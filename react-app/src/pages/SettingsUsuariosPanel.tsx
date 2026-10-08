import {
  CheckCircle2,
  RefreshCcw,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ErrorState, LoadingState } from '../components/ui/States'
import { Modal } from '../components/ui/Modal'
import { asNumber, asString } from '../utils/format'
import { parseBRMoneyToDecimal } from '../utils/money'
import { isPresenterRole, presenterProfileId, toPresenterOptions } from '../utils/presenters'
import { extractErrorMessage } from '../services/api'
import { QK } from '../services/query-keys'
import { invalidateFinanceiro } from '../hooks/useFinanceiro'
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
  getConvitesPendentes,
  getUsuarios,
  resetSenhaUsuario,
  reenviarConviteUsuario,
  uploadImageAsset,
  updateApresentadora,
  updateUsuario,
} from '../services/domain'
import type { JsonRecord } from '../types/models'
import { UsuariosList } from '../components/configuracoes/UsuariosList'
import { ResetSenhaModal } from '../components/configuracoes/ResetSenhaModal'
import { UsuarioForm, type CreateFormState } from '../components/configuracoes/UsuarioForm'
import { UsuarioPapelSelect } from '../components/configuracoes/UsuarioPapelSelect'
import { ApresentadoraRemuneracao } from '../components/configuracoes/ApresentadoraRemuneracao'
import { ApresentadoraFaixas } from '../components/configuracoes/ApresentadoraFaixas'
import { HistoricoAuditModal } from '../components/audit/HistoricoAuditModal'
import { useCurrentUser } from '../stores/auth-store'
import {
  attachPendingInvites,
  consolidateSettingsUserRows,
  filterSettingsUserRows,
  rowsMatchingSettingsToolbar,
  settingsViewCounts,
  type SettingsUserView,
} from '../components/configuracoes/settings-user-rows'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const value = item?.fixo_mensal ?? item?.fixo
  return value === null || value === undefined || value === '' ? '' : String(asNumber(value))
}

const papelOptions = [
  { value: 'gerente', label: 'Gerente' },
  { value: 'gerente_comercial', label: 'Gerente comercial' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'apresentador', label: 'Apresentadora' },
  { value: 'cliente_parceiro', label: 'Cliente parceiro' },
]

// comissao_pct plano saiu dos formulários: o cálculo de comissão ignora esse campo —
// a fonte é sempre a escada de faixas por GMV.
const emptyForm: CreateFormState = {
  nome: '',
  email: '',
  papel: 'gerente',
  cliente_id: '',
  apresentadora_id: '',
  fixo: '2700',
  foto_url: '',
  senha_temporaria: '',
}

const emptyEditForm = {
  nome: '',
  email: '',
  papel: 'gerente',
  ativo: true,
  fixo: '2700',
  foto_url: '',
  data_inicio: '',
  data_fim: '',
}

const emptyFaixaForm = { gmv_inicio: '0', gmv_fim: '', comissao_pct: '0' }

function sameEditForm(a: typeof emptyEditForm, b: typeof emptyEditForm) {
  return Object.keys(emptyEditForm).every((key) => a[key as keyof typeof emptyEditForm] === b[key as keyof typeof emptyEditForm])
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function SettingsUsuariosPanel() {
  const client = useQueryClient()
  const currentUser = useCurrentUser()
  const [form, setForm] = useState<CreateFormState>(emptyForm)
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<JsonRecord | null>(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [originalEditForm, setOriginalEditForm] = useState(emptyEditForm)
  const [faixaForm, setFaixaForm] = useState(emptyFaixaForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [papelFilter, setPapelFilter] = useState('all')
  const [view, setView] = useState<SettingsUserView>('active')
  const [auditTarget, setAuditTarget] = useState<{ id: string; type: 'user' | 'apresentadora'; title: string } | null>(null)
  const [resetUser, setResetUser] = useState<JsonRecord | null>(null)
  const [inviteNotice, setInviteNotice] = useState('')

  const usuariosQueryKey = QK.configuracaoUsuarios(currentUser?.tenant_id, 'usuarios')
  const apresentadorasQueryKey = QK.configuracaoUsuarios(currentUser?.tenant_id, 'apresentadoras')
  const convitesQueryKey = QK.configuracaoUsuarios(currentUser?.tenant_id, 'convites')
  const usuarios = useQuery({ queryKey: usuariosQueryKey, queryFn: () => getUsuarios({ include_inactive: true }) })
  const convites = useQuery({ queryKey: convitesQueryKey, queryFn: getConvitesPendentes })
  const clientes = useQuery({ queryKey: QK.clientes(), queryFn: () => getClientes() })
  const apresentadoras = useQuery({
    queryKey: apresentadorasQueryKey,
    queryFn: () => getApresentadoras({ include_inactive: true }),
  })

  const presenterProfileOptions = useMemo(
    () => toPresenterOptions((apresentadoras.data ?? []).filter((item) => !asString(item.user_id, ''))),
    [apresentadoras.data],
  )

  const editingPresenterId = editingUser ? presenterProfileId(editingUser) : ''
  const editingHasPresenterProfile = Boolean(editingUser && (isPresenterProfile(editingUser) || isPresenterUser(editingUser)))

  const faixasQuery = useQuery({
    queryKey: QK.apresentadoraFaixasComissao(editingPresenterId),
    queryFn: () => getApresentadoraFaixasComissao(editingPresenterId),
    enabled: Boolean(editingPresenterId) && editingHasPresenterProfile,
  })

  function invalidateUserDirectory() {
    void client.invalidateQueries({ queryKey: usuariosQueryKey })
    void client.invalidateQueries({ queryKey: apresentadorasQueryKey })
    void client.invalidateQueries({ queryKey: convitesQueryKey })
    // Consumers outside Configurações intentionally retain their active-only cache keys.
    void client.invalidateQueries({ queryKey: QK.usuarios })
    void client.invalidateQueries({ queryKey: QK.apresentadoras() })
  }

  // ---- Mutations ------------------------------------------------------------
  const inviteMutation = useMutation({
    mutationFn: convidarUsuario,
    onSuccess: () => {
      setForm(emptyForm)
      setCreateOpen(false)
      invalidateUserDirectory()
      void client.invalidateQueries({ queryKey: QK.clientes() })
      void client.invalidateQueries({ queryKey: QK.cadastros() })
      void client.invalidateQueries({ queryKey: QK.apresentadoras() })
      invalidateFinanceiro(client)
    },
  })
  const uploadCreatePresenterImage = useMutation({
    mutationFn: (file: File) => uploadImageAsset(file, 'apresentadoras'),
    onSuccess: (data) => setForm((f) => ({ ...f, foto_url: asString(data.url, '') })),
  })
  const uploadEditPresenterImage = useMutation({
    mutationFn: (file: File) => uploadImageAsset(file, 'apresentadoras'),
    onSuccess: (data) => setEditForm((f) => ({ ...f, foto_url: asString(data.url, '') })),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateUsuario(id, payload),
    onSuccess: () => {
      setEditingUser(null); setEditForm(emptyEditForm)
      invalidateUserDirectory()
      invalidateFinanceiro(client)
    },
  })
  const updatePresenterMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateApresentadora(id, payload),
    onSuccess: () => {
      setEditingUser(null); setEditForm(emptyEditForm)
      invalidateUserDirectory()
      invalidateFinanceiro(client)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteUsuario,
    onSuccess: (_data, id) => {
      setView('active'); setEditingUser(null); setEditForm(emptyEditForm); setOriginalEditForm(emptyEditForm)
      client.setQueriesData<JsonRecord[]>({ queryKey: QK.usuarios }, (old) =>
        Array.isArray(old) ? old.filter((item) => asString(item.id, '') !== id) : old)
      invalidateUserDirectory()
      invalidateFinanceiro(client)
    },
  })
  const deletePresenterMutation = useMutation({
    mutationFn: deleteApresentadora,
    onSuccess: (_data, id) => {
      setView('active'); setEditingUser(null); setEditForm(emptyEditForm); setOriginalEditForm(emptyEditForm)
      client.setQueriesData<JsonRecord[]>({ queryKey: QK.apresentadoras() }, (old) =>
        Array.isArray(old) ? old.filter((item) => asString(item.id, '') !== id) : old)
      invalidateUserDirectory()
      invalidateFinanceiro(client)
    },
  })
  const resetMutation = useMutation({ mutationFn: resetSenhaUsuario, gcTime: 0 })
  const logoutMutation = useMutation({ mutationFn: forceLogoutUsuario })
  const resendInviteMutation = useMutation({
    mutationFn: reenviarConviteUsuario,
    onSuccess: (result) => {
      setInviteNotice(result.invite_enviado === true
        ? 'Convite renovado e e-mail enviado.'
        : 'Convite renovado, mas o e-mail não foi confirmado como enviado. Verifique a entrega antes de orientar a pessoa.')
      void client.invalidateQueries({ queryKey: convitesQueryKey })
      void client.invalidateQueries({ queryKey: usuariosQueryKey })
    },
  })
  const createFaixaMutation = useMutation({
    mutationFn: ({ apresentadoraId, payload }: { apresentadoraId: string; payload: JsonRecord }) => createApresentadoraFaixaComissao(apresentadoraId, payload),
    onSuccess: () => {
      setFaixaForm(emptyFaixaForm)
      void client.invalidateQueries({ queryKey: QK.apresentadoraFaixasComissao() })
      void client.invalidateQueries({ queryKey: ['usuarios'] })
      void client.invalidateQueries({ queryKey: ['apresentadoras'] })
    },
  })
  const deleteFaixaMutation = useMutation({
    mutationFn: ({ apresentadoraId, faixaId }: { apresentadoraId: string; faixaId: string }) => deleteApresentadoraFaixaComissao(apresentadoraId, faixaId),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['apresentadora-faixas-comissao'] }),
  })
  const editMutation = useMutation({
    mutationFn: async ({ user, form: ef, original }: { user: JsonRecord; form: typeof emptyEditForm; original: typeof emptyEditForm }) => {
      const presenterIdResolved = presenterProfileId(user)
      const presenterPapel = isPresenterUser(user) || isPresenterRole(ef.papel) || isPresenterProfile(user)
      const presenterPayload: JsonRecord = {}
      if (presenterPapel && isPresenterProfile(user)) {
        if (ef.nome !== original.nome) presenterPayload.nome = ef.nome
        if (ef.email !== original.email) presenterPayload.email = ef.email
        if (ef.ativo !== original.ativo) presenterPayload.ativo = ef.ativo
      }
      if (presenterPapel) {
        if (ef.fixo !== original.fixo && ef.fixo !== '') presenterPayload.fixo = parseBRMoneyToDecimal(ef.fixo)
        if (ef.foto_url !== original.foto_url) presenterPayload.foto_url = ef.foto_url || null
        if (ef.data_inicio !== original.data_inicio) presenterPayload.data_inicio = ef.data_inicio || null
        if (ef.data_fim !== original.data_fim) presenterPayload.data_fim = ef.data_fim || null
      }
      if (isPresenterProfile(user)) {
        return Object.keys(presenterPayload).length ? updateApresentadora(presenterIdResolved, presenterPayload) : user
      }

      const accountPayload: JsonRecord = {}
      if (ef.nome !== original.nome) accountPayload.nome = ef.nome
      if (ef.email !== original.email) accountPayload.email = ef.email
      if (ef.papel !== original.papel) accountPayload.papel = ef.papel
      if (ef.ativo !== original.ativo) accountPayload.ativo = ef.ativo
      const accountResult = Object.keys(accountPayload).length ? await updateUsuario(asString(user.id, ''), accountPayload) : null
      const presenterOnlyPayload = Object.fromEntries(Object.entries(presenterPayload).filter(([key]) => !['nome', 'email', 'ativo'].includes(key)))
      if (presenterPapel && Object.keys(presenterOnlyPayload).length) {
        return updateApresentadora(presenterIdResolved, presenterOnlyPayload)
      }
      return accountResult ?? user
    },
    onSuccess: () => {
      setEditingUser(null); setEditForm(emptyEditForm); setOriginalEditForm(emptyEditForm)
      invalidateUserDirectory()
      invalidateFinanceiro(client)
      void client.invalidateQueries({ queryKey: QK.apresentadoraFaixasComissao() })
    },
  })

  // ---- Derived data --------------------------------------------------------
  const allRows = useMemo(() => {
    return attachPendingInvites(
      consolidateSettingsUserRows(usuarios.data ?? [], apresentadoras.data ?? []),
      convites.data ?? [],
    )
  }, [usuarios.data, apresentadoras.data, convites.data])

  const rowsMatchingToolbar = useMemo(() => rowsMatchingSettingsToolbar(allRows, searchTerm, papelFilter), [allRows, papelFilter, searchTerm])

  const viewCounts = useMemo(() => settingsViewCounts(rowsMatchingToolbar), [rowsMatchingToolbar])

  const filteredRows = useMemo(() => filterSettingsUserRows(rowsMatchingToolbar, view), [rowsMatchingToolbar, view])

  if (usuarios.isLoading || apresentadoras.isLoading || convites.isLoading) return <LoadingState />
  if (usuarios.isError || apresentadoras.isError || convites.isError) {
    const failedQuery = usuarios.isError ? usuarios : apresentadoras.isError ? apresentadoras : convites
    return <ErrorState message={extractErrorMessage(failedQuery.error)} onRetry={() => void failedQuery.refetch()} />
  }

  // ---- Handlers ------------------------------------------------------------
  function setField(key: keyof CreateFormState, value: string) {
    setForm((current) => {
      if (key === 'papel' && isPresenterRole(value) && !current.fixo) {
        return { ...current, [key]: value, fixo: '2700' }
      }
      return { ...current, [key]: value }
    })
  }

  function setEditField(key: keyof typeof emptyEditForm, value: string | boolean) {
    setEditForm((current) => {
      if (key === 'papel' && typeof value === 'string' && isPresenterRole(value) && !current.fixo) {
        return { ...current, [key]: value, fixo: '2700' }
      }
      return { ...current, [key]: value }
    })
  }

  function openEditUser(item: JsonRecord) {
    editMutation.reset()
    setEditingUser(item)
    const nextEditForm = {
      nome: asString(item.nome, ''),
      email: asString(item.email, ''),
      papel: asString(item.papel, 'gerente'),
      ativo: ativoValue(item.ativo),
      fixo: isPresenterUser(item) || isPresenterProfile(item) ? presenterFixedValue(item) : asString(item.fixo_mensal ?? item.fixo, ''),
      foto_url: asString(item.foto_url ?? item.apresentadora_foto_url, ''),
      data_inicio: asString(item.data_inicio ?? '', '').slice(0, 10),
      data_fim: asString(item.data_fim ?? '', '').slice(0, 10),
    }
    setEditForm(nextEditForm)
    setOriginalEditForm(nextEditForm)
  }

  function openCreateAccess(item: JsonRecord) {
    inviteMutation.reset()
    setForm({
      ...emptyForm,
      nome: asString(item.nome, ''),
      email: asString(item.email, ''),
      papel: 'apresentador',
      apresentadora_id: presenterProfileId(item),
      // O perfil já existe: não sugerir que este acesso muda a remuneração.
      fixo: '',
      foto_url: '',
    })
    setCreateOpen(true)
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    inviteMutation.mutate({
      nome: form.nome,
      email: form.email,
      papel: form.papel,
      ...(form.papel === 'cliente_parceiro' ? { cliente_id: form.cliente_id } : {}),
      ...(isPresenterRole(form.papel) && form.apresentadora_id ? { apresentadora_id: form.apresentadora_id } : {}),
      // Vínculos preservam os dados financeiros e visuais do perfil existente.
      ...(isPresenterRole(form.papel) && !form.apresentadora_id && form.fixo !== '' ? { fixo: parseBRMoneyToDecimal(form.fixo) } : {}),
      ...(isPresenterRole(form.papel) && !form.apresentadora_id && form.foto_url ? { foto_url: form.foto_url } : {}),
      senha_temporaria: form.senha_temporaria,
    })
  }

  function onEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingUser) return
    if (sameEditForm(editForm, originalEditForm)) return
    editMutation.mutate({ user: editingUser, form: editForm, original: originalEditForm })
  }

  function onDeleteUser(item: JsonRecord) {
    const label = asString(item.nome ?? item.email, 'usuário')
    if (!window.confirm(`Excluir/desativar o usuário "${label}"?`)) return
    if (isPresenterProfile(item)) { deletePresenterMutation.mutate(presenterProfileId(item)); return }
    deleteMutation.mutate(asString(item.id, ''))
  }

  function closeResetModal() {
    setResetUser(null)
    resetMutation.reset()
  }

  function submitFaixa() {
    if (!editingPresenterId) return
    createFaixaMutation.mutate({
      apresentadoraId: editingPresenterId,
      payload: {
        gmv_inicio: parseBRMoneyToDecimal(faixaForm.gmv_inicio),
        gmv_fim: faixaForm.gmv_fim ? parseBRMoneyToDecimal(faixaForm.gmv_fim) : null,
        comissao_pct: Number(faixaForm.comissao_pct || 0),
      },
    })
  }

  const listMutations = {
    updatePending: updateMutation.isPending || updatePresenterMutation.isPending,
    deletePending: deleteMutation.isPending || deletePresenterMutation.isPending,
    resetPending: resetMutation.isPending,
    logoutPending: logoutMutation.isPending,
    invitePending: resendInviteMutation.isPending,
    updateError: updateMutation.error ?? updatePresenterMutation.error,
    deleteError: deleteMutation.error ?? deletePresenterMutation.error,
    logoutError: logoutMutation.error,
    inviteError: resendInviteMutation.error,
  }

  return (
    <div className="settings-users-panel space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-base font-bold text-ink">Usuários e equipe</p>
              <p className="mt-1 text-xs text-ink-muted">Acessos e perfis vinculados à unidade.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={RefreshCcw} aria-label="Atualizar usuários e equipe" onClick={() => { void usuarios.refetch(); void apresentadoras.refetch(); void convites.refetch() }}>
                Atualizar
              </Button>
              <Button icon={UserPlus} onClick={() => setCreateOpen(true)}>Novo acesso</Button>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-1 border-b border-line" role="tablist" aria-label="Vistas de usuários e equipe">
            {[
              { value: 'all', label: 'Todos', count: viewCounts.all },
              { value: 'active', label: 'Ativos', count: viewCounts.active },
              { value: 'inactive', label: 'Inativos', count: viewCounts.inactive },
              { value: 'without_access', label: 'Sem acesso', count: viewCounts.without_access },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={view === item.value}
                className={`min-h-10 border-b-2 px-3 text-sm font-semibold transition ${view === item.value ? 'border-brand text-brand' : 'border-transparent text-ink-muted hover:text-ink'}`}
                onClick={() => setView(item.value as typeof view)}
              >
                {item.label} <span className="ml-1 text-xs tabular-nums">{item.count}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_190px_auto] lg:items-center">
            <label className="relative block min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input className="design-input h-10 w-full px-10 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou e-mail" />
            </label>
            <select className="design-input h-10 px-3 text-sm" value={papelFilter} onChange={(e) => setPapelFilter(e.target.value)}>
              <option value="all">Todos os papéis</option>
              {papelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            {searchTerm || papelFilter !== 'all' ? <Button variant="secondary" onClick={() => { setSearchTerm(''); setPapelFilter('all') }}>Limpar filtros</Button> : null}
          </div>
        </CardHeader>
        <CardBody>
          <UsuariosList
            data={filteredRows}
            mutations={listMutations}
            actions={{
              onEdit: openEditUser,
              onToggleAtivo: (item) => {
                const id = asString(item.id, '')
                const presenterOnly = asString(item.origem_perfil) === 'apresentadora'
                const ativo = ativoValue(item.ativo)
                const label = asString(item.nome ?? item.email, 'usuário')
                const action = ativo ? 'inativar' : 'reativar'
                if (!window.confirm(`Confirma ${action} ${label}? ${ativo ? 'A pessoa perderá acesso até ser reativada.' : 'A pessoa voltará a poder acessar a plataforma.'}`)) return
                const presenterId = presenterProfileId(item)
                if (presenterOnly) { updatePresenterMutation.mutate({ id: presenterId, payload: { ativo: !ativo } }); return }
                updateMutation.mutate({ id, payload: { ativo: !ativo } })
              },
              onResetSenha: (id) => {
                const item = filteredRows.find((row) => asString(row.id, '') === id)
                if (!item) return
                resetMutation.reset()
                setResetUser(item)
              },
              onForceLogout: (id) => {
                const item = filteredRows.find((row) => asString(row.id, '') === id)
                const label = asString(item?.nome ?? item?.email, 'usuário')
                if (window.confirm(`Encerrar agora todas as sessões de ${label}? A pessoa precisará entrar novamente.`)) logoutMutation.mutate(id)
              },
              onCreateAccess: openCreateAccess,
              onResendInvite: (item) => {
                const label = asString(item.nome ?? item.email, 'usuário')
                if (!window.confirm(`Enviar um novo convite para ${label} (${asString(item.email, 'sem e-mail')})? O link anterior deixará de funcionar.`)) return
                setInviteNotice('')
                resendInviteMutation.reset()
                resendInviteMutation.mutate(asString(item.id, ''))
              },
            }}
          />
          {inviteNotice ? <p role="status" className="mt-3 rounded-lg bg-surface-muted px-4 py-3 text-sm text-ink">{inviteNotice}</p> : null}
          <p className="mt-3 text-xs text-ink-muted">
            {filteredRows.length} exibido{filteredRows.length === 1 ? '' : 's'} de {rowsMatchingToolbar.length} registro{rowsMatchingToolbar.length === 1 ? '' : 's'} no recorte.
          </p>
        </CardBody>
      </Card>

      <ResetSenhaModal
        open={Boolean(resetUser)}
        nome={asString(resetUser?.nome, '')}
        email={asString(resetUser?.email, '')}
        password={resetMutation.isSuccess ? asString(resetMutation.data?.senha_temporaria, '') || null : null}
        pending={resetMutation.isPending}
        error={resetMutation.error}
        onClose={closeResetModal}
        onConfirm={() => {
          const id = asString(resetUser?.id, '')
          if (id) resetMutation.mutate(id)
        }}
      />

      {/* ---- Create modal ---- */}
      <Modal
        open={isCreateOpen}
        title="Novo acesso"
        subtitle="Cadastro único para equipe, apresentadoras e clientes parceiros. Defina uma senha temporária — o usuário poderá trocá-la depois."
        size="lg"
        onClose={() => setCreateOpen(false)}
        footer={(
          <>
            <Button type="submit" form="usuario-create-form" icon={UserPlus} isLoading={inviteMutation.isPending}>Criar usuário</Button>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
          </>
        )}
      >
        <form className="space-y-5" id="usuario-create-form" onSubmit={onSubmit}>
          <UsuarioForm
            form={form}
            onFieldChange={setField}
            clientes={clientes.data ?? []}
            presenterProfileOptions={presenterProfileOptions}
            uploadState={{ isPending: uploadCreatePresenterImage.isPending, isError: uploadCreatePresenterImage.isError, error: uploadCreatePresenterImage.error }}
            onFileSelect={(file) => uploadCreatePresenterImage.mutate(file)}
            inviteError={inviteMutation.error}
            isInviteError={inviteMutation.isError}
          />
        </form>
      </Modal>

      {/* ---- Edit modal ---- */}
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
            {editingUser ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAuditTarget(isPresenterProfile(editingUser)
                  ? { id: editingPresenterId, type: 'apresentadora', title: 'Histórico de alterações — apresentadora' }
                  : { id: asString(editingUser.id, ''), type: 'user', title: 'Histórico de alterações — usuário' })}
              >
                Histórico
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>Cancelar</Button>
          </>
        )}
      >
        <form className="space-y-5" id="usuario-edit-form" onSubmit={onEditSubmit}>
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Nome</span>
              <input className="design-input mt-2 h-11 w-full px-4" value={editForm.nome} onChange={(e) => setEditField('nome', e.target.value)} placeholder="Nome completo" required />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">E-mail</span>
              <input type="email" className="design-input mt-2 h-11 w-full px-4" value={editForm.email} onChange={(e) => setEditField('email', e.target.value)} placeholder="email@exemplo.com" required />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Status</span>
              <select className="design-input mt-2 h-11 w-full px-4" value={editForm.ativo ? 'true' : 'false'} onChange={(e) => setEditField('ativo', e.target.value === 'true')}>
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
            <UsuarioPapelSelect
              value={editForm.papel}
              onChange={(role) => setEditField('papel', role)}
              disabled={isPresenterProfile(editingUser)}
            />
          </section>

          {(isPresenterRole(editForm.papel) || isPresenterProfile(editingUser)) ? (
            <ApresentadoraRemuneracao
              form={editForm}
              onFieldChange={(key, value) => setEditField(key as keyof typeof emptyEditForm, value)}
              uploadState={{ isPending: uploadEditPresenterImage.isPending, isError: uploadEditPresenterImage.isError, error: uploadEditPresenterImage.error }}
              onFileSelect={(file) => uploadEditPresenterImage.mutate(file)}
            />
          ) : null}

          {editingPresenterId && editingHasPresenterProfile ? (
            <ApresentadoraFaixas
              apresentadoraId={editingPresenterId}
              faixaForm={faixaForm}
              onFaixaFormChange={setFaixaForm}
              onAddFaixa={() => submitFaixa()}
              onDeleteFaixa={(faixaId) => deleteFaixaMutation.mutate({ apresentadoraId: editingPresenterId, faixaId })}
              faixasQuery={faixasQuery}
              mutations={{
                createPending: createFaixaMutation.isPending,
                deletePending: deleteFaixaMutation.isPending,
                createError: createFaixaMutation.error,
                deleteError: deleteFaixaMutation.error,
                isCreateError: createFaixaMutation.isError,
                isDeleteError: deleteFaixaMutation.isError,
              }}
            />
          ) : null}
          {editMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(editMutation.error)}</p> : null}
        </form>
      </Modal>

      {/* ---- Audit history modal ---- */}
      <HistoricoAuditModal
        open={Boolean(auditTarget)}
        onClose={() => setAuditTarget(null)}
        entityType={auditTarget?.type ?? 'user'}
        entityId={auditTarget?.id ?? ''}
        titulo={auditTarget?.title ?? 'Histórico de alterações'}
      />
    </div>
  )
}
