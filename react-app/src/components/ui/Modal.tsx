import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import clsx from 'clsx'

export function Modal({
  open,
  title,
  subtitle,
  children,
  footer,
  onClose,
  size = 'md',
}: {
  open: boolean
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex min-h-full items-center justify-center">
        <div
          className={clsx(
            'w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]',
            size === 'sm' && 'max-w-lg',
            size === 'md' && 'max-w-2xl',
            size === 'lg' && 'max-w-4xl',
            size === 'xl' && 'max-w-6xl',
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-base font-bold text-ink">{title}</p>
              {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-muted transition hover:bg-surface-muted hover:text-ink"
              aria-label="Fechar"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[72vh] overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
          {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}
