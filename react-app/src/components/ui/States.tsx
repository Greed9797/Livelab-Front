import { AlertTriangle, Inbox, Loader2, RefreshCcw } from 'lucide-react'
import { Button } from './Button'

export function LoadingState({ label = 'Carregando dados' }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-line bg-surface/70 p-6 text-sm text-ink-muted">
      <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand" />
      {label}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-6 text-center">
      <AlertTriangle className="h-8 w-8 text-[var(--danger)]" />
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
    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/70 p-6 text-center">
      <Inbox className="h-8 w-8 text-ink-muted" />
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
    </div>
  )
}
