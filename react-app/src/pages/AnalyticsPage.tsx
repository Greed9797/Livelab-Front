import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { BarPanel, LinePanel } from '../components/charts/Charts'
import { ErrorState, LoadingState } from '../components/ui/States'
import { FunilAnalyticsSection } from '../components/analytics/FunilAnalyticsSection'
import { AnalyticsImportSection } from '../components/analytics/AnalyticsImportSection'
import { RelatorioEntidadeSection } from '../components/analytics/RelatorioEntidadeSection'
import { PulsoDiarioSection } from '../components/analytics/PulsoDiarioSection'
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
import { sumDailyTotals } from './page-helpers'
import { buildDailyPulse } from '../utils/dailyPulse'
import { QK } from '../services/query-keys'
import { useToast } from '../components/ui/Toast'
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
  // Seções mensais legadas usam o mês do FIM do intervalo (mês corrente), não o
  // início — senão "7 dias" cruzando meses (31/05→06/06) cairia em maio e zeraria.
  const mes = to.slice(0, 7)
  // Comissões/funil/CSV usam o INTERVALO (data_inicio/data_fim) — mesmo período do
  // topo — para não divergir do Pulso (que usava só o mês corrente antes).
  const comissaoFiltros = { data_inicio: from, data_fim: to, marca_id: marcaId || undefined, apresentadora_id: apresentadoraId || undefined }
  const hasFilter = Boolean(marcaId || apresentadoraId)

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

  // staleTime 0 + refetchOnMount: o % de franquia precisa vir sempre fresco — senão,
  // após editar em Comercial, o relatório segue lendo o valor antigo (divergência).
  const marcasOpts = useQuery({
    queryKey: QK.marcas('analytics-filter'),
    queryFn: () => getMarcas({ status: 'ativa' }),
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const apresentadorasOpts = useQuery({ queryKey: QK.apresentadoras('analytics-filter'), queryFn: () => getApresentadoras() })

  const marcas = useMemo(() => unwrapList<JsonRecord>(marcasOpts.data), [marcasOpts.data])
  const apresentadoras = useMemo(() => unwrapList<JsonRecord>(apresentadorasOpts.data), [apresentadorasOpts.data])

  function refreshAll() {
    void query.refetch()
    void comissoesApresentadorasQ.refetch()
    void comissoesMarcasQ.refetch()
    void queryClient.invalidateQueries({ queryKey: ['daily-pulse'] })
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
      onExport={handleExport}
      exporting={exporting}
    />
  )

  // Tudo abaixo segue o range do filtro (mesma fonte do Pulso: /diario por dia).
  const diarioRows = useMemo(() => unwrapList<JsonRecord>(query.data), [query.data])
  const totals = useMemo(() => sumDailyTotals(diarioRows), [diarioRows])
  const serie = useMemo(() => buildDailyPulse(diarioRows).serieDiaria, [diarioRows])
  const totalLives = totals.total_lives
  const totalVideos = totals.total_videos
  const gmvPoints = useMemo(() => serie.map((d) => ({ label: d.label, value: Math.round(d.gmv * 100) / 100 })), [serie])
  const pedidosPoints = useMemo(() => serie.map((d) => ({ label: d.label, value: d.pedidos })), [serie])

  const apresentadorasRows = asArray<JsonRecord>(comissoesApresentadorasQ.data)
  const marcasRows = asArray<JsonRecord>(comissoesMarcasQ.data)

  return (
    <div className="space-y-6">
      {embedded ? (
        <p className="text-base font-bold text-ink">Pulso Diário</p>
      ) : (
        <PageHeader
          eyebrow="Pulso Diário"
          accent="Operação"
          title="diária"
          subtitle="Status, alertas e produtividade das lives por dia."
        />
      )}

      {/* Filtro único — rege Pulso + gráficos de série + relatório por entidade */}
      {filterBar}

      <PulsoDiarioSection from={from} to={to} marcaId={marcaId} apresentadoraId={apresentadoraId} />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {/* Séries do período — distintas do hero do Pulso (que mostra os agregados). */}
          <section className="grid gap-4 xl:grid-cols-2">
            <LinePanel title={`GMV · ${periodNoun}`} subtitle="GMV por dia no período selecionado" data={gmvPoints} />
            <BarPanel title={`Pedidos · ${periodNoun}`} subtitle="Pedidos por dia no período" data={pedidosPoints} />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <BarPanel
              title={`Conteúdos · ${periodNoun}`}
              subtitle="Lives e vídeos no período"
              data={[
                { label: 'Lives', value: totalLives },
                { label: 'Vídeos', value: totalVideos },
              ]}
            />
          </section>

          <AnalyticsImportSection mesAno={mes} />

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
              franquiaPct={marcaId ? asNumber(marcas.find((m) => asString(m.id) === marcaId)?.comissao_franquia_pct) : undefined}
            />
          ) : null}

          <FunilAnalyticsSection from={from} to={to} marcaId={marcaId} apresentadoraId={apresentadoraId} />
        </>
      )}
    </div>
  )
}
