import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardPlus, Pencil, Send, Trash2, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { respondPresenterArchive, cancelPresenterSubmission, createPresenterSubmission, getPresenterPortalLives, getPresenterPortalOptions, resubmitPresenterSubmission, updatePresenterSubmission, type PresenterPortalOptions, type PresenterSubmission, type PresenterSubmissionPayload } from '../services/presenter-portal'
import { QK } from '../services/query-keys'
import { useCurrentUser } from '../stores/auth-store'
import { extractErrorMessage } from '../services/api'
import { formatDate, formatMoney } from '../utils/format'
import { currentMonth, isoFromLocalDateTime, localDateTimeValue, submissionHasOfficialLiveTombstone, submissionStatusLabel, submissionStatusTone } from '../utils/presenter-portal'
import { useToast } from '../components/ui/Toast'
import { DataTable } from '../components/ui/DataTable'
import { parsePresenterCount, parsePresenterMoney } from '../utils/presenter-input'
import { getSaoPauloDateInput } from '../utils/sao-paulo-date'

type FormState = { marcaId: string; cabineId: string; dia: string; horaInicio: string; horaFim: string; observacao: string; gmv: string; pedidos: string; liveImpressions: string; manualViews: string }
const blankForm = (): FormState => ({ marcaId: '', cabineId: '', dia: '', horaInicio: '', horaFim: '', observacao: '', gmv: '', pedidos: '', liveImpressions: '', manualViews: '' })
const MAX_DECLARED_COUNT = 2_147_483_647

export function presenterFormErrors(form: FormState, now = new Date()): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {}
  if (!form.marcaId) errors.marcaId = 'Selecione a marca.'
  const inicio = isoFromLocalDateTime(`${form.dia}T${form.horaInicio}`)
  const fim = isoFromLocalDateTime(`${form.dia}T${form.horaFim}`)
  if (!form.dia || form.dia.slice(0, 7) !== currentMonth(now) || form.dia > getSaoPauloDateInput(now)) errors.dia = 'Informe um dia deste mês, até hoje (horário de Brasília).'
  if (!inicio) errors.horaInicio = 'Informe um horário de início válido.'
  if (!fim || new Date(fim) <= new Date(inicio) || new Date(fim) > now) errors.horaFim = 'O fim deve ser depois do início e não pode estar no futuro.'
  const money = parsePresenterMoney(form.gmv)
  if (!money.ok) errors.gmv = money.error
  for (const key of ['pedidos', 'liveImpressions', 'manualViews'] as const) {
    const count = parsePresenterCount(form[key], key === 'liveImpressions' ? Number.MAX_SAFE_INTEGER : MAX_DECLARED_COUNT)
    if (!count.ok) errors[key] = count.error
  }
  return errors
}

function formFromSubmission(item?: PresenterSubmission): FormState {
  if (!item) return blankForm()
  const inicio = localDateTimeValue(item.iniciado_em)
  const fim = localDateTimeValue(item.encerrado_em)
  return { ...blankForm(), marcaId: item.marca_id ?? '', cabineId: item.cabine_id ?? '', dia: inicio.slice(0, 10), horaInicio: inicio.slice(11, 16), horaFim: fim.slice(11, 16), observacao: item.observacao ?? '', gmv: item.gmv_declarado?.toString() ?? '', pedidos: item.pedidos_declarados?.toString() ?? '', liveImpressions: item.live_impressions_declaradas?.toString() ?? '', manualViews: item.manual_views_declaradas?.toString() ?? '' }
}

export function payloadFromForm(form: FormState): PresenterSubmissionPayload | null {
  const gmv = parsePresenterMoney(form.gmv)
  const pedidos = parsePresenterCount(form.pedidos, MAX_DECLARED_COUNT)
  const liveImpressions = parsePresenterCount(form.liveImpressions, Number.MAX_SAFE_INTEGER)
  const manualViews = parsePresenterCount(form.manualViews, MAX_DECLARED_COUNT)
  if (!form.marcaId || !form.dia || !form.horaInicio || !form.horaFim || !gmv.ok || !pedidos.ok || !liveImpressions.ok || !manualViews.ok) return null
  const inicio = isoFromLocalDateTime(`${form.dia}T${form.horaInicio}`); const fim = isoFromLocalDateTime(`${form.dia}T${form.horaFim}`)
  if (!inicio || !fim || new Date(fim) <= new Date(inicio)) return null
  return { marca_id: form.marcaId, cabine_id: form.cabineId || undefined, iniciado_em: inicio, encerrado_em: fim, observacao: form.observacao.trim() || undefined, gmv_declarado: gmv.value, pedidos_declarados: pedidos.value, live_impressions_declaradas: liveImpressions.value, manual_views_declaradas: manualViews.value }
}

function SubmissionModal({ item, options, optionsLoading, optionsError, errorMessage, onClose, onSave, busy }: { item: PresenterSubmission | null; options?: PresenterPortalOptions; optionsLoading: boolean; optionsError: unknown; errorMessage?: string; onClose: () => void; onSave: (payload: PresenterSubmissionPayload) => void; busy: boolean }) {
  const [form, setForm] = useState(() => formFromSubmission(item ?? undefined))
  const [error, setError] = useState(errorMessage ?? '')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const formRef = useRef<HTMLDivElement>(null)
  const fieldProps = (key: keyof FormState) => ({ 'data-field': key, 'aria-invalid': Boolean(fieldErrors[key]), 'aria-describedby': fieldErrors[key] ? `submission-error-${key}` : undefined })
  const fieldError = (key: keyof FormState) => fieldErrors[key] ? <small id={`submission-error-${key}`} className="text-[var(--danger)]">{fieldErrors[key]}</small> : null
  useEffect(() => { if (errorMessage) setError(errorMessage) }, [errorMessage])
  const requestId = useRef(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
  const set = (key: keyof FormState, value: string) => setForm((old) => ({ ...old, [key]: value }))
  const unavailable = optionsLoading || Boolean(optionsError) || !options
  const month = currentMonth()
  const maxDate = getSaoPauloDateInput()
  const minDate = `${month}-01`
  return <Modal open title={item ? 'Corrigir envio' : 'Registrar live concluída'} subtitle="Obrigatórios: marca, data, horários, impressões, visualizações, GMV e pedidos." onClose={onClose} closeDisabled={busy} footer={<div className="flex w-full flex-wrap justify-end gap-2"><Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button><Button icon={Send} isLoading={busy} disabled={unavailable} onClick={() => { const errors = presenterFormErrors(form); setFieldErrors(errors); const firstError = Object.keys(errors)[0]; if (firstError) formRef.current?.querySelector<HTMLElement>(`[data-field="${firstError}"]`)?.focus(); const payload = firstError ? null : payloadFromForm(form); if (!payload) { setError('Preencha os campos obrigatórios. Use somente números válidos; zero é permitido. A live deve terminar depois do início, no mesmo dia deste mês.'); return }; onSave({ ...payload, request_id: item ? undefined : requestId.current }) }}>{item ? 'Salvar correção' : 'Enviar para revisão'}</Button></div>}>
    <div ref={formRef} className="grid min-w-0 gap-3 p-1 sm:grid-cols-2 [&_input]:min-w-0 [&_input]:w-full [&_input]:text-base [&_select]:min-w-0 [&_select]:w-full [&_select]:text-base [&_textarea]:text-base">
      <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">Marca<select className="design-input h-11 px-3" {...fieldProps('marcaId')} value={form.marcaId} onChange={(e) => set('marcaId', e.target.value)} disabled={unavailable} required><option value="">{optionsLoading ? 'Carregando marcas…' : optionsError ? 'Não foi possível carregar marcas' : 'Selecione a marca'}</option>{options?.marcas.map((marca) => <option key={marca.id} value={marca.id}>{marca.nome}</option>)}</select>{fieldError('marcaId')}</label>
      {optionsError ? <p role="alert" className="text-sm text-[var(--danger)] sm:col-span-2">{extractErrorMessage(optionsError)}</p> : null}
      {options && options.marcas.length === 0 ? <p role="alert" className="text-sm text-[var(--warning)] sm:col-span-2">Nenhuma marca ativa na unidade.</p> : null}
      <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">Dia<input aria-label="Dia da live" className="design-input h-11 px-3" type="date" min={minDate} max={maxDate} {...fieldProps('dia')} value={form.dia} onChange={(e) => set('dia', e.target.value)} required />{fieldError('dia')}</label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">Hora de início<input aria-label="Hora de início" className="design-input h-11 px-3" type="time" {...fieldProps('horaInicio')} value={form.horaInicio} onChange={(e) => set('horaInicio', e.target.value)} required />{fieldError('horaInicio')}</label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">Hora de fim<input aria-label="Hora de fim" className="design-input h-11 px-3" type="time" {...fieldProps('horaFim')} value={form.horaFim} onChange={(e) => set('horaFim', e.target.value)} required />{fieldError('horaFim')}</label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">GMV declarado<input aria-label="GMV declarado" className="design-input h-11 px-3" inputMode="decimal" placeholder="Ex.: 1.234,56" {...fieldProps('gmv')} value={form.gmv} onChange={(e) => set('gmv', e.target.value)} required />{fieldError('gmv')}</label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">Pedidos<input aria-label="Pedidos declarados" className="design-input h-11 px-3" inputMode="numeric" {...fieldProps('pedidos')} value={form.pedidos} onChange={(e) => set('pedidos', e.target.value)} required />{fieldError('pedidos')}</label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">Impressões<input aria-label="Impressões da live" className="design-input h-11 px-3" inputMode="numeric" {...fieldProps('liveImpressions')} value={form.liveImpressions} onChange={(e) => set('liveImpressions', e.target.value)} required />{fieldError('liveImpressions')}</label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">Visualizações<input aria-label="Visualizações" className="design-input h-11 px-3" inputMode="numeric" {...fieldProps('manualViews')} value={form.manualViews} onChange={(e) => set('manualViews', e.target.value)} required />{fieldError('manualViews')}</label>
      <details className="rounded-xl border border-line p-3 text-sm text-ink-muted sm:col-span-2">
        <summary className="min-h-11 cursor-pointer font-semibold text-ink">Informações adicionais (opcional)</summary>
        {options?.cabines.length ? <label className="mt-3 grid gap-1.5 font-semibold text-ink">Cabine<select className="design-input h-11 px-3" value={form.cabineId} onChange={(e) => set('cabineId', e.target.value)}><option value="">Não informada</option>{options.cabines.map((cabine) => <option key={cabine.id} value={cabine.id}>{cabine.nome || `Cabine ${cabine.numero ?? ''}`}</option>)}</select></label> : null}
        <label className="mt-3 grid gap-1.5 font-semibold text-ink">Observação<textarea className="design-input min-h-24 p-3" value={form.observacao} onChange={(e) => set('observacao', e.target.value)} maxLength={2000} /></label>
      </details>
      {error ? <p role="alert" className="text-sm text-[var(--danger)] sm:col-span-2">{error}</p> : null}
    </div>
  </Modal>
}

function TablePager({ page, total, onChange }: { page: number; total: number; onChange: (next: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / 10))
  if (pages <= 1) return null
  return <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3 text-sm text-ink-muted"><span>Página {page + 1} de {pages}</span><Button size="icon" variant="secondary" aria-label="Página anterior" disabled={page === 0} onClick={() => onChange(page - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="secondary" aria-label="Próxima página" disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}><ChevronRight className="h-4 w-4" /></Button></div>
}

export function PresenterPortalLivesPage() {
  const user = useCurrentUser(); const client = useQueryClient(); const toast = useToast(); const [mes, setMes] = useState(currentMonth); const [editing, setEditing] = useState<PresenterSubmission | null | undefined>(undefined); const [cancelling, setCancelling] = useState<PresenterSubmission | null>(null); const [officialPage, setOfficialPage] = useState(0); const [submissionPage, setSubmissionPage] = useState(0)
  const [archiveResponse, setArchiveResponse] = useState<{ item: PresenterSubmission; acao: 'confirmar' | 'contestar' } | null>(null)
  const [archiveReason, setArchiveReason] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const query = useQuery({ queryKey: QK.presenterPortalLives(user?.tenant_id ?? '', user?.id ?? '', mes), queryFn: () => getPresenterPortalLives(mes), enabled: Boolean(user?.id && user?.tenant_id), staleTime: 0, refetchOnWindowFocus: true, refetchInterval: 30_000, refetchIntervalInBackground: false })
  const options = useQuery({ queryKey: ['presenter-portal-options', user?.tenant_id ?? '', user?.id ?? ''], queryFn: getPresenterPortalOptions, enabled: Boolean(user?.id && user?.tenant_id && editing !== undefined) })
  const invalidate = () => { void client.invalidateQueries({ queryKey: ['presenter-portal-home'] }); return client.invalidateQueries({ queryKey: ['presenter-portal-lives'] }) }
  const save = useMutation({ mutationFn: ({ item, payload }: { item?: PresenterSubmission | null; payload: PresenterSubmissionPayload }) => item ? updatePresenterSubmission(item.id, payload) : createPresenterSubmission(payload), onSuccess: (_data, variables) => { void invalidate(); setEditing(undefined); toast.push(variables.item ? 'Correção salva. Reenvie quando estiver pronta.' : 'Live enviada para revisão.', 'success') }, onError: (error) => toast.push(extractErrorMessage(error), 'error') })
  const resend = useMutation({ mutationFn: resubmitPresenterSubmission, onSuccess: () => { void invalidate(); toast.push('Envio reenviado para revisão.', 'success') }, onError: (error) => toast.push(extractErrorMessage(error), 'error') })
  const cancel = useMutation({ mutationFn: cancelPresenterSubmission, onSuccess: () => { void invalidate(); setCancelling(null); toast.push('Envio cancelado.', 'success') }, onError: (error) => toast.push(extractErrorMessage(error), 'error') })
  const respondArchive = useMutation({ mutationFn: () => respondPresenterArchive(archiveResponse!.item.id, { acao: archiveResponse!.acao, versao_esperada: archiveResponse!.item.versao!, ...(archiveResponse!.acao === 'contestar' ? { motivo: archiveReason.trim() } : {}) }), onSuccess: (_data) => { void invalidate(); setArchiveResponse(null); setSubmissionPage(0); toast.push('Resposta registrada. O histórico do envio foi preservado.', 'success') }, onError: error => toast.push(extractErrorMessage(error), 'error') })
  useEffect(() => { setOfficialPage(0); setSubmissionPage(0) }, [mes])
  if (query.isLoading) return <LoadingState label="Carregando suas lives" />
  if (query.isError || !query.data) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
  const canRegisterCurrentMonth = mes === currentMonth()
  const visibleSubmissions = query.data.submissoes.filter(item => showArchived || item.arquivamento_status !== 'confirmado')
  return <div className="space-y-6"><PageHeader title="Minhas lives" subtitle="Envios entram nas métricas como pendentes; comissão só após validação." actions={<><label className="grid gap-1 text-xs font-semibold text-ink-muted">Mês<input aria-label="Mês das minhas lives" className="design-input h-10 px-3 text-sm" type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></label><Button icon={ClipboardPlus} disabled={!canRegisterCurrentMonth} title={canRegisterCurrentMonth ? undefined : 'O cadastro é permitido somente no mês atual'} onClick={() => setEditing(null)}>Registrar live</Button></>} />
    <Card><CardHeader><h2 className="text-lg font-bold text-ink">Lives concluídas</h2><p className="mt-1 text-sm text-ink-muted">Registros validados e declarações pendentes, identificados abaixo.</p></CardHeader><CardBody className="p-0">{query.data.items.length === 0 ? <EmptyState title="Nenhuma live concluída no período" /> : <><DataTable data={query.data.items.slice(officialPage * 10, officialPage * 10 + 10)} rowKey={(item) => item.id} columns={[{ key: 'marca', header: 'Marca e data', render: (item) => <div><p className="font-semibold text-ink">{item.marca_nome ?? 'Marca não informada'}</p>{item.pendente_aprovacao ? <Badge tone="warning">{item.em_conciliacao ? 'Pendente aprovação · conferir vínculo' : 'Pendente aprovação'}</Badge> : null}<p className="text-xs text-ink-muted">{formatDate(item.iniciado_em)} · {item.cabine_nome ?? 'Cabine não informada'}</p></div> }, { key: 'gmv', header: 'GMV', align: 'right', render: (item) => <span className="num font-bold">{formatMoney(item.gmv, true)}</span> }, { key: 'resultado', header: 'Resultado', align: 'right', render: (item) => <span className="text-ink-muted">{item.horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h · {item.pedidos} pedidos</span> }]} /><TablePager page={officialPage} total={query.data.items.length} onChange={setOfficialPage} /></>}</CardBody></Card>
    <Card><CardHeader><h2 className="text-lg font-bold text-ink">Meus envios</h2><p className="mt-1 text-sm text-ink-muted">Acompanhe a revisão e corrija somente envios devolvidos.</p><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={showArchived} onChange={e => { setShowArchived(e.target.checked); setSubmissionPage(0) }} />Mostrar arquivados</label></CardHeader><CardBody className="p-0">{visibleSubmissions.length === 0 ? <EmptyState title="Nenhum envio no período" description="Registre uma live concluída para iniciar a revisão." /> : <><DataTable data={visibleSubmissions.slice(submissionPage * 10, submissionPage * 10 + 10)} rowKey={(item) => item.id} columns={[{ key: 'envio', header: 'Envio', render: (item) => <div><p className="font-semibold text-ink">{item.marca_nome ?? item.marca_descricao ?? 'Marca'}</p><p className="text-xs text-ink-muted">{formatDate(item.iniciado_em)}{item.motivo_devolucao ? ` · ${item.motivo_devolucao}` : ''}</p></div> }, { key: 'status', header: 'Status', render: (item) => <div className="flex flex-wrap gap-1.5"><Badge tone={submissionStatusTone(item.status)}>{item.arquivamento_status === 'confirmado' ? 'Arquivado' : item.arquivamento_status === 'solicitado' ? 'Aguardando sua resposta' : submissionStatusLabel(item.status)}</Badge>{submissionHasOfficialLiveTombstone(item) ? <Badge tone="neutral">Live excluída pelo gestor</Badge> : null}</div> }, { key: 'acoes', header: 'Ações', align: 'right', render: (item) => item.arquivamento_status === 'solicitado' ? <div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={() => { respondArchive.reset(); setArchiveReason(''); setArchiveResponse({ item, acao: 'confirmar' }) }}>Confirmar arquivamento</Button><Button onClick={() => { respondArchive.reset(); setArchiveReason(''); setArchiveResponse({ item, acao: 'contestar' }) }}>Contestar devolução</Button></div> : item.status === 'devolvida' ? <div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" icon={Pencil} onClick={() => setEditing(item)}>Corrigir</Button><Button icon={Send} isLoading={resend.isPending} onClick={() => resend.mutate(item.id)}>Reenviar</Button><Button variant="ghost" icon={Trash2} onClick={() => setCancelling(item)}>Cancelar envio</Button></div> : item.status === 'aprovada' ? <CheckCircle2 className="h-5 w-5 text-[var(--success)]" aria-label="Aprovada" /> : item.status === 'cancelada' ? <XCircle className="h-5 w-5 text-ink-muted" aria-label="Cancelada" /> : null }]} /><TablePager page={submissionPage} total={visibleSubmissions.length} onChange={setSubmissionPage} /></>}</CardBody></Card>
    {editing !== undefined ? <SubmissionModal item={editing} options={options.data} optionsLoading={options.isLoading} optionsError={options.error} errorMessage={save.error ? ((save.error as { response?: { data?: { error?: string } } }).response?.data?.error ?? extractErrorMessage(save.error)) : undefined} busy={save.isPending} onClose={() => setEditing(undefined)} onSave={(payload) => save.mutate({ item: editing, payload })} /> : null}
    <Modal open={Boolean(cancelling)} title="Cancelar envio" subtitle="Este envio será cancelado e não poderá mais ser editado ou reenviado." onClose={() => setCancelling(null)} closeDisabled={cancel.isPending} footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" disabled={cancel.isPending} onClick={() => setCancelling(null)}>Voltar</Button><Button variant="danger" isLoading={cancel.isPending} onClick={() => { if (cancelling) cancel.mutate(cancelling.id) }}>Cancelar envio</Button></div>}>{cancel.isError ? <p role="alert" className="text-sm text-[var(--danger)]">{extractErrorMessage(cancel.error)}</p> : <p className="text-sm text-ink-muted">Use esta ação apenas quando não pretende corrigir o envio devolvido.</p>}</Modal>
    <Modal open={Boolean(archiveResponse)} title={archiveResponse?.acao === 'contestar' ? 'Contestar devolução' : 'Confirmar arquivamento'} onClose={() => setArchiveResponse(null)} closeDisabled={respondArchive.isPending} footer={<Button isLoading={respondArchive.isPending} disabled={archiveResponse?.item.versao == null || (archiveResponse?.acao === 'contestar' && !archiveReason.trim())} onClick={() => respondArchive.mutate()}>{archiveResponse?.acao === 'contestar' ? 'Enviar contestação' : 'Confirmar arquivamento'}</Button>}><p className="text-sm text-ink-muted">Motivo da gestão: {archiveResponse?.item.motivo_devolucao}</p>{archiveResponse?.acao === 'contestar' ? <label className="mt-3 grid gap-2 text-sm">Motivo da contestação<textarea aria-label="Motivo da contestação" className="design-input min-h-28 w-full p-3 text-base" maxLength={1000} value={archiveReason} onChange={e => setArchiveReason(e.target.value)} /></label> : <p className="mt-3 text-sm text-ink-muted">O envio sairá da lista atual e continuará disponível em Mostrar arquivados. Esta confirmação não cria nem exclui uma live oficial.</p>}{respondArchive.isError ? <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{extractErrorMessage(respondArchive.error)}</p> : null}</Modal>
  </div>
}
export default PresenterPortalLivesPage
