import { useMemo, useState } from 'react'
import { CircleDollarSign, Clock, Radio, ShoppingBag, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { MetricCard } from '../ui/MetricCard'
import { LinePanel, BarPanel } from '../charts/Charts'
import { LoadingState, ErrorState, EmptyState } from '../ui/States'
import { getClienteAnalyticsDiario } from '../../services/domain'
import { QK } from '../../services/query-keys'
import { extractErrorMessage } from '../../services/api'
import { asNumber, asString } from '../../utils/format'
import { metric, moneyMetric, sumDailyTotals } from '../../pages/page-helpers'
import type { JsonRecord } from '../../types/models'

type Preset = 'hoje' | '7d' | '30d' | 'mes'
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'mes', label: 'Mês atual' },
]

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function range(preset: Preset): { from: string; to: string } {
  const today = new Date()
  const to = ymd(today)
  const shift = (days: number) => { const d = new Date(today); d.setDate(d.getDate() - days); return ymd(d) }
  if (preset === 'hoje') return { from: to, to }
  if (preset === '7d') return { from: shift(6), to }
  if (preset === '30d') return { from: shift(29), to }
  return { from: `${to.slice(0, 7)}-01`, to }
}
function diaCurto(value: unknown): string {
  const m = asString(value, '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}` : '—'
}

export function ClienteAnalyticsPanel() {
  const [preset, setPreset] = useState<Preset>('30d')
  const { from, to } = range(preset)

  const query = useQuery({
    queryKey: QK.clienteAnalyticsDiario(from, to),
    queryFn: () => getClienteAnalyticsDiario({ from, to }),
    staleTime: 60_000,
  })

  const rows = useMemo(() => (Array.isArray(query.data) ? (query.data as JsonRecord[]) : []), [query.data])
  const totals = useMemo(() => sumDailyTotals(rows), [rows])
  const gmvPoints = useMemo(() => rows.map((r) => ({ label: diaCurto(r.dia), value: asNumber(r.gmv_total) })), [rows])
  const pedidosPoints = useMemo(() => rows.map((r) => ({ label: diaCurto(r.dia), value: asNumber(r.pedidos) })), [rows])
  const horasPoints = useMemo(() => rows.map((r) => ({ label: diaCurto(r.dia), value: Math.round(asNumber(r.horas_live) * 10) / 10 })), [rows])

  const metrics = [
    moneyMetric('GMV atribuído', totals.gmv_total, 'lives publicadas', 'brand'),
    metric('Pedidos', totals.pedidos.toLocaleString('pt-BR'), 'no período', 'success'),
    metric('Lives realizadas', totals.total_lives.toLocaleString('pt-BR'), 'no período', 'neutral'),
    metric('Horas de live', totals.horas_live.toFixed(1), 'no período', 'neutral'),
    moneyMetric('GMV / live', totals.gmv_por_live, 'GMV / lives', 'info'),
    moneyMetric('GMV / hora', totals.gmv_por_hora, 'GMV / horas', 'success'),
  ]
  const icons = [CircleDollarSign, ShoppingBag, Radio, Clock, TrendingUp, TrendingUp]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPreset(p.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${preset === p.key ? 'bg-brand text-white' : 'border border-line text-ink-muted hover:bg-surface-muted hover:text-ink'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <LoadingState label="Carregando analytics" />
      ) : query.isError ? (
        <ErrorState message={extractErrorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="Sem lives publicadas no período" />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((item, i) => <MetricCard key={item.label} metric={item} icon={icons[i]} />)}
          </section>
          <section className="grid gap-4 xl:grid-cols-2">
            <LinePanel title="GMV por dia" data={gmvPoints} />
            <BarPanel title="Pedidos por dia" data={pedidosPoints} />
          </section>
          <BarPanel title="Horas de live por dia" data={horasPoints} />
        </>
      )}
    </div>
  )
}
