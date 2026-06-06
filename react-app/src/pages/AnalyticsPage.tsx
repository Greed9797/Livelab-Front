import { Clock, CircleDollarSign, Film, Radio, ReceiptText, ShoppingBag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { BarPanel, LinePanel } from '../components/charts/Charts'
import { ErrorState, LoadingState } from '../components/ui/States'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
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
import { asArray, asNumber, asString, formatMoney, unwrapList } from '../utils/format'
import { metric, moneyMetric, sumDailyTotals } from './page-helpers'
import { buildDailyPulse } from '../utils/dailyPulse'
import { QK } from '../services/query-keys'
import { useToast } from '../components/ui/Toast'
import type { JsonRecord } from '../types/models'

const icons = [CircleDollarSign, ShoppingBag, Radio, Film, Clock, ReceiptText]

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

  // Mesma chave do Pulso → React Query dedup (1 fetch só). Métricas detalhadas
  // e os 4 gráficos seguem o range do filtro, não um mês fixo.
  const query = useQuery({
    queryKey: ['daily-pulse', from, to, marcaId, apresentadoraId],
    queryFn: () => getDailyAnalytics({ from, to, marca_id: marcaId || undefined, apresentadora_id: apresentadoraId || undefined }),
    staleTime: 60_000,
  })

  const comissoesApresentadorasQ = useQuery({
    queryKey: ['comissoes-apresentadoras', from, to, marcaId, apresentadoraId],
    queryFn: () => getComissoesApresentadoras(comissaoFiltros),
  })
  const comissoesMarcasQ = useQuery({
    queryKey: ['comissoes-marcas', from, to, marcaId, apresentadoraId],
    queryFn: () => getComissoesMarcas(comissaoFiltros),
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
  const totalConteudos = totalLives + totalVideos
  const gmvPoints = useMemo(() => serie.map((d) => ({ label: d.label, value: Math.round(d.gmv * 100) / 100 })), [serie])
  const pedidosPoints = useMemo(() => serie.map((d) => ({ label: d.label, value: d.pedidos })), [serie])
  const horasPoints = useMemo(() => serie.map((d) => ({ label: d.label, value: Math.round(d.horas * 10) / 10 })), [serie])

  const apresentadorasRows = asArray<JsonRecord>(comissoesApresentadorasQ.data)
  const marcasRows = asArray<JsonRecord>(comissoesMarcasQ.data)
  const totalGMVApresentadoras = apresentadorasRows.reduce((sum, r) => sum + asNumber(r.gmv_total ?? r.gmv), 0)
  const totalComissaoApresentadoras = apresentadorasRows.reduce((sum, r) => sum + asNumber(r.comissao_apresentadora), 0)
  const totalGMVMarcas = marcasRows.reduce((sum, r) => sum + asNumber(r.gmv_total ?? r.gmv), 0)
  const totalComissaoFranquia = marcasRows.reduce((sum, r) => sum + asNumber(r.comissao_franquia), 0)
  const totalComissaoFranqueadora = marcasRows.reduce((sum, r) => sum + asNumber(r.comissao_franqueadora), 0)

  const metrics = [
    moneyMetric('GMV atribuído', totals.gmv_total, periodNoun, 'brand'),
    metric('Pedidos', totals.pedidos.toLocaleString('pt-BR'), 'pedidos atribuídos', 'success'),
    metric('Lives realizadas', totalLives.toLocaleString('pt-BR'), periodNoun, 'neutral'),
    metric('Horas de live', totals.horas_live.toFixed(1), 'lives encerradas', 'neutral'),
    metric('GMV / live', formatMoney(totals.gmv_por_live), 'GMV total / lives', 'info'),
    metric('GMV / hora', formatMoney(totals.gmv_por_hora), 'GMV total / horas', 'success'),
  ]

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

      {/* Filtro único — rege Pulso + métricas detalhadas */}
      {filterBar}

      <PulsoDiarioSection from={from} to={to} marcaId={marcaId} apresentadoraId={apresentadoraId} />

      <div className="flex items-center gap-3 pt-2">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-muted">Métricas detalhadas · {periodNoun}</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((item, index) => (
              <MetricCard key={item.label} metric={item} icon={icons[index]} />
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <LinePanel title={`GMV · ${periodNoun}`} subtitle="GMV por dia no período selecionado" data={gmvPoints} />
            <BarPanel title={`Pedidos · ${periodNoun}`} subtitle="Pedidos por dia no período" data={pedidosPoints} />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <BarPanel title={`Horas de live · ${periodNoun}`} subtitle="Horas no ar por dia" data={horasPoints} />
            <BarPanel
              title={`Conteúdos · ${periodNoun}`}
              subtitle="Lives e vídeos no período"
              data={[
                { label: 'Lives', value: totalLives },
                { label: 'Vídeos', value: totalVideos },
                { label: 'Total', value: totalConteudos },
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

          <section className="space-y-4">
            <div className="rounded-2xl border border-line bg-surface-muted p-4">
              <p className="text-base font-bold text-ink">Desempenho e comissionamento por entidade</p>
              <p className="mt-1 text-xs text-ink-muted">GMV, GMV/hora, pedidos, lives e comissão por apresentadora e por marca. Usa o filtro único do topo.</p>
            </div>
            <section className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <p className="text-base font-bold tracking-[-0.01em] text-ink">Comissões — por apresentadora</p>
                  <p className="mt-1 text-xs text-ink-muted">GMV + comissão da apresentadora no período/filtros.</p>
                </CardHeader>
                <CardBody>
                  {comissoesApresentadorasQ.isLoading ? (
                    <p className="py-4 text-center text-sm text-muted">Carregando...</p>
                  ) : apresentadorasRows.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted">{hasFilter ? 'Sem vendas para esta combinação de filtros no período. Tente limpar um dos filtros.' : 'Nenhuma comissão registrada no período.'}</p>
                  ) : (
                    <>
                      <DataTable<JsonRecord>
                        data={apresentadorasRows}
                        columns={[
                          { key: 'apresentadora_nome', header: 'Apresentadora', render: (item) => asString(item.apresentadora_nome, 'Sem apresentadora') },
                          { key: 'gmv_total', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv_total ?? item.gmv) },
                          { key: 'gmv_por_hora', header: 'GMV/h', align: 'right', render: (item) => formatMoney(item.gmv_por_hora) },
                          { key: 'pedidos_total', header: 'Pedidos', align: 'right', render: (item) => asNumber(item.pedidos_total ?? item.pedidos).toLocaleString('pt-BR') },
                          { key: 'total_lives', header: 'Lives', align: 'right', render: (item) => asNumber(item.total_lives ?? item.lives).toLocaleString('pt-BR') },
                          { key: 'comissao_apresentadora', header: 'Comissão', align: 'right', render: (item) => formatMoney(item.comissao_apresentadora) },
                        ]}
                      />
                      <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm font-bold text-ink">
                        <span>Total ({apresentadorasRows.length})</span>
                        <span>GMV {formatMoney(totalGMVApresentadoras)} · Comissão {formatMoney(totalComissaoApresentadoras)}</span>
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <p className="text-base font-bold tracking-[-0.01em] text-ink">Comissões — por marca (Livelab)</p>
                  <p className="mt-1 text-xs text-ink-muted">Franquia + franqueadora. Usa o filtro único do topo.</p>
                </CardHeader>
                <CardBody>
                  {comissoesMarcasQ.isLoading ? (
                    <p className="py-4 text-center text-sm text-muted">Carregando...</p>
                  ) : marcasRows.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted">{hasFilter ? 'Sem vendas para esta combinação de filtros no período. Tente limpar um dos filtros.' : 'Nenhuma comissão registrada no período.'}</p>
                  ) : (
                    <>
                      <DataTable<JsonRecord>
                        data={marcasRows}
                        columns={[
                          { key: 'marca_nome', header: 'Marca', render: (item) => asString(item.marca_nome, 'Sem marca') },
                          { key: 'gmv_total', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv_total ?? item.gmv) },
                          { key: 'gmv_por_hora', header: 'GMV/h', align: 'right', render: (item) => formatMoney(item.gmv_por_hora) },
                          { key: 'pedidos', header: 'Pedidos', align: 'right', render: (item) => asNumber(item.pedidos ?? item.pedidos_total).toLocaleString('pt-BR') },
                          { key: 'total_lives', header: 'Lives', align: 'right', render: (item) => asNumber(item.total_lives ?? item.lives).toLocaleString('pt-BR') },
                          { key: 'comissao_franquia', header: 'Franquia', align: 'right', render: (item) => formatMoney(item.comissao_franquia) },
                          { key: 'comissao_franqueadora', header: 'Franqueadora', align: 'right', render: (item) => formatMoney(item.comissao_franqueadora) },
                        ]}
                      />
                      <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-line pt-3 text-sm font-bold text-ink">
                        <span>Total ({marcasRows.length})</span>
                        <span>GMV {formatMoney(totalGMVMarcas)} · Franquia {formatMoney(totalComissaoFranquia)} · Franqueadora {formatMoney(totalComissaoFranqueadora)}</span>
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            </section>
          </section>
        </>
      )}
    </div>
  )
}
