import clsx from 'clsx'
import {
  Building2,
  MonitorPlay,
  Shield,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react'

interface RoleOption {
  value: string
  label: string
  helper: string
  icon: LucideIcon
}

export const roleOptions: RoleOption[] = [
  { value: 'gerente', label: 'Gerente', helper: 'Gestão da unidade', icon: Shield },
  { value: 'operacional', label: 'Operacional', helper: 'Agenda, lives e vídeos', icon: MonitorPlay },
  { value: 'apresentador', label: 'Apresentadora', helper: 'Perfil e remuneração', icon: UserRoundCheck },
  { value: 'cliente_parceiro', label: 'Cliente', helper: 'Acesso do parceiro', icon: Building2 },
]

interface Props {
  value: string
  onChange: (role: string) => void
  allowedRoles?: string[]
  disabled?: boolean
}

export function UsuarioPapelSelect({ value, onChange, allowedRoles, disabled = false }: Props) {
  const options = allowedRoles
    ? roleOptions.filter((opt) => allowedRoles.includes(opt.value))
    : roleOptions

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {options.map((option) => {
        const Icon = option.icon
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            className={clsx(
              'flex min-h-20 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
              active ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-ink hover:bg-surface-muted',
              disabled && 'cursor-not-allowed opacity-60',
            )}
            onClick={() => onChange(option.value)}
          >
            <span className={clsx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', active ? 'bg-button-primary text-button-primary-foreground' : 'bg-surface-muted text-ink-muted')}>
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
  )
}
