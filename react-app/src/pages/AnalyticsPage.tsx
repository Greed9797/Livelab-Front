import { BarChart3, Clock, CircleDollarSign, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { PeriodControl } from '../components/forms/PeriodControl'
import { MetricCard } from '../components/ui/MetricCard'
import { BarPanel, LinePanel } from '../components/charts/Charts'
import { ErrorState, LoadingState } from '../components/ui/States'
import { getAnalyticsDashboard } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, currentPeriod, formatMoney } from '../utils/format'
import { historyPoints, metric, moneyMetric } from './page-helpers'
import { QK } from '../services/query-keys'

const icons = [CircleDollarSign, TrendingUp, Clock, BarChart3]

export function AnalyticsPage({ embedded = false }: { embedded?: boolean }) {
  const [period, setPeriod] = useState(currentPeriod())
  const query = useQuery({ queryKey: QK.analyticsDashboard(period), queryFn: () => getAnalyticsDashboard({ mes: period.mes, ano: period.ano }) })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const raw = query.data ?? {}
  const metrics = [
    moneyMetric('GMV', raw.gmv_total ?? raw.gmv_mes, 'período selecionado', 'brand'),
    metric('Lives', raw.total_lives ?? raw.lives, 'volume do período', 'neutral'),
    metric('Horas', asNumber(raw.horas_live).toFixed(1), 'tempo no ar', 'info'),
    metric('Ticket médio', formatMoney(raw.ticket_medio), 'por pedido', 'success'),
  ]

  return (
    <div className="space-y-6">
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-bold text-ink">Analytics</p>
          <PeriodControl period={period} onChange={setPeriod} />
        </div>
      ) : (
        <PageHeader
          eyebrow="Analytics"
          accent="Dashboard"
          title="de métricas"
          subtitle="GMV, horas, lives e desempenho por período."
          actions={<PeriodControl period={period} onChange={setPeriod} />}
        />
      )}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item, index) => (
          <MetricCard key={item.label} metric={item} icon={icons[index]} />
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <LinePanel title="GMV mensal" data={historyPoints(raw.historico_gmv ?? raw.gmv_mensal ?? raw.history)} />
        <BarPanel title="Horas de live" data={historyPoints(raw.horas_por_dia ?? raw.horas_live_chart, ['dia', 'label'], ['horas', 'value'])} />
      </section>
    </div>
  )
}
