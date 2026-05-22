import clsx from 'clsx'

const toneClass = {
  brand: 'border-brand/25 bg-brand-soft text-brand',
  success: 'border-[color-mix(in_srgb,var(--success)_26%,transparent)] bg-[var(--success-soft)] text-[var(--success)]',
  warning: 'border-[color-mix(in_srgb,var(--warning)_28%,transparent)] bg-[var(--warning-soft)] text-[var(--warning)]',
  danger: 'border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)]',
  info: 'border-[color-mix(in_srgb,var(--info)_28%,transparent)] bg-[var(--info-soft)] text-[var(--info)]',
  neutral: 'border-line bg-surface-muted text-ink-muted',
}

export type BadgeTone = keyof typeof toneClass

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span className={clsx('inline-flex h-[22px] items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold uppercase tracking-[0.04em]', toneClass[tone], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}

export function statusTone(status?: string): BadgeTone {
  const normalized = status?.toLowerCase() ?? ''
  if (['ao_vivo', 'em_andamento'].includes(normalized)) return 'brand'
  if (['livre', 'disponivel', 'rascunho', 'inativo', 'inativa'].includes(normalized)) return 'neutral'
  if (['ativo', 'ativa', 'aprovada', 'confirmada', 'pago', 'publicado'].includes(normalized)) return 'success'
  if (['pendente', 'reservada', 'planejado', 'confirmado', 'em_analise', 'aguardando'].includes(normalized)) return 'warning'
  if (['cancelado', 'recusada', 'vencido', 'inadimplente', 'manutencao'].includes(normalized)) return 'danger'
  if (['encerrada', 'finalizada', 'revisado'].includes(normalized)) return 'info'
  return 'neutral'
}
