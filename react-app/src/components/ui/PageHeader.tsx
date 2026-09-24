import { useEffect, type ReactNode } from 'react'
import { useCompactChrome } from '../layout/compact-chrome'

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  const chrome = useCompactChrome()
  const setTitle = chrome?.setTitle
  useEffect(() => {
    setTitle?.(title)
    return () => setTitle?.(null)
  }, [setTitle, title])

  return (
    <div className="page-head flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="page-title text-balance">{title}</h1>
        {subtitle ? <p className="page-subtitle mt-2.5 max-w-3xl text-[15px] leading-6 text-[var(--text-secondary)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
