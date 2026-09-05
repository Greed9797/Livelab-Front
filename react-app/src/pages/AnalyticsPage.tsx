import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { BarPanel } from '../components/charts/Charts'
import { ErrorState, LoadingState } from '../components/ui/States'
import { FunilAnalyticsSection } from '../components/analytics/FunilAnalyticsSection'
import { RelatorioEntidadeSection } from '../components/analytics/RelatorioEntidadeSection'
import { PulsoDiarioSection } from '../components/analytics/PulsoDiarioSection'
import { BrandComparisonSection } from '../components/analytics/BrandComparisonSection'
import { BrandAudienceComparisonSection } from '../components/analytics/BrandAudienceComparisonSection'
import { AssiduidadeStrip } from '../components/dashboard/AssiduidadeStrip'
import { AnalyticsFilterBar, presetRange, ymd, type Preset } from '../components/analytics/AnalyticsFilterBar'
import {
  exportarComissoesCSV,
  getApresentadoras,
  getComissoesApresentadoras,
  getComissoesMarcas,
  getDailyAnalytics,
  getMarcas,
} from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, unwrapList } from '../utils/format'
import { rankingId, rankingName } from '../utils/ranking'
import { FileDown } from 'lucide-react'
import { sumDailyTotals } from './page-helpers'
import { buildDailyPulse } from '../utils/dailyPulse'
import { previousPeriodRange } from '../utils/brandComparison'
import { QK } from '../services/query-keys'
import { useToast } from '../components/ui/Toast'
import { useCurrentUser } from '../stores/auth-store'
import { masterRoles, financeRoles, commercialRoles } from '../utils/access'
import type { JsonRecord } from '../types/models'

export function AnalyticsPage({ embedded = false }: { embedded?: boolean }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [preset, setPreset] = useState<Preset>('mes')
  const [customFrom, setCustomFrom] = useState(ymd(new Date()))
  const [customTo, setCustomTo] = useState(ymd(new Date()))
  const [marcaId, setMarcaId] = useState<string>('')
  const [apresentadoraId, setApresentadoraId] = useState<string>('')
  const [exporting, setExporting] = useState(false)

  // Filtro ÚNICO: período (range) + marca + apresentadora rege a página toda.
  const { from, to } = presetRange(preset, customFrom, customTo)
  const previousPeriod = useMemo(() => previousPeriodRange(from, to), [from, to])
  // Seções mensais legadas usam o mês do FIM do intervalo (mês corrente), não o
  // início — senão "7 dias" cruzando meses (31/05→06/06) cairia em maio e zeraria.
  const mes = to.slice(0, 7)
  // Comissões/funil/CSV usam o INTERVALO (data_inicio/data_fim) — mesmo período do
  // topo — para não divergir do Pulso (que usava só o mês corrente antes).
  const comissaoFiltros = { data_inicio: from, data_fim: to, marca_id: marcaId || undefined, apresentadora_id: apresentadoraId || undefined }
  const hasFilter = Boolean(marcaId || apresentadoraId)
  // O ranking de marcas lê /comissoes/marcas (dado sensível de franquia). Só busca
  // para papéis com acesso a comissões — apresentador/operacional/cabine veem /conteudo
  // mas não devem disparar 403; para eles a seção simplesmente não renderiza.
  const user = useCurrentUser()
  const canSeeComissoes = useMemo(
    () => [...masterRoles, ...financeRoles, ...commercialRoles].some((r) => r === user?.papel),
    [user?.papel],
  )

  // Rótulo de granularidade do período — usado nos títulos dos gráficos detalhados.
  const PERIODO_NOUN: Record<Preset, string> = {
    hoje: 'hoje', ontem: 'ontem', '7d': '7 dias', '30d': '30 dias', mes: 'mês', custom: 'período',
  }
  const periodNoun = PERIODO_NOUN[preset]

  // Mesma chave do Pulso → React Query dedup (1 fetch só). Os gráficos de série
  // seguem o range do filtro, não um mês fixo.
  const query = useQuery({
    queryKey: ['daily-pulse', from, to, marcaId, apresentadoraId],
    queryFn: () => getDailyAnalytics({ from, to, marca_id: marcaId || undefined, apresentadora_id: apresentadoraId || undefined }),
    staleTime: 60_000,
  })
  // Consulta separada, com a mesma duração-calendário e os mesmos filtros. Uma falha
  // aqui não interfere no recorte atual nem transforma ausência de marca em zero.
  const previousQuery = useQuery({
    queryKey: ['daily-pulse', 'previous', previousPeriod?.from, previousPeriod?.to, marcaId, apresentadoraId],
    queryFn: () => getDailyAnalytics({ from: previousPeriod!.from, to: previousPeriod!.to, marca_id: marcaId || undefined, apresentadora_id: apresentadoraId || undefined }),
    enabled: Boolean(previousPeriod) && !apresentadoraId,
    staleTime: 60_000,
  })

  // Comissão por entidade alimenta APENAS o relatório por entidade (drill quando há
  // filtro). As tabelas de comissão vivem no Financeiro — fonte única.
  const comissoesApresentadorasQ = useQuery({
    queryKey: ['comissoes-apresentadoras', from, to, marcaId, apresentadoraId],
    queryFn: () => getComissoesApresentadoras(comissaoFiltros),
    enabled: hasFilter,
  })
  const comissoesMarcasQ = useQuery({
    queryKey: ['comissoes-marcas', from, to, marcaId, apresentadoraId],
    queryFn: () => getComissoesMarcas(comissaoFiltros),
    enabled: hasFilter,
  })
  // Ranking de marcas do período — TODAS as marcas, sem filtro de entidade, sempre
  // visível no Analytics (o comissoesMarcasQ acima é só o drill por entidade).
  const rankingMarcasQ = useQuery({
    queryKey: ['ranking-marcas', from, to],
    queryFn: () => getComissoesMarcas({ data_inicio: from, data_fim: to }),
    enabled: canSeeComissoes,
    staleTime: 60_000,
  })
  // Ranking de apresentadoras do período — fonte das entidades COM atividade (filtra zerados).
  const rankingApresentadorasQ = useQuery({
    queryKey: ['ranking-apresentadoras', from, to],
    queryFn: () => getComissoesApresentadoras({ data_inicio: from, data_fim: to }),
    enabled: canSeeComissoes,
    staleTime: 60_000,
  })

  // Cadastral (fallback): resolve nome da entidade selecionada + papéis sem comissão.
  const marcasOpts = useQuery({
    queryKey: QK.marcas('analytics-filter'),
    queryFn: () => getMarcas({ status: 'ativa' }),
  })
  const apresentadorasOpts = useQuery({ queryKey: QK.apresentadoras('analytics-filter'), queryFn: () => getApresentadoras() })

  // Opções dos dropdowns = só entidades com Live/GMV no período (via ranking, que já
  // filtra zerados no backend). Fallback pro cadastral quando o ranking está indisponível.
  // A entidade atualmente selecionada é sempre mantida (evita filtro "preso").
  const marcas = useMemo(() => {
    const cadastral = unwrapList<JsonRecord>(marcasOpts.data)
    const doPeriodo = unwrapList<JsonRecord>(rankingMarcasQ.data)
      .map((r) => ({ id: rankingId(r, 'marca'), nome: rankingName(r, 'marca') }))
      .filter((m) => m.id)
    const base = (doPeriodo.length ? doPeriodo : cadastral.map((m) => ({ id: asString(m.id), nome: asString(m.nome, 'Sem nome') })))
      .filter((m) => m.id)
    if (marcaId && !base.some((m) => m.id === marcaId)) {
      const sel = cadastral.find((m) => asString(m.id) === marcaId)
      if (sel) base.push({ id: marcaId, nome: asString(sel.nome, 'Sem nome') })
    }
    return base
  }, [rankingMarcasQ.data, marcasOpts.data, marcaId])

  const apresentadoras = useMemo(() => {
    const cadastral = unwrapList<JsonRecord>(apresentadorasOpts.data)
    const doPeriodo = unwrapList<JsonRecord>(rankingApresentadorasQ.data)
      .map((r) => ({ id: rankingId(r, 'apresentadora'), nome: rankingName(r, 'apresentadora') }))
      .filter((a) => a.id)
    const base = (doPeriodo.length ? doPeriodo : cadastral.map((a) => ({ id: asString(a.id), nome: asString(a.nome, 'Sem nome') })))
      .filter((a) => a.id)
    if (apresentadoraId && !base.some((a) => a.id === apresentadoraId)) {
      const sel = cadastral.find((a) => asString(a.id) === apresentadoraId)
      if (sel) base.push({ id: apresentadoraId, nome: asString(sel.nome, 'Sem nome') })
    }
    return base
  }, [rankingApresentadorasQ.data, apresentadorasOpts.data, apresentadoraId])

  function refreshAll() {
    void query.refetch()
    void comissoesApresentadorasQ.refetch()
    void comissoesMarcasQ.refetch()
    void rankingMarcasQ.refetch()
    void queryClient.invalidateQueries({ queryKey: ['daily-pulse'] })
    void queryClient.invalidateQueries({ queryKey: ['audiencia-marcas'] })
    void queryClient.invalidateQueries({ queryKey: ['funil-analytics'] })
  }

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await exportarComissoesCSV(comissaoFiltros)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comissoes-${mes}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.push('Relatório CSV gerado', 'success')
    } catch (err) {
      toast.push(extractErrorMessage(err), 'error')
    } finally {
      setExporting(false)
    }
  }

  const filterBar = (
    <AnalyticsFilterBar
      preset={preset}
      onPreset={setPreset}
      customFrom={customFrom}
      customTo={customTo}
      onCustomFrom={setCustomFrom}
      onCustomTo={setCustomTo}
      marcaId={marcaId}
      apresentadoraId={apresentadoraId}
      onMarca={setMarcaId}
      onApresentadora={setApresentadoraId}
      marcas={marcas}
      apresentadoras={apresentadoras}
      onRefresh={refreshAll}
      refreshing={query.isFetching}
      // CSV de comissões — só para papéis com acesso (os demais levariam 403 do backend).
      onExport={canSeeComissoes ? handleExport : undefined}
      exporting={exporting}
    />
  )

  // Tudo abaixo segue o range do filtro (mesma fonte do Pulso: /diario por dia).
  const diarioRows = useMemo(() => unwrapList<JsonRecord>(query.data), [query.data])
  const previousDiarioRows = useMemo(() => previousQuery.isSuccess ? unwrapList<JsonRecord>(previousQuery.data) : undefined, [previousQuery.data, previousQuery.isSuccess])
  const previousStatus = previousQuery.isSuccess ? 'ready' : previousQuery.isError ? 'error' : 'loading'
  const totals = useMemo(() => sumDailyTotals(diarioRows), [diarioRows])
  const serie = useMemo(() => buildDailyPulse(diarioRows).serieDiaria, [diarioRows])
  const totalLives = totals.total_lives
  const totalVideos = totals.total_videos
  const pedidosPoints = useMemo(() => serie.map((d) => ({ label: d.label, value: d.pedidos })), [serie])

  const apresentadorasRows = asArray<JsonRecord>(comissoesApresentadorasQ.data)
  const marcasRows = asArray<JsonRecord>(comissoesMarcasQ.data)
  return (
    <div className="space-y-6">
      {embedded ? (
        <p className="text-base font-bold text-ink">Resultados da operação</p>
      ) : (
        <PageHeader
          eyebrow="Analytics · Operação"
          accent="Resultados"
          title="da operação"
          subtitle="Compare marcas, acompanhe a eficiência das lives e entenda a audiência."
        />
      )}

      {/* Filtro único — rege Pulso + gráficos de série + relatório por entidade */}
      {filterBar}

      {!query.isLoading && !query.isError ? (
        <>
          <BrandComparisonSection rows={diarioRows} marcaId={marcaId} apresentadoraId={apresentadoraId} onSelectMarca={setMarcaId} onClearMarca={() => setMarcaId('')} onClearApresentadora={() => setApresentadoraId('')} previousRows={previousDiarioRows} currentPeriod={{ from, to }} previousPeriod={previousQuery.isSuccess ? previousPeriod : null} previousStatus={previousStatus} currentPeriodEndsToday={to === ymd(new Date())} />
          {!apresentadoraId ? <BrandAudienceComparisonSection from={from} to={to} marcaId={marcaId} /> : null}
        </>
      ) : null}

      {/* Relatório por entidade — logo abaixo do filtro: é o que se vem buscar para
          exportar. Sem filtro, um hint ensina o caminho em vez da seção surgir do nada. */}
      {hasFilter ? (
        <RelatorioEntidadeSection
          from={from}
          to={to}
          marcaId={marcaId}
          apresentadoraId={apresentadoraId}
          nomeEntidade={[
            marcaId ? asString(marcas.find((m) => asString(m.id) === marcaId)?.nome, '') : '',
            apresentadoraId ? asString(apresentadoras.find((a) => asString(a.id) === apresentadoraId)?.nome, '') : '',
          ].filter(Boolean).join(' · ')}
          comissaoRow={marcaId ? marcasRows[0] : apresentadorasRows[0]}
          franquiaPct={marcaId ? asNumber(unwrapList<JsonRecord>(marcasOpts.data).find((m) => asString(m.id) === marcaId)?.comissao_franquia_pct) : undefined}
        />
      ) : (
        <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-line bg-surface-muted/40 px-4 py-3">
          <FileDown className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
          <p className="text-sm text-ink-muted">
            <span className="font-bold text-ink">Relatório em PDF:</span> selecione uma marca ou apresentadora no filtro acima —
            o relatório do período (GMV, horas, pedidos e comissão) aparece aqui, pronto para exportar.
          </p>
        </div>
      )}

      <FunilAnalyticsSection from={from} to={to} marcaId={marcaId} apresentadoraId={apresentadoraId} />

      <PulsoDiarioSection from={from} to={to} marcaId={marcaId} apresentadoraId={apresentadoraId} />

      {/* Assiduidade obedece o filtro de período da página (decisão do dono). marcaId NÃO entra:
          presença é física — com recorte por marca, quem naquele dia fez live de outra marca
          sumiria e viraria falta. apresentadoraId só estreita a lista, não muda a classificação. */}
      <AssiduidadeStrip
        inicio={from}
        fim={to}
        apresentadoraId={apresentadoraId || undefined}
        subtitulo={`Período do filtro · ${periodNoun}`}
      />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <section>
            <BarPanel
              title={`Pedidos · ${periodNoun}`}
              subtitle={`Pedidos por dia no período · ${totalLives.toLocaleString('pt-BR')} lives · ${totalVideos.toLocaleString('pt-BR')} vídeos`}
              data={pedidosPoints}
            />
          </section>

          {/* A importação de planilha mudou para Conteúdo › Lives realizadas, ao lado da
              exportação: é lá que as lives que ela preenche são geridas. */}
        </>
      )}
    </div>
  )
}
