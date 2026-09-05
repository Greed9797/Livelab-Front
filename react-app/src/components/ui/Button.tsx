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
        'inline-flex h-[42px] items-center justify-center gap-2 rounded-[var(--radius-pill)] px-4 text-sm font-semibold tracking-normal transition-[background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:pointer-events-none disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-button-primary text-button-primary-foreground shadow-button-primary hover:bg-button-primary-hover',
        variant === 'secondary' && 'border border-[var(--border-strong)] bg-[var(--bg-elev-1)] text-ink hover:bg-surface-muted',
        variant === 'ghost' && 'border border-transparent text-ink-muted hover:bg-surface-muted hover:text-ink',
        variant === 'danger' && 'bg-button-danger text-button-danger-foreground shadow-sm hover:bg-button-danger-hover',
        (disabled || isLoading) && 'opacity-45 shadow-none',
        className,
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Loader2 aria-hidden="true" className="h-[18px] w-[18px]" /> : Icon ? <Icon aria-hidden="true" className="h-[18px] w-[18px] stroke-[2]" /> : null}
      {children}
    </button>
  )
}
