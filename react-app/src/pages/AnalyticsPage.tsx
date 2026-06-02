import { Clock, CircleDollarSign, Download, Film, Radio, ReceiptText, ShoppingBag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { PeriodControl } from '../components/forms/PeriodControl'
import { MetricCard } from '../components/ui/MetricCard'
import { BarPanel, LinePanel } from '../components/charts/Charts'
import { ErrorState, LoadingState } from '../components/ui/States'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Button } from '../components/ui/Button'
import { FunilAnalyticsSection } from '../components/analytics/FunilAnalyticsSection'
import { AnalyticsImportSection } from '../components/analytics/AnalyticsImportSection'
import {
  exportarComissoesCSV,
  getAnalyticsDashboard,
  getDailyAnalytics,
  getApresentadoras,
  getComissoesApresentadoras,
  getComissoesMarcas,
  getMarcas,
} from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, currentPeriod, formatMoney, getRecord, unwrapList } from '../utils/format'
import { analyticsDailyChartRows, historyPoints, latestPeriodWithData, metric, moneyMetric, topDailyPoints } from './page-helpers'
import { QK } from '../services/query-keys'
import { useToast } from '../components/ui/Toast'
import type { JsonRecord } from '../types/models'

const icons = [CircleDollarSign, ShoppingBag, Radio, Film, Clock, ReceiptText]

function periodToMesAno(period: { mes: number; ano: number }) {
  return `${period.ano}-${String(period.mes).padStart(2, '0')}`
}

export function AnalyticsPage({ embedded = false }: { embedded?: boolean }) {
  const toast = useToast()
  const [period, setPeriod] = useState(currentPeriod())
  const [marcaId, setMarcaId] = useState<string>('')
  const [apresentadoraId, setApresentadoraId] = useState<string>('')
  const [exporting, setExporting] = useState(false)
  const [chartMode, setChartMode] = useState<'mensal' | 'diario'>('mensal')
  const [periodAutoAdjusted, setPeriodAutoAdjusted] = useState(false)

  const mes = periodToMesAno(period)
  const filtros = { mes, marca_id: marcaId || undefined, apresentadora_id: apresentadoraId || undefined }

  const query = useQuery({ queryKey: QK.analyticsDashboard(period), queryFn: () => getAnalyticsDashboard({ mesAno: mes }) })
  const dailyQuery = useQuery({
    queryKey: QK.dailyAnalytics(mes),
    queryFn: () => getDailyAnalytics({ mesAno: mes }),
    enabled: chartMode === 'diario',
    staleTime: 5 * 60_000,
  })

  const comissoesApresentadorasQ = useQuery({
    queryKey: QK.comissoesApresentadorasBy(mes, marcaId, apresentadoraId),
    queryFn: () => getComissoesApresentadoras(filtros),
  })
  const comissoesMarcasQ = useQuery({
    queryKey: QK.comissoesMarcasBy(mes, marcaId, apresentadoraId),
    queryFn: () => getComissoesMarcas(filtros),
  })

  const marcasOpts = useQuery({ queryKey: QK.marcas('analytics-filter'), queryFn: () => getMarcas({ status: 'ativa' }) })
  const apresentadorasOpts = useQuery({ queryKey: QK.apresentadoras('analytics-filter'), queryFn: () => getApresentadoras() })
  const raw = query.data ?? {}
  const latestDataPeriod = latestPeriodWithData(raw)

  useEffect(() => {
    if (!query.isSuccess || periodAutoAdjusted || !latestDataPeriod) return
    if (latestDataPeriod.ano === period.ano && latestDataPeriod.mes === period.mes) return
    const kpis = getRecord(raw.kpis)
    const hasCurrentData =
      asNumber(kpis.gmv_total ?? raw.gmv_total ?? raw.gmv_mes) > 0 ||
      asNumber(kpis.total_lives ?? raw.total_lives) > 0 ||
      asNumber(kpis.pedidos_total ?? raw.pedidos_total) > 0
    if (hasCurrentData) return
    setPeriodAutoAdjusted(true)
    setPeriod(latestDataPeriod)
  }, [latestDataPeriod?.ano, latestDataPeriod?.mes, period.ano, period.mes, periodAutoAdjusted, query.isSuccess, raw])

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const kpis = getRecord(raw.kpis)
  const endpointDailyRows = unwrapList<JsonRecord>(dailyQuery.data)
  const { gmvRows: dailyGmvRows, pedidosRows: dailyPedidosRows, hasDashboardRows } = analyticsDailyChartRows(raw, endpointDailyRows)
  const dailyGmvPoints = topDailyPoints(dailyGmvRows, ['gmv_total', 'gmv_lives', 'gmv'])
  const dailyPedidosPoints = topDailyPoints(dailyPedidosRows, ['pedidos', 'total_pedidos', 'orders'])
  const dailySubtitle = dailyQuery.isLoading && !hasDashboardRows
    ? 'Carregando melhores dias do mês selecionado...'
    : 'Top 10 dias do mês selecionado, ordenado do maior para o menor.'

  const apresentadorasRows = asArray<JsonRecord>(comissoesApresentadorasQ.data)
  const marcasRows = asArray<JsonRecord>(comissoesMarcasQ.data)

  const totalGMVApresentadoras = apresentadorasRows.reduce((sum, r) => sum + asNumber(r.gmv_total ?? r.gmv), 0)
  const totalComissaoApresentadoras = apresentadorasRows.reduce((sum, r) => sum + asNumber(r.comissao_apresentadora), 0)
  const totalGMVMarcas = marcasRows.reduce((sum, r) => sum + asNumber(r.gmv_total ?? r.gmv), 0)
  const totalComissaoFranquia = marcasRows.reduce((sum, r) => sum + asNumber(r.comissao_franquia), 0)
  const totalComissaoFranqueadora = marcasRows.reduce((sum, r) => sum + asNumber(r.comissao_franqueadora), 0)

  const totalLives = asNumber(kpis.total_lives ?? raw.total_lives)
  const totalVideos = asNumber(kpis.total_videos ?? raw.total_videos)
  const totalConteudos = asNumber(kpis.total_conteudos ?? totalLives + totalVideos)

  const metrics = [
    moneyMetric('GMV atribuído', kpis.gmv_total ?? raw.gmv_total ?? raw.gmv_mes, 'lives + vídeos', 'brand'),
    metric('Pedidos', asNumber(kpis.pedidos_total ?? raw.pedidos_total ?? kpis.total_vendas).toLocaleString('pt-BR'), 'pedidos atribuídos', 'success'),
    metric('Lives realizadas', totalLives.toLocaleString('pt-BR'), 'período selecionado', 'neutral'),
    metric('Horas de live', asNumber(kpis.horas_live ?? raw.horas_live).toFixed(1), 'lives encerradas', 'neutral'),
    metric('GMV / live', formatMoney(kpis.gmv_por_live ?? raw.gmv_por_live), 'GMV total / lives', 'info'),
    metric('GMV / hora', formatMoney(kpis.gmv_por_hora ?? raw.gmv_por_hora ?? raw.gmv_hora), 'GMV total / horas', 'success'),
  ]

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await exportarComissoesCSV(filtros)
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

  // Filtro marca/apresentadora: escopo ÚNICO da seção "Desempenho e comissionamento"
  // (tabelas + CSV). KPIs e gráficos do topo seguem só o período (mês), sem esse filtro.
  const hasFilter = Boolean(marcaId || apresentadoraId)
  const comissoesFiltrosBar = (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Marca</span>
        <select
          className="design-input h-10 min-w-[180px] px-3 text-sm"
          value={marcaId}
          onChange={(e) => setMarcaId(e.target.value)}
        >
          <option value="">Todas as marcas</option>
          {asArray<JsonRecord>(marcasOpts.data).map((m) => (
            <option key={asString(m.id)} value={asString(m.id)}>{asString(m.nome, 'Sem nome')}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Apresentadora</span>
        <select
          className="design-input h-10 min-w-[180px] px-3 text-sm"
          value={apresentadoraId}
          onChange={(e) => setApresentadoraId(e.target.value)}
        >
          <option value="">Todas as apresentadoras</option>
          {asArray<JsonRecord>(apresentadorasOpts.data).map((a) => (
            <option key={asString(a.id)} value={asString(a.id)}>{asString(a.nome, 'Sem nome')}</option>
          ))}
        </select>
      </label>
      {hasFilter ? (
        <button
          type="button"
          className="h-10 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink-muted hover:bg-surface-muted"
          onClick={() => { setMarcaId(''); setApresentadoraId('') }}
        >
          Limpar filtros
        </button>
      ) : null}
      <Button type="button" icon={Download} variant="secondary" onClick={handleExport} isLoading={exporting}>
        Exportar CSV
      </Button>
    </div>
  )

  // Topo (KPIs/gráficos) usa só período.
  const periodoBar = (
    <div className="flex flex-wrap items-end gap-3">
      <PeriodControl period={period} onChange={setPeriod} />
    </div>
  )

  return (
    <div className="space-y-6">
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-bold text-ink">Analytics</p>
          {periodoBar}
        </div>
      ) : (
        <PageHeader
          eyebrow="Analytics"
          accent="Dashboard"
          title="de métricas"
          subtitle="GMV, horas, lives e desempenho por período."
          actions={periodoBar}
        />
      )}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item, index) => (
          <MetricCard key={item.label} metric={item} icon={icons[index]} />
        ))}
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-muted/60 p-3">
          <div>
            <p className="text-sm font-bold text-ink">Comparativo principal</p>
            <p className="text-xs text-ink-muted">
              {chartMode === 'mensal'
                ? 'Evolução mensal consolidada de GMV e pedidos.'
                : 'Ranking dos melhores dias do mês selecionado em GMV e pedidos.'}
            </p>
          </div>
          <div className="flex rounded-full border border-line bg-surface p-1">
            {(['mensal', 'diario'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  chartMode === mode
                    ? 'bg-brand text-white shadow-[0_8px_24px_rgba(255,90,31,0.28)]'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                }`}
                onClick={() => setChartMode(mode)}
              >
                {mode === 'mensal' ? 'Mensal' : 'Diário'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {chartMode === 'mensal' ? (
            <>
              <LinePanel title="GMV mensal" data={historyPoints(raw.gmv_mensal ?? raw.faturamento_mensal ?? raw.history)} />
              <BarPanel title="Pedidos mensais" data={historyPoints(raw.pedidos_mensal ?? raw.vendas_mensal, ['mes', 'label'], ['pedidos', 'total_vendas', 'value'])} />
            </>
          ) : (
            <>
              <BarPanel title="GMV diário" subtitle={dailySubtitle} data={dailyGmvPoints} />
              <BarPanel title="Pedidos diários" subtitle={dailySubtitle} data={dailyPedidosPoints} />
            </>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <BarPanel title="Horas de live" data={historyPoints(raw.horas_live_por_dia ?? raw.horas_por_dia, ['dia', 'label'], ['horas', 'value'])} />
        <BarPanel
          title="Conteúdos no período"
          data={[
            { label: 'Lives', value: totalLives },
            { label: 'Vídeos', value: totalVideos },
            { label: 'Total', value: totalConteudos },
          ]}
        />
      </section>

      <AnalyticsImportSection mesAno={mes} />

      <section className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-line bg-surface-muted p-4">
        <div>
          <p className="text-base font-bold text-ink">Filtro por marca / apresentadora</p>
          <p className="mt-1 text-xs text-ink-muted">Afeta o funil de conversão e o desempenho por entidade abaixo. KPIs e gráficos do topo seguem só o período.</p>
        </div>
        {comissoesFiltrosBar}
      </section>

      <FunilAnalyticsSection mesAno={mes} marcaId={marcaId} apresentadoraId={apresentadoraId} />

      <section className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface-muted p-4">
          <p className="text-base font-bold text-ink">Desempenho e comissionamento por entidade</p>
          <p className="mt-1 text-xs text-ink-muted">GMV, GMV/hora de live, pedidos, lives e comissão por apresentadora e por marca. Usa o filtro de marca/apresentadora acima.</p>
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
            <p className="mt-1 text-xs text-ink-muted">Franquia + franqueadora. Filtra por marca / apresentadora / mês.</p>
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
    </div>
  )
}
