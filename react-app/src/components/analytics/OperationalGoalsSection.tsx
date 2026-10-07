import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, ChevronDown, Gauge, Pencil, Plus, Save, Settings2, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { ErrorState, LoadingState } from '../ui/States'
import { useToast } from '../ui/Toast'
import { extractErrorMessage } from '../../services/api'
import { consolidateOperationalDay, getOperationalGoals, saveOperationalGoals, type OperationalGoalsConfig, type OperationalGoalsPatch } from '../../services/domain'
import { QK } from '../../services/query-keys'
import { useCurrentUser } from '../../stores/auth-store'
import { formatDate, formatMoney } from '../../utils/format'
import { getSaoPauloDateInput } from '../../utils/sao-paulo-date'

type Status = 'dentro_da_meta' | 'abaixo_do_ritmo' | 'abaixo_da_meta' | 'dados_pendentes' | 'nao_iniciado' | 'sem_meta' | 'sem_dados' | 'nao_util' | 'consolidado' | 'em_andamento' | 'sem_permissao'
type LiveDetail = { id: string; dia: string; marca_nome?: string | null; cabine_nome?: string | null; status?: string; gmv: number; horas: number; tempo_incompleto?: boolean }
type GoalEntity = { id: string; nome: string; horas: number; gmv: number; gmv_hora: number | null; meta_horas: number | null; piso: number | null; piso_origem: string; desvio: number | null; status: Status; status_horas: Status | null; lives: LiveDetail[] }
type OperationalData = {
  data: string; ano_mes: string; editavel: boolean; configurado: boolean; configuracao: OperationalGoalsConfig | null; pode_editar: boolean; equipe_ativa: number; dias_uteis: number; estado: Status
  pendencias: { submissoes: number; videos: number; lives_abertas: number; tempos_incompletos: number }
  horas: { realizado: number; meta: number | null; esperado_agora: number | null; faltante: number | null; status: Status }
  gmv: { realizado: number; lives: number; videos: number; meta_diaria: number | null; meta_mensal: number | null; esperado_agora: number | null; faltante_dia: number | null; realizado_mes: number; esperado_mes: number | null; faltante_mes: number | null; necessario_dia: number | null; dias_restantes_equivalentes: number; status: Status }
  produtividade: { realizado: number | null; piso: number | null; necessario: number | null; potencial_mensal_piso: number | null; piso_sustenta_meta: boolean | null }
  capacidade: { horas_apresentadores: number | null; horas_operacao: number; horas_cabines: number | null; horas_cabines_realizadas: number; gmv_hora_operacao_necessario: number | null; cabines_ativas?: number }
  serie: { dia: string; realizado: number; esperado: number | null }[]; apresentadoras: GoalEntity[]; marcas: GoalEntity[]
}

const STATUS_LABEL: Record<Status, string> = {
  dentro_da_meta: 'Dentro da meta', abaixo_do_ritmo: 'Abaixo do ritmo', abaixo_da_meta: 'Abaixo da meta', dados_pendentes: 'Dados pendentes',
  nao_iniciado: 'Ainda não iniciado', sem_meta: 'Meta não definida', sem_dados: 'Sem dados', nao_util: 'Dia não útil', consolidado: 'Consolidado',
  em_andamento: 'Em andamento', sem_permissao: 'Sem permissão',
}
const STATUS_STYLE: Record<Status, string> = {
  dentro_da_meta: 'bg-[var(--success-soft)] text-[var(--success)]', abaixo_do_ritmo: 'bg-[var(--warning-soft)] text-[var(--warning)]', abaixo_da_meta: 'bg-[var(--danger-soft)] text-[var(--danger)]',
  dados_pendentes: 'bg-[var(--warning-soft)] text-[var(--warning)]', nao_iniciado: 'bg-surface-muted text-ink-muted', sem_meta: 'bg-surface-muted text-ink-muted',
  sem_dados: 'bg-surface-muted text-ink-muted', nao_util: 'bg-surface-muted text-ink-muted', consolidado: 'bg-[var(--success-soft)] text-[var(--success)]',
  em_andamento: 'bg-[var(--alt-soft)] text-[var(--alt)]', sem_permissao: 'bg-surface-muted text-ink-muted',
}

function StatusPill({ status }: { status: Status }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
}

function Metric({ label, value, note, status }: { label: string; value: string; note: string; status?: Status }) {
  return (
    <div className="min-w-0 border-t border-line px-4 py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</p>
      <p className="num mt-2 truncate text-[clamp(1.25rem,2.2vw,1.85rem)] font-bold tracking-[-0.035em] text-ink">{value}</p>
      <div className="mt-2 flex min-h-6 flex-wrap items-center gap-2 text-xs text-ink-muted"><span>{note}</span>{status ? <StatusPill status={status} /> : null}</div>
    </div>
  )
}

function dateGroups(lives: LiveDetail[]) {
  const grouped = new Map<string, LiveDetail[]>()
  for (const live of lives) grouped.set(live.dia, [...(grouped.get(live.dia) ?? []), live])
  return [...grouped.entries()].sort(([a], [b]) => b.localeCompare(a))
}

function EntityTable({ title, description, rows, kind }: { title: string; description: string; rows: GoalEntity[]; kind: 'apresentadora' | 'marca' }) {
  return (
    <Card className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
        <div><h3 className="text-base font-bold tracking-tight text-ink">{title}</h3><p className="mt-1 text-sm text-ink-muted">{description}</p></div>
        <span className="text-xs text-ink-muted">{rows.length} {kind === 'marca' ? 'marcas' : 'apresentadoras'}</span>
      </div>
      {rows.length ? <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-surface-muted/45 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted"><tr>
            <th className="px-4 py-3 sm:px-6">{kind === 'marca' ? 'Marca' : 'Apresentadora'}</th><th className="px-3 py-3 text-right">{kind === 'marca' ? 'Cabine-h' : 'Horas'}</th><th className="px-3 py-3 text-right">GMV/h</th><th className="px-3 py-3 text-right">Piso</th><th className="px-4 py-3 text-right sm:px-6">Situação</th>
          </tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const groups = dateGroups(row.lives)
              return <tr key={row.id} className="align-top">
                <td className="px-4 py-3 sm:px-6">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand/60 [&::-webkit-details-marker]:hidden">
                      <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180" />{row.nome}<span className="ml-1 text-xs font-normal text-ink-muted">{row.lives.length} lives · ver por dia</span>
                    </summary>
                    <div className="mt-3 space-y-3 border-l border-line pl-3 sm:pl-6">
                      {groups.length ? groups.map(([dia, lives]) => {
                        const hours = lives.reduce((sum, live) => sum + live.horas, 0)
                        const gmv = lives.reduce((sum, live) => sum + live.gmv, 0)
                        return <div key={dia}>
                          <p className="text-xs font-bold text-ink">{formatDate(dia)} <span className="font-normal text-ink-muted">· {formatMoney(gmv, true)} · {hours.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h · {hours ? `${formatMoney(gmv / hours, true)}/h` : 'GMV/h sem base'}</span></p>
                          <ul className="mt-1 space-y-1">{lives.map((live) => <li key={live.id} className="flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                            <span className="font-semibold text-[var(--text-secondary)]">{live.cabine_nome ? `Cabine ${live.cabine_nome}` : 'Live'}</span>{live.marca_nome ? <span>· {live.marca_nome}</span> : null}<span>· {formatMoney(live.gmv, true)} em {live.horas.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h</span>{live.tempo_incompleto ? <span className="text-[var(--warning)]">Tempo pendente</span> : null}
                          </li>)}</ul>
                        </div>
                      }) : <p className="text-xs text-ink-muted">Nenhuma live registrada no período.</p>}
                    </div>
                  </details>
                </td>
                <td className="num px-3 py-3 text-right text-ink-secondary">{row.horas.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h</td>
                <td className="num px-3 py-3 text-right font-semibold text-ink">{row.gmv_hora === null ? '—' : `${formatMoney(row.gmv_hora, true)}/h`}</td>
                <td className="num px-3 py-3 text-right text-ink-secondary">{row.piso === null ? '—' : `${formatMoney(row.piso, true)}/h`}{row.piso_origem === 'especifico' ? <span className="mt-1 block text-[10px] text-ink-muted">exceção</span> : null}</td>
                <td className="px-4 py-3 text-right sm:px-6"><div className="flex flex-col items-end gap-1.5"><StatusPill status={row.status} />{kind === 'apresentadora' && row.status_horas ? <span className="text-[11px] text-ink-muted">Horas: {STATUS_LABEL[row.status_horas]}</span> : null}</div></td>
              </tr>
            })}
          </tbody>
        </table>
      </div> : <p className="px-4 py-8 text-center text-sm text-ink-muted sm:px-6">Sem registros para este dia.</p>}
    </Card>
  )
}

function moneyString(value: number | null | undefined) {
  return value == null ? '' : value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function parseMoney(value: string) {
  const compact = value.trim().replace(/\s/g, '')
  if (!compact) return Number.NaN
  const decimal = compact.includes(',')
    ? compact.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(?:\.\d{3})+$/.test(compact) ? compact.replace(/\./g, '') : compact
  const parsed = Number(decimal)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN
}

function GoalsEditor({ data, busy, onClose, onSave }: { data: OperationalData; busy: boolean; onClose: () => void; onSave: (patch: OperationalGoalsPatch) => void }) {
  const current = data.configuracao
  const [monthly, setMonthly] = useState(moneyString(data.gmv.meta_mensal))
  const [baseFloor, setBaseFloor] = useState(moneyString(data.produtividade.piso ?? 300))
  const [hours, setHours] = useState(String(current?.horas_por_apresentador ?? 5.5))
  const [cabins, setCabins] = useState(String(current?.cabines_consideradas ?? 6))
  const [shifts, setShifts] = useState(current?.turnos?.length ? current.turnos : [{ inicio: '08:00', fim: '13:30' }, { inicio: '14:00', fim: '19:30' }])
  const [peopleFloors, setPeopleFloors] = useState(() => Object.fromEntries(data.apresentadoras.map((entity) => [entity.id, entity.piso_origem === 'especifico' ? moneyString(entity.piso) : ''])) as Record<string, string>)
  const [brandFloors, setBrandFloors] = useState(() => Object.fromEntries(data.marcas.map((entity) => [entity.id, entity.piso_origem === 'especifico' ? moneyString(entity.piso) : ''])) as Record<string, string>)
  const [error, setError] = useState('')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const target = parseMoney(monthly), floor = parseMoney(baseFloor), perPresenter = Number(hours), cabinsCount = Number(cabins)
    if (![target, floor, perPresenter, cabinsCount].every(Number.isFinite) || target < 0 || floor < 0 || perPresenter <= 0 || perPresenter > 24 || !Number.isInteger(cabinsCount) || cabinsCount < 1 || cabinsCount > 100) {
      setError('Revise os valores. Horas por apresentador devem ficar entre 0 e 24; cabines, entre 1 e 100.')
      return
    }
    if (!shifts.length || shifts.some((shift) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.inicio) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.fim) || shift.fim <= shift.inicio)) {
      setError('Informe horários válidos para cada turno.')
      return
    }
    const normalizedPeople = Object.entries(peopleFloors).map(([id, raw]) => ({ id, meta_gmv_hora: raw.trim() ? parseMoney(raw) : null }))
    const normalizedBrands = Object.entries(brandFloors).map(([id, raw]) => ({ id, meta_gmv_hora: raw.trim() ? parseMoney(raw) : null }))
    if ([...normalizedPeople, ...normalizedBrands].some((row) => row.meta_gmv_hora !== null && !Number.isFinite(row.meta_gmv_hora))) {
      setError('Os pisos específicos devem ser valores numéricos iguais ou maiores que zero.')
      return
    }
    setError('')
    onSave({ ano_mes: data.ano_mes, meta_gmv: target, meta_gmv_hora: floor, configuracao: { horas_por_apresentador: perPresenter, cabines_consideradas: cabinsCount, turnos: shifts }, pisos_apresentadoras: normalizedPeople, pisos_marcas: normalizedBrands })
  }

  return <form onSubmit={submit} className="space-y-6">
    <div className="rounded-xl border border-[var(--border)] bg-surface-muted/40 p-3 text-sm text-ink-muted">Alterar a meta mensal aqui também atualiza a meta da unidade já usada no restante do sistema. A nova configuração recalcula todos os dias deste mês.</div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm font-semibold text-ink">Meta GMV do mês<input required inputMode="decimal" placeholder="Ex.: 600.000,00" value={monthly} onChange={(e) => setMonthly(e.target.value)} className="design-input h-11 w-full px-3" aria-label="Meta GMV do mês" /></label>
      <label className="space-y-2 text-sm font-semibold text-ink">Piso padrão de GMV/h<input required inputMode="decimal" placeholder="Ex.: 300,00" value={baseFloor} onChange={(e) => setBaseFloor(e.target.value)} className="design-input h-11 w-full px-3" aria-label="Piso padrão de GMV por hora" /></label>
      <label className="space-y-2 text-sm font-semibold text-ink">Horas meta por apresentador<input required type="number" min="0.25" max="24" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} className="design-input h-11 w-full px-3" /></label>
      <label className="space-y-2 text-sm font-semibold text-ink">Cabines consideradas<input required type="number" min="1" max="100" step="1" value={cabins} onChange={(e) => setCabins(e.target.value)} className="design-input h-11 w-full px-3" /></label>
    </div>
    <section className="space-y-3">
      <div><h3 className="text-sm font-bold text-ink">Turnos da operação</h3><p className="mt-1 text-xs text-ink-muted">Intervalos sem sobreposição; pausas ficam entre o fim de um turno e o início do próximo.</p></div>
      {shifts.map((shift, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <label className="space-y-1 text-xs font-semibold text-ink-muted">Início do turno {index + 1}<input type="time" value={shift.inicio} onChange={(e) => setShifts((currentShifts) => currentShifts.map((item, i) => i === index ? { ...item, inicio: e.target.value } : item))} className="design-input h-11 w-full px-3" /></label>
        <label className="space-y-1 text-xs font-semibold text-ink-muted">Fim do turno {index + 1}<input type="time" value={shift.fim} onChange={(e) => setShifts((currentShifts) => currentShifts.map((item, i) => i === index ? { ...item, fim: e.target.value } : item))} className="design-input h-11 w-full px-3" /></label>
        <Button type="button" variant="ghost" size="icon" aria-label={`Remover turno ${index + 1}`} disabled={shifts.length <= 1} onClick={() => setShifts((currentShifts) => currentShifts.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
      </div>)}
      <Button type="button" variant="secondary" icon={Plus} onClick={() => setShifts((currentShifts) => currentShifts.length < 8 ? [...currentShifts, { inicio: '20:00', fim: '21:00' }] : currentShifts)} disabled={shifts.length >= 8}>Adicionar turno</Button>
    </section>
    <ExceptionEditor title="Piso por apresentadora" rows={data.apresentadoras} values={peopleFloors} onChange={setPeopleFloors} />
    <ExceptionEditor title="Piso por marca" rows={data.marcas} values={brandFloors} onChange={setBrandFloors} />
    {error ? <p role="alert" className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p> : null}
    <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" icon={Save} isLoading={busy}>Salvar metas operacionais</Button></div>
  </form>
}

function ExceptionEditor({ title, rows, values, onChange }: { title: string; rows: GoalEntity[]; values: Record<string, string>; onChange: (values: Record<string, string>) => void }) {
  return <section className="space-y-3">
    <div><h3 className="text-sm font-bold text-ink">{title}</h3><p className="mt-1 text-xs text-ink-muted">Deixe vazio para herdar o piso padrão.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">{rows.map((row) => <label key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-ink">
      <span className="min-w-0 truncate">{row.nome}</span><span className="flex shrink-0 items-center gap-2"><input aria-label={`${title}: ${row.nome}`} inputMode="decimal" placeholder="Padrão" value={values[row.id] ?? ''} onChange={(e) => onChange({ ...values, [row.id]: e.target.value })} className="design-input h-10 w-28 px-2 text-right" /><span className="text-xs text-ink-muted">/h</span></span>
    </label>)}</div>
  </section>
}

export function OperationalGoalsSection() {
  const user = useCurrentUser()
  const tenantId = user?.tenant_id
  const today = getSaoPauloDateInput(new Date())
  const [day, setDay] = useState(today)
  const [editing, setEditing] = useState(false)
  const [confirmingClose, setConfirmingClose] = useState(false)
  const toast = useToast()
  const client = useQueryClient()
  const query = useQuery({
    queryKey: QK.operationalGoals(day, tenantId), queryFn: () => getOperationalGoals(day), staleTime: 15_000,
    refetchInterval: day === today ? 60_000 : false,
  })
  const data = query.data as OperationalData | undefined
  const save = useMutation({
    mutationFn: saveOperationalGoals,
    onSuccess: async () => {
      toast.push('Metas operacionais atualizadas', 'success')
      setEditing(false)
      await Promise.all([client.invalidateQueries({ queryKey: ['analytics-operacao'] }), client.invalidateQueries({ queryKey: ['meta-unidade'] }), client.invalidateQueries({ queryKey: ['analytics-unidade-mensal'] })])
    },
    onError: (error) => toast.push(extractErrorMessage(error), 'error'),
  })
  const consolidate = useMutation({
    mutationFn: consolidateOperationalDay,
    onSuccess: async () => {
      toast.push('Dia consolidado', 'success')
      setConfirmingClose(false)
      await client.invalidateQueries({ queryKey: ['analytics-operacao'] })
    },
    onError: (error) => toast.push(extractErrorMessage(error), 'error'),
  })
  const accumulatedPercent = data?.gmv.meta_mensal && data.gmv.meta_mensal > 0 ? Math.min(100, (data.gmv.realizado_mes / data.gmv.meta_mensal) * 100) : null
  const dailyProgressPercent = data?.gmv.meta_diaria && data.gmv.meta_diaria > 0 ? Math.min(100, (data.gmv.realizado / data.gmv.meta_diaria) * 100) : null
  const liveRows = useMemo(() => new Set(data?.apresentadoras.flatMap((row) => row.lives.map((live) => live.id)) ?? []).size, [data?.apresentadoras])
  const configuredCabins = data && data.capacidade.horas_operacao > 0 && data.capacidade.horas_cabines != null ? data.capacidade.horas_cabines / data.capacidade.horas_operacao : null

  if (query.isLoading && !data) return <section aria-label="Acompanhamento operacional" className="space-y-3"><LoadingState /></section>
  if (query.isError && !data) return <section aria-label="Acompanhamento operacional"><ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} /></section>
  if (!data) return null

  return <section className="space-y-4" aria-labelledby="operational-goals-title">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
      <div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">Analytics · unidade</p><h2 id="operational-goals-title" className="mt-1 text-xl font-bold tracking-tight text-ink">Acompanhamento operacional</h2><p className="mt-1 text-sm text-ink-muted">Ritmo diário de horas e GMV, produtividade e metas por pessoa e marca.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="operational-date">Dia da operação</label><input id="operational-date" type="date" value={day} max={today} onChange={(event) => setDay(event.target.value)} className="design-input h-[42px] w-44 px-3 [color-scheme:dark]" />
        {data.pode_editar && data.editavel ? <Button variant="secondary" icon={Settings2} onClick={() => setEditing(true)}>Configurar metas</Button> : null}
      </div>
    </div>

    {data.estado === 'dados_pendentes' ? <div className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: 'color-mix(in srgb, var(--warning) 25%, transparent)', background: 'var(--warning-soft)', color: 'var(--warning)' }}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>Há lives abertas, dados incompletos, envios ou vídeos aguardando revisão. O resultado final só aparece após revisar e consolidar o dia.</span></div> : null}
    {data.estado === 'consolidado' ? <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: 'color-mix(in srgb, var(--success) 20%, transparent)', background: 'var(--success-soft)', color: 'var(--success)' }}><Check className="h-4 w-4" />Dia consolidado · números finais deste dia.</div> : null}
    {!data.configurado ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-surface-muted/40 px-4 py-3"><div><p className="font-semibold text-ink">Configure a capacidade da operação</p><p className="mt-1 text-sm text-ink-muted">Defina horas por apresentador, turnos, cabines e piso de GMV/h para habilitar o ritmo e os alertas.</p></div>{data.pode_editar && data.editavel ? <Button icon={Pencil} onClick={() => setEditing(true)}>Configurar</Button> : null}</div> : null}

    <Card className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
      <Metric label="Horas das apresentadoras" value={`${data.horas.realizado.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h`} note={data.horas.meta == null ? 'Meta diária não configurada' : `${data.horas.meta} h/dia · ${data.equipe_ativa} ativas · esperado agora ${data.horas.esperado_agora?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) ?? '—'} h · faltam ${data.horas.faltante?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) ?? '—'} h`} status={data.horas.status} />
      <Metric label="GMV do dia" value={formatMoney(data.gmv.realizado, true)} note={data.gmv.meta_diaria == null ? 'Meta diária não definida' : `Meta ${formatMoney(data.gmv.meta_diaria, true)} · esperado agora ${data.gmv.esperado_agora == null ? '—' : formatMoney(data.gmv.esperado_agora, true)} · faltam ${data.gmv.faltante_dia == null ? '—' : formatMoney(data.gmv.faltante_dia, true)} · ${formatMoney(data.gmv.lives, true)} em lives + ${formatMoney(data.gmv.videos, true)} em vídeos`} status={data.gmv.status} />
      <Metric label="GMV/h de lives" value={data.produtividade.realizado == null ? '—' : `${formatMoney(data.produtividade.realizado, true)}/h`} note={data.produtividade.piso == null ? 'Piso não definido' : `Piso ${formatMoney(data.produtividade.piso, true)}/h · necessário ${data.produtividade.necessario == null ? '—' : `${formatMoney(data.produtividade.necessario, true)}/h`}`} />
      <Metric label="Janela e cabines" value={`${data.capacidade.horas_operacao.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h`} note={`${configuredCabins == null ? 'Cabines não configuradas' : `${configuredCabins.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} cabines consideradas`} · ${data.capacidade.cabines_ativas ?? '—'} ativas · ${data.capacidade.horas_cabines_realizadas.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} cabine-h · ${liveRows} lives`} />
    </Card>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
      <Card className="min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-bold text-ink">Meta mensal no ritmo do mês</h3><p className="mt-1 text-sm text-ink-muted">{data.dias_uteis} dias úteis · {data.ano_mes}</p></div><StatusPill status={data.estado} /></div>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><p className="num text-2xl font-bold tracking-tight text-ink">{formatMoney(data.gmv.realizado_mes, true)} <span className="text-sm font-medium text-ink-muted">de {data.gmv.meta_mensal == null ? 'meta não definida' : formatMoney(data.gmv.meta_mensal, true)}</span></p><span className="text-sm font-semibold text-ink-muted">{accumulatedPercent == null ? '—' : `${accumulatedPercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}</span></div>
        {accumulatedPercent != null ? <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${accumulatedPercent}%` }} /></div> : null}
        <div className="mt-4 grid gap-3 border-t border-line pt-3 sm:grid-cols-3"><div><p className="text-xs text-ink-muted">Esperado até este dia</p><p className="num mt-1 font-semibold text-ink">{data.gmv.esperado_mes == null ? '—' : formatMoney(data.gmv.esperado_mes, true)}</p></div><div><p className="text-xs text-ink-muted">Falta para a meta</p><p className="num mt-1 font-semibold text-ink">{data.gmv.faltante_mes == null ? '—' : formatMoney(data.gmv.faltante_mes, true)}</p></div><div><p className="text-xs text-ink-muted">Necessário por dia útil restante</p><p className="num mt-1 font-semibold text-ink">{data.gmv.necessario_dia == null ? '—' : formatMoney(data.gmv.necessario_dia, true)}</p></div></div>
        {data.gmv.meta_diaria != null ? <div className="mt-4 rounded-lg bg-surface-muted/50 px-3 py-2 text-xs text-ink-muted">Este dia: {dailyProgressPercent == null ? 'meta sem base' : `${dailyProgressPercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% da meta diária`} · GMV necessário somado nas cabines: {data.capacidade.gmv_hora_operacao_necessario == null ? '—' : `${formatMoney(data.capacidade.gmv_hora_operacao_necessario, true)}/h nas ${data.capacidade.horas_operacao} h de operação`} · piso padrão {data.produtividade.potencial_mensal_piso == null ? 'não configurado' : `${formatMoney(data.produtividade.potencial_mensal_piso, true)}/mês`}{data.produtividade.piso_sustenta_meta === false ? ' — o piso não sustenta a meta mensal.' : ''}</div> : null}
      </Card>
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-brand" /><h3 className="font-bold text-ink">Capacidade de live</h3></div>
        <dl className="mt-4 divide-y divide-line text-sm">
          <div className="flex justify-between gap-3 py-2"><dt className="text-ink-muted">Meta de horas do time</dt><dd className="num font-semibold text-ink">{data.horas.meta == null ? '—' : `${data.horas.meta} h`}</dd></div>
          <div className="flex justify-between gap-3 py-2"><dt className="text-ink-muted">GMV/h necessário para a meta diária</dt><dd className="num text-right font-semibold text-ink">{data.produtividade.necessario == null ? '—' : `${formatMoney(data.produtividade.necessario, true)}/h`}</dd></div>
          <div className="flex justify-between gap-3 py-2"><dt className="text-ink-muted">Piso por marca/apresentadora</dt><dd className="num font-semibold text-ink">{data.produtividade.piso == null ? '—' : `${formatMoney(data.produtividade.piso, true)}/h`}</dd></div>
          <div className="flex justify-between gap-3 py-2"><dt className="text-ink-muted">Ocupação prevista das cabines</dt><dd className="num font-semibold text-ink">{data.capacidade.horas_cabines == null ? '—' : `${data.capacidade.horas_cabines} cabine-h`}</dd></div>
        </dl>
      </Card>
    </div>

    <EntityTable title="Apresentadoras" description="GMV/h avaliado individualmente contra seu piso; horas consideram presença, inclusive quando não houve venda." rows={data.apresentadoras} kind="apresentadora" />
    <EntityTable title="Marcas" description="GMV/h de cada marca comparado ao piso específico ou ao piso padrão da unidade." rows={data.marcas} kind="marca" />

    {data.pode_editar && data.editavel && data.estado !== 'consolidado' && data.estado !== 'nao_util' && data.configurado ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
      <p className="text-sm text-ink-muted">Para finalizar: encerre as lives, resolva as pendências e consolide o dia.</p><Button variant="secondary" icon={Check} onClick={() => setConfirmingClose(true)} disabled={data.pendencias.submissoes + data.pendencias.videos + data.pendencias.lives_abertas + data.pendencias.tempos_incompletos > 0}>Consolidar dia</Button>
    </div> : null}
    {query.isFetching ? <p className="text-right text-xs text-ink-muted" role="status">Atualizando dados…</p> : null}

    {editing ? <Modal open title="Metas e capacidade operacional" subtitle={`Configuração de ${data.ano_mes} · fuso de São Paulo`} size="lg" onClose={() => setEditing(false)} closeDisabled={save.isPending}>
      <GoalsEditor key={`${data.data}-${data.gmv.meta_mensal}`} data={data} busy={save.isPending} onClose={() => setEditing(false)} onSave={(patch) => save.mutate(patch)} />
    </Modal> : null}
    {confirmingClose ? <Modal open title="Consolidar resultado do dia" subtitle={`Data da operação: ${formatDate(data.data)}`} onClose={() => setConfirmingClose(false)} closeDisabled={consolidate.isPending}>
      <p className="text-sm leading-6 text-ink-secondary">A consolidação registra que os turnos terminaram, os envios foram revisados e as lives foram conferidas. O mês atual pode ser reavaliado depois; se algum dado voltar a ficar pendente, o painel avisará.</p>
      <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirmingClose(false)}>Voltar</Button><Button icon={Check} isLoading={consolidate.isPending} onClick={() => consolidate.mutate(data.data)}>Confirmar consolidação</Button></div>
    </Modal> : null}
  </section>
}
