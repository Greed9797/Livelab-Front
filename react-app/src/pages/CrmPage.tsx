import { Plus, Search, Workflow } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MetricCard } from '../components/ui/MetricCard'
import { Card, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/States'
import { Modal } from '../components/ui/Modal'
import { LeadDrawer } from '../components/crm/LeadDrawer'
import { LeadKanban } from '../components/crm/LeadKanban'
import { addLeadContato, addLeadTarefa, createLead, deleteLead, ganharLead, getCrmSummary, getLead, getLeads, updateLead } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, getRecord } from '../utils/format'
import { CRM_STAGES, leadTitle, moveLeadToStage, normalizeCrmStage, type CrmStageKey } from '../utils/crm'
import { metric, moneyMetric } from './page-helpers'
import type { JsonRecord, Lead } from '../types/models'

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
  const [search, setSearch] = useState('')
  const [activityFilter, setActivityFilter] = useState('todos')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'detail' | null>(null)
  const [editingId, setEditingId] = useState('')
  const [selectedLead, setSelectedLead] = useState<JsonRecord | null>(null)
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [leadForm, setLeadForm] = useState(emptyLeadForm)
  const client = useQueryClient()
  const summaryQuery = useQuery({ queryKey: ['crm-summary'], queryFn: getCrmSummary })
  const leadsQuery = useQuery({ queryKey: ['leads'], queryFn: getLeads })
  const leadDetailQuery = useQuery({
    queryKey: ['lead', selectedLeadId],
    queryFn: () => getLead(selectedLeadId),
    enabled: modalMode === 'detail' && Boolean(selectedLeadId),
  })

  const invalidateCrm = () => {
    void client.invalidateQueries({ queryKey: ['leads'] })
    void client.invalidateQueries({ queryKey: ['crm-summary'] })
    if (selectedLeadId) void client.invalidateQueries({ queryKey: ['lead', selectedLeadId] })
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingId('')
    setSelectedLead(null)
    setSelectedLeadId('')
    setLeadForm(emptyLeadForm)
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
    onSuccess: invalidateCrm,
    onError: invalidateCrm,
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
    onSuccess: invalidateCrm,
  })
  const tarefaMutation = useMutation({
    mutationFn: ({ id, titulo }: { id: string; titulo: string }) => addLeadTarefa(id, { titulo, concluida: false }),
    onSuccess: invalidateCrm,
  })
  const ganharMutation = useMutation({
    mutationFn: (id: string) => ganharLead(id),
    onSuccess: () => {
      closeModal()
      invalidateCrm()
      void client.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
  const perderMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) => updateLead(id, { crm_etapa: 'perdido', ...(motivo ? { motivo_perda: motivo } : {}) }),
    onSuccess: () => {
      closeModal()
      invalidateCrm()
    },
  })

  const raw = summaryQuery.data ?? {}
  const summary = getRecord(raw.summary)
  const totals = getRecord(raw.totals)
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

  const ganhos = asNumber(summary.ganhos ?? totals.ganhos)
  const metrics = [
    metric('Leads abertos', visibleLeads.filter((lead) => !['ganho', 'perdido'].includes(asString((lead as JsonRecord).crm_etapa))).length, 'pipeline ativo', 'neutral'),
    metric('Reuniões agendadas', visibleLeads.filter((lead) => asString((lead as JsonRecord).crm_etapa) === 'reuniao_agendada').length, 'próximos contatos', 'info'),
    metric('Propostas enviadas', visibleLeads.filter((lead) => asString((lead as JsonRecord).crm_etapa) === 'proposta_enviada').length, 'em análise', 'warning'),
    metric('Ganhos no mês', ganhos, 'clientes convertidos', 'success'),
    moneyMetric('Valor em negociação', summary.valor_estimado ?? totals.valor_estimado ?? totals.valor_pipeline, 'pipeline aberto', 'brand'),
  ]

  if (summaryQuery.isLoading || leadsQuery.isLoading) return <LoadingState />
  if (summaryQuery.isError) return <ErrorState message={extractErrorMessage(summaryQuery.error)} onRetry={() => void summaryQuery.refetch()} />
  if (leadsQuery.isError) return <ErrorState message={extractErrorMessage(leadsQuery.error)} onRetry={() => void leadsQuery.refetch()} />

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
      valor_oportunidade: asString(lead.valor_oportunidade ?? lead.valor_estimado, ''),
      responsavel_nome: asString(lead.responsavel_nome, ''),
      crm_etapa: normalizeCrmStage(lead),
      contato_email: asString(lead.contato_email, ''),
      contato_whatsapp: asString(lead.contato_whatsapp, ''),
      observacoes_internas: asString(lead.observacoes_internas, ''),
      motivo_perda: asString(lead.motivo_perda, ''),
    })
  }

  function openCreateForm() {
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
    setSelectedLead(lead)
    setEditingId(asString(lead.id, ''))
    fillForm(lead)
    setModalMode('edit')
  }

  function onLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    saveMutation.mutate({
      nome: leadForm.nome,
      nicho: leadForm.nicho || undefined,
      origem: leadForm.origem || undefined,
      cidade: leadForm.cidade || undefined,
      estado: leadForm.estado || undefined,
      valor_oportunidade: asNumber(leadForm.valor_oportunidade),
      responsavel_nome: leadForm.responsavel_nome || undefined,
      crm_etapa: leadForm.crm_etapa,
      contato_email: leadForm.contato_email || undefined,
      contato_whatsapp: leadForm.contato_whatsapp || undefined,
      observacoes_internas: leadForm.observacoes_internas || undefined,
      motivo_perda: leadForm.motivo_perda || undefined,
    })
  }

  function moveLead(id: string, stage: CrmStageKey) {
    const currentLead = leads.find((lead) => asString(lead.id, '') === id) as JsonRecord | undefined
    if (!currentLead || normalizeCrmStage(currentLead) === stage) return
    client.setQueryData<Lead[]>(['leads'], (current = []) => moveLeadToStage(current as unknown as JsonRecord[], id, stage) as unknown as Lead[])
    updateMutation.mutate({ id, payload: { crm_etapa: stage } })
  }

  function registerContact(lead: JsonRecord) {
    const resumo = window.prompt('Resumo do contato')
    if (!resumo?.trim()) return
    contatoMutation.mutate({ id: asString(lead.id, ''), resumo: resumo.trim() })
  }

  function createTask(lead: JsonRecord) {
    const titulo = window.prompt('Título da tarefa')
    if (!titulo?.trim()) return
    tarefaMutation.mutate({ id: asString(lead.id, ''), titulo: titulo.trim() })
  }

  function markLost(lead: JsonRecord) {
    const motivo = window.prompt('Motivo da perda')
    perderMutation.mutate({ id: asString(lead.id, ''), motivo: motivo?.trim() || undefined })
  }

  function deleteSelectedLead(lead: JsonRecord) {
    if (!window.confirm(`Excluir o lead "${leadTitle(lead)}"?`)) return
    deleteMutation.mutate(asString(lead.id, ''))
  }

  const mutationError = updateMutation.error ?? deleteMutation.error ?? contatoMutation.error ?? tarefaMutation.error ?? ganharMutation.error ?? perderMutation.error
  const drawerLead = (leadDetailQuery.data as unknown as JsonRecord | undefined) ?? selectedLead

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-bold text-ink">CRM</p>
          <p className="mt-1 text-sm text-ink-muted">Kanban comercial com drag and drop, detalhe em popup e ações de pipeline.</p>
        </div>
        <Button icon={Plus} onClick={openCreateForm}>Novo lead</Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((item) => <MetricCard key={item.label} metric={item} icon={Workflow} />)}
      </section>

      <Card>
        <CardBody className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="design-input flex h-11 min-w-0 flex-1 items-center gap-2 px-3">
            <Search className="h-4 w-4 shrink-0 text-ink-muted" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted"
              placeholder="Buscar lead, responsável, origem ou etapa"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select className="design-input h-11 min-w-48 px-3 text-sm" value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}>
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
      />

      {mutationError ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
          {extractErrorMessage(mutationError)}
        </p>
      ) : null}

      <Modal
        open={modalMode === 'create' || modalMode === 'edit'}
        title={modalMode === 'edit' ? 'Editar lead' : 'Novo lead'}
        subtitle="Campos básicos do pipeline comercial."
        onClose={closeModal}
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
            <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" step="0.01" value={leadForm.valor_oportunidade} onChange={(event) => setLeadField('valor_oportunidade', event.target.value)} />
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
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      <LeadDrawer
        open={modalMode === 'detail' && Boolean(drawerLead)}
        lead={drawerLead ?? null}
        loading={leadDetailQuery.isFetching}
        onClose={closeModal}
        onEdit={openEditForm}
        onAddContact={registerContact}
        onAddTask={createTask}
        onWin={(lead) => ganharMutation.mutate(asString(lead.id, ''))}
        onLose={markLost}
        onDelete={deleteSelectedLead}
      />
    </div>
  )
}
