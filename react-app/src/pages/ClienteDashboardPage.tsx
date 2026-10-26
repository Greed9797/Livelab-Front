import { CircleDollarSign, Clock, MonitorPlay, ShoppingBag, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { PeriodControl } from '../components/forms/PeriodControl'
import { MetricCard } from '../components/ui/MetricCard'
import { AreaPanel } from '../components/charts/Charts'
import { ErrorState, LoadingState, EmptyState } from '../components/ui/States'
import { ClienteAnalyticsPanel } from '../components/cliente/ClienteAnalyticsPanel'
import { getClienteHome } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { formatMoney } from '../utils/format'
import { metric } from './page-helpers'
import { QK } from '../services/query-keys'
import { useCurrentUser } from '../stores/auth-store'

function metricValue(value: number | null | undefined, formatter: (value: number) => string): string {
  return value === null || value === undefined ? 'Não informado' : formatter(value)
}

function saoPauloPeriod() {
  const values = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: 'numeric' }).formatToParts(new Date())
  return { mes: Number(values.find((part) => part.type === 'month')?.value), ano: Number(values.find((part) => part.type === 'year')?.value) }
}

export function ClienteDashboardPage() {
  const [period, setPeriod] = useState(saoPauloPeriod)
  const user = useCurrentUser()
  const scope = `${user?.tenant_id ?? ''}:${user?.id ?? ''}`
  const query = useQuery({ queryKey: QK.clienteHome(scope, period), queryFn: () => getClienteHome(period), enabled: Boolean(user) })
  if (query.isLoading) return <LoadingState />
  if (query.isError && !query.data) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
  if (!query.data) return null

  const data = query.data
  const metrics = [
    metric('GMV do mês', metricValue(data.gmv_mes, formatMoney), 'lives revisadas', 'brand'),
    metric('Lives revisadas', data.lives_mes.toLocaleString('pt-BR'), 'no mês', 'neutral'),
    metric('Horas de live', metricValue(data.horas_live_mes, (value) => `${value.toFixed(1)}h`), 'no mês', 'neutral'),
    metric('Pedidos', metricValue(data.pedidos, (value) => value.toLocaleString('pt-BR')), 'no mês', 'success'),
    metric('GMV / live', metricValue(data.gmv_por_live, formatMoney), 'média do período', 'info'),
    metric('GMV / hora', metricValue(data.gmv_por_hora, formatMoney), 'média do período', 'success'),
  ]
  const icons = [CircleDollarSign, MonitorPlay, Clock, ShoppingBag, TrendingUp, TrendingUp]
  const series = data.series_mensais.filter((row) => row.gmv !== null).map((row) => ({ label: row.mes, value: row.gmv as number, secondary: row.lives }))

  return <div className="space-y-6">
    <PageHeader title="Resultados" subtitle={`Resultados revisados da ${data.marca.nome}.`} actions={<PeriodControl period={period} onChange={setPeriod} />} />
    {data.lives_mes === 0 ? <EmptyState title="Sem lives revisadas neste período" /> : null}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map((item, index) => <MetricCard key={item.label} metric={item} icon={icons[index]} />)}</section>
    {series.length > 0 ? <AreaPanel title="Evolução mensal de GMV" data={series} /> : null}
    <ClienteAnalyticsPanel scope={scope} period={period} />
  </div>
}
