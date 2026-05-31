import { Clock, MonitorPlay, TrendingUp, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { PeriodControl } from '../components/forms/PeriodControl'
import { MetricCard } from '../components/ui/MetricCard'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Badge, statusTone } from '../components/ui/Badge'
import { ErrorState, LoadingState } from '../components/ui/States'
import { getClienteLives } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, currentPeriod, formatMoney, getRecord } from '../utils/format'
import { metric, moneyMetric } from './page-helpers'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'

const icons = [MonitorPlay, Clock, WalletCards, TrendingUp]

export function ClienteLivesPage() {
  const [period, setPeriod] = useState(currentPeriod())
  const query = useQuery({ queryKey: QK.clienteLives(period), queryFn: () => getClienteLives(period) })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const raw = query.data ?? {}
  const resumo = getRecord(raw.resumo)
  const lives = asArray<JsonRecord>(raw.lives)
  const metrics = [
    metric('Lives', resumo.total_lives ?? lives.length, 'histórico do período', 'neutral'),
    metric('Horas', asNumber(resumo.horas_live).toFixed(1), 'tempo consumido', 'info'),
    moneyMetric('Valor investido', resumo.valor_investido_lives, 'proporcional ao uso', 'brand'),
    metric('ROAS', asNumber(resumo.roas).toFixed(2), 'retorno das lives', 'success'),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cliente parceiro"
        accent="Minhas"
        title="Lives"
        subtitle="Histórico, GMV, ROAS e consumo de horas."
        actions={<PeriodControl period={period} onChange={setPeriod} />}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item, index) => (
          <MetricCard key={item.label} metric={item} icon={icons[index]} />
        ))}
      </section>

      <Card>
        <CardHeader>
          <p className="text-sm font-bold text-ink">Histórico de lives</p>
        </CardHeader>
        <CardBody>
          <DataTable<JsonRecord>
            data={lives}
            columns={[
              { key: 'titulo', header: 'Live', render: (item) => asString(item.titulo ?? item.nome ?? item.id, 'Live') },
              { key: 'data', header: 'Data', render: (item) => asString(item.data ?? item.iniciada_em ?? item.encerrada_em) },
              { key: 'gmv', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv ?? item.fat_gerado) },
              { key: 'pedidos', header: 'Pedidos', align: 'right', render: (item) => asNumber(item.pedidos ?? item.total_orders ?? item.qtd_pedidos).toLocaleString('pt-BR') },
              { key: 'roas', header: 'ROAS', align: 'right', render: (item) => asNumber(item.roas).toFixed(2) },
              { key: 'status', header: 'Status', render: (item) => <Badge tone={statusTone(asString(item.status, ''))}>{asString(item.status)}</Badge> },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  )
}
