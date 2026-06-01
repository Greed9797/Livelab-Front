import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  accent,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: string
  accent?: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted before:h-px before:w-5 before:bg-brand">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[32px] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[38px]">
          {accent ? <span className="font-serif font-normal italic text-brand">{accent}</span> : null}
          {accent ? ' ' : null}
          <span>{title}</span>
        </h1>
        {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
