import { CalendarClock, Edit2, Mail, Phone, Plus, Search, Trash2, UserRound } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody } from '../components/ui/Card'
import { Badge, statusTone } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/States'
import { MoneyInput } from '../components/ui/MoneyInput'
import { createApresentadora, deleteApresentadora, getApresentadoras, updateApresentadora } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, formatMoney } from '../utils/format'
import { formatBRLWithoutSymbol, parseBRMoneyToDecimal } from '../utils/money'
import type { JsonRecord } from '../types/models'

const emptyForm = {
  nome: '',
  email: '',
  telefone: '',
  cargo: 'apresentadora',
  cidade: '',
  fixo: '',
  comissao_pct: '',
  meta_diaria_gmv: '',
  observacoes: '',
}

export function ApresentadorasPage() {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState(emptyForm)
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['apresentadoras'], queryFn: getApresentadoras })
  const saveMutation = useMutation({
    mutationFn: (payload: JsonRecord) => editingId ? updateApresentadora(editingId, payload) : createApresentadora(payload),
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
    const text = `${item.nome ?? item.name ?? ''} ${item.email ?? ''} ${item.telefone ?? ''} ${item.especialidade ?? item.bio ?? ''}`.toLowerCase()
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
      nome: asString(item.nome ?? item.name, ''),
      email: asString(item.email, ''),
      telefone: asString(item.telefone, ''),
      cargo: asString(item.cargo, 'apresentadora'),
      cidade: asString(item.cidade, ''),
      fixo: formatBRLWithoutSymbol(item.fixo ?? 0),
      comissao_pct: asString(item.comissao_pct, ''),
      meta_diaria_gmv: formatBRLWithoutSymbol(item.meta_diaria_gmv ?? 0),
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
      fixo: parseBRMoneyToDecimal(form.fixo),
      comissao_pct: asNumber(form.comissao_pct),
      meta_diaria_gmv: parseBRMoneyToDecimal(form.meta_diaria_gmv),
      observacoes: form.observacoes || undefined,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pessoas da franquia"
        accent="Gestão"
        title="de equipe"
        subtitle="Internos, apresentadoras e perfis de atendimento vinculados à operação."
        actions={<Button icon={Plus} onClick={openCreateForm}>Novo usuário</Button>}
      />

      {showForm ? (
        <Card>
          <CardBody>
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={onSubmit}>
              <label className="block xl:col-span-2">
                <span className="text-sm font-semibold text-ink">Nome</span>
                <input className="design-input mt-2 h-11 w-full px-4" value={form.nome} onChange={(event) => setField('nome', event.target.value)} required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Email</span>
                <input className="design-input mt-2 h-11 w-full px-4" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Telefone</span>
                <input className="design-input mt-2 h-11 w-full px-4" value={form.telefone} onChange={(event) => setField('telefone', event.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Cargo</span>
                <input className="design-input mt-2 h-11 w-full px-4" value={form.cargo} onChange={(event) => setField('cargo', event.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Cidade</span>
                <input className="design-input mt-2 h-11 w-full px-4" value={form.cidade} onChange={(event) => setField('cidade', event.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Fixo</span>
                <MoneyInput className="design-input mt-2 h-11 w-full px-4" value={form.fixo} onChange={(raw) => setField('fixo', raw)} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Comissão %</span>
                <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" max="100" step="0.1" value={form.comissao_pct} onChange={(event) => setField('comissao_pct', event.target.value)} />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-ink">Meta diária GMV</span>
                <MoneyInput className="design-input mt-2 h-11 w-full px-4" value={form.meta_diaria_gmv} onChange={(raw) => setField('meta_diaria_gmv', raw)} />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-ink">Observações</span>
                <input className="design-input mt-2 h-11 w-full px-4" value={form.observacoes} onChange={(event) => setField('observacoes', event.target.value)} />
              </label>
              {saveMutation.isError ? <p className="md:col-span-2 xl:col-span-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(saveMutation.error)}</p> : null}
              <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4">
                <Button type="submit" icon={Plus} isLoading={saveMutation.isPending}>{editingId ? 'Salvar usuário' : 'Criar usuário'}</Button>
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
              placeholder="Buscar por nome, e-mail ou telefone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-brand bg-brand-soft px-3 py-2 text-xs font-bold text-brand">Apresentadoras {items.length}</span>
            <span className="rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink-muted">Equipe</span>
            <span className="rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink-muted">Clientes</span>
          </div>
        </CardBody>
      </Card>

      <section className="space-y-3">
        {items.map((item, index) => (
          <Card key={asString(item.id, String(index))}>
            <CardBody className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-soft text-base font-bold text-brand">
                  {asString(item.nome ?? item.name, 'A')[0]?.toUpperCase() ?? <UserRound className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-ink">{asString(item.nome ?? item.name, 'Apresentadora')}</p>
                  <p className="mt-1 truncate text-xs text-ink-muted">{asString(item.especialidade ?? item.bio, 'perfil operacional')}</p>
                </div>
              </div>
              <div className="grid gap-3 text-sm text-ink-muted md:grid-cols-3 lg:min-w-[520px]">
                <p className="flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 shrink-0" /> <span className="truncate">{asString(item.email)}</span></p>
                <p className="flex min-w-0 items-center gap-2"><Phone className="h-4 w-4 shrink-0" /> <span className="truncate">{asString(item.telefone)}</span></p>
                <p className="flex min-w-0 items-center gap-2"><CalendarClock className="h-4 w-4 shrink-0" /> <span className="truncate">{formatMoney(item.meta_diaria_gmv)}</span></p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
                <Badge tone={statusTone(asString(item.status ?? item.ativo, ''))}>{asString(item.status ?? (item.ativo ? 'ativo' : 'inativo'))}</Badge>
                <Button variant="secondary" icon={Edit2} onClick={() => openEditForm(item)}>Editar</Button>
                <Button variant="ghost" disabled={toggleMutation.isPending} onClick={() => void toggleMutation.mutate({ id: asString(item.id, ''), ativo: !item.ativo })}>
                  {item.ativo ? 'Inativar' : 'Ativar'}
                </Button>
                <Button variant="danger" icon={Trash2} disabled={deleteMutation.isPending} onClick={() => void deleteMutation.mutate(asString(item.id, ''))}>Excluir</Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </section>
      {deleteMutation.isError || toggleMutation.isError ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(deleteMutation.error ?? toggleMutation.error)}</p>
      ) : null}
    </div>
  )
}
