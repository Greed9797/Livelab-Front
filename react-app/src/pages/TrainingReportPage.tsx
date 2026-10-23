import axios from 'axios'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { PageHeader } from '../components/ui/PageHeader'
import type { TableColumn } from '../types/models'
import { extractErrorMessage } from '../services/api'
import { QK } from '../services/query-keys'
import { useCurrentUser } from '../stores/auth-store'
import { formatWatchedPercent, getTrainingReport, type TrainingProgressState, type TrainingReportRow } from '../services/training'

const PAGE_SIZE = 25
const STATE_LABEL: Record<TrainingProgressState, string> = { not_started: 'Não iniciado', in_progress: 'Em andamento', completed: 'Concluído' }

function formatCompletedAt(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function TrainingReportPage() {
  const user = useCurrentUser()
  const tenantId = user?.tenant_id
  const canManageTraining = user?.papel === 'franqueador_master'
  const navigate = useNavigate()
  const [userId, setUserId] = useState('')
  const [trailId, setTrailId] = useState('')
  const [page, setPage] = useState(1)
  const params = { user_id: userId || undefined, trail_id: trailId || undefined, page, page_size: PAGE_SIZE }
  const report = useQuery({ queryKey: QK.trainingReport(tenantId, params), queryFn: () => getTrainingReport(params), enabled: Boolean(tenantId) })
  const columns: TableColumn<TrainingReportRow>[] = [
    { key: 'user_name', header: 'Pessoa', render: (row) => <span className="block min-w-40"><span className="block font-semibold">{row.user_name}</span>{row.user_email ? <span className="text-xs text-ink-muted">{row.user_email}</span> : null}</span> },
    { key: 'trail_title', header: 'Trilha' },
    { key: 'lesson_title', header: 'Aula' },
    { key: 'state', header: 'Status', render: (row) => STATE_LABEL[row.state] ?? row.state },
    { key: 'watched_percent', header: 'Assistido', render: (row) => formatWatchedPercent(row.watched_percent) },
    { key: 'completed_at', header: 'Conclusão', render: (row) => <span className="whitespace-nowrap">{formatCompletedAt(row.completed_at)}</span> },
  ]

  if (report.isLoading) return <LoadingState label="Carregando relatório de treinamento" />
  if (report.isError && report.data === undefined && axios.isAxiosError(report.error) && report.error.response?.status === 404) {
    return <Card><CardBody><EmptyState title="Relatório de treinamento aguardando atualização do backend" description="A API de produção ainda não disponibiliza o relatório. Tente novamente após a atualização do servidor." /></CardBody></Card>
  }
  if (report.isError) return <ErrorState message={extractErrorMessage(report.error)} onRetry={() => void report.refetch()} />
  const data = report.data

  return <div className="space-y-6">
    <PageHeader title="Relatório de treinamento" subtitle="Acompanhe o andamento das pessoas nas trilhas e aulas desta unidade." actions={<>
      <Button variant="ghost" onClick={() => navigate('/conhecimento')}>Voltar à Base</Button>
      {canManageTraining ? <Button variant="secondary" onClick={() => navigate('/conhecimento/treinamentos/gerenciar')}>Gerenciar trilhas</Button> : null}
    </>} />
    <Card><CardBody className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-ink">Pessoa<select aria-label="Filtrar por pessoa" className="design-input h-11 px-3" value={userId} onChange={(event) => { setUserId(event.target.value); setPage(1) }}><option value="">Todas as pessoas</option>{data?.users.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold text-ink">Trilha<select aria-label="Filtrar por trilha" className="design-input h-11 px-3" value={trailId} onChange={(event) => { setTrailId(event.target.value); setPage(1) }}><option value="">Todas as trilhas</option>{data?.trails.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      </div>
      <DataTable columns={columns} data={data?.items ?? []} rowKey={(row) => `${row.user_id}-${row.trail_id}-${row.lesson_id}`} stackOnMobile mobileColumnKeys={['user_name', 'state', 'trail_title', 'lesson_title', 'watched_percent', 'completed_at']} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">Página {data?.page ?? page}</p>
        <div className="flex gap-2"><Button variant="secondary" disabled={page <= 1 || report.isFetching} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</Button><Button variant="secondary" disabled={!data?.has_more || report.isFetching} onClick={() => setPage((value) => value + 1)}>Próxima</Button></div>
      </div>
    </CardBody></Card>
  </div>
}
