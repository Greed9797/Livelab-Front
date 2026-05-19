import { Activity, CircleDollarSign, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge, statusTone } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { ErrorState, LoadingState } from '../components/ui/States'
import { getComissoesApresentadoras, getHomeDashboard } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, formatMoney } from '../utils/format'
import { normalizeHome } from './page-helpers'
import type { JsonRecord } from '../types/models'

const icons = [CircleDollarSign, Activity, Activity, Users]

export function DashboardPage() {
  const query = useQuery({ queryKey: ['home-dashboard'], queryFn: getHomeDashboard, refetchInterval: 30_000 })
  const rankingApresentadoras = useQuery({ queryKey: ['comissoes-apresentadoras'], queryFn: () => getComissoesApresentadoras(), refetchInterval: 30_000 })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const data = normalizeHome(query.data ?? {})

  return (
    <div className="space-y-6">
      <PageHeader
        accent="Visão"
        title="da unidade"
        subtitle="Pulso operacional, comercial e financeiro da unidade."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((item, index) => (
          <MetricCard key={item.label} metric={item} icon={icons[index]} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">Operação em tempo real</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {data.occupancy.live} de {data.occupancy.total} cabines em live
                </p>
              </div>
              <Badge tone={data.occupancy.live > 0 ? 'success' : 'neutral'}>{data.occupancy.live > 0 ? 'ao vivo' : 'sem lives ativas'}</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <DataTable<JsonRecord>
              data={data.liveCabines}
              columns={[
                { key: 'numero', header: 'Cabine', render: (item) => `Cabine ${String(item.numero ?? '').padStart(2, '0')}` },
                { key: 'cliente_nome', header: 'Cliente', render: (item) => asString(item.cliente_nome) },
                { key: 'viewer_count', header: 'Viewers', align: 'right', render: (item) => asNumber(item.viewer_count).toLocaleString('pt-BR') },
                { key: 'gmv_atual', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv_atual) },
              ]}
            />
          </CardBody>
        </Card>

        <div className="space-y-4">
          {data.alerts.map((alert) => (
            <Card key={alert.label}>
              <CardBody className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-ink">{alert.label}</p>
                  <p className="mt-1 text-xs text-ink-muted">{alert.hint}</p>
                </div>
                <span className="text-2xl font-bold text-ink">{alert.value}</span>
              </CardBody>
            </Card>
          ))}
        </div>
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
                { key: 'hora', header: 'Horário', render: (item) => asString(item.hora ?? item.hora_inicio) },
                { key: 'cliente_nome', header: 'Cliente', render: (item) => asString(item.cliente_nome) },
                { key: 'cabine_numero', header: 'Cabine', render: (item) => `Cabine ${asString(item.cabine_numero ?? item.numero)}` },
                { key: 'status', header: 'Status', render: (item) => <Badge tone={statusTone(asString(item.status, ''))}>{asString(item.status)}</Badge> },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-sm font-bold text-ink">Ranking comercial</p>
          </CardHeader>
          <CardBody>
            <DataTable<JsonRecord>
              data={data.ranking}
              columns={[
                { key: 'nome', header: 'Cliente', render: (item) => asString(item.nome ?? item.cliente_nome ?? item.tenant_nome) },
                { key: 'gmv', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv ?? item.valor) },
                { key: 'lives', header: 'Lives', align: 'right', render: (item) => asNumber(item.lives ?? item.total_lives).toLocaleString('pt-BR') },
              ]}
            />
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-1">
        <Card>
          <CardHeader>
            <p className="text-sm font-bold text-ink">Ranking de apresentadoras</p>
          </CardHeader>
          <CardBody>
            <DataTable<JsonRecord>
              data={rankingApresentadoras.data ?? []}
              columns={[
                { key: 'nome', header: 'Apresentadora', render: (item) => asString(item.nome) },
                { key: 'gmv', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv) },
                { key: 'comissao_apresentadora', header: 'Comissão', align: 'right', render: (item) => formatMoney(item.comissao_apresentadora) },
              ]}
            />
          </CardBody>
        </Card>
      </section>
    </div>
  )
}
