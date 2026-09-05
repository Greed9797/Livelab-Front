import { Building2, CircleDollarSign, TrendingUp, Users } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { PeriodControl } from '../components/forms/PeriodControl'
import { BarPanel, LinePanel } from '../components/charts/Charts'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Badge, statusTone } from '../components/ui/Badge'
import { ErrorState, LoadingState } from '../components/ui/States'
import { getMasterDashboard } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, currentPeriod, formatMoney } from '../utils/format'
import { normalizeMaster } from './page-helpers'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'

const icons = [CircleDollarSign, Building2, Users, TrendingUp]

export function MasterDashboardPage() {
  const [period, setPeriod] = useState(currentPeriod())
  const query = useQuery({ queryKey: QK.masterDashboard(period), queryFn: () => getMasterDashboard(period) })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const data = normalizeMaster(query.data ?? {})
  const bioTotal = asNumber(data.bioTotals.total)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel Master"
        subtitle="Rede, unidades, CRM e alertas de operação em uma visão executiva."
        actions={<PeriodControl period={period} onChange={setPeriod} />}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((item, index) => (
          <MetricCard key={item.label} metric={item} icon={icons[index]} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LinePanel title="Evolução da rede" subtitle="GMV e desempenho mensal" data={data.history} />
        <BarPanel title="Crescimento por unidade" data={data.growth} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr_0.9fr]">
        <Card>
          <CardHeader>
            <p className="text-sm font-bold text-ink">Pipeline do CRM</p>
          </CardHeader>
          <CardBody>
            <DataTable<JsonRecord>
              data={data.pipeline}
              columns={[
                { key: 'etapa', header: 'Etapa', render: (item) => asString(item.etapa ?? item.stage ?? item.label) },
                { key: 'quantidade', header: 'Leads', align: 'right', render: (item) => asNumber(item.quantidade ?? item.count ?? item.total).toLocaleString('pt-BR') },
                { key: 'valor', header: 'Valor', align: 'right', render: (item) => formatMoney(item.valor ?? item.value) },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <p className="text-sm font-bold text-ink">Entradas da Bio</p>
              <p className="mt-1 text-xs text-ink-muted">
                {bioTotal.toLocaleString('pt-BR')} leads captados pelo webhook
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {data.bioPorPersona.map((item) => (
              <div key={asString(item.persona ?? item.origem)} className="rounded-2xl border border-line bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{asString(item.label ?? item.persona)}</p>
                  <Badge tone="brand">{asNumber(item.total).toLocaleString('pt-BR')}</Badge>
                </div>
                <p className="mt-2 text-xs font-semibold text-ink-muted">{formatMoney(item.valor)}</p>
              </div>
            ))}
            {!data.bioPorPersona.length ? (
              <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-muted">
                Nenhuma entrada Bio no escopo atual.
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-sm font-bold text-ink">Alertas</p>
          </CardHeader>
          <CardBody>
            <DataTable<JsonRecord>
              data={data.alerts}
              columns={[
                { key: 'tipo', header: 'Tipo', render: (item) => <Badge tone={statusTone(asString(item.tipo ?? item.status, ''))}>{asString(item.tipo ?? item.status)}</Badge> },
                { key: 'titulo', header: 'Descrição', render: (item) => asString(item.titulo ?? item.descricao ?? item.message) },
                { key: 'count', header: 'Qtd.', align: 'right', render: (item) => asNumber(item.count ?? item.total).toLocaleString('pt-BR') },
              ]}
            />
          </CardBody>
        </Card>
      </section>
    </div>
  )
}
