import clsx from 'clsx'

const toneClass = {
  brand: 'bg-brand-soft text-brand',
  success: 'bg-[var(--success-soft)] text-[var(--success)]',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
  info: 'bg-[var(--info-soft)] text-[var(--info)]',
  neutral: 'bg-surface-muted text-ink-muted',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode
  tone?: keyof typeof toneClass
  className?: string
}) {
  return (
    <span className={clsx('inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold uppercase tracking-[0.04em]', toneClass[tone], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}

export function statusTone(status?: string): keyof typeof toneClass {
  const normalized = status?.toLowerCase() ?? ''
  if (['ao_vivo', 'em_andamento'].includes(normalized)) return 'brand'
  if (['livre', 'disponivel'].includes(normalized)) return 'neutral'
  if (['ativo', 'ativa', 'aprovada', 'confirmada', 'pago'].includes(normalized)) return 'success'
  if (['pendente', 'reservada', 'planejado', 'confirmado', 'em_analise', 'aguardando'].includes(normalized)) return 'warning'
  if (['cancelado', 'recusada', 'vencido', 'inadimplente', 'manutencao'].includes(normalized)) return 'danger'
  if (['encerrada', 'finalizada'].includes(normalized)) return 'info'
  return 'neutral'
}
