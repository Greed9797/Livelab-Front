import clsx from 'clsx'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Natureza, StatusLancamento } from '../../types/financeiro'
import { STATUS_META, mesAtualSP, mesLabel, shiftMes, statusLabel } from '../../utils/financeiro'
import { formatMoney } from '../../utils/format'

export function StatusChip({ status, natureza = 'custo', className }: { status: StatusLancamento; natureza?: Natureza; className?: string }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={clsx('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold uppercase tracking-[0.05em]', className)}
      style={{ color: meta.color, background: meta.soft, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${meta.color} 24%, transparent)` }}
      title={meta.descricao}
    >
      <span
        aria-hidden
        className={clsx('h-1.5 w-1.5 rounded-full', status === 'atrasado' && 'animate-pulse')}
        style={{ background: meta.color }}
      />
      {statusLabel(status, natureza)}
    </span>
  )
}

export function MonthSwitcher({ value, onChange }: { value: string; onChange: (ym: string) => void }) {
  const atual = mesAtualSP()
  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-[var(--shadow-card)]" role="group" aria-label="Selecionar mês">
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
        aria-label="Mês anterior"
        onClick={() => onChange(shiftMes(value, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <label className="relative flex h-9 min-w-[10.5rem] cursor-pointer items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold text-ink hover:bg-surface-muted">
        <CalendarDays className="h-4 w-4 text-brand" aria-hidden />
        <span aria-live="polite" className="first-letter:uppercase">{mesLabel(value)}</span>
        <input
          type="month"
          aria-label="Escolher mês"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
        aria-label="Próximo mês"
        onClick={() => onChange(shiftMes(value, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {value !== atual ? (
        <button
          type="button"
          className="h-9 rounded-full px-3 text-xs font-bold uppercase tracking-[0.06em] text-brand transition hover:bg-brand-soft"
          onClick={() => onChange(atual)}
        >
          Hoje
        </button>
      ) : null}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; icon?: ReactNode }[]
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 scrollbar-thin">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={clsx(
              'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
              size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm',
              active ? 'bg-[var(--text-primary)] text-[var(--bg-elev-1)] shadow-sm' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
            )}
            onClick={() => onChange(o.value)}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Valor com sinal e cor semântica (entrada verde, saída neutra). */
export function Amount({ value, natureza, className }: { value: number; natureza: Natureza; className?: string }) {
  return (
    <span className={clsx('num font-bold', natureza === 'receita' ? 'text-[var(--success)]' : 'text-ink', className)}>
      {natureza === 'receita' ? '+' : '−'} {formatMoney(value, true)}
    </span>
  )
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx('grid content-start gap-1.5', className)}>
      <span className="text-xs font-semibold text-[var(--text-secondary)]">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-ink-muted">{hint}</span> : null}
    </label>
  )
}

export function InlineError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-[var(--danger)]">
      {message}
    </p>
  )
}

/** Barra de progresso previsto × realizado. */
export function ProgressBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}
