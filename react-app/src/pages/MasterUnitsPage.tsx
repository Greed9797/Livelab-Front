import { Building2, CircleDollarSign, Store, Users } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { PeriodControl } from '../components/forms/PeriodControl'
import { MetricCard } from '../components/ui/MetricCard'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Badge, statusTone } from '../components/ui/Badge'
import { LinePanel } from '../components/charts/Charts'
import { ErrorState, LoadingState } from '../components/ui/States'
import { getMasterUnits } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, currentPeriod, formatMoney, getRecord } from '../utils/format'
import { historyPoints, metric, moneyMetric } from './page-helpers'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'

const icons = [Store, Users, CircleDollarSign, Building2]

export function MasterUnitsPage({ title = 'Unidades', mode }: { title?: string; mode?: 'franqueados' }) {
  const [period, setPeriod] = useState(currentPeriod())
  const [status, setStatus] = useState('all')
  const query = useQuery({ queryKey: QK.masterUnits(period, status), queryFn: () => getMasterUnits(period, status) })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const raw = query.data ?? {}
  const summary = getRecord(raw.summary)
  const units = asArray<JsonRecord>(raw.units)
  const metrics = [
    metric('Unidades', summary.total_unidades ?? units.length, 'rede listada', 'neutral'),
    metric('Clientes ativos', summary.clientes_ativos ?? summary.active_clients, 'carteira ativa', 'success'),
    moneyMetric('GMV', summary.gmv_total ?? summary.gmv, 'período selecionado', 'brand'),
    metric('Setup', summary.em_setup ?? summary.setup ?? 0, 'em implantação', 'warning'),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === 'franqueados' ? `Rede · ${title}` : title}
        subtitle="Lista operacional das unidades com GMV, clientes, plano e status."
        actions={
          <>
            <select className="design-input h-10 px-3 text-sm font-semibold text-ink" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="setup">Setup</option>
              <option value="inativo">Inativos</option>
            </select>
            <PeriodControl period={period} onChange={setPeriod} />
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item, index) => (
          <MetricCard key={item.label} metric={item} icon={icons[index]} />
        ))}
      </section>

      <Card>
        <CardHeader>
          <p className="text-sm font-bold text-ink">{title}</p>
        </CardHeader>
        <CardBody>
          <DataTable<JsonRecord>
            data={units}
            columns={[
              { key: 'nome', header: 'Unidade', render: (item) => asString(item.nome ?? item.tenant_nome) },
              { key: 'status', header: 'Status', render: (item) => <Badge tone={statusTone(asString(item.status, ''))}>{asString(item.status)}</Badge> },
              { key: 'plano', header: 'Plano', render: (item) => asString(item.plano) },
              { key: 'clientes', header: 'Clientes', align: 'right', render: (item) => asNumber(item.activeClients ?? item.clientes_ativos ?? item.clientes).toLocaleString('pt-BR') },
              { key: 'gmv', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv ?? item.gmv_mes ?? item.gmv_total) },
              { key: 'lives', header: 'Lives', align: 'right', render: (item) => asNumber(item.lives ?? item.total_lives).toLocaleString('pt-BR') },
            ]}
          />
        </CardBody>
      </Card>

      {units[0]?.history ? (
        <LinePanel title="Histórico da primeira unidade" data={historyPoints(units[0].history)} />
      ) : null}
    </div>
  )
}
