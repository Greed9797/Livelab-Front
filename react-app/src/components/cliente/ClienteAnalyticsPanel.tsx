import { useMemo } from 'react'
import { CircleDollarSign, Clock, Radio, ShoppingBag, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { MetricCard } from '../ui/MetricCard'
import { LinePanel, BarPanel } from '../charts/Charts'
import { LoadingState, ErrorState, EmptyState } from '../ui/States'
import { getClienteAnalyticsDiario } from '../../services/domain'
import { QK } from '../../services/query-keys'
import { extractErrorMessage } from '../../services/api'
import { asString, formatMoney } from '../../utils/format'
import { metric } from '../../pages/page-helpers'
import type { Period } from '../../types/models'

function range(period: Period): { from: string; to: string } {
  const month = String(period.mes).padStart(2, '0')
  const lastDay = new Date(Date.UTC(period.ano, period.mes, 0)).getUTCDate()
  return { from: `${period.ano}-${month}-01`, to: `${period.ano}-${month}-${String(lastDay).padStart(2, '0')}` }
}
function diaCurto(value: unknown): string {
  const m = asString(value, '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}` : '—'
}

export function ClienteAnalyticsPanel({ scope, period }: { scope: string; period: Period }) {
  const { from, to } = range(period)

  const query = useQuery({
    queryKey: QK.clienteAnalyticsDiario(scope, from, to),
    queryFn: () => getClienteAnalyticsDiario({ from, to }),
    staleTime: 60_000,
  })

  const rows = useMemo(() => query.data ?? [], [query.data])
  const totals = useMemo(() => rows.reduce((total, row) => ({
    gmv: total.gmv === null || row.gmv_total === null ? null : total.gmv + row.gmv_total,
    pedidos: total.pedidos === null || row.pedidos === null ? null : total.pedidos + row.pedidos,
    horas: total.horas === null || row.horas_live === null ? null : total.horas + row.horas_live,
    lives: total.lives + row.total_lives,
  }), { gmv: 0 as number | null, pedidos: 0 as number | null, horas: 0 as number | null, lives: 0 }), [rows])
  const gmvPoints = useMemo(() => rows.filter((r) => r.gmv_total !== null).map((r) => ({ label: diaCurto(r.dia), value: r.gmv_total as number })), [rows])
  const pedidosPoints = useMemo(() => rows.filter((r) => r.pedidos !== null).map((r) => ({ label: diaCurto(r.dia), value: r.pedidos as number })), [rows])
  const horasPoints = useMemo(() => rows.filter((r) => r.horas_live !== null).map((r) => ({ label: diaCurto(r.dia), value: Math.round((r.horas_live as number) * 10) / 10 })), [rows])

  const metrics = [
    metric('GMV', totals.gmv === null ? 'Não informado' : formatMoney(totals.gmv), 'lives revisadas', 'brand'),
    metric('Pedidos', totals.pedidos === null ? 'Não informado' : totals.pedidos.toLocaleString('pt-BR'), 'no período', 'success'),
    metric('Lives revisadas', totals.lives.toLocaleString('pt-BR'), 'no período', 'neutral'),
    metric('Horas de live', totals.horas === null ? 'Não informado' : `${totals.horas.toFixed(1)}h`, 'no período', 'neutral'),
    metric('GMV / live', totals.gmv === null || totals.lives === 0 ? 'Não informado' : formatMoney(totals.gmv / totals.lives), 'média do período', 'info'),
    metric('GMV / hora', totals.gmv === null || totals.horas === null || totals.horas === 0 ? 'Não informado' : formatMoney(totals.gmv / totals.horas), 'média do período', 'success'),
  ]
  const icons = [CircleDollarSign, ShoppingBag, Radio, Clock, TrendingUp, TrendingUp]

  return (
    <div className="space-y-4">
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
            {gmvPoints.length > 0 ? <LinePanel title="GMV por dia" data={gmvPoints} /> : null}
            {pedidosPoints.length > 0 ? <BarPanel title="Pedidos por dia" data={pedidosPoints} /> : null}
          </section>
          {horasPoints.length > 0 ? <BarPanel title="Horas de live por dia" data={horasPoints} /> : null}
        </>
      )}
    </div>
  )
}
