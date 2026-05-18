import { ClipboardCheck, Edit2, PhoneCall, Plus, Search, Trash2, Trophy, Workflow, XCircle } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MetricCard } from '../components/ui/MetricCard'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/States'
import { addLeadContato, addLeadTarefa, createLead, deleteLead, ganharLead, getCrmSummary, getLeads, updateLead } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, formatDate, formatMoney, getRecord } from '../utils/format'
import { metric, moneyMetric } from './page-helpers'
import type { JsonRecord, Lead } from '../types/models'

export const CRM_STAGES = [
  { key: 'lead_novo', label: 'Novo lead' },
  { key: 'contato_iniciado', label: 'Contato iniciado' },
  { key: 'reuniao_agendada', label: 'Reunião agendada' },
  { key: 'proposta_enviada', label: 'Proposta enviada' },
  { key: 'em_negociacao', label: 'Em negociação' },
  { key: 'aguardando_assinatura', label: 'Aguardando assinatura' },
  { key: 'ganho', label: 'Ganho' },
  { key: 'perdido', label: 'Perdido' },
] as const

const CRM_STAGE_KEYS = new Set(CRM_STAGES.map((stage) => stage.key))

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
}

export function normalizeCrmStage(lead: JsonRecord) {
  const stage = asString(lead.crm_etapa, '')
  return CRM_STAGE_KEYS.has(stage as (typeof CRM_STAGES)[number]['key']) ? stage : 'lead_novo'
}

export function groupLeadsByStage<T extends JsonRecord>(leads: T[]) {
  return CRM_STAGES.map((stage) => ({
    stage,
    leads: leads.filter((lead) => normalizeCrmStage(lead) === stage.key),
  }))
}

function leadTitle(lead: JsonRecord) {
  return asString(lead.nome ?? lead.nome_cliente ?? lead.cliente_nome, 'Lead')
}

function leadValue(lead: JsonRecord) {
  return lead.valor_oportunidade ?? lead.valor_estimado ?? lead.fat_estimado
}

export function CrmPage() {
  const [search, setSearch] = useState('')
  const [activityFilter, setActivityFilter] = useState('todos')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [leadForm, setLeadForm] = useState(emptyLeadForm)
  const client = useQueryClient()
  const summaryQuery = useQuery({ queryKey: ['crm-summary'], queryFn: getCrmSummary })
  const leadsQuery = useQuery({ queryKey: ['leads'], queryFn: getLeads })

  const invalidateCrm = () => {
    void client.invalidateQueries({ queryKey: ['leads'] })
    void client.invalidateQueries({ queryKey: ['crm-summary'] })
  }

  const saveMutation = useMutation({
    mutationFn: (payload: JsonRecord) => editingId ? updateLead(editingId, payload) : createLead(payload),
    onSuccess: () => {
      setShowForm(false)
      setEditingId('')
      setLeadForm(emptyLeadForm)
      invalidateCrm()
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateLead(id, payload),
    onSuccess: invalidateCrm,
  })
  const deleteMutation = useMutation({ mutationFn: deleteLead, onSuccess: invalidateCrm })
  const contatoMutation = useMutation({
    mutationFn: (id: string) => addLeadContato(id, { tipo: 'whatsapp', resumo: 'Contato registrado pelo painel React.' }),
    onSuccess: invalidateCrm,
  })
  const tarefaMutation = useMutation({
    mutationFn: (id: string) => addLeadTarefa(id, { titulo: 'Follow-up comercial', concluida: false }),
    onSuccess: invalidateCrm,
  })
  const ganharMutation = useMutation({
    mutationFn: (id: string) => ganharLead(id),
    onSuccess: () => {
      invalidateCrm()
      void client.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
  const perderMutation = useMutation({
    mutationFn: (id: string) => updateLead(id, { crm_etapa: 'perdido' }),
    onSuccess: invalidateCrm,
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

  const leadsByStage = groupLeadsByStage(visibleLeads as unknown as JsonRecord[])
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

  function openCreateForm() {
    setEditingId('')
    setLeadForm(emptyLeadForm)
    setShowForm(true)
  }

  function openEditForm(lead: Lead) {
    const record = lead as Lead & JsonRecord
    setEditingId(lead.id)
    setLeadForm({
      nome: leadTitle(record) === 'Lead' ? '' : leadTitle(record),
      nicho: asString(record.nicho, ''),
      origem: asString(record.origem, 'Cliente'),
      cidade: asString(record.cidade, ''),
      estado: asString(record.estado, ''),
      valor_oportunidade: asString(record.valor_oportunidade ?? record.valor_estimado, ''),
      responsavel_nome: asString(record.responsavel_nome, ''),
      crm_etapa: normalizeCrmStage(record),
      contato_email: asString(record.contato_email, ''),
      contato_whatsapp: asString(record.contato_whatsapp, ''),
    })
    setShowForm(true)
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
    })
  }

  const mutationError = updateMutation.error ?? deleteMutation.error ?? contatoMutation.error ?? tarefaMutation.error ?? ganharMutation.error ?? perderMutation.error

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-bold text-ink">CRM</p>
          <p className="mt-1 text-sm text-ink-muted">Pipeline por etapa, sem duplicar leads entre colunas.</p>
        </div>
        <Button icon={Plus} onClick={openCreateForm}>Novo lead</Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <p className="text-base font-bold text-ink">{editingId ? 'Editar lead' : 'Novo lead'}</p>
          </CardHeader>
          <CardBody>
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={onLeadSubmit}>
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
              {saveMutation.isError ? <p className="md:col-span-2 xl:col-span-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(saveMutation.error)}</p> : null}
              <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4">
                <Button type="submit" icon={Plus} isLoading={saveMutation.isPending}>{editingId ? 'Salvar lead' : 'Criar lead'}</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

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

      <div className="overflow-x-auto pb-2">
        <section className="grid min-w-[1500px] grid-cols-8 gap-4">
          {leadsByStage.map(({ stage, leads: stageLeads }) => (
            <Card key={stage.key} className="min-h-80">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-ink">{stage.label}</p>
                  <Badge tone={stage.key === 'ganho' ? 'success' : stage.key === 'perdido' ? 'danger' : 'brand'}>{stageLeads.length}</Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                {stageLeads.map((lead) => (
                  <div key={asString(lead.id)} className="rounded-2xl border border-line bg-surface-muted p-3">
                    <p className="truncate text-sm font-bold text-ink">{leadTitle(lead)}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-ink-muted">
                      <span>{asString(lead.responsavel_nome, 'sem responsável')}</span>
                      <span>{formatMoney(leadValue(lead))}</span>
                    </div>
                    <p className="mt-2 text-[11px] text-ink-muted">Atualizado {formatDate(asString(lead.atualizado_em ?? lead.criado_em, ''))}</p>
                    <select
                      className="design-input mt-3 h-9 w-full px-3 text-xs"
                      value={normalizeCrmStage(lead)}
                      disabled={updateMutation.isPending}
                      onChange={(event) => updateMutation.mutate({ id: asString(lead.id), payload: { crm_etapa: event.target.value } })}
                    >
                      {CRM_STAGES.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                    </select>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="ghost" icon={PhoneCall} disabled={contatoMutation.isPending} onClick={() => void contatoMutation.mutate(asString(lead.id))}>Contato</Button>
                      <Button variant="ghost" icon={ClipboardCheck} disabled={tarefaMutation.isPending} onClick={() => void tarefaMutation.mutate(asString(lead.id))}>Tarefa</Button>
                      <Button variant="secondary" icon={Edit2} onClick={() => openEditForm(lead as unknown as Lead)}>Editar</Button>
                      {stage.key !== 'ganho' ? <Button variant="secondary" icon={Trophy} disabled={ganharMutation.isPending} onClick={() => void ganharMutation.mutate(asString(lead.id))}>Ganho</Button> : null}
                      {stage.key !== 'perdido' ? <Button variant="ghost" icon={XCircle} disabled={perderMutation.isPending} onClick={() => void perderMutation.mutate(asString(lead.id))}>Perdido</Button> : null}
                    </div>
                  </div>
                ))}
                {stageLeads.length === 0 ? <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-ink-muted">vazio</p> : null}
              </CardBody>
            </Card>
          ))}
        </section>
      </div>

      {mutationError ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
          {extractErrorMessage(mutationError)}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <p className="text-sm font-bold text-ink">Lista de leads</p>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3">
            {visibleLeads.map((lead) => (
              <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-muted p-4">
                <div>
                  <p className="font-bold text-ink">{leadTitle(lead as JsonRecord)}</p>
                  <p className="mt-1 text-sm text-ink-muted">{asString((lead as JsonRecord).origem ?? (lead as JsonRecord).nicho)} · {formatMoney(leadValue(lead as JsonRecord))}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" icon={Edit2} onClick={() => openEditForm(lead)}>Editar</Button>
                  <Button variant="danger" icon={Trash2} disabled={deleteMutation.isPending} onClick={() => void deleteMutation.mutate(lead.id)}>Excluir</Button>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
