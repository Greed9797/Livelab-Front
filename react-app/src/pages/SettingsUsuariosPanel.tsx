import clsx from 'clsx'
import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Edit2,
  KeyRound,
  LogOut,
  Mail,
  MailPlus,
  MonitorPlay,
  RefreshCcw,
  Search,
  Shield,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  UserRoundCheck,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { FormEvent, type ReactNode, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, statusTone } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { ErrorState, LoadingState } from '../components/ui/States'
import { Modal } from '../components/ui/Modal'
import { MoneyInput } from '../components/ui/MoneyInput'
import { asNumber, asString, formatMoney } from '../utils/format'
import { parseBRMoneyToDecimal } from '../utils/money'
import { isPresenterRole, presenterProfileId, toPresenterOptions } from '../utils/presenters'
import { extractErrorMessage } from '../services/api'
import {
  createApresentadoraFaixaComissao,
  convidarUsuario,
  deleteApresentadoraFaixaComissao,
  deleteApresentadora,
  deleteUsuario,
  forceLogoutUsuario,
  getApresentadoraFaixasComissao,
  getApresentadoras,
  getClientes,
  getUsuarios,
  reenviarConviteUsuario,
  resetSenhaUsuario,
  updateApresentadoraFaixaComissao,
  updateApresentadora,
  updateUsuario,
} from '../services/domain'
import type { JsonRecord } from '../types/models'

const papelLabels: Record<string, string> = {
  gerente: 'Gerente',
  operacional: 'Operacional',
  apresentador: 'Apresentadora',
  cliente_parceiro: 'Cliente parceiro',
}

const DEFAULT_PRESENTER_FIXED = '2700'

const roleOptions: Array<{ value: string; label: string; helper: string; icon: LucideIcon }> = [
  { value: 'gerente', label: 'Gerente', helper: 'Gestão da unidade', icon: Shield },
  { value: 'operacional', label: 'Operacional', helper: 'Agenda, lives e vídeos', icon: MonitorPlay },
  { value: 'apresentador', label: 'Apresentadora', helper: 'Perfil e remuneração', icon: UserRoundCheck },
  { value: 'cliente_parceiro', label: 'Cliente', helper: 'Acesso do parceiro', icon: Building2 },
]

const statusOptions = [
  { value: 'true', label: 'Ativos' },
  { value: 'all', label: 'Todos' },
  { value: 'false', label: 'Inativos' },
]

const defaultCommissionTiers = [
  { label: 'até R$ 50k', value: '0,5%' },
  { label: 'até R$ 150k', value: '1%' },
  { label: 'até R$ 500k', value: '1,5%' },
  { label: 'acima de R$ 500k', value: '2%' },
]

const emptyForm = {
  nome: '',
  email: '',
  papel: 'gerente',
  cliente_id: '',
  apresentadora_id: '',
  fixo: DEFAULT_PRESENTER_FIXED,
  comissao_pct: '',
  meta_diaria_gmv: '',
  senha_temporaria: '',
}

const emptyEditForm = {
  nome: '',
  papel: 'gerente',
  ativo: true,
  fixo: DEFAULT_PRESENTER_FIXED,
  comissao_pct: '',
  meta_diaria_gmv: '',
}

const emptyFaixaForm = {
  gmv_inicio: '0',
  gmv_fim: '',
  comissao_pct: '0',
}

function ativoValue(value: unknown) {
  return value === true || value === 'true'
}

function isPresenterProfile(item: JsonRecord | null | undefined) {
  return asString(item?.origem_perfil) === 'apresentadora'
}

function isPresenterUser(item: JsonRecord | null | undefined) {
  return isPresenterRole(item?.papel) || item?.pode_apresentar_live === true
}

function presenterFixedValue(item: JsonRecord | null | undefined) {
  const value = asNumber(item?.fixo_mensal ?? item?.fixo)
  return value > 0 ? String(value) : DEFAULT_PRESENTER_FIXED
}

function initialsFor(item: JsonRecord) {
  const source = asString(item.nome ?? item.email, '')
  const parts = source.split(/\s+/).filter(Boolean)
  const initials = parts.length > 1
    ? `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`
    : source.slice(0, 2)
  return initials.toUpperCase() || 'US'
}

function roleLabel(item: JsonRecord) {
  return papelLabels[asString(item.papel)] ?? asString(item.papel)
}

function matchesSearch(item: JsonRecord, term: string) {
  if (!term) return true
  const haystack = [
    item.nome,
    item.email,
    item.telefone,
    item.cidade,
    item.papel,
    item.origem_perfil,
  ].map((value) => asString(value, '').toLowerCase()).join(' ')
  return haystack.includes(term)
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex h-9 items-center justify-center rounded-full px-3 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-brand/20',
        active ? 'bg-brand text-white shadow-[0_6px_14px_-6px_rgba(255,90,31,0.55)]' : 'border border-line bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function IconActionButton({
  icon: Icon,
  label,
  tone = 'neutral',
  disabled,
  onClick,
}: {
  icon: LucideIcon
  label: string
  tone?: 'neutral' | 'brand' | 'danger' | 'success'
  disabled?: boolean
  onClick: () => void
}) {
  const toneClass = {
    neutral: 'border-line bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink',
    brand: 'border-brand/25 bg-brand-soft text-brand hover:bg-brand/15',
    success: 'border-[var(--success-soft)] bg-[var(--success-soft)] text-[var(--success)] hover:brightness-110',
    danger: 'border-[var(--danger-soft)] bg-[var(--danger-soft)] text-[var(--danger)] hover:brightness-110',
  }
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'inline-flex h-9 w-9 items-center justify-center rounded-full border transition focus:outline-none focus:ring-4 focus:ring-brand/20',
        toneClass[tone],
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

export function SettingsUsuariosPanel() {
  const client = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [editingUser, setEditingUser] = useState<JsonRecord | null>(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [faixaForm, setFaixaForm] = useState(emptyFaixaForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [papelFilter, setPapelFilter] = useState('all')
  const [ativoFilter, setAtivoFilter] = useState('true')
  const usuarios = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => getUsuarios(),
  })
  const clientes = useQuery({ queryKey: ['clientes'], queryFn: getClientes })
  const apresentadoras = useQuery({ queryKey: ['apresentadoras'], queryFn: getApresentadoras })
  const presenterProfileOptions = useMemo(
    () => toPresenterOptions((apresentadoras.data ?? []).filter((item) => !asString(item.user_id, ''))),
    [apresentadoras.data],
  )
  const editingPresenterId = editingUser ? presenterProfileId(editingUser) : ''
  const editingHasPresenterProfile = Boolean(editingUser && (isPresenterProfile(editingUser) || isPresenterUser(editingUser)))
  const faixasQuery = useQuery({
    queryKey: ['apresentadora-faixas-comissao', editingPresenterId],
    queryFn: () => getApresentadoraFaixasComissao(editingPresenterId),
    enabled: Boolean(editingPresenterId) && editingHasPresenterProfile,
  })

  const inviteMutation = useMutation({
    mutationFn: convidarUsuario,
    onSuccess: () => {
      setForm(emptyForm)
      void client.invalidateQueries({ queryKey: ['usuarios'] })
      void client.invalidateQueries({ queryKey: ['clientes'] })
      void client.invalidateQueries({ queryKey: ['apresentadoras'] })
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateUsuario(id, payload),
    onSuccess: () => {
      setEditingUser(null)
      setEditForm(emptyEditForm)
      void client.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
  const updatePresenterMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateApresentadora(id, payload),
    onSuccess: () => {
      setEditingUser(null)
      setEditForm(emptyEditForm)
      void client.invalidateQueries({ queryKey: ['usuarios'] })
      void client.invalidateQueries({ queryKey: ['apresentadoras'] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteUsuario,
    onSuccess: (_data, id) => {
      setAtivoFilter('true')
      setEditingUser(null)
      setEditForm(emptyEditForm)
      client.setQueriesData<JsonRecord[]>({ queryKey: ['usuarios'] }, (old) =>
        Array.isArray(old) ? old.filter((item) => asString(item.id, '') !== id) : old
      )
      void client.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
  const deletePresenterMutation = useMutation({
    mutationFn: deleteApresentadora,
    onSuccess: (_data, id) => {
      setAtivoFilter('true')
      setEditingUser(null)
      setEditForm(emptyEditForm)
      client.setQueriesData<JsonRecord[]>({ queryKey: ['apresentadoras'] }, (old) =>
        Array.isArray(old) ? old.filter((item) => asString(item.id, '') !== id) : old
      )
      void client.invalidateQueries({ queryKey: ['usuarios'] })
      void client.invalidateQueries({ queryKey: ['apresentadoras'] })
    },
  })
  const resetMutation = useMutation({ mutationFn: resetSenhaUsuario })
  const logoutMutation = useMutation({ mutationFn: forceLogoutUsuario })
  const resendMutation = useMutation({
    mutationFn: reenviarConviteUsuario,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['usuarios'] }),
  })
  const createFaixaMutation = useMutation({
    mutationFn: ({ apresentadoraId, payload }: { apresentadoraId: string; payload: JsonRecord }) => createApresentadoraFaixaComissao(apresentadoraId, payload),
    onSuccess: () => {
      setFaixaForm(emptyFaixaForm)
      void client.invalidateQueries({ queryKey: ['apresentadora-faixas-comissao'] })
      void client.invalidateQueries({ queryKey: ['usuarios'] })
      void client.invalidateQueries({ queryKey: ['apresentadoras'] })
    },
  })
  const updateFaixaMutation = useMutation({
    mutationFn: ({ apresentadoraId, faixaId, payload }: { apresentadoraId: string; faixaId: string; payload: JsonRecord }) => updateApresentadoraFaixaComissao(apresentadoraId, faixaId, payload),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['apresentadora-faixas-comissao'] }),
  })
  const deleteFaixaMutation = useMutation({
    mutationFn: ({ apresentadoraId, faixaId }: { apresentadoraId: string; faixaId: string }) => deleteApresentadoraFaixaComissao(apresentadoraId, faixaId),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['apresentadora-faixas-comissao'] }),
  })
  const editMutation = useMutation({
    mutationFn: async ({ user, form }: { user: JsonRecord; form: typeof emptyEditForm }) => {
      const presenterIdResolved = presenterProfileId(user)
      const presenterPapel = isPresenterUser(user) || isPresenterRole(form.papel) || isPresenterProfile(user)
      const presenterPayload: JsonRecord = {}

      if (presenterPapel) {
        presenterPayload.nome = form.nome
        presenterPayload.ativo = form.ativo
        if (form.fixo !== '') presenterPayload.fixo = asNumber(form.fixo)
        if (form.comissao_pct !== '') presenterPayload.comissao_pct = asNumber(form.comissao_pct)
        if (form.meta_diaria_gmv !== '') presenterPayload.meta_diaria_gmv = asNumber(form.meta_diaria_gmv)
      }

      if (isPresenterProfile(user)) {
        return updateApresentadora(presenterIdResolved, presenterPayload)
      }

      const updatedUser = await updateUsuario(asString(user.id, ''), {
        nome: form.nome,
        papel: form.papel,
        ativo: form.ativo,
      })

      if (presenterPapel && presenterIdResolved && Object.keys(presenterPayload).length > 0) {
        await updateApresentadora(presenterIdResolved, presenterPayload)
      }

      return updatedUser
    },
    onSuccess: () => {
      setEditingUser(null)
      setEditForm(emptyEditForm)
      void client.invalidateQueries({ queryKey: ['usuarios'] })
      void client.invalidateQueries({ queryKey: ['apresentadoras'] })
      void client.invalidateQueries({ queryKey: ['apresentadora-faixas-comissao'] })
    },
  })

  const allRows = useMemo(() => {
    const userRows = usuarios.data ?? []
    const linkedPresenterIds = new Set(userRows.map((item) => asString(item.apresentadora_id, '')).filter(Boolean))
    const linkedUserIds = new Set(userRows.map((item) => asString(item.id, '')).filter(Boolean))
    const presenterOnlyRows = (apresentadoras.data ?? [])
      .filter((item) => {
        const apresentadoraId = asString(item.id, '')
        const userId = asString(item.user_id, '')
        return !linkedPresenterIds.has(apresentadoraId) && (!userId || !linkedUserIds.has(userId))
      })
      .map((item) => ({
        ...item,
        id: `apresentadora:${asString(item.id, '')}`,
        user_id: asString(item.user_id, ''),
        apresentadora_id: asString(item.id, ''),
        papel: 'apresentador',
        email: asString(item.email, 'sem acesso criado'),
        ativo: ativoValue(item.ativo),
        pode_apresentar_live: true,
        origem_perfil: 'apresentadora',
      }))
    return [...userRows, ...presenterOnlyRows]
  }, [usuarios.data, apresentadoras.data])

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    return allRows.filter((item) => {
      if (papelFilter !== 'all' && asString(item.papel) !== papelFilter) return false
      if (ativoFilter !== 'all' && ativoValue(item.ativo) !== (ativoFilter === 'true')) return false
      return matchesSearch(item, normalizedSearch)
    })
  }, [allRows, ativoFilter, papelFilter, searchTerm])

  const summary = useMemo(() => {
    const active = allRows.filter((item) => ativoValue(item.ativo)).length
    const presenters = allRows.filter((item) => isPresenterUser(item) || isPresenterProfile(item)).length
    const profileOnly = allRows.filter((item) => isPresenterProfile(item)).length
    const clients = allRows.filter((item) => asString(item.papel) === 'cliente_parceiro').length
    return { total: allRows.length, active, presenters, profileOnly, clients }
  }, [allRows])

  if (usuarios.isLoading || clientes.isLoading || apresentadoras.isLoading) return <LoadingState />
  if (usuarios.isError) return <ErrorState message={extractErrorMessage(usuarios.error)} onRetry={() => void usuarios.refetch()} />

  function setField(key: keyof typeof emptyForm, value: string) {
    setForm((current) => {
      if (key === 'papel' && isPresenterRole(value) && !current.fixo) {
        return { ...current, [key]: value, fixo: DEFAULT_PRESENTER_FIXED }
      }
      return { ...current, [key]: value }
    })
  }

  function openEditUser(item: JsonRecord) {
    editMutation.reset()
    setEditingUser(item)
    setEditForm({
      nome: asString(item.nome, ''),
      papel: asString(item.papel, 'gerente'),
      ativo: ativoValue(item.ativo),
      fixo: isPresenterUser(item) || isPresenterProfile(item) ? presenterFixedValue(item) : asString(item.fixo_mensal ?? item.fixo, ''),
      comissao_pct: asString(item.comissao_live_pct ?? item.comissao_pct, ''),
      meta_diaria_gmv: asString(item.meta_diaria_gmv, ''),
    })
  }

  function setEditField(key: keyof typeof emptyEditForm, value: string | boolean) {
    setEditForm((current) => {
      if (key === 'papel' && typeof value === 'string' && isPresenterRole(value) && !current.fixo) {
        return { ...current, [key]: value, fixo: DEFAULT_PRESENTER_FIXED }
      }
      return { ...current, [key]: value }
    })
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    inviteMutation.mutate({
      nome: form.nome,
      email: form.email,
      papel: form.papel,
      ...(form.papel === 'cliente_parceiro' ? { cliente_id: form.cliente_id } : {}),
      ...(isPresenterRole(form.papel) && form.apresentadora_id ? { apresentadora_id: form.apresentadora_id } : {}),
      ...(isPresenterRole(form.papel) && form.fixo !== '' ? { fixo: parseBRMoneyToDecimal(form.fixo) } : {}),
      ...(isPresenterRole(form.papel) && form.comissao_pct !== '' ? { comissao_pct: Number(form.comissao_pct || 0) } : {}),
      ...(isPresenterRole(form.papel) && form.meta_diaria_gmv !== '' ? { meta_diaria_gmv: parseBRMoneyToDecimal(form.meta_diaria_gmv) } : {}),
      ...(form.senha_temporaria ? { senha_temporaria: form.senha_temporaria } : {}),
    })
  }

  function onEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingUser) return
    editMutation.mutate({ user: editingUser, form: editForm })
  }

  function onDeleteUser(item: JsonRecord) {
    const label = asString(item.nome ?? item.email, 'usuário')
    if (!window.confirm(`Excluir/desativar o usuário "${label}"?`)) return
    if (isPresenterProfile(item)) {
      deletePresenterMutation.mutate(presenterProfileId(item))
      return
    }
    deleteMutation.mutate(asString(item.id, ''))
  }

  function submitFaixa() {
    if (!editingPresenterId) return
    createFaixaMutation.mutate({
      apresentadoraId: editingPresenterId,
      payload: {
        gmv_inicio: parseBRMoneyToDecimal(faixaForm.gmv_inicio),
        gmv_fim: faixaForm.gmv_fim ? parseBRMoneyToDecimal(faixaForm.gmv_fim) : null,
        comissao_pct: Number(faixaForm.comissao_pct || 0),
        ativo: true,
      },
    })
  }

  return (
    <div className="settings-users-panel space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Pessoas', value: summary.total, hint: `${summary.active} ativas`, icon: UsersRound, tone: 'brand' },
          { label: 'Apresentadoras', value: summary.presenters, hint: `${summary.profileOnly} sem acesso`, icon: UserRoundCheck, tone: 'success' },
          { label: 'Clientes parceiros', value: summary.clients, hint: 'com login próprio', icon: Building2, tone: 'info' },
          { label: 'Resultado filtrado', value: filteredRows.length, hint: 'linhas na visão', icon: SlidersHorizontal, tone: 'neutral' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="design-card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{item.label}</p>
                <p className="num mt-2 text-3xl font-bold leading-none text-ink">{item.value}</p>
                <p className="mt-1 text-xs text-ink-muted">{item.hint}</p>
              </div>
              <div className={clsx(
                'grid h-11 w-11 shrink-0 place-items-center rounded-2xl',
                item.tone === 'brand' && 'bg-brand-soft text-brand',
                item.tone === 'success' && 'bg-[var(--success-soft)] text-[var(--success)]',
                item.tone === 'info' && 'bg-[var(--info-soft)] text-[var(--info)]',
                item.tone === 'neutral' && 'bg-surface-muted text-ink-muted',
              )}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          )
        })}
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-base font-bold text-ink">Novo acesso</p>
              <p className="mt-1 text-xs text-ink-muted">Cadastro único para equipe, apresentadoras e clientes parceiros.</p>
            </div>
            <Badge tone={isPresenterRole(form.papel) ? 'success' : form.papel === 'cliente_parceiro' ? 'info' : 'brand'}>
              {papelLabels[form.papel] ?? form.papel}
            </Badge>
          </div>
        </CardHeader>
        <CardBody>
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {roleOptions.map((option) => {
                const Icon = option.icon
                const active = form.papel === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={clsx(
                      'flex min-h-20 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-4 focus:ring-brand/20',
                      active ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-ink hover:bg-surface-muted',
                    )}
                    onClick={() => setField('papel', option.value)}
                  >
                    <span className={clsx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', active ? 'bg-brand text-white' : 'bg-surface-muted text-ink-muted')}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold">{option.label}</span>
                      <span className={clsx('mt-0.5 block text-xs', active ? 'text-brand/80' : 'text-ink-muted')}>{option.helper}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="block xl:col-span-1">
                <span className="text-sm font-semibold text-ink">Nome</span>
                <input className="design-input mt-2 h-11 w-full px-4" value={form.nome} onChange={(event) => setField('nome', event.target.value)} placeholder="Nome completo" required />
              </label>
              <label className="block xl:col-span-1">
                <span className="text-sm font-semibold text-ink">E-mail</span>
                <input className="design-input mt-2 h-11 w-full px-4" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} placeholder="email@empresa.com.br" required />
              </label>
              <label className="block xl:col-span-1">
                <span className="text-sm font-semibold text-ink">Senha temporária</span>
                <input className="design-input mt-2 h-11 w-full px-4" value={form.senha_temporaria} onChange={(event) => setField('senha_temporaria', event.target.value)} placeholder="Opcional" />
              </label>
            </div>

            {form.papel === 'cliente_parceiro' ? (
              <label className="block max-w-xl">
                <span className="text-sm font-semibold text-ink">Cliente vinculado</span>
                <select className="design-input mt-2 h-11 w-full px-4" value={form.cliente_id} onChange={(event) => setField('cliente_id', event.target.value)} required>
                  <option value="">Selecionar cliente</option>
                  {(clientes.data ?? []).map((cliente) => <option key={asString(cliente.id, '')} value={asString(cliente.id, '')}>{asString(cliente.nome)}</option>)}
                </select>
              </label>
            ) : null}
            {isPresenterRole(form.papel) ? (
              <section className="space-y-4 rounded-2xl border border-line bg-surface-muted/45 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-bold text-ink">Remuneração da apresentadora</p>
                    <p className="mt-1 text-xs text-ink-muted">Fixo padrão de R$ 2.700,00 e escada mensal aplicada automaticamente.</p>
                  </div>
                  <Badge tone="success">padrão ativo</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block md:col-span-2">
                    <span className="text-sm font-semibold text-ink">Perfil operacional</span>
                    <select className="design-input mt-2 h-11 w-full px-4" value={form.apresentadora_id} onChange={(event) => setField('apresentadora_id', event.target.value)}>
                      <option value="">Criar perfil novo</option>
                      {presenterProfileOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Fixo mensal (R$)</span>
                    <MoneyInput className="design-input mt-2 h-11 w-full px-4" value={form.fixo} onChange={(raw) => setField('fixo', raw)} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Meta diária GMV (R$)</span>
                    <MoneyInput className="design-input mt-2 h-11 w-full px-4" value={form.meta_diaria_gmv} onChange={(raw) => setField('meta_diaria_gmv', raw)} />
                  </label>
                  <label className="block md:col-span-2 xl:col-span-1">
                    <span className="text-sm font-semibold text-ink">Comissão base opcional (%)</span>
                    <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" max="100" step="0.01" value={form.comissao_pct} onChange={(event) => setField('comissao_pct', event.target.value)} placeholder="Escada padrão" />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {defaultCommissionTiers.map((tier) => (
                    <span key={tier.label} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink">
                      <CircleDollarSign className="h-3.5 w-3.5 text-brand" />
                      {tier.label} · <strong>{tier.value}</strong>
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
            {inviteMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(inviteMutation.error)}</p> : null}
            {inviteMutation.isSuccess ? <p className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)]">Convite enviado.</p> : null}
            <div>
              <Button type="submit" icon={UserPlus} isLoading={inviteMutation.isPending}>Enviar convite</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <label className="relative block min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                className="design-input h-11 w-full px-10"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nome, e-mail, cidade ou papel"
              />
              {searchTerm ? (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted hover:text-ink"
                  onClick={() => setSearchTerm('')}
                >
                  limpar
                </button>
              ) : null}
            </label>
            <Button variant="secondary" icon={RefreshCcw} onClick={() => {
              void usuarios.refetch()
              void apresentadoras.refetch()
            }}>
              Atualizar
            </Button>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <FilterButton active={papelFilter === 'all'} onClick={() => setPapelFilter('all')}>Todos</FilterButton>
              {roleOptions.map((option) => (
                <FilterButton key={option.value} active={papelFilter === option.value} onClick={() => setPapelFilter(option.value)}>
                  {option.label}
                </FilterButton>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <FilterButton key={option.value} active={ativoFilter === option.value} onClick={() => setAtivoFilter(option.value)}>
                  {option.label}
                </FilterButton>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-base font-bold text-ink">Equipe e acessos</p>
              <p className="mt-1 text-xs text-ink-muted">Visualização consolidada de usuários e perfis operacionais.</p>
            </div>
            <Badge tone="neutral">{filteredRows.length} de {allRows.length}</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <DataTable<JsonRecord>
            data={filteredRows}
            columns={[
              {
                key: 'pessoa',
                header: 'Pessoa',
                render: (item) => {
                  const profileOnly = isPresenterProfile(item)
                  return (
                    <div className="flex min-w-60 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-soft text-sm font-black text-brand">
                        {initialsFor(item)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-ink">{asString(item.nome)}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-muted">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          {asString(item.email)}
                        </p>
                        {profileOnly ? <Badge className="mt-2" tone="warning">sem acesso</Badge> : null}
                      </div>
                    </div>
                  )
                },
              },
              { key: 'papel', header: 'Papel', render: (item) => <Badge tone={isPresenterUser(item) ? 'success' : asString(item.papel) === 'cliente_parceiro' ? 'info' : 'brand'}>{roleLabel(item)}</Badge> },
              {
                key: 'remuneracao',
                header: 'Remuneração',
                align: 'right',
                render: (item) => {
                  const presenter = isPresenterUser(item) || isPresenterProfile(item)
                  if (!presenter) return <span className="text-ink-muted">—</span>
                  return (
                    <div className="space-y-1 text-right">
                      <p className="num font-bold text-ink">{formatMoney(item.fixo_mensal ?? item.fixo)}</p>
                      <p className="text-xs text-ink-muted">base {asNumber(item.comissao_live_pct ?? item.comissao_pct).toLocaleString('pt-BR')}% · meta {formatMoney(item.meta_diaria_gmv)}</p>
                    </div>
                  )
                },
              },
              { key: 'ativo', header: 'Status', render: (item) => <Badge tone={statusTone(ativoValue(item.ativo) ? 'ativo' : 'inativo')}>{ativoValue(item.ativo) ? 'ativo' : 'inativo'}</Badge> },
              {
                key: 'acoes',
                header: 'Ações',
                align: 'right',
                render: (item) => {
                  const id = asString(item.id, '')
                  const presenterOnly = asString(item.origem_perfil) === 'apresentadora'
                  const ativo = ativoValue(item.ativo)
                  const presenterId = presenterProfileId(item)
                  const writePending = updateMutation.isPending || updatePresenterMutation.isPending
                  const deletePending = deleteMutation.isPending || deletePresenterMutation.isPending
                  return (
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button className="h-9 px-3" variant="secondary" icon={Edit2} disabled={writePending} onClick={() => openEditUser(item)}>Editar</Button>
                      <IconActionButton
                        icon={ativo ? Shield : CheckCircle2}
                        label={ativo ? 'Inativar' : 'Reativar'}
                        tone={ativo ? 'neutral' : 'success'}
                        disabled={writePending}
                        onClick={() => presenterOnly
                          ? updatePresenterMutation.mutate({ id: presenterId, payload: { ativo: !ativo } })
                          : updateMutation.mutate({ id, payload: { ativo: !ativo } })
                        }
                      />
                      <IconActionButton icon={KeyRound} label="Resetar senha" disabled={presenterOnly || resetMutation.isPending} onClick={() => resetMutation.mutate(id)} />
                      <IconActionButton icon={MailPlus} label="Reenviar convite" disabled={presenterOnly || resendMutation.isPending} onClick={() => resendMutation.mutate(id)} />
                      <IconActionButton icon={LogOut} label="Forçar logout" disabled={presenterOnly || logoutMutation.isPending} onClick={() => logoutMutation.mutate(id)} />
                      <IconActionButton icon={Trash2} label="Excluir" tone="danger" disabled={deletePending} onClick={() => onDeleteUser(item)} />
                    </div>
                  )
                },
              },
            ]}
          />
          {updateMutation.isError || updatePresenterMutation.isError || resetMutation.isError || logoutMutation.isError || resendMutation.isError || deleteMutation.isError || deletePresenterMutation.isError ? (
            <p className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
              {extractErrorMessage(updateMutation.error ?? updatePresenterMutation.error ?? resetMutation.error ?? logoutMutation.error ?? resendMutation.error ?? deleteMutation.error ?? deletePresenterMutation.error)}
            </p>
          ) : null}
          {resetMutation.data ? (
            <p className="mt-4 rounded-2xl bg-[var(--warning-soft)] px-4 py-3 text-sm font-semibold text-[var(--warning)]">
              Senha temporária: {asString((resetMutation.data as JsonRecord).senha_temporaria)}
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Modal
        open={!!editingUser}
        title="Editar usuário"
        subtitle={editingUser ? asString(editingUser.email, '') : undefined}
        onClose={() => setEditingUser(null)}
        size="lg"
        footer={(
          <>
            <Button type="submit" form="usuario-edit-form" icon={CheckCircle2} isLoading={editMutation.isPending}>Salvar usuário</Button>
            {editingUser ? <Button type="button" variant="danger" icon={Trash2} isLoading={deleteMutation.isPending || deletePresenterMutation.isPending} onClick={() => onDeleteUser(editingUser)}>Excluir</Button> : null}
            <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>Cancelar</Button>
          </>
        )}
      >
        <form className="space-y-5" id="usuario-edit-form" onSubmit={onEditSubmit}>
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Nome</span>
              <input className="design-input mt-2 h-11 w-full px-4" value={editForm.nome} onChange={(event) => setEditField('nome', event.target.value)} placeholder="Nome completo" required />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Status</span>
              <select className="design-input mt-2 h-11 w-full px-4" value={editForm.ativo ? 'true' : 'false'} onChange={(event) => setEditField('ativo', event.target.value === 'true')}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
          </div>

          <section className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-ink">Papel e permissões</p>
                <p className="mt-1 text-xs text-ink-muted">Use o mesmo modelo de cadastro para manter os acessos consistentes.</p>
              </div>
              {isPresenterProfile(editingUser) ? <Badge tone="warning">perfil sem login</Badge> : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {roleOptions.map((option) => {
                const Icon = option.icon
                const active = editForm.papel === option.value
                const locked = isPresenterProfile(editingUser)
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={locked}
                    className={clsx(
                      'flex min-h-20 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-4 focus:ring-brand/20',
                      active ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-ink hover:bg-surface-muted',
                      locked && 'cursor-not-allowed opacity-60',
                    )}
                    onClick={() => setEditField('papel', option.value)}
                  >
                    <span className={clsx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', active ? 'bg-brand text-white' : 'bg-surface-muted text-ink-muted')}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold">{option.label}</span>
                      <span className={clsx('mt-0.5 block text-xs', active ? 'text-brand/80' : 'text-ink-muted')}>{option.helper}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {(isPresenterRole(editForm.papel) || isPresenterProfile(editingUser)) ? (
            <section className="space-y-4 rounded-2xl border border-line bg-surface-muted/45 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">Remuneração da apresentadora</p>
                  <p className="mt-1 text-xs text-ink-muted">Fixo, meta e comissão base ficam juntos para evitar cadastro incompleto.</p>
                </div>
                <Badge tone="success">fixo padrão R$ 2.700</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Fixo mensal (R$)</span>
                  <MoneyInput className="design-input mt-2 h-11 w-full px-4" value={editForm.fixo} onChange={(raw) => setEditField('fixo', raw)} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Meta diária GMV (R$)</span>
                  <MoneyInput className="design-input mt-2 h-11 w-full px-4" value={editForm.meta_diaria_gmv} onChange={(raw) => setEditField('meta_diaria_gmv', raw)} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Comissão base opcional (%)</span>
                  <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" max="100" step="0.01" value={editForm.comissao_pct} onChange={(event) => setEditField('comissao_pct', event.target.value)} placeholder="Escada padrão" />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {defaultCommissionTiers.map((tier) => (
                  <span key={tier.label} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink">
                    <CircleDollarSign className="h-3.5 w-3.5 text-brand" />
                    {tier.label} · <strong>{tier.value}</strong>
                  </span>
                ))}
              </div>
            </section>
          ) : null}
          {editingPresenterId && editingHasPresenterProfile ? (
            <div className="space-y-4 rounded-2xl border border-line bg-surface-muted p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">Escada de comissão</p>
                  <p className="mt-1 text-xs text-ink-muted">Faixas por GMV mensal atribuído à apresentadora.</p>
                </div>
                <Badge tone="neutral">{faixasQuery.data?.length ?? 0} faixas</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_120px_auto]">
                <label className="block">
                  <span className="text-xs font-semibold text-ink-muted">GMV inicial</span>
                  <MoneyInput className="design-input mt-2 h-10 w-full px-3" value={faixaForm.gmv_inicio} onChange={(raw) => setFaixaForm((current) => ({ ...current, gmv_inicio: raw }))} />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-ink-muted">GMV final</span>
                  <MoneyInput className="design-input mt-2 h-10 w-full px-3" value={faixaForm.gmv_fim} onChange={(raw) => setFaixaForm((current) => ({ ...current, gmv_fim: raw }))} placeholder="Sem limite" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-ink-muted">Comissão (%)</span>
                  <input className="design-input mt-2 h-10 w-full px-3" type="number" min="0" max="100" step="0.01" value={faixaForm.comissao_pct} onChange={(event) => setFaixaForm((current) => ({ ...current, comissao_pct: event.target.value }))} />
                </label>
                <div className="flex items-end">
                  <Button type="button" isLoading={createFaixaMutation.isPending} onClick={submitFaixa}>Adicionar</Button>
                </div>
              </div>
              {faixasQuery.isLoading ? <LoadingState label="Carregando faixas" /> : null}
              {faixasQuery.data?.length ? (
                <DataTable<JsonRecord>
                  data={faixasQuery.data}
                  columns={[
                    { key: 'gmv_inicio', header: 'Início', render: (item) => formatMoney(item.gmv_inicio) },
                    { key: 'gmv_fim', header: 'Fim', render: (item) => item.gmv_fim == null ? 'Sem limite' : formatMoney(item.gmv_fim) },
                    { key: 'comissao_pct', header: 'Comissão', align: 'right', render: (item) => `${asNumber(item.comissao_pct).toLocaleString('pt-BR')}%` },
                    { key: 'ativo', header: 'Status', render: (item) => <Badge tone={item.ativo === false ? 'neutral' : 'success'}>{item.ativo === false ? 'inativa' : 'ativa'}</Badge> },
                    {
                      key: 'acoes',
                      header: 'Ações',
                      align: 'right',
                      render: (item) => (
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" disabled={updateFaixaMutation.isPending} onClick={() => updateFaixaMutation.mutate({ apresentadoraId: editingPresenterId, faixaId: asString(item.id, ''), payload: { ativo: item.ativo === false } })}>
                            {item.ativo === false ? 'Reativar' : 'Inativar'}
                          </Button>
                          <Button variant="danger" disabled={deleteFaixaMutation.isPending} onClick={() => deleteFaixaMutation.mutate({ apresentadoraId: editingPresenterId, faixaId: asString(item.id, '') })}>
                            Excluir
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                />
              ) : faixasQuery.isSuccess ? <p className="text-sm text-ink-muted">Nenhuma faixa configurada.</p> : null}
              {createFaixaMutation.isError || updateFaixaMutation.isError || deleteFaixaMutation.isError || faixasQuery.isError ? (
                <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
                  {extractErrorMessage(createFaixaMutation.error ?? updateFaixaMutation.error ?? deleteFaixaMutation.error ?? faixasQuery.error)}
                </p>
              ) : null}
            </div>
          ) : null}
          {editMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(editMutation.error)}</p> : null}
        </form>
      </Modal>
    </div>
  )
}
