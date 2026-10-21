import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { PeriodControl } from '../components/forms/PeriodControl'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States'
import { getClienteConteudoLives, type ClientePortalLive } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { formatDate, formatMoney } from '../utils/format'
import { QK } from '../services/query-keys'
import { useCurrentUser } from '../stores/auth-store'

const PAGE_SIZE = 50
const unknown = (value: number | null, format: (number: number) => string) => value === null ? 'Não informado' : format(value)
function saoPauloPeriod() {
  const values = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: 'numeric' }).formatToParts(new Date())
  return { mes: Number(values.find((part) => part.type === 'month')?.value), ano: Number(values.find((part) => part.type === 'year')?.value) }
}

export function ClienteConteudoPage() {
  const [period, setPeriod] = useState(saoPauloPeriod)
  const [offset, setOffset] = useState(0)
  const user = useCurrentUser()
  const scope = `${user?.tenant_id ?? ''}:${user?.id ?? ''}`
  useEffect(() => setOffset(0), [period.ano, period.mes, scope])
  const query = useQuery({ queryKey: QK.clienteConteudoLives(scope, period, offset), queryFn: () => getClienteConteudoLives(period, offset), enabled: Boolean(user) })
  const data = query.data
  const start = offset + 1
  const end = Math.min(offset + PAGE_SIZE, data?.total ?? 0)

  return <div className="space-y-6">
    <PageHeader title="Lives" subtitle="Histórico de lives encerradas e revisadas." actions={<PeriodControl period={period} onChange={setPeriod} />} />
    {query.isLoading && !data ? <LoadingState label="Carregando lives" /> : null}
    {query.isError && !data ? <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} /> : null}
    {data ? <Card>
      <CardHeader><p className="text-base font-bold text-ink">Lives revisadas</p><p className="mt-0.5 text-xs text-ink-muted">{data.resumo.lives.toLocaleString('pt-BR')} lives · GMV {unknown(data.resumo.gmv, formatMoney)} · {unknown(data.resumo.pedidos, (value) => value.toLocaleString('pt-BR'))} pedidos · {unknown(data.resumo.horas, (value) => `${value.toFixed(1)}h`)}</p></CardHeader>
      <CardBody>{data.lives.length === 0 ? <EmptyState title="Sem lives revisadas no mês" /> : <>
        <DataTable<ClientePortalLive> data={data.lives} columns={[
          { key: 'iniciado_em', header: 'Data', render: (live) => formatDate(live.iniciado_em) },
          { key: 'gmv', header: 'GMV', align: 'right', render: (live) => unknown(live.gmv, formatMoney) },
          { key: 'pedidos', header: 'Pedidos', align: 'right', render: (live) => unknown(live.pedidos, (value) => value.toLocaleString('pt-BR')) },
          { key: 'duracao_min', header: 'Duração', align: 'right', render: (live) => unknown(live.duracao_min, (value) => `${value} min`) },
          { key: 'status_publicacao', header: 'Status', render: (live) => <Badge tone="success">{live.status_publicacao}</Badge> },
        ]} />
        {data.total > PAGE_SIZE ? <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-ink-muted">{start}–{end} de {data.total} lives</p><div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={offset === 0}>Anterior</Button><Button type="button" variant="secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= data.total}>Próxima</Button></div></div> : null}
      </>}</CardBody>
    </Card> : null}
  </div>
}
