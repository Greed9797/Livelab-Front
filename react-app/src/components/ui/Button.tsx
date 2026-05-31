import { Loader2, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  icon?: LucideIcon
  isLoading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  icon: Icon,
  isLoading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold tracking-[0.01em] transition focus:outline-none focus:ring-4 focus:ring-brand/20',
        variant === 'primary' && 'bg-brand text-white shadow-[0_6px_14px_-4px_rgba(255,90,31,0.45)] hover:bg-brand-hover hover:-translate-y-0.5',
        variant === 'secondary' && 'border border-line bg-surface text-ink hover:border-[var(--border-strong)] hover:bg-surface-muted',
        variant === 'ghost' && 'border border-transparent text-ink-muted hover:bg-surface-muted hover:text-ink',
        variant === 'danger' && 'bg-[var(--danger)] text-white shadow-sm hover:brightness-95',
        (disabled || isLoading) && 'opacity-60',
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4 stroke-[2.2]" /> : null}
      {children}
    </button>
  )
}
