import {
  CheckCircle2,
  Edit2,
  KeyRound,
  LogOut,
  Mail,
  Shield,
  Trash2,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { Button } from '../ui/Button'
import { Badge, statusTone } from '../ui/Badge'
import { DataTable } from '../ui/DataTable'
import { FaixaBadge } from '../comissao/FaixaBadge'
import { extractErrorMessage } from '../../services/api'
import { asNumber, asArray, asString, formatMoney } from '../../utils/format'
import { isPresenterRole } from '../../utils/presenters'
import type { JsonRecord } from '../../types/models'

const papelLabels: Record<string, string> = {
  gerente: 'Gerente',
  operacional: 'Operacional',
  apresentador: 'Apresentadora',
  cliente_parceiro: 'Cliente parceiro',
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

function isPresenterMissingProfile(item: JsonRecord | null | undefined) {
  return isPresenterRole(item?.papel) && !asString(item?.apresentadora_id, '') && !isPresenterProfile(item)
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

interface RowActions {
  onEdit: (item: JsonRecord) => void
  onToggleAtivo: (item: JsonRecord) => void
  onDelete: (item: JsonRecord) => void
  onResetSenha: (id: string) => void
  onResendConvite: (id: string) => void
  onForceLogout: (id: string) => void
  onCreateAccess: (item: JsonRecord) => void
}

interface MutationState {
  updatePending: boolean
  deletePending: boolean
  resetPending: boolean
  resendPending: boolean
  logoutPending: boolean
  updateError: unknown
  deleteError: unknown
  resetError: unknown
  logoutError: unknown
  resendError: unknown
  resetData: unknown
}

interface Props {
  data: JsonRecord[]
  actions: RowActions
  mutations: MutationState
  /** Map from apresentadora_id → faixas array, used to render FaixaBadge per presenter row. */
  faixasPorApresentadora?: Record<string, JsonRecord[]>
  /** GMV mensal por apresentadora_id, used together with faixasPorApresentadora. */
  gmvMesPorApresentadora?: Record<string, number>
}

export function UsuariosList({ data, actions, mutations, faixasPorApresentadora = {}, gmvMesPorApresentadora = {} }: Props) {
  const anyWriteError =
    mutations.updateError ||
    mutations.deleteError ||
    mutations.resetError ||
    mutations.logoutError ||
    mutations.resendError

  return (
    <>
      <DataTable<JsonRecord>
        data={data}
        columns={[
          {
            key: 'pessoa',
            header: 'Pessoa',
            render: (item) => {
              const profileOnly = isPresenterProfile(item)
              const photo = asString(item.foto_url ?? item.apresentadora_foto_url, '')
              return (
                <div className="flex min-w-60 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-soft text-sm font-black text-brand">
                    {photo ? (
                      <img src={photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      initialsFor(item)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{asString(item.nome)}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-muted">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {asString(item.email)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {profileOnly ? <Badge tone="warning">sem acesso</Badge> : null}
                      {isPresenterMissingProfile(item) ? <Badge tone="danger">perfil operacional pendente</Badge> : null}
                      {!profileOnly && !isPresenterMissingProfile(item) ? <Badge tone="neutral">acesso criado</Badge> : null}
                    </div>
                  </div>
                </div>
              )
            },
          },
          {
            key: 'papel',
            header: 'Papel',
            render: (item) => (
              <Badge tone={isPresenterUser(item) ? 'success' : asString(item.papel) === 'cliente_parceiro' ? 'info' : 'brand'}>
                {roleLabel(item)}
              </Badge>
            ),
          },
          {
            key: 'remuneracao',
            header: 'Remuneração',
            align: 'right',
            render: (item) => {
              const presenter = isPresenterUser(item) || isPresenterProfile(item)
              if (!presenter) return <span className="text-ink-muted">—</span>
              const apresentadoraId = asString(item.apresentadora_id ?? item.id, '')
              const faixas = asArray<JsonRecord>(faixasPorApresentadora[apresentadoraId])
              const gmvMes = gmvMesPorApresentadora[apresentadoraId] ?? 0
              return (
                <div className="space-y-1 text-right">
                  <p className="num font-bold text-ink">{formatMoney(item.fixo_mensal ?? item.fixo)}</p>
                  <p className="text-xs text-ink-muted">
                    base {asNumber(item.comissao_pct).toLocaleString('pt-BR')}%
                  </p>
                  {faixas.length > 0 ? (
                    <div className="flex justify-end">
                      <FaixaBadge gmvMes={gmvMes} faixas={faixas} />
                    </div>
                  ) : null}
                </div>
              )
            },
          },
          {
            key: 'ativo',
            header: 'Status',
            render: (item) => (
              <Badge tone={statusTone(ativoValue(item.ativo) ? 'ativo' : 'inativo')}>
                {ativoValue(item.ativo) ? 'ativo' : 'inativo'}
              </Badge>
            ),
          },
          {
            key: 'acoes',
            header: 'Ações',
            align: 'right',
            render: (item) => {
              const id = asString(item.id, '')
              const presenterOnly = asString(item.origem_perfil) === 'apresentadora'
              const ativo = ativoValue(item.ativo)
              return (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    className="h-9 px-3"
                    variant="secondary"
                    icon={Edit2}
                    disabled={mutations.updatePending}
                    onClick={() => actions.onEdit(item)}
                  >
                    Editar
                  </Button>
                  {presenterOnly ? (
                    <Button
                      className="h-9 px-3"
                      variant="secondary"
                      icon={UserPlus}
                      disabled={mutations.updatePending}
                      onClick={() => actions.onCreateAccess(item)}
                    >
                      Criar acesso
                    </Button>
                  ) : null}
                  <IconActionButton
                    icon={ativo ? Shield : CheckCircle2}
                    label={ativo ? 'Inativar' : 'Reativar'}
                    tone={ativo ? 'neutral' : 'success'}
                    disabled={mutations.updatePending}
                    onClick={() => actions.onToggleAtivo(item)}
                  />
                  <IconActionButton
                    icon={KeyRound}
                    label="Resetar senha"
                    disabled={presenterOnly || mutations.resetPending}
                    onClick={() => actions.onResetSenha(id)}
                  />
                  <IconActionButton
                    icon={LogOut}
                    label="Forçar logout"
                    disabled={presenterOnly || mutations.logoutPending}
                    onClick={() => actions.onForceLogout(id)}
                  />
                  <IconActionButton
                    icon={Trash2}
                    label="Excluir"
                    tone="danger"
                    disabled={mutations.deletePending}
                    onClick={() => actions.onDelete(item)}
                  />
                </div>
              )
            },
          },
        ]}
      />

      {anyWriteError ? (
        <p className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
          {extractErrorMessage(
            mutations.updateError ??
            mutations.deleteError ??
            mutations.resetError ??
            mutations.logoutError ??
            mutations.resendError,
          )}
        </p>
      ) : null}

      {mutations.resetData ? (
        <p className="mt-4 rounded-2xl bg-[var(--warning-soft)] px-4 py-3 text-sm font-semibold text-[var(--warning)]">
          Senha temporária: {asString((mutations.resetData as Record<string, unknown>).senha_temporaria)}
        </p>
      ) : null}
    </>
  )
}
