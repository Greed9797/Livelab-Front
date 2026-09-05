import type { ReactNode } from 'react'

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-[34px] font-extrabold leading-[1.02] tracking-[-0.035em] text-ink text-balance sm:text-[42px]">
          {title}
        </h1>
        {subtitle ? <p className="mt-2.5 max-w-3xl text-[15px] leading-6 text-[var(--text-secondary)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
