import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Target } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { MoneyInput } from '../ui/MoneyInput'
import { ErrorState, LoadingState } from '../ui/States'
import { getAnalyticsUnidadeMensal, upsertMetaUnidade } from '../../services/domain'
import { extractErrorMessage } from '../../services/api'
import { QK } from '../../services/query-keys'
import { asNumber, formatMoney, periodLabel } from '../../utils/format'
import { formatBRLWithoutSymbol, parseBRMoneyToDecimal } from '../../utils/money'
import { useCurrentUser } from '../../stores/auth-store'
import { useToast } from '../ui/Toast'
import type { JsonRecord } from '../../types/models'

const MAX_GOAL_VALUE = 9_999_999_999_999.99

/**
 * Keeps the same PT-BR number forms accepted by the server, but rejects
 * malformed separators before the shared money parser could coerce them to 0.
 * `null` means an intentionally empty field; `undefined` means invalid input.
 */
export function parseOptionalGoalValue(value: string): number | null | undefined {
  const compact = value.trim().replace(/\s/g, '')
  if (!compact) return null
  const validBrazilianDecimal = /^(?:(?:0|[1-9]\d{0,12})|(?:[1-9]\d{0,2}(?:\.\d{3})+))(?:,\d{1,2})?$/
  const validDotDecimal = /^(?:0|[1-9]\d{0,12})\.\d{1,2}$/
  if (!(validBrazilianDecimal.test(compact) || validDotDecimal.test(compact))) return undefined
  const parsed = parseBRMoneyToDecimal(compact)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_GOAL_VALUE ? parsed : undefined
}

type GoalMetricProps = {
  label: string
  actual: number
  goal: number | null
  actualLabel: string
  projection?: number | null
  projectionLabel?: string
  noData?: boolean
  monthStarted: boolean
}

export function monthToPeriod(mes: string) {
  const [ano, mesNumero] = mes.split('-').map(Number)
  return periodLabel({ ano, mes: mesNumero })
}

export function goalProgress(value: number, goal: number | null): number | null {
  if (goal === null || goal <= 0) return null
  return Math.max(0, Math.min(100, (value / goal) * 100))
}

export function goalPaceLabel(value: number, goal: number | null, monthStarted = true): string {
  if (goal === null) return 'Meta não definida'
  if (!monthStarted) return 'Mês ainda não iniciado'
  if (goal === 0 || value >= goal) return 'Dentro da meta'
  return 'Abaixo da meta'
}

function GoalMetric({ label, actual, goal, actualLabel, projection, projectionLabel, noData = false, monthStarted }: GoalMetricProps) {
  const reference = projection ?? actual
  const progress = noData ? null : goalProgress(reference, goal)
  const detail = noData
    ? 'Sem dados de horas para calcular'
    : goal === null ? '' : goalPaceLabel(reference, goal, monthStarted)

  return (
    <div className="rounded-[var(--radius-control)] border border-line bg-surface-muted/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</p>
      <p className="num mt-2 text-2xl font-bold tracking-[-0.02em] text-ink">{actualLabel}</p>
      {projection !== undefined && projection !== null ? <p className="mt-1 text-xs text-ink-muted">{projectionLabel}</p> : null}
      {goal !== null ? <p className="num mt-3 text-sm font-semibold text-ink">Meta {label === 'Horas em live' ? `${goal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h` : `${formatMoney(goal, true)}/h`}</p> : <p className="mt-3 text-sm text-ink-muted">Meta não definida</p>}
      {progress !== null ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-[var(--alt)]" style={{ width: `${progress}%` }} /></div> : null}
      {detail ? <p className="mt-2 text-xs text-ink-muted">{detail}{goal !== null && goal > 0 && monthStarted && !noData ? ` · ${Math.round((reference / goal) * 100)}% da meta` : ''}</p> : null}
    </div>
  )
}

function GoalsModal({ open, mes, data, busy, onClose, onSave }: {
  open: boolean
  mes: string
  data?: JsonRecord
  busy: boolean
  onClose: () => void
  onSave: (payload: { meta_horas_live: number | null; meta_gmv_hora: number | null }) => void
}) {
  const [hours, setHours] = useState('')
  const [gmvPerHour, setGmvPerHour] = useState('')
  const [validationError, setValidationError] = useState('')
  const initializedMonthRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open) {
      initializedMonthRef.current = null
      return
    }
    // Uma atualização da query não pode substituir o que o operador já está
    // digitando. Inicializa somente ao abrir, depois que os dados chegam.
    if (!data || initializedMonthRef.current === mes) return
    const configuredHours = data?.horas_live ?? data?.meta_horas_live
    const configuredGmvHour = data?.gmv_por_hora ?? data?.meta_gmv_hora
    setHours(configuredHours == null ? '' : asNumber(configuredHours).toLocaleString('pt-BR', { maximumFractionDigits: 2 }))
    setGmvPerHour(configuredGmvHour == null ? '' : formatBRLWithoutSymbol(configuredGmvHour))
    setValidationError('')
    initializedMonthRef.current = mes
  }, [data, mes, open])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const parsedHours = parseOptionalGoalValue(hours)
    const parsedGmvHour = parseOptionalGoalValue(gmvPerHour)
    if (parsedHours === undefined || parsedGmvHour === undefined) {
      setValidationError('Informe valores numéricos válidos ou deixe o campo vazio.')
      return
    }
    onSave({
      meta_horas_live: parsedHours,
      meta_gmv_hora: parsedGmvHour,
    })
  }

  return (
    <Modal
      open={open}
      title="Metas operacionais da unidade"
      subtitle={`${monthToPeriod(mes)} · estas metas valem para a unidade inteira.`}
      onClose={onClose}
      closeDisabled={busy}
      footer={<><Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" form="unit-goals-form" isLoading={busy}>Salvar metas</Button></>}
    >
      <form id="unit-goals-form" className="space-y-5" onSubmit={submit}>
        <p className="text-sm leading-6 text-ink-muted">Defina somente o que será acompanhado neste mês. Campos vazios ficam sem meta e não recebem classificação automática.</p>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Meta de horas em live</span>
          <input aria-label="Meta de horas em live" className="design-input mt-2 h-11 w-full px-3 text-sm" inputMode="decimal" placeholder="Ex.: 1.100" value={hours} onChange={(event) => setHours(event.target.value)} disabled={busy} />
          <span className="mt-1 block text-xs text-ink-muted">A projeção usa o ritmo dos dias corridos do mês.</span>
        </label>
        {validationError ? <p role="alert" className="text-sm text-danger">{validationError}</p> : null}
        <label className="block">
          <span className="text-sm font-semibold text-ink">Meta de GMV por hora</span>
          <MoneyInput aria-label="Meta de GMV por hora" className="design-input mt-2 h-11 w-full px-3 text-sm" placeholder="Ex.: 550,00" value={gmvPerHour} onChange={(value) => setGmvPerHour(value)} disabled={busy} />
          <span className="mt-1 block text-xs text-ink-muted">É comparada ao GMV total dividido pelas horas totais da unidade.</span>
        </label>
      </form>
    </Modal>
  )
}

export function MonthlyUnitGoals({ mes }: { mes: string }) {
  const toast = useToast()
  const client = useQueryClient()
  const user = useCurrentUser()
  const canEdit = user?.papel === 'franqueado' || user?.papel === 'gerente'
  const [editing, setEditing] = useState(false)
  const query = useQuery({
    queryKey: QK.analyticsUnidadeMensal(mes, user?.tenant_id ?? ''),
    queryFn: () => getAnalyticsUnidadeMensal(mes),
    enabled: canEdit && Boolean(user?.tenant_id),
    staleTime: 60_000,
  })
  const mutation = useMutation({
    mutationFn: (payload: { meta_horas_live: number | null; meta_gmv_hora: number | null }) => upsertMetaUnidade(mes, payload),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: QK.analyticsUnidadeMensal(mes, user?.tenant_id ?? '') }),
        client.invalidateQueries({ queryKey: QK.metaUnidade(mes) }),
      ])
      setEditing(false)
    },
    onError: (error: unknown) => toast.push(extractErrorMessage(error), 'error'),
  })
  const data = query.data
  const realized = useMemo(() => (data?.realizado && typeof data.realizado === 'object' ? data.realizado as JsonRecord : {}), [data])
  const projection = useMemo(() => (data?.projecao && typeof data.projecao === 'object' ? data.projecao as JsonRecord : null), [data])
  const metas = useMemo(() => (data?.metas && typeof data.metas === 'object' ? data.metas as JsonRecord : data ?? {}), [data])
  const hours = asNumber(realized.horas_live)
  const gmvPerHour = asNumber(realized.gmv_por_hora)
  const hoursGoal = (metas.horas_live ?? metas.meta_horas_live) == null ? null : asNumber(metas.horas_live ?? metas.meta_horas_live)
  const gmvPerHourGoal = (metas.gmv_por_hora ?? metas.meta_gmv_hora) == null ? null : asNumber(metas.gmv_por_hora ?? metas.meta_gmv_hora)
  const projectedHours = projection ? asNumber(projection.horas_live) : null
  const days = data?.periodo && typeof data.periodo === 'object' ? data.periodo as JsonRecord : data?.dias && typeof data.dias === 'object' ? data.dias as JsonRecord : null
  const elapsedDays = asNumber(days?.dias_decorridos ?? days?.decorridos)
  const totalDays = asNumber(days?.dias_no_mes ?? days?.no_mes)
  const monthStarted = elapsedDays > 0
  const projectionContext = projection
    ? `Projeção de horas baseada em ${elapsedDays} de ${totalDays} dias corridos.`
    : elapsedDays === 0
      ? 'Mês ainda não iniciado.'
      : elapsedDays >= totalDays
        ? 'Mês encerrado.'
        : null

  if (!canEdit) return null
  return (
    <section aria-label="Metas operacionais da unidade">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex gap-3"><Target className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" /><div><p className="text-base font-bold text-ink">Metas operacionais da unidade</p><p className="mt-1 text-xs leading-5 text-ink-muted">{monthToPeriod(mes)} · unidade inteira · lives encerradas.</p></div></div>
            <Button type="button" variant="secondary" icon={Pencil} onClick={() => setEditing(true)} disabled={query.isLoading || query.isError}>Editar metas</Button>
          </div>
        </CardHeader>
        <CardBody>
          {query.isLoading ? <LoadingState label="Carregando metas da unidade…" /> : null}
          {query.isError ? <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} /> : null}
          {data && !query.isError ? <><div className="grid gap-3 md:grid-cols-2"><GoalMetric label="Horas em live" actual={hours} goal={hoursGoal} actualLabel={`${hours.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h realizadas`} projection={projectedHours} projectionLabel={projectedHours === null ? undefined : `Projeção: ${projectedHours.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h`} monthStarted={monthStarted} /><GoalMetric label="GMV por hora" actual={gmvPerHour} goal={gmvPerHourGoal} actualLabel={hours > 0 ? `${formatMoney(gmvPerHour, true)}/h` : 'Sem dados'} noData={hours <= 0} monthStarted={monthStarted} /></div>{projectionContext ? <p className="mt-3 text-xs text-ink-muted">{projectionContext}</p> : null}</> : null}
        </CardBody>
      </Card>
      <GoalsModal open={editing} mes={mes} data={metas} busy={mutation.isPending} onClose={() => setEditing(false)} onSave={(payload) => mutation.mutate(payload)} />
    </section>
  )
}
