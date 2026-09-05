import { ChevronDown } from 'lucide-react'
import { type ReactNode } from 'react'
import clsx from 'clsx'

interface ModalSectionProps {
  title: string
  description?: string
  children: ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  className?: string
}

function SectionHeading({ title, description, heading = true }: Pick<ModalSectionProps, 'title' | 'description'> & { heading?: boolean }) {
  if (!heading) {
    return (
      <span className="block">
        <span className="block text-sm font-semibold leading-5 text-ink">{title}</span>
        {description ? <span className="mt-1 block text-sm leading-5 text-ink-muted">{description}</span> : null}
      </span>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold leading-5 text-ink">{title}</h3>
      {description ? <p className="mt-1 text-sm leading-5 text-ink-muted">{description}</p> : null}
    </div>
  )
}

export function ModalSection({
  title,
  description,
  children,
  collapsible = false,
  defaultOpen = false,
  className,
}: ModalSectionProps) {
  if (!collapsible) {
    return (
      <section className={clsx('space-y-4 border-t border-line pt-5 first:border-t-0 first:pt-0', className)}>
        <SectionHeading title={title} description={description} />
        {children}
      </section>
    )
  }

  return (
    <details
      open={defaultOpen ? true : undefined}
      className={clsx('group border-t border-line first:border-t-0', className)}
      onInvalidCapture={(event) => { event.currentTarget.open = true }}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/30">
        <SectionHeading title={title} description={description} heading={false} />
        <ChevronDown aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted transition-transform duration-200 motion-reduce:transition-none group-open:rotate-180" />
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  )
}
