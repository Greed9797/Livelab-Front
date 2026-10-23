import { Plus, Search } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/States'
import { Modal } from '../components/ui/Modal'
import { MoneyInput } from '../components/ui/MoneyInput'
import { LeadDrawer } from '../components/crm/LeadDrawer'
import { LeadKanban } from '../components/crm/LeadKanban'
import { addLeadContato, addLeadTarefa, createLead, deleteLead, ganharLead, getLead, getLeads, updateLead } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asString } from '../utils/format'
import { formatBRLWithoutSymbol, parseBRMoneyToDecimal } from '../utils/money'
import { CRM_STAGES, leadTitle, moveLeadToStage, normalizeCrmStage, type CrmStageKey } from '../utils/crm'
import { QK } from '../services/query-keys'
import { useCurrentUser } from '../stores/auth-store'
import { canWriteLeads } from '../utils/access'
import type { JsonRecord, Lead, User } from '../types/models'

export { groupLeadsByStage, moveLeadToStage, normalizeCrmStage } from '../utils/crm'

const emptyLeadForm = {
  nome: '',
  nicho: '',
  origem: 'Cliente',
  cidade: '',
  estado: '',
  valor_oportunidade: '',
  responsavel_nome: '',
  crm_etapa: 'lead_novo',
  contato_email: '',
  contato_whatsapp: '',
  observacoes_internas: '',
  motivo_perda: '',
}

export function CrmPage() {
  const user = useCurrentUser()
  return <CrmWorkspace key={`${user?.tenant_id}:${user?.id}`} user={user} />
}

function CrmWorkspace({ user }: { user: User | null }) {
  const canEdit = canWriteLeads(user)
  const [search, setSearch] = useState('')
  const [activityFilter, setActivityFilter] = useState('todos')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'detail' | null>(null)
  const [editingId, setEditingId] = useState('')
  const [selectedLead, setSelectedLead] = useState<JsonRecord | null>(null)
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [leadForm, setLeadForm] = useState(emptyLeadForm)
  const [action, setAction] = useState<{ kind: 'contact' | 'task' | 'lost' | 'delete' | 'win'; lead: JsonRecord } | null>(null)
  const [actionText, setActionText] = useState('')
  const client = useQueryClient()
  const leadsKey = [...QK.leads, user?.tenant_id, user?.id] as const
  const detailKey = [...QK.leadById(selectedLeadId), user?.tenant_id, user?.id] as const
  const leadsQuery = useQuery({ queryKey: leadsKey, queryFn: getLeads, enabled: Boolean(user?.tenant_id) })
  const leadDetailQuery = useQuery({
    queryKey: detailKey,
    queryFn: () => getLead(selectedLeadId),
    enabled: modalMode === 'detail' && Boolean(selectedLeadId),
  })

  const invalidateCrm = () => {
    void client.invalidateQueries({ queryKey: QK.leads })
    void client.invalidateQueries({ queryKey: QK.crmSummary })
    if (selectedLeadId) void client.invalidateQueries({ queryKey: QK.leadById(selectedLeadId) })
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingId('')
    setSelectedLead(null)
    setSelectedLeadId('')
    setLeadForm(emptyLeadForm)
    setAction(null)
    setActionText('')
  }

  const saveMutation = useMutation({
    mutationFn: (payload: JsonRecord) => editingId ? updateLead(editingId, payload) : createLead(payload),
    onSuccess: () => {
      closeModal()
      invalidateCrm()
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateLead(id, payload),
    onMutate: async ({ id, payload }) => {
      await client.cancelQueries({ queryKey: leadsKey })
      const previous = client.getQueryData<Lead[]>(leadsKey)
      client.setQueryData<Lead[]>(leadsKey, (current = []) => moveLeadToStage(current as unknown as JsonRecord[], id, payload.crm_etapa as CrmStageKey) as unknown as Lead[])
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) client.setQueryData(leadsKey, context.previous)
    },
    onSettled: () => client.invalidateQueries({ queryKey: leadsKey }),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      closeModal()
      invalidateCrm()
    },
  })
  const contatoMutation = useMutation({
    mutationFn: ({ id, resumo }: { id: string; resumo: string }) => addLeadContato(id, { tipo: 'whatsapp', resumo }),
    onSuccess: () => { setAction(null); invalidateCrm() },
  })
  const tarefaMutation = useMutation({
    mutationFn: ({ id, titulo }: { id: string; titulo: string }) => addLeadTarefa(id, { titulo, concluida: false }),
    onSuccess: () => { setAction(null); invalidateCrm() },
  })
  const ganharMutation = useMutation({
    mutationFn: (id: string) => ganharLead(id),
    onSuccess: () => {
      closeModal()
      invalidateCrm()
      void client.invalidateQueries({ queryKey: QK.clientes() })
      void client.invalidateQueries({ queryKey: QK.cadastros() })
    },
  })
  const perderMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) => updateLead(id, { crm_etapa: 'perdido', ...(motivo ? { motivo_perda: motivo } : {}) }),
    onSuccess: () => {
      closeModal()
      invalidateCrm()
    },
  })

  const leads = useMemo(() => (leadsQuery.data ?? []).map((lead) => ({
    ...lead,
    crm_etapa: normalizeCrmStage(lead as unknown as JsonRecord),
  })), [leadsQuery.data])

  const visibleLeads = useMemo(() => {
    const query = search.trim().toLowerCase()
    return leads.filter((lead) => {
      const record = lead as Lead & JsonRecord
      const text = `${record.nome ?? ''} ${record.nome_cliente ?? ''} ${record.cliente_nome ?? ''} ${record.origem ?? ''} ${record.nicho ?? ''} ${record.crm_etapa ?? ''} ${record.responsavel_nome ?? ''}`.toLowerCase()
      const tarefas = asArray<JsonRecord>(record.tarefas)
      const stale = record.atualizado_em ? Date.now() - new Date(asString(record.atualizado_em, '')).getTime() > 7 * 24 * 60 * 60 * 1000 : false
      const matchesActivity =
        activityFilter === 'todos' ||
        (activityFilter === 'parados' && stale) ||
        (activityFilter === 'com_tarefa' && tarefas.length > 0) ||
        (activityFilter === 'sem_tarefa' && tarefas.length === 0)
      return matchesActivity && text.includes(query)
    })
  }, [activityFilter, leads, search])

  if (leadsQuery.isLoading) return <LoadingState />
  if (leadsQuery.isError && !leadsQuery.data) return <ErrorState message={extractErrorMessage(leadsQuery.error)} onRetry={() => void leadsQuery.refetch()} />

  function setLeadField(key: keyof typeof emptyLeadForm, value: string) {
    setLeadForm((current) => ({ ...current, [key]: value }))
  }

  function fillForm(lead: JsonRecord) {
    setLeadForm({
      nome: leadTitle(lead) === 'Lead' ? '' : leadTitle(lead),
      nicho: asString(lead.nicho, ''),
      origem: asString(lead.origem, 'Cliente'),
      cidade: asString(lead.cidade, ''),
      estado: asString(lead.estado, ''),
      valor_oportunidade: formatBRLWithoutSymbol(lead.valor_oportunidade ?? lead.valor_estimado ?? 0),
      responsavel_nome: asString(lead.responsavel_nome, ''),
      crm_etapa: normalizeCrmStage(lead),
      contato_email: asString(lead.contato_email, ''),
      contato_whatsapp: asString(lead.contato_whatsapp, ''),
      observacoes_internas: asString(lead.observacoes_internas, ''),
      motivo_perda: asString(lead.motivo_perda, ''),
    })
  }

  function openCreateForm() {
    if (!canEdit) return
    saveMutation.reset()
    setEditingId('')
    setSelectedLead(null)
    setLeadForm(emptyLeadForm)
    setModalMode('create')
  }

  function openDetail(lead: JsonRecord) {
    setSelectedLead(lead)
    setSelectedLeadId(asString(lead.id, ''))
    setModalMode('detail')
  }

  function openEditForm(lead: JsonRecord) {
    if (!canEdit) return
    saveMutation.reset()
    setSelectedLead(lead)
    setEditingId(asString(lead.id, ''))
    fillForm(lead)
    setModalMode('edit')
  }

  function onLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEdit || saveMutation.isPending) return
    saveMutation.mutate({
      nome: leadForm.nome,
      nicho: leadForm.nicho || undefined,
      origem: leadForm.origem || undefined,
      cidade: leadForm.cidade || undefined,
      estado: leadForm.estado || undefined,
      valor_oportunidade: parseBRMoneyToDecimal(leadForm.valor_oportunidade),
      responsavel_nome: leadForm.responsavel_nome || undefined,
      crm_etapa: leadForm.crm_etapa,
      contato_email: leadForm.contato_email || undefined,
      contato_whatsapp: leadForm.contato_whatsapp || undefined,
      observacoes_internas: leadForm.observacoes_internas || undefined,
      motivo_perda: leadForm.motivo_perda || undefined,
    })
  }

  function moveLead(id: string, stage: CrmStageKey) {
    if (!canEdit || updateMutation.isPending) return
    const currentLead = leads.find((lead) => asString(lead.id, '') === id) as JsonRecord | undefined
    if (!currentLead || normalizeCrmStage(currentLead) === stage) return
    if (stage === 'perdido') { openAction('lost', currentLead); return }
    updateMutation.mutate({ id, payload: { crm_etapa: stage } })
  }

  function openAction(kind: NonNullable<typeof action>['kind'], lead: JsonRecord) {
    if (!canEdit) return
    contatoMutation.reset()
    tarefaMutation.reset()
    perderMutation.reset()
    deleteMutation.reset()
    ganharMutation.reset()
    setActionText('')
    setAction({ kind, lead })
  }

  function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!action || !canEdit || actionPending) return
    const id = asString(action.lead.id, '')
    const text = actionText.trim()
    if (action.kind === 'contact' && text) contatoMutation.mutate({ id, resumo: text })
    if (action.kind === 'task' && text) tarefaMutation.mutate({ id, titulo: text })
    if (action.kind === 'lost' && text) perderMutation.mutate({ id, motivo: text })
    if (action.kind === 'delete') deleteMutation.mutate(id)
    if (action.kind === 'win') ganharMutation.mutate(id)
  }

  const mutationError = updateMutation.error
  const actionPending = contatoMutation.isPending || tarefaMutation.isPending || perderMutation.isPending || deleteMutation.isPending || ganharMutation.isPending
  const actionError = contatoMutation.error ?? tarefaMutation.error ?? perderMutation.error ?? deleteMutation.error ?? ganharMutation.error
  const actionTitle = action?.kind === 'contact' ? 'Registrar contato' : action?.kind === 'task' ? 'Criar tarefa' : action?.kind === 'lost' ? 'Marcar lead como perdido' : action?.kind === 'delete' ? 'Excluir lead' : 'Converter em cliente'
  const actionLabel = action?.kind === 'contact' ? 'Resumo do contato' : action?.kind === 'task' ? 'Título da tarefa' : 'Motivo da perda'
  const drawerLead = (leadDetailQuery.data as unknown as JsonRecord | undefined) ?? selectedLead

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Oportunidades</h2>
          <p className="mt-1 text-sm text-ink-muted">Acompanhe leads, contatos e próximas ações da sua unidade.</p>
        </div>
        {canEdit ? <Button icon={Plus} onClick={openCreateForm}>Novo lead</Button> : null}
      </div>

      {leadsQuery.isError ? <ErrorState message={extractErrorMessage(leadsQuery.error)} onRetry={() => void leadsQuery.refetch()} /> : null}

      <Card>
        <CardBody className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="design-input flex h-11 min-w-0 flex-1 items-center gap-2 px-3">
            <Search className="h-4 w-4 shrink-0 text-ink-muted" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted"
              placeholder="Buscar lead, responsável, origem ou etapa"
              aria-label="Buscar leads"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select aria-label="Filtrar atividade" className="design-input h-11 min-w-48 px-3 text-sm" value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}>
            <option value="todos">Todos</option>
            <option value="parados">Parados</option>
            <option value="com_tarefa">Com tarefa</option>
            <option value="sem_tarefa">Sem tarefa</option>
          </select>
        </CardBody>
      </Card>

      <LeadKanban
        leads={visibleLeads as unknown as JsonRecord[]}
        onOpenLead={openDetail}
        onMoveLead={moveLead}
        canMove={canEdit && !updateMutation.isPending && !actionPending}
      />

      {mutationError ? (
        <p role="alert" className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
          {extractErrorMessage(mutationError)}
        </p>
      ) : null}

      <Modal
        open={modalMode === 'create' || modalMode === 'edit'}
        title={modalMode === 'edit' ? 'Editar lead' : 'Novo lead'}
        subtitle="Campos básicos do pipeline comercial."
        onClose={closeModal}
        closeDisabled={saveMutation.isPending}
        size="lg"
      >
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" id="lead-form" onSubmit={onLeadSubmit}>
          <label className="block xl:col-span-2">
            <span className="text-sm font-semibold text-ink">Nome da marca/lead</span>
            <input className="design-input mt-2 h-11 w-full px-4" value={leadForm.nome} onChange={(event) => setLeadField('nome', event.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Origem</span>
            <input className="design-input mt-2 h-11 w-full px-4" value={leadForm.origem} onChange={(event) => setLeadField('origem', event.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Nicho</span>
            <input className="design-input mt-2 h-11 w-full px-4" value={leadForm.nicho} onChange={(event) => setLeadField('nicho', event.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Cidade</span>
            <input className="design-input mt-2 h-11 w-full px-4" value={leadForm.cidade} onChange={(event) => setLeadField('cidade', event.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">UF</span>
            <input className="design-input mt-2 h-11 w-full px-4" value={leadForm.estado} onChange={(event) => setLeadField('estado', event.target.value)} maxLength={2} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Valor oportunidade</span>
            <MoneyInput className="design-input mt-2 h-11 w-full px-4" value={leadForm.valor_oportunidade} onChange={(raw) => setLeadField('valor_oportunidade', raw)} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Etapa</span>
            <select className="design-input mt-2 h-11 w-full px-4" value={leadForm.crm_etapa} onChange={(event) => setLeadField('crm_etapa', event.target.value)}>
              {CRM_STAGES.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">WhatsApp</span>
            <input className="design-input mt-2 h-11 w-full px-4" value={leadForm.contato_whatsapp} onChange={(event) => setLeadField('contato_whatsapp', event.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">E-mail</span>
            <input className="design-input mt-2 h-11 w-full px-4" type="email" value={leadForm.contato_email} onChange={(event) => setLeadField('contato_email', event.target.value)} />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-ink">Responsável</span>
            <input className="design-input mt-2 h-11 w-full px-4" value={leadForm.responsavel_nome} onChange={(event) => setLeadField('responsavel_nome', event.target.value)} />
          </label>
          <label className="block md:col-span-2 xl:col-span-4">
            <span className="text-sm font-semibold text-ink">Observações internas</span>
            <textarea className="design-input mt-2 min-h-24 w-full px-4 py-3" value={leadForm.observacoes_internas} onChange={(event) => setLeadField('observacoes_internas', event.target.value)} />
          </label>
          {leadForm.crm_etapa === 'perdido' ? (
            <label className="block md:col-span-2 xl:col-span-4">
              <span className="text-sm font-semibold text-ink">Motivo da perda</span>
              <textarea className="design-input mt-2 min-h-20 w-full px-4 py-3" value={leadForm.motivo_perda} onChange={(event) => setLeadField('motivo_perda', event.target.value)} required />
            </label>
          ) : null}
          {saveMutation.isError ? <p className="md:col-span-2 xl:col-span-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(saveMutation.error)}</p> : null}
          <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4">
            <Button type="submit" icon={Plus} isLoading={saveMutation.isPending}>{editingId ? 'Salvar lead' : 'Criar lead'}</Button>
            <Button type="button" variant="secondary" onClick={closeModal} disabled={saveMutation.isPending}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      <LeadDrawer
        open={modalMode === 'detail' && Boolean(drawerLead)}
        lead={drawerLead ?? null}
        loading={leadDetailQuery.isFetching}
        error={leadDetailQuery.isError ? extractErrorMessage(leadDetailQuery.error) : undefined}
        onRetry={() => void leadDetailQuery.refetch()}
        canEdit={canEdit}
        busy={actionPending || updateMutation.isPending}
        onClose={closeModal}
        onEdit={openEditForm}
        onAddContact={(lead) => openAction('contact', lead)}
        onAddTask={(lead) => openAction('task', lead)}
        onWin={(lead) => openAction('win', lead)}
        onLose={(lead) => openAction('lost', lead)}
        onDelete={(lead) => openAction('delete', lead)}
      />
      <Modal open={Boolean(action)} title={actionTitle} subtitle={action ? leadTitle(action.lead) : undefined} onClose={() => setAction(null)} closeDisabled={actionPending}>
        <form className="space-y-4" onSubmit={submitAction}>
          {action?.kind === 'delete' ? <p className="text-sm text-ink-muted">Confirme a exclusão deste lead. Esta ação remove o registro e seu histórico.</p>
            : action?.kind === 'win' ? <p className="text-sm text-ink-muted">O lead será convertido em cliente conforme as condições já configuradas para sua unidade.</p>
              : <label className="grid gap-2 text-sm font-semibold text-ink">
                {actionLabel}
                <textarea className="design-input min-h-24 w-full px-3 py-2" value={actionText} onChange={(event) => setActionText(event.target.value)} required maxLength={action?.kind === 'task' ? 180 : 2000} />
              </label>}
          {actionError ? <p role="alert" className="text-sm text-[var(--danger)]">{extractErrorMessage(actionError)}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant={action?.kind === 'delete' ? 'danger' : 'primary'} isLoading={actionPending}>{action?.kind === 'delete' ? 'Excluir lead' : action?.kind === 'win' ? 'Converter em cliente' : 'Salvar'}</Button>
            <Button type="button" variant="secondary" disabled={actionPending} onClick={() => setAction(null)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
