import { CheckCircle2, Edit2, KeyRound, LogOut, MailPlus, RefreshCcw, Shield, Trash2, UserPlus } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, statusTone } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { ErrorState, LoadingState } from '../components/ui/States'
import { Modal } from '../components/ui/Modal'
import { asNumber, asString, formatMoney } from '../utils/format'
import { extractErrorMessage } from '../services/api'
import {
  convidarUsuario,
  deleteApresentadora,
  deleteUsuario,
  forceLogoutUsuario,
  getApresentadoras,
  getClientes,
  getUsuarios,
  reenviarConviteUsuario,
  resetSenhaUsuario,
  updateApresentadora,
  updateUsuario,
} from '../services/domain'
import type { JsonRecord } from '../types/models'

const papeis = [
  'gerente',
  'operacional',
  'apresentador',
  'cliente_parceiro',
]

const papelLabels: Record<string, string> = {
  gerente: 'Gerente',
  operacional: 'Operacional',
  apresentador: 'Apresentador',
  cliente_parceiro: 'Cliente parceiro',
}

const emptyForm = {
  nome: '',
  email: '',
  papel: 'gerente',
  cliente_id: '',
  apresentadora_id: '',
  senha_temporaria: '',
}

const emptyEditForm = {
  nome: '',
  papel: 'gerente',
  ativo: true,
}

function ativoValue(value: unknown) {
  return value === true || value === 'true'
}

function isPresenterProfile(item: JsonRecord | null | undefined) {
  return asString(item?.origem_perfil) === 'apresentadora'
}

function presenterProfileId(item: JsonRecord) {
  return asString(item.apresentadora_id ?? item.id, '').replace(/^apresentadora:/, '')
}

export function SettingsUsuariosPanel() {
  const client = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [editingUser, setEditingUser] = useState<JsonRecord | null>(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [papelFilter, setPapelFilter] = useState('all')
  const [ativoFilter, setAtivoFilter] = useState('true')
  const usuarios = useQuery({
    queryKey: ['usuarios', papelFilter, ativoFilter],
    queryFn: () => getUsuarios({
      ...(papelFilter !== 'all' ? { papel: papelFilter } : {}),
      ...(ativoFilter !== 'all' ? { ativo: ativoFilter } : {}),
    }),
  })
  const clientes = useQuery({ queryKey: ['clientes'], queryFn: getClientes })
  const apresentadoras = useQuery({ queryKey: ['apresentadoras'], queryFn: getApresentadoras })

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

  const rows = useMemo(() => {
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
      .filter((item) => {
        if (papelFilter !== 'all' && papelFilter !== 'apresentador') return false
        if (ativoFilter !== 'all' && ativoValue(item.ativo) !== (ativoFilter === 'true')) return false
        return true
      })
    return [...userRows, ...presenterOnlyRows]
  }, [usuarios.data, apresentadoras.data, papelFilter, ativoFilter])

  if (usuarios.isLoading || clientes.isLoading || apresentadoras.isLoading) return <LoadingState />
  if (usuarios.isError) return <ErrorState message={extractErrorMessage(usuarios.error)} onRetry={() => void usuarios.refetch()} />

  function setField(key: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function openEditUser(item: JsonRecord) {
    setEditingUser(item)
    setEditForm({
      nome: asString(item.nome, ''),
      papel: asString(item.papel, 'gerente'),
      ativo: ativoValue(item.ativo),
    })
  }

  function setEditField(key: keyof typeof emptyEditForm, value: string | boolean) {
    setEditForm((current) => ({ ...current, [key]: value }))
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    inviteMutation.mutate({
      nome: form.nome,
      email: form.email,
      papel: form.papel,
      ...(form.papel === 'cliente_parceiro' ? { cliente_id: form.cliente_id } : {}),
      ...(form.papel === 'apresentador' && form.apresentadora_id ? { apresentadora_id: form.apresentadora_id } : {}),
      ...(form.senha_temporaria ? { senha_temporaria: form.senha_temporaria } : {}),
    })
  }

  function onEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingUser) return
    if (isPresenterProfile(editingUser)) {
      updatePresenterMutation.mutate({
        id: presenterProfileId(editingUser),
        payload: {
          nome: editForm.nome,
          ativo: editForm.ativo,
        },
      })
      return
    }
    updateMutation.mutate({
      id: asString(editingUser.id, ''),
      payload: {
        nome: editForm.nome,
        papel: editForm.papel,
        ativo: editForm.ativo,
      },
    })
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <p className="text-base font-bold text-ink">Novo usuário da equipe</p>
          <p className="mt-1 text-xs text-ink-muted">Crie acessos usando apenas os papéis oficiais da unidade.</p>
        </CardHeader>
        <CardBody>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={onSubmit}>
            <label className="block xl:col-span-2">
              <span className="text-sm font-semibold text-ink">Nome</span>
              <input className="design-input mt-2 h-11 w-full px-4" value={form.nome} onChange={(event) => setField('nome', event.target.value)} required />
            </label>
            <label className="block xl:col-span-2">
              <span className="text-sm font-semibold text-ink">E-mail</span>
              <input className="design-input mt-2 h-11 w-full px-4" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} required />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Papel</span>
              <select className="design-input mt-2 h-11 w-full px-4" value={form.papel} onChange={(event) => setField('papel', event.target.value)}>
                {papeis.map((papel) => <option key={papel} value={papel}>{papelLabels[papel] ?? papel}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Cliente vinculado</span>
              <select className="design-input mt-2 h-11 w-full px-4" value={form.cliente_id} onChange={(event) => setField('cliente_id', event.target.value)} required={form.papel === 'cliente_parceiro'}>
                <option value="">Selecionar</option>
                {(clientes.data ?? []).map((cliente) => <option key={asString(cliente.id, '')} value={asString(cliente.id, '')}>{asString(cliente.nome)}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Perfil de apresentador</span>
              <select className="design-input mt-2 h-11 w-full px-4" value={form.apresentadora_id} onChange={(event) => setField('apresentadora_id', event.target.value)}>
                <option value="">Opcional</option>
                {(apresentadoras.data ?? []).map((item) => <option key={asString(item.id, '')} value={asString(item.id, '')}>{asString(item.nome)}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Senha temporária</span>
              <input className="design-input mt-2 h-11 w-full px-4" value={form.senha_temporaria} onChange={(event) => setField('senha_temporaria', event.target.value)} placeholder="Opcional" />
            </label>
            {inviteMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] md:col-span-2 xl:col-span-4">{extractErrorMessage(inviteMutation.error)}</p> : null}
            {inviteMutation.isSuccess ? <p className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)] md:col-span-2 xl:col-span-4">Convite enviado.</p> : null}
            <div className="md:col-span-2 xl:col-span-4">
              <Button type="submit" icon={UserPlus} isLoading={inviteMutation.isPending}>Enviar convite</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <select className="design-input h-10 px-3 text-sm" value={papelFilter} onChange={(event) => setPapelFilter(event.target.value)}>
              <option value="all">Todos os papéis</option>
              {papeis.map((papel) => <option key={papel} value={papel}>{papelLabels[papel] ?? papel}</option>)}
            </select>
            <select className="design-input h-10 px-3 text-sm" value={ativoFilter} onChange={(event) => setAtivoFilter(event.target.value)}>
              <option value="all">Todos os status</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </div>
          <Button variant="secondary" icon={RefreshCcw} onClick={() => void usuarios.refetch()}>Atualizar</Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-base font-bold text-ink">Usuários e equipe</p>
          <p className="mt-1 text-xs text-ink-muted">Ações de acesso, vínculo operacional e status do usuário.</p>
        </CardHeader>
        <CardBody>
          <DataTable<JsonRecord>
            data={rows}
            columns={[
              { key: 'nome', header: 'Nome', render: (item) => <span className="font-semibold">{asString(item.nome)}</span> },
              { key: 'email', header: 'E-mail', render: (item) => asString(item.email) },
              { key: 'papel', header: 'Papel', render: (item) => <Badge tone="brand">{papelLabels[asString(item.papel)] ?? asString(item.papel)}</Badge> },
              {
                key: 'pode_apresentar_live',
                header: 'Pode apresentar',
                render: (item) => {
                  const papel = asString(item.papel)
                  const podeApresentar = item.pode_apresentar_live === true || papel === 'apresentador' || papel === 'apresentadora'
                  return podeApresentar ? <Badge tone="success">sim</Badge> : <Badge tone="neutral">não</Badge>
                },
              },
              { key: 'fixo', header: 'Fixo', align: 'right', render: (item) => formatMoney(item.fixo_mensal ?? item.fixo) },
              { key: 'comissao', header: 'Comissão', align: 'right', render: (item) => `${asNumber(item.comissao_live_pct ?? item.comissao_pct).toLocaleString('pt-BR')}%` },
              { key: 'meta', header: 'Meta diária', align: 'right', render: (item) => formatMoney(item.meta_diaria_gmv) },
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
                      <Button
                        variant="ghost"
                        icon={ativo ? Shield : CheckCircle2}
                        disabled={writePending}
                        onClick={() => presenterOnly
                          ? updatePresenterMutation.mutate({ id: presenterId, payload: { ativo: !ativo } })
                          : updateMutation.mutate({ id, payload: { ativo: !ativo } })
                        }
                      >
                        {ativo ? 'Inativar' : 'Reativar'}
                      </Button>
                      <Button variant="secondary" icon={Edit2} disabled={writePending} onClick={() => openEditUser(item)}>Editar</Button>
                      <Button variant="ghost" icon={KeyRound} disabled={presenterOnly || resetMutation.isPending} onClick={() => resetMutation.mutate(id)}>Resetar</Button>
                      <Button variant="ghost" icon={MailPlus} disabled={presenterOnly || resendMutation.isPending} onClick={() => resendMutation.mutate(id)}>Convite</Button>
                      <Button variant="ghost" icon={LogOut} disabled={presenterOnly || logoutMutation.isPending} onClick={() => logoutMutation.mutate(id)}>Logout</Button>
                      <Button variant="danger" icon={Trash2} disabled={deletePending} onClick={() => onDeleteUser(item)}>Excluir</Button>
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
        size="md"
      >
        <form className="grid gap-4 md:grid-cols-2" id="usuario-edit-form" onSubmit={onEditSubmit}>
          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-ink">Nome</span>
            <input className="design-input mt-2 h-11 w-full px-4" value={editForm.nome} onChange={(event) => setEditField('nome', event.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Papel</span>
            <select className="design-input mt-2 h-11 w-full px-4" value={editForm.papel} disabled={isPresenterProfile(editingUser)} onChange={(event) => setEditField('papel', event.target.value)}>
              {papeis.map((papel) => <option key={papel} value={papel}>{papelLabels[papel] ?? papel}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Status</span>
            <select className="design-input mt-2 h-11 w-full px-4" value={editForm.ativo ? 'true' : 'false'} onChange={(event) => setEditField('ativo', event.target.value === 'true')}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </label>
          {updateMutation.isError || updatePresenterMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] md:col-span-2">{extractErrorMessage(updateMutation.error ?? updatePresenterMutation.error)}</p> : null}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" icon={CheckCircle2} isLoading={updateMutation.isPending || updatePresenterMutation.isPending}>Salvar usuário</Button>
            {editingUser ? <Button type="button" variant="danger" icon={Trash2} isLoading={deleteMutation.isPending || deletePresenterMutation.isPending} onClick={() => onDeleteUser(editingUser)}>Excluir</Button> : null}
            <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
