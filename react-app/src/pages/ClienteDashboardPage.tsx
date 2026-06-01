import { Clock, CircleDollarSign, MonitorPlay, Target, TrendingUp, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { PeriodControl } from '../components/forms/PeriodControl'
import { MetricCard } from '../components/ui/MetricCard'
import { AreaPanel, BarPanel } from '../components/charts/Charts'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Badge, statusTone } from '../components/ui/Badge'
import { ErrorState, LoadingState } from '../components/ui/States'
import { getClienteDashboard } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, currentPeriod, formatMoney } from '../utils/format'
import { historyPoints, normalizeCliente } from './page-helpers'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'

const icons = [CircleDollarSign, WalletCards, MonitorPlay, TrendingUp, Clock, Target]

function officialLiveGmv(item: JsonRecord) {
  return item.gmv ?? item.ads_gmv ?? item.manual_gmv ?? item.fat_gerado
}

export function ClienteDashboardPage() {
  const [period, setPeriod] = useState(currentPeriod())
  const query = useQuery({ queryKey: QK.clienteDashboard(period), queryFn: () => getClienteDashboard(period), refetchInterval: 30_000 })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const data = normalizeCliente(query.data ?? {})
  const liveAtiva = Object.keys(data.liveAtiva).length > 0 ? data.liveAtiva : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cliente parceiro"
        accent="Dashboard"
        title="da loja"
        subtitle="GMV, ROAS, investimento e consumo de lives por período."
        actions={<PeriodControl period={period} onChange={setPeriod} />}
      />

      {liveAtiva ? (
        <Card className="brand-soft-panel border-brand/30">
          <CardBody className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge tone="success">ao vivo</Badge>
              <p className="mt-3 text-xl font-bold text-ink">Cabine {asString(liveAtiva.cabine_numero ?? liveAtiva.numero)}</p>
              <p className="mt-1 text-sm text-ink-muted">{asString(liveAtiva.titulo ?? liveAtiva.cliente_nome, 'Live em andamento')}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-card)]">
                <p className="text-xs text-ink-muted">GMV</p>
                <p className="font-bold text-ink">{formatMoney(liveAtiva.gmv_atual ?? liveAtiva.gmv)}</p>
              </div>
              <div className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-card)]">
                <p className="text-xs text-ink-muted">Viewers</p>
                <p className="font-bold text-ink">{asNumber(liveAtiva.viewer_count).toLocaleString('pt-BR')}</p>
              </div>
              <div className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-card)]">
                <p className="text-xs text-ink-muted">Pedidos</p>
                <p className="font-bold text-ink">{asNumber(liveAtiva.pedidos ?? liveAtiva.total_orders).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.metrics.map((item, index) => (
          <MetricCard key={item.label} metric={item} icon={icons[index]} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <AreaPanel title="Evolução mensal" data={data.history} />
        <BarPanel title="Melhores horários de venda" data={historyPoints(data.topHorarios, ['hora', 'label'], ['gmv', 'valor', 'total'])} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-sm font-bold text-ink">Próximas lives</p>
          </CardHeader>
          <CardBody>
            <DataTable<JsonRecord>
              data={data.upcoming}
              columns={[
                { key: 'data', header: 'Data', render: (item) => asString(item.data ?? item.data_solicitada) },
                { key: 'hora', header: 'Hora', render: (item) => asString(item.hora ?? item.hora_inicio) },
                { key: 'cabine', header: 'Cabine', render: (item) => `Cabine ${asString(item.cabine_numero ?? item.numero)}` },
                { key: 'status', header: 'Status', render: (item) => <Badge tone={statusTone(asString(item.status, ''))}>{asString(item.status)}</Badge> },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-sm font-bold text-ink">Lives detalhadas</p>
          </CardHeader>
          <CardBody>
            <DataTable<JsonRecord>
              data={data.lives}
              columns={[
                { key: 'data', header: 'Data', render: (item) => asString(item.data ?? item.iniciado_em ?? item.iniciada_em) },
                { key: 'gmv', header: 'GMV', align: 'right', render: (item) => formatMoney(officialLiveGmv(item)) },
                { key: 'roas', header: 'ROAS', align: 'right', render: (item) => asNumber(item.roas).toFixed(2) },
                { key: 'status', header: 'Status', render: (item) => <Badge tone={statusTone(asString(item.status, ''))}>{asString(item.status)}</Badge> },
              ]}
            />
          </CardBody>
        </Card>
      </section>
    </div>
  )
}
