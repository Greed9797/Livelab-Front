import {
  CheckCircle2,
  Edit2,
  KeyRound,
  LogOut,
  Mail,
  MoreHorizontal,
  Shield,
  UserPlus,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Badge, statusTone } from '../ui/Badge'
import { DataTable } from '../ui/DataTable'
import { extractErrorMessage } from '../../services/api'
import { asString } from '../../utils/format'
import { isPresenterRole } from '../../utils/presenters'
import type { JsonRecord } from '../../types/models'

const papelLabels: Record<string, string> = {
  gerente: 'Gerente',
  gerente_comercial: 'Gerente comercial',
  financeiro: 'Financeiro',
  operacional: 'Operacional',
  apresentador: 'Apresentadora',
  apresentadora: 'Apresentadora',
  cliente_parceiro: 'Cliente parceiro',
}

function ativoValue(value: unknown) {
  return value === true || value === 'true'
}

function inactiveValue(value: unknown) {
  return value === false || value === 'false'
}

function isPresenterProfile(item: JsonRecord | null | undefined) {
  return asString(item?.origem_perfil) === 'apresentadora'
}

function isPresenterUser(item: JsonRecord | null | undefined) {
  return isPresenterRole(item?.papel) || item?.pode_apresentar_live === true
}

function isPresenterMissingProfile(item: JsonRecord | null | undefined) {
  return isPresenterRole(item?.papel) && !asString(item?.apresentadora_id, '') && !isPresenterProfile(item)
}

function initialsFor(item: JsonRecord) {
  const source = asString(item.nome ?? item.email, '')
  const parts = source.split(/\s+/).filter(Boolean)
  const initials = parts.length > 1 ? `${parts[0][0] ?? ''}${parts[1][0] ?? ''}` : source.slice(0, 2)
  return initials.toUpperCase() || 'US'
}

function roleLabel(item: JsonRecord) {
  return papelLabels[asString(item.papel)] ?? asString(item.papel, 'Sem papel')
}

function formatJoined(value: unknown) {
  const raw = asString(value, '')
  if (!raw) return '—'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

interface RowActions {
  onEdit: (item: JsonRecord) => void
  onToggleAtivo: (item: JsonRecord) => void
  onResetSenha: (id: string) => void
  onForceLogout: (id: string) => void
  onCreateAccess: (item: JsonRecord) => void
  onResendInvite: (item: JsonRecord) => void
}

interface MutationState {
  updatePending: boolean
  resetPending: boolean
  logoutPending: boolean
  updateError: unknown
  logoutError: unknown
  invitePending: boolean
  inviteError: unknown
}

interface Props {
  data: JsonRecord[]
  actions: RowActions
  mutations: MutationState
}

function UserActionsMenu({ item, actions, mutations }: { item: JsonRecord; actions: RowActions; mutations: MutationState }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const id = asString(item.id, '')
  const profileOnly = isPresenterProfile(item)
  const invitePending = item.primeiro_acesso === false || item.primeiro_acesso === 'false'
  const ativo = ativoValue(item.ativo)
  const statusKnown = ativo || inactiveValue(item.ativo)
  const label = asString(item.nome ?? item.email, 'usuário')

  useEffect(() => {
    if (!open) return
    function close(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  function run(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <div ref={ref} className="relative inline-flex justify-end">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Mais ações para ${label}`}
        className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-muted hover:text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-[var(--shadow-card-lg)]">
          <MenuAction icon={Edit2} label="Editar" disabled={mutations.updatePending} onClick={() => run(() => actions.onEdit(item))} />
          {profileOnly ? (
            <MenuAction icon={UserPlus} label="Criar acesso" disabled={mutations.updatePending} onClick={() => run(() => actions.onCreateAccess(item))} />
          ) : invitePending ? (
            <MenuAction icon={Mail} label="Reenviar convite" disabled={mutations.invitePending} onClick={() => run(() => actions.onResendInvite(item))} />
          ) : (
            <>
              <MenuAction icon={KeyRound} label="Resetar senha" disabled={mutations.resetPending} onClick={() => run(() => actions.onResetSenha(id))} />
              <MenuAction icon={LogOut} label="Forçar logout" disabled={mutations.logoutPending} onClick={() => run(() => actions.onForceLogout(id))} />
            </>
          )}
          {statusKnown ? <MenuAction icon={ativo ? Shield : CheckCircle2} label={ativo ? 'Inativar' : 'Reativar'} disabled={mutations.updatePending} onClick={() => run(() => actions.onToggleAtivo(item))} /> : null}
        </div>
      ) : null}
    </div>
  )
}

function MenuAction({ icon: Icon, label, disabled, onClick }: {
  icon: typeof Edit2
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      role="menuitem"
      type="button"
      disabled={disabled}
      className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
      onClick={onClick}
    >
      <Icon className="h-4 w-4 text-ink-muted" />
      {label}
    </button>
  )
}

export function UsuariosList({ data, actions, mutations }: Props) {
  const anyWriteError = mutations.updateError || mutations.logoutError || mutations.inviteError

  return (
    <>
      <DataTable<JsonRecord>
        data={data}
        rowKey={(item) => asString(item.id, '')}
        stackOnMobile
        mobileColumnKeys={['pessoa', 'papel_acesso', 'ativo', 'acoes']}
        columns={[
          {
            key: 'pessoa',
            header: 'Pessoa',
            render: (item) => {
              const photo = asString(item.foto_url ?? item.apresentadora_foto_url, '')
              return (
                <div className="flex min-w-64 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-soft text-sm font-black text-brand">
                    {photo ? <img src={photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : initialsFor(item)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{asString(item.nome, 'Sem nome')}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-muted"><Mail className="h-3.5 w-3.5 shrink-0" />{asString(item.email, 'E-mail não informado')}</p>
                  </div>
                </div>
              )
            },
          },
          {
            key: 'papel_acesso',
            header: 'Papel e acesso',
            render: (item) => {
              const profileOnly = isPresenterProfile(item)
              const missingProfile = isPresenterMissingProfile(item)
              const invitePending = item.primeiro_acesso === false || item.primeiro_acesso === 'false'
              return (
                <div className="space-y-1.5">
                  <Badge tone={isPresenterUser(item) ? 'success' : asString(item.papel) === 'cliente_parceiro' ? 'info' : 'brand'}>{roleLabel(item)}</Badge>
                  {invitePending ? <Badge tone={item.expirou === true || item.expirou === 'true' ? 'danger' : 'warning'}>{item.expirou === true || item.expirou === 'true' ? 'Convite expirado' : 'Convite pendente'}</Badge> : <p className="text-xs text-ink-muted">{profileOnly ? 'Perfil operacional sem login' : missingProfile ? 'Perfil operacional pendente' : 'Acesso criado'}</p>}
                </div>
              )
            },
          },
          {
            key: 'ativo',
            header: 'Status',
            render: (item) => {
              if (!ativoValue(item.ativo) && !inactiveValue(item.ativo)) return <Badge tone="neutral">Não verificado</Badge>
              return <Badge tone={statusTone(ativoValue(item.ativo) ? 'ativo' : 'inativo')}>{ativoValue(item.ativo) ? 'Ativo' : 'Inativo'}</Badge>
            },
          },
          {
            key: 'criado_em',
            header: 'Cadastro',
            render: (item) => <span className="whitespace-nowrap text-sm text-ink-muted">{formatJoined(item.criado_em)}</span>,
          },
          {
            key: 'acoes',
            header: '',
            align: 'right',
            render: (item) => <UserActionsMenu item={item} actions={actions} mutations={mutations} />,
          },
        ]}
      />

      {anyWriteError ? (
        <p className="mt-4 rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
          {extractErrorMessage(mutations.updateError ?? mutations.logoutError ?? mutations.inviteError)}
        </p>
      ) : null}
    </>
  )
}
