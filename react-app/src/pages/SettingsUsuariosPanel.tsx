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
  uploadImageAsset,
  updateApresentadoraFaixaComissao,
  updateApresentadora,
  updateUsuario,
} from '../services/domain'
import type { JsonRecord } from '../types/models'
import { UsuariosList } from '../components/configuracoes/UsuariosList'
import { UsuarioForm, type CreateFormState } from '../components/configuracoes/UsuarioForm'
import { UsuarioPapelSelect } from '../components/configuracoes/UsuarioPapelSelect'
import { ApresentadoraRemuneracao } from '../components/configuracoes/ApresentadoraRemuneracao'
import { ApresentadoraFaixas } from '../components/configuracoes/ApresentadoraFaixas'

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
  const value = asNumber(item?.fixo_mensal ?? item?.fixo)
  return value > 0 ? String(value) : '2700'
}

function matchesSearch(item: JsonRecord, term: string) {
  if (!term) return true
  const haystack = [item.nome, item.email, item.telefone, item.cidade, item.papel, item.origem_perfil]
    .map((v) => asString(v, '').toLowerCase())
    .join(' ')
  return haystack.includes(term)
}

const statusOptions = [
  { value: 'true', label: 'Ativos' },
  { value: 'all', label: 'Todos' },
  { value: 'false', label: 'Inativos' },
]

const emptyForm: CreateFormState = {
  nome: '',
  email: '',
  papel: 'gerente',
  cliente_id: '',
  apresentadora_id: '',
  fixo: '2700',
  comissao_pct: '',
  meta_diaria_gmv: '',
  foto_url: '',
  senha_temporaria: '',
}

const emptyEditForm = {
  nome: '',
  papel: 'gerente',
  ativo: true,
  fixo: '2700',
  comissao_pct: '',
  meta_diaria_gmv: '',
  foto_url: '',
}

const emptyFaixaForm = { gmv_inicio: '0', gmv_fim: '', comissao_pct: '0' }

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function SettingsUsuariosPanel() {
  const client = useQueryClient()
  const [form, setForm] = useState<CreateFormState>(emptyForm)
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<JsonRecord | null>(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [faixaForm, setFaixaForm] = useState(emptyFaixaForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [papelFilter, setPapelFilter] = useState('all')
  const [ativoFilter, setAtivoFilter] = useState('true')

  const usuarios = useQuery({ queryKey: QK.usuarios, queryFn: getUsuarios })
  const clientes = useQuery({ queryKey: QK.clientes(), queryFn: getClientes })
  const apresentadoras = useQuery({ queryKey: QK.apresentadoras(), queryFn: getApresentadoras })

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

  // ---- Mutations ------------------------------------------------------------
  const inviteMutation = useMutation({
    mutationFn: convidarUsuario,
    onSuccess: () => {
      setForm(emptyForm)
      setCreateOpen(false)
      void client.invalidateQueries({ queryKey: QK.usuarios })
      void client.invalidateQueries({ queryKey: QK.clientes() })
      void client.invalidateQueries({ queryKey: QK.apresentadoras() })
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
    onSuccess: () => { setEditingUser(null); setEditForm(emptyEditForm); void client.invalidateQueries({ queryKey: ['usuarios'] }) },
  })
  const updatePresenterMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateApresentadora(id, payload),
    onSuccess: () => {
      setEditingUser(null); setEditForm(emptyEditForm)
      void client.invalidateQueries({ queryKey: ['usuarios'] })
      void client.invalidateQueries({ queryKey: ['apresentadoras'] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteUsuario,
    onSuccess: (_data, id) => {
      setAtivoFilter('true'); setEditingUser(null); setEditForm(emptyEditForm)
      client.setQueriesData<JsonRecord[]>({ queryKey: QK.usuarios }, (old) =>
        Array.isArray(old) ? old.filter((item) => asString(item.id, '') !== id) : old)
      void client.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
  const deletePresenterMutation = useMutation({
    mutationFn: deleteApresentadora,
    onSuccess: (_data, id) => {
      setAtivoFilter('true'); setEditingUser(null); setEditForm(emptyEditForm)
      client.setQueriesData<JsonRecord[]>({ queryKey: QK.apresentadoras() }, (old) =>
        Array.isArray(old) ? old.filter((item) => asString(item.id, '') !== id) : old)
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
      void client.invalidateQueries({ queryKey: QK.apresentadoraFaixasComissao() })
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
    mutationFn: async ({ user, form: ef }: { user: JsonRecord; form: typeof emptyEditForm }) => {
      const presenterIdResolved = presenterProfileId(user)
      const presenterPapel = isPresenterUser(user) || isPresenterRole(ef.papel) || isPresenterProfile(user)
      const presenterPayload: JsonRecord = {}
      if (presenterPapel) {
        presenterPayload.nome = ef.nome
        presenterPayload.ativo = ef.ativo
        if (ef.fixo !== '') presenterPayload.fixo = asNumber(ef.fixo)
        if (ef.comissao_pct !== '') presenterPayload.comissao_pct = asNumber(ef.comissao_pct)
        if (ef.meta_diaria_gmv !== '') presenterPayload.meta_diaria_gmv = asNumber(ef.meta_diaria_gmv)
        presenterPayload.foto_url = ef.foto_url || null
      }
      if (isPresenterProfile(user)) return updateApresentadora(presenterIdResolved, presenterPayload)
      const updatedUser = await updateUsuario(asString(user.id, ''), { nome: ef.nome, papel: ef.papel, ativo: ef.ativo })
      if (presenterPapel && presenterIdResolved && Object.keys(presenterPayload).length > 0) {
        await updateApresentadora(presenterIdResolved, presenterPayload)
      }
      return updatedUser
    },
    onSuccess: () => {
      setEditingUser(null); setEditForm(emptyEditForm)
      void client.invalidateQueries({ queryKey: ['usuarios'] })
      void client.invalidateQueries({ queryKey: ['apresentadoras'] })
      void client.invalidateQueries({ queryKey: QK.apresentadoraFaixasComissao() })
    },
  })

  // ---- Derived data --------------------------------------------------------
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

  if (usuarios.isLoading || clientes.isLoading || apresentadoras.isLoading) return <LoadingState />
  if (usuarios.isError) return <ErrorState message={extractErrorMessage(usuarios.error)} onRetry={() => void usuarios.refetch()} />

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
    setEditForm({
      nome: asString(item.nome, ''),
      papel: asString(item.papel, 'gerente'),
      ativo: ativoValue(item.ativo),
      fixo: isPresenterUser(item) || isPresenterProfile(item) ? presenterFixedValue(item) : asString(item.fixo_mensal ?? item.fixo, ''),
      comissao_pct: asString(item.comissao_live_pct ?? item.comissao_pct, ''),
      meta_diaria_gmv: asString(item.meta_diaria_gmv, ''),
      foto_url: asString(item.foto_url ?? item.apresentadora_foto_url, ''),
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
      ...(isPresenterRole(form.papel) && form.foto_url ? { foto_url: form.foto_url } : {}),
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
    if (isPresenterProfile(item)) { deletePresenterMutation.mutate(presenterProfileId(item)); return }
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

  const listMutations = {
    updatePending: updateMutation.isPending || updatePresenterMutation.isPending,
    deletePending: deleteMutation.isPending || deletePresenterMutation.isPending,
    resetPending: resetMutation.isPending,
    resendPending: resendMutation.isPending,
    logoutPending: logoutMutation.isPending,
    updateError: updateMutation.error ?? updatePresenterMutation.error,
    deleteError: deleteMutation.error ?? deletePresenterMutation.error,
    resetError: resetMutation.error,
    logoutError: logoutMutation.error,
    resendError: resendMutation.error,
    resetData: resetMutation.data,
  }

  return (
    <div className="settings-users-panel space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-base font-bold text-ink">Usuários e perfis</p>
              <p className="mt-1 text-xs text-ink-muted">
                {filteredRows.length} exibidos de {allRows.length} cadastros consolidados.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={RefreshCcw} onClick={() => { void usuarios.refetch(); void apresentadoras.refetch() }}>
                Atualizar
              </Button>
              <Button icon={UserPlus} onClick={() => setCreateOpen(true)}>Novo acesso</Button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_180px_160px] lg:items-center">
            <label className="relative block min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input className="design-input h-10 w-full px-10 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar pessoa" />
              {searchTerm ? <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted hover:text-ink" onClick={() => setSearchTerm('')}>limpar</button> : null}
            </label>
            <select className="design-input h-10 px-3 text-sm" value={papelFilter} onChange={(e) => setPapelFilter(e.target.value)}>
              <option value="all">Todos os papéis</option>
              <option value="gerente">Gerente</option>
              <option value="operacional">Operacional</option>
              <option value="apresentador">Apresentadora</option>
              <option value="cliente_parceiro">Cliente</option>
            </select>
            <select className="design-input h-10 px-3 text-sm" value={ativoFilter} onChange={(e) => setAtivoFilter(e.target.value)}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardBody>
          <UsuariosList
            data={filteredRows}
            mutations={listMutations}
            actions={{
              onEdit: openEditUser,
              onDelete: onDeleteUser,
              onToggleAtivo: (item) => {
                const id = asString(item.id, '')
                const presenterOnly = asString(item.origem_perfil) === 'apresentadora'
                const ativo = ativoValue(item.ativo)
                const presenterId = presenterProfileId(item)
                if (presenterOnly) { updatePresenterMutation.mutate({ id: presenterId, payload: { ativo: !ativo } }); return }
                updateMutation.mutate({ id, payload: { ativo: !ativo } })
              },
              onResetSenha: (id) => resetMutation.mutate(id),
              onResendConvite: (id) => resendMutation.mutate(id),
              onForceLogout: (id) => logoutMutation.mutate(id),
            }}
          />
        </CardBody>
      </Card>

      {/* ---- Create modal ---- */}
      <Modal
        open={isCreateOpen}
        title="Novo acesso"
        subtitle="Cadastro único para equipe, apresentadoras e clientes parceiros."
        size="lg"
        onClose={() => setCreateOpen(false)}
        footer={(
          <>
            <Button type="submit" form="usuario-create-form" icon={UserPlus} isLoading={inviteMutation.isPending}>Enviar convite</Button>
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
              onToggleFaixa={(faixaId, currentAtivo) => updateFaixaMutation.mutate({ apresentadoraId: editingPresenterId, faixaId, payload: { ativo: !currentAtivo } })}
              onDeleteFaixa={(faixaId) => deleteFaixaMutation.mutate({ apresentadoraId: editingPresenterId, faixaId })}
              faixasQuery={faixasQuery}
              mutations={{
                createPending: createFaixaMutation.isPending,
                updatePending: updateFaixaMutation.isPending,
                deletePending: deleteFaixaMutation.isPending,
                createError: createFaixaMutation.error,
                updateError: updateFaixaMutation.error,
                deleteError: deleteFaixaMutation.error,
                isCreateError: createFaixaMutation.isError,
                isUpdateError: updateFaixaMutation.isError,
                isDeleteError: deleteFaixaMutation.isError,
              }}
            />
          ) : null}
          {editMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(editMutation.error)}</p> : null}
        </form>
      </Modal>
    </div>
  )
}
