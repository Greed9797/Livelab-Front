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
        'inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold tracking-[0.01em] transition-colors focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-button-primary text-button-primary-foreground shadow-button-primary hover:bg-button-primary-hover focus-visible:ring-button-primary/25',
        variant === 'secondary' && 'border border-line bg-surface text-ink hover:border-[var(--border-strong)] hover:bg-surface-muted focus-visible:ring-brand/20',
        variant === 'ghost' && 'border border-transparent text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:ring-brand/20',
        variant === 'danger' && 'bg-button-danger text-button-danger-foreground shadow-sm hover:bg-button-danger-hover focus-visible:ring-button-danger/25',
        (disabled || isLoading) && 'opacity-60',
        className,
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : Icon ? <Icon aria-hidden="true" className="h-4 w-4 stroke-[2.2]" /> : null}
      {children}
    </button>
  )
}
