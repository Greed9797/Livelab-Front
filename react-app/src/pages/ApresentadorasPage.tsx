import { ChevronDown, ChevronUp, Edit2, Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge, statusTone } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/States'
import {
  createApresentadora,
  deleteApresentadora,
  getApresentadoras,
  updateApresentadora,
  getFaixasApresentadora,
  createFaixaApresentadora,
  deleteFaixaApresentadora,
} from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, formatMoney, formatPercent } from '../utils/format'
import type { JsonRecord } from '../types/models'

const emptyForm = {
  nome: '',
  email: '',
  telefone: '',
  cargo: 'apresentadora',
  cidade: '',
  fixo: '',
  valor_fixo_mensal: '',
  comissao_pct: '',
  meta_diaria_gmv: '',
  observacoes: '',
}

function FaixasPanel({ apresentadoraId }: { apresentadoraId: string }) {
  const client = useQueryClient()
  const [showAddFaixa, setShowAddFaixa] = useState(false)
  const [newFaixa, setNewFaixa] = useState({ gmv_min: '', gmv_max: '', pct_comissao: '' })

  const faixasQuery = useQuery({
    queryKey: ['faixas', apresentadoraId],
    queryFn: () => getFaixasApresentadora(apresentadoraId),
  })

  const addMutation = useMutation({
    mutationFn: (payload: JsonRecord) => createFaixaApresentadora(apresentadoraId, payload),
    onSuccess: () => {
      setShowAddFaixa(false)
      setNewFaixa({ gmv_min: '', gmv_max: '', pct_comissao: '' })
      void client.invalidateQueries({ queryKey: ['faixas', apresentadoraId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (faixaId: string) => deleteFaixaApresentadora(apresentadoraId, faixaId),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['faixas', apresentadoraId] }),
  })

  function submitFaixa(e: FormEvent) {
    e.preventDefault()
    addMutation.mutate({
      gmv_min: asNumber(newFaixa.gmv_min),
      gmv_max: newFaixa.gmv_max ? asNumber(newFaixa.gmv_max) : null,
      pct_comissao: asNumber(newFaixa.pct_comissao),
    })
  }

  const faixas = faixasQuery.data ?? []

  return (
    <div className="mt-4 rounded-2xl bg-surface-muted p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-ink">Faixas de comissão por GMV</p>
        <Button variant="secondary" icon={Plus} onClick={() => setShowAddFaixa(true)}>Adicionar faixa</Button>
      </div>

      {faixasQuery.isLoading ? <p className="text-xs text-ink-muted">Carregando...</p> : null}

      {faixas.length === 0 && !faixasQuery.isLoading ? (
        <p className="text-xs text-ink-muted">Nenhuma faixa cadastrada. A comissão variável será 0%.</p>
      ) : (
        <div className="space-y-2">
          {faixas.map((f) => (
            <div key={asString(f.id)} className="flex items-center justify-between rounded-xl bg-surface px-4 py-2.5 text-sm">
              <span className="text-ink-muted">
                {formatMoney(f.gmv_min)} — {f.gmv_max ? formatMoney(f.gmv_max) : '∞'}
              </span>
              <span className="font-bold text-brand">{formatPercent(f.pct_comissao)}</span>
              <Button
                variant="ghost"
                icon={Trash2}
                disabled={deleteMutation.isPending}
                onClick={() => void deleteMutation.mutate(asString(f.id))}
              >
                <span className="sr-only">Excluir</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      {showAddFaixa ? (
        <form className="mt-3 grid grid-cols-3 gap-2" onSubmit={submitFaixa}>
          <label className="block">
            <span className="text-xs font-semibold text-ink-muted">GMV min (R$)</span>
            <input
              className="design-input mt-1 h-9 w-full px-3 text-sm"
              type="number" min="0" step="0.01" placeholder="0"
              value={newFaixa.gmv_min}
              onChange={(e) => setNewFaixa((v) => ({ ...v, gmv_min: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink-muted">GMV max (R$, vazio = sem teto)</span>
            <input
              className="design-input mt-1 h-9 w-full px-3 text-sm"
              type="number" min="0" step="0.01" placeholder="sem limite"
              value={newFaixa.gmv_max}
              onChange={(e) => setNewFaixa((v) => ({ ...v, gmv_max: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink-muted">% comissão</span>
            <input
              className="design-input mt-1 h-9 w-full px-3 text-sm"
              type="number" min="0" max="100" step="0.1" required
              value={newFaixa.pct_comissao}
              onChange={(e) => setNewFaixa((v) => ({ ...v, pct_comissao: e.target.value }))}
            />
          </label>
          {addMutation.isError ? (
            <p className="col-span-3 text-xs text-[var(--danger)]">{extractErrorMessage(addMutation.error)}</p>
          ) : null}
          <div className="col-span-3 flex gap-2">
            <Button type="submit" isLoading={addMutation.isPending}>Salvar faixa</Button>
            <Button type="button" variant="secondary" onClick={() => setShowAddFaixa(false)}>Cancelar</Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}

export function ApresentadorasPage() {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const client = useQueryClient()

  const query = useQuery({ queryKey: ['apresentadoras'], queryFn: getApresentadoras })
  const saveMutation = useMutation({
    mutationFn: (payload: JsonRecord) =>
      editingId ? updateApresentadora(editingId, payload) : createApresentadora(payload),
    onSuccess: () => {
      setShowForm(false)
      setEditingId('')
      setForm(emptyForm)
      void client.invalidateQueries({ queryKey: ['apresentadoras'] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteApresentadora,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['apresentadoras'] }),
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => updateApresentadora(id, { ativo }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['apresentadoras'] }),
  })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const items = (query.data ?? []).filter((item) => {
    const text = `${item.nome ?? ''} ${item.email ?? ''} ${item.telefone ?? ''} ${item.cidade ?? ''}`.toLowerCase()
    return text.includes(search.trim().toLowerCase())
  })

  function setField(key: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function openCreateForm() {
    setEditingId('')
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEditForm(item: JsonRecord) {
    setEditingId(asString(item.id, ''))
    setForm({
      nome: asString(item.nome, ''),
      email: asString(item.email, ''),
      telefone: asString(item.telefone, ''),
      cargo: asString(item.cargo, 'apresentadora'),
      cidade: asString(item.cidade, ''),
      fixo: asString(item.fixo, ''),
      valor_fixo_mensal: asString(item.valor_fixo_mensal, ''),
      comissao_pct: asString(item.comissao_pct, ''),
      meta_diaria_gmv: asString(item.meta_diaria_gmv, ''),
      observacoes: asString(item.observacoes, ''),
    })
    setShowForm(true)
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    saveMutation.mutate({
      nome: form.nome,
      email: form.email || undefined,
      telefone: form.telefone || undefined,
      cargo: form.cargo || undefined,
      cidade: form.cidade || undefined,
      fixo: asNumber(form.fixo),
      valor_fixo_mensal: asNumber(form.valor_fixo_mensal),
      comissao_pct: asNumber(form.comissao_pct),
      meta_diaria_gmv: asNumber(form.meta_diaria_gmv),
      observacoes: form.observacoes || undefined,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pessoas da franquia"
        accent="Gestão"
        title="de apresentadoras"
        subtitle="Cadastro, comissões e faixas de metas das apresentadoras vinculadas à operação."
        actions={<Button icon={Plus} onClick={openCreateForm}>Nova apresentadora</Button>}
      />

      {showForm ? (
        <Card>
          <CardHeader>
            <p className="text-sm font-bold text-ink">{editingId ? 'Editar apresentadora' : 'Nova apresentadora'}</p>
          </CardHeader>
          <CardBody>
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={onSubmit}>
              <label className="block xl:col-span-2">
                <span className="text-sm font-semibold text-ink">Nome *</span>
                <input className="design-input mt-2 h-11 w-full px-4" value={form.nome} onChange={(e) => setField('nome', e.target.value)} required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Email</span>
                <input className="design-input mt-2 h-11 w-full px-4" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Telefone</span>
                <input className="design-input mt-2 h-11 w-full px-4" value={form.telefone} onChange={(e) => setField('telefone', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Cargo</span>
                <input className="design-input mt-2 h-11 w-full px-4" value={form.cargo} onChange={(e) => setField('cargo', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Cidade</span>
                <input className="design-input mt-2 h-11 w-full px-4" value={form.cidade} onChange={(e) => setField('cidade', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Fixo diário (R$)</span>
                <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" step="0.01" value={form.fixo} onChange={(e) => setField('fixo', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Fixo mensal garantido (R$)</span>
                <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" step="0.01" value={form.valor_fixo_mensal} onChange={(e) => setField('valor_fixo_mensal', e.target.value)} placeholder="0.00" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Meta diária GMV (R$)</span>
                <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" step="0.01" value={form.meta_diaria_gmv} onChange={(e) => setField('meta_diaria_gmv', e.target.value)} />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-ink">Observações</span>
                <input className="design-input mt-2 h-11 w-full px-4" value={form.observacoes} onChange={(e) => setField('observacoes', e.target.value)} />
              </label>
              {saveMutation.isError ? (
                <p className="md:col-span-2 xl:col-span-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
                  {extractErrorMessage(saveMutation.error)}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4">
                <Button type="submit" icon={Plus} isLoading={saveMutation.isPending}>{editingId ? 'Salvar' : 'Criar apresentadora'}</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="design-input flex h-11 min-w-0 flex-1 items-center gap-2 px-3">
            <Search className="h-4 w-4 shrink-0 text-ink-muted" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted"
              placeholder="Buscar por nome, e-mail, cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? <button onClick={() => setSearch('')}><X className="h-4 w-4 text-ink-muted" /></button> : null}
          </div>
          <span className="rounded-full border border-brand bg-brand-soft px-3 py-2 text-xs font-bold text-brand">
            {items.length} apresentadora{items.length !== 1 ? 's' : ''}
          </span>
        </CardBody>
      </Card>

      <section className="space-y-3">
        {items.map((item, index) => {
          const id = asString(item.id, String(index))
          const expanded = expandedId === id
          return (
            <Card key={id}>
              <CardBody className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-soft text-base font-bold text-brand">
                      {asString(item.nome, 'A')[0]?.toUpperCase() ?? <UserRound className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-ink">{asString(item.nome, 'Apresentadora')}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">{asString(item.cargo, 'apresentadora')} · {asString(item.cidade, '—')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-ink-muted md:grid-cols-4 lg:min-w-[420px]">
                    <div>
                      <p className="text-xs text-ink-muted">Fixo mensal</p>
                      <p className="font-semibold text-ink">{formatMoney(item.valor_fixo_mensal ?? item.fixo)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-muted">Meta diária</p>
                      <p className="font-semibold text-ink">{formatMoney(item.meta_diaria_gmv)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-muted">Email</p>
                      <p className="truncate font-semibold text-ink">{asString(item.email, '—')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-muted">Status</p>
                      <Badge tone={statusTone(item.ativo ? 'ativo' : 'inativo')}>{item.ativo ? 'Ativa' : 'Inativa'}</Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      icon={expanded ? ChevronUp : ChevronDown}
                      onClick={() => setExpandedId(expanded ? null : id)}
                    >
                      Faixas
                    </Button>
                    <Button variant="secondary" icon={Edit2} onClick={() => openEditForm(item)}>Editar</Button>
                    <Button
                      variant="ghost"
                      disabled={toggleMutation.isPending}
                      onClick={() => void toggleMutation.mutate({ id, ativo: !item.ativo })}
                    >
                      {item.ativo ? 'Inativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="danger"
                      icon={Trash2}
                      disabled={deleteMutation.isPending}
                      onClick={() => void deleteMutation.mutate(id)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>

                {expanded ? <FaixasPanel apresentadoraId={id} /> : null}
              </CardBody>
            </Card>
          )
        })}

        {items.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center">
              <p className="text-sm text-ink-muted">Nenhuma apresentadora encontrada.</p>
              <Button className="mt-4" icon={Plus} onClick={openCreateForm}>Cadastrar primeira apresentadora</Button>
            </CardBody>
          </Card>
        ) : null}
      </section>

      {deleteMutation.isError || toggleMutation.isError ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
          {extractErrorMessage(deleteMutation.error ?? toggleMutation.error)}
        </p>
      ) : null}
    </div>
  )
}
