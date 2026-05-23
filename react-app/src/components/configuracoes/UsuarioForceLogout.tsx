import { LogOut } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  userId: string
  userName: string
  onConfirm: () => void
  isLoading: boolean
  disabled?: boolean
}

export function UsuarioForceLogout({ userId: _userId, userName, onConfirm, isLoading, disabled = false }: Props) {
  function handleClick() {
    if (window.confirm(`Forçar logout de "${userName}"? O usuário será desconectado imediatamente.`)) {
      onConfirm()
    }
  }

  return (
    <button
      type="button"
      title="Forçar logout"
      aria-label="Forçar logout"
      disabled={disabled || isLoading}
      onClick={handleClick}
      className={clsx(
        'inline-flex h-9 w-9 items-center justify-center rounded-full border transition focus:outline-none focus:ring-4 focus:ring-brand/20',
        'border-line bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink',
        (disabled || isLoading) && 'cursor-not-allowed opacity-50',
      )}
    >
      <LogOut className="h-4 w-4" />
    </button>
  )
}
