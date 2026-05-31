import { CircleDollarSign, Percent, Receipt, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { PeriodControl } from '../components/forms/PeriodControl'
import { MetricCard } from '../components/ui/MetricCard'
import { LinePanel } from '../components/charts/Charts'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { ErrorState, LoadingState } from '../components/ui/States'
import { getMasterConsolidated } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, currentPeriod, formatMoney, formatPercent, getRecord } from '../utils/format'
import { historyPoints, metric, moneyMetric } from './page-helpers'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'

const icons = [CircleDollarSign, Receipt, TrendingUp, Percent]

export function MasterConsolidatedPage() {
  const [period, setPeriod] = useState(currentPeriod())
  const query = useQuery({ queryKey: QK.masterConsolidated(period), queryFn: () => getMasterConsolidated(period) })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const raw = query.data ?? {}
  const overview = getRecord(raw.overview)
  const units = asArray<JsonRecord>(raw.units)
  const metrics = [
    moneyMetric('Receita bruta', overview.receita_bruta ?? overview.gmv_total ?? raw.gmv_total, 'consolidado da rede', 'brand'),
    moneyMetric('Receita líquida', overview.receita_liquida ?? overview.net_revenue, 'após custos principais', 'success'),
    metric('Lives', overview.total_lives ?? raw.total_lives ?? 0, 'volume operacional', 'neutral'),
    metric('Margem', formatPercent(overview.margem ?? overview.margin), 'visão financeira', 'info'),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Master"
        accent="Consolidado"
        title="da rede"
        subtitle="GMV, receita, lives e comparativo por unidade."
        actions={<PeriodControl period={period} onChange={setPeriod} />}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item, index) => (
          <MetricCard key={item.label} metric={item} icon={icons[index]} />
        ))}
      </section>

      <LinePanel title="Evolução consolidada" data={historyPoints(raw.history ?? raw.historico)} secondary />

      <Card>
        <CardHeader>
          <p className="text-sm font-bold text-ink">Comparativo por unidade</p>
        </CardHeader>
        <CardBody>
          <DataTable<JsonRecord>
            data={units}
            columns={[
              { key: 'nome', header: 'Unidade', render: (item) => asString(item.nome ?? item.tenant_nome) },
              { key: 'gmv', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv ?? item.gmv_total) },
              { key: 'receita', header: 'Receita', align: 'right', render: (item) => formatMoney(item.receita ?? item.receita_bruta) },
              { key: 'lives', header: 'Lives', align: 'right', render: (item) => asNumber(item.lives ?? item.total_lives).toLocaleString('pt-BR') },
              { key: 'ticket', header: 'Ticket', align: 'right', render: (item) => formatMoney(item.ticket_medio ?? item.avg_ticket) },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  )
}
