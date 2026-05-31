import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { Card, CardBody } from './Card'
import type { Metric } from '../../types/models'

const toneClass: Record<NonNullable<Metric['tone']>, string> = {
  brand: 'bg-brand-soft text-brand',
  success: 'bg-[var(--success-soft)] text-[var(--success)]',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
  info: 'bg-[var(--info-soft)] text-[var(--info)]',
  neutral: 'bg-surface-muted text-ink-muted',
}

export function MetricCard({ metric, icon: Icon }: { metric: Metric; icon?: LucideIcon }) {
  const tone = metric.tone ?? 'neutral'
  return (
    <Card className={clsx('relative', tone === 'brand' && 'border-brand/25')}>
      {tone === 'brand' ? <div className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-brand" /> : null}
      <CardBody className="flex min-h-[138px] flex-col justify-between gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{metric.label}</p>
          {Icon ? (
            <span className={clsx('grid h-10 w-10 place-items-center rounded-xl', toneClass[tone])}>
              <Icon className="h-4 w-4 stroke-[2.1]" />
            </span>
          ) : null}
        </div>
        <div>
          <p className="num text-[28px] font-bold leading-none tracking-[-0.025em] text-ink">{metric.value}</p>
          {metric.hint ? <p className="mt-2 text-xs text-ink-muted">{metric.hint}</p> : null}
        </div>
      </CardBody>
    </Card>
  )
}
