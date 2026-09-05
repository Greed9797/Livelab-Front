import { AlertTriangle, Inbox, RefreshCcw } from 'lucide-react'
import { Button } from './Button'

export function LoadingState({ label = 'Carregando dados' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-48 flex-col justify-center rounded-[var(--radius-panel)] border border-line bg-surface p-6">
      <span aria-hidden="true" className="h-3 w-28 rounded-full bg-surface-muted" />
      <span aria-hidden="true" className="mt-3 h-7 w-2/5 max-w-52 rounded-[var(--radius-control)] bg-surface-muted" />
      <span className="mt-4 text-sm text-ink-muted">{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex min-h-48 flex-col items-center justify-center rounded-[var(--radius-panel)] border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-6 text-center">
      <AlertTriangle aria-hidden="true" className="h-8 w-8 text-[var(--danger)]" />
      <p className="mt-3 max-w-xl text-sm font-medium text-ink">{message}</p>
      {onRetry ? (
        <Button className="mt-4" variant="secondary" icon={RefreshCcw} onClick={onRetry}>
          Recarregar
        </Button>
      ) : null}
    </div>
  )
}

export function EmptyState({ title = 'Sem dados no período', description }: { title?: string; description?: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-[var(--radius-panel)] border border-dashed border-line bg-surface p-6 text-center">
      <Inbox aria-hidden="true" className="h-8 w-8 text-ink-muted" />
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
    </div>
  )
}
