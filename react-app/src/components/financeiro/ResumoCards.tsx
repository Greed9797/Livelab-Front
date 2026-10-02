import clsx from 'clsx'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Scale, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TotaisLancamentos } from '../../types/financeiro'
import { formatMoney } from '../../utils/format'
import { ProgressBar } from './primitives'

function Tile({
  label,
  value,
  hint,
  icon: Icon,
  color,
  soft,
  progress,
  onClick,
  active,
  delay,
}: {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  color: string
  soft: string
  progress?: { value: number; max: number }
  onClick?: () => void
  active?: boolean
  delay: number
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? Boolean(active) : undefined}
      className={clsx(
        'design-card fin-rise group relative flex min-w-0 flex-col gap-3 p-4 text-left transition sm:p-5',
        onClick && 'hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-lg)] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
      )}
      style={{ animationDelay: `${delay}ms`, ...(active ? { outline: `2px solid ${color}`, outlineOffset: 2 } : {}) }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</span>
        <span className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: soft, color }}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="num break-words text-[17px] font-bold leading-tight tracking-[-0.02em] text-ink min-[420px]:text-[20px] sm:text-[26px] sm:leading-none">{formatMoney(value, true)}</p>
      {progress ? <ProgressBar value={progress.value} max={progress.max} color={color} label={`${label}: progresso`} /> : null}
      <p className="text-xs text-ink-muted">{hint}</p>
    </Tag>
  )
}

export function ResumoCards({
  totais,
  atrasadosCount,
  onFiltrarAtrasados,
  atrasadosAtivo,
}: {
  totais: TotaisLancamentos
  atrasadosCount: number
  onFiltrarAtrasados: () => void
  atrasadosAtivo: boolean
}) {
  const { receita, custo } = totais
  const perdido = Math.max(0, receita.perdido ?? 0)
  const cancelado = Math.max(0, custo.cancelado ?? 0)
  // Perdido/cancelado já saíram de pendente/atrasado no backend; o fallback de totalizar() faz o mesmo.
  const aReceber = Math.max(0, receita.pendente + receita.atrasado)
  const aPagar = Math.max(0, custo.pendente + custo.atrasado)
  const atrasado = receita.atrasado + custo.atrasado
  const pctRecebido = receita.previsto > 0 ? Math.round((receita.pago / receita.previsto) * 100) : 0
  const pctPago = custo.previsto > 0 ? Math.round((custo.pago / custo.previsto) * 100) : 0
  const saldoPositivo = totais.saldo_previsto >= 0

  return (
    <section aria-label="Resumo do mês" className="grid gap-4 lg:grid-cols-[1.05fr_2fr]">
      {/* Saldo — peça central, estilo extrato de banco */}
      <div className="design-panel fin-rise relative overflow-hidden p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl"
          style={{ background: saldoPositivo ? 'var(--success-soft)' : 'var(--danger-soft)' }}
        />
        <div className="relative flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          <Scale className="h-4 w-4 text-brand" aria-hidden /> Saldo previsto do mês
        </div>
        <p
          className={clsx(
            'num relative mt-3 text-[38px] font-bold leading-none tracking-[-0.035em] sm:text-[46px]',
            saldoPositivo ? 'text-ink' : 'text-[var(--danger)]',
          )}
        >
          {formatMoney(totais.saldo_previsto, true)}
        </p>
        <p className="relative mt-2 text-sm text-[var(--text-secondary)]">
          <span className="serif text-base text-brand">realizado</span>{' '}
          <span className={clsx('num font-bold', totais.saldo_realizado >= 0 ? 'text-ink' : 'text-[var(--danger)]')}>
            {formatMoney(totais.saldo_realizado, true)}
          </span>
        </p>
        <dl className="relative mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs">
          <div>
            <dt className="text-ink-muted">Entradas previstas</dt>
            <dd className="num mt-0.5 text-sm font-bold text-[var(--success)]">{formatMoney(receita.previsto, true)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Saídas previstas</dt>
            <dd className="num mt-0.5 text-sm font-bold text-ink">{formatMoney(custo.previsto, true)}</dd>
          </div>
        </dl>
        {perdido > 0 || cancelado > 0 ? (
          <dl className="relative mt-3 grid grid-cols-2 gap-3 text-xs">
            {perdido > 0 ? (
              <div title="Receita dada como perdida — fora do a receber">
                <dt className="text-ink-muted">Perdido</dt>
                <dd className="num mt-0.5 text-sm font-semibold text-ink-muted">{formatMoney(perdido, true)}</dd>
              </div>
            ) : null}
            {cancelado > 0 ? (
              <div title="Despesa cancelada — fora do a pagar e do previsto">
                <dt className="text-ink-muted">Cancelado</dt>
                <dd className="num mt-0.5 text-sm font-semibold text-ink-muted">{formatMoney(cancelado, true)}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <Tile
          label="A receber"
          value={aReceber}
          hint={`${pctRecebido}% já recebido`}
          icon={ArrowDownLeft}
          color="var(--info)"
          soft="var(--info-soft)"
          progress={{ value: receita.pago, max: receita.previsto }}
          delay={40}
        />
        <Tile label="Recebido" value={receita.pago} hint={`de ${formatMoney(receita.previsto)} previstos`} icon={Wallet} color="var(--success)" soft="var(--success-soft)" delay={80} />
        <Tile
          label="A pagar"
          value={aPagar}
          hint={`${pctPago}% já pago`}
          icon={ArrowUpRight}
          color="var(--warning)"
          soft="var(--warning-soft)"
          progress={{ value: custo.pago, max: custo.previsto }}
          delay={120}
        />
        <Tile label="Pago" value={custo.pago} hint={`de ${formatMoney(custo.previsto)} previstos`} icon={CheckCircle2} color="var(--text-secondary)" soft="var(--bg-elev-3)" delay={160} />
        <Tile
          label="Atrasados"
          value={atrasado}
          hint={
            atrasadosCount
              ? `${atrasadosCount} lançamento${atrasadosCount > 1 ? 's' : ''} · receber ${formatMoney(receita.atrasado)} · pagar ${formatMoney(custo.atrasado)}`
              : 'Nada vencido. Tudo em dia.'
          }
          icon={AlertTriangle}
          color="var(--danger)"
          soft="var(--danger-soft)"
          onClick={atrasadosCount ? onFiltrarAtrasados : undefined}
          active={atrasadosAtivo}
          delay={200}
        />
        <Tile
          label="Saldo realizado"
          value={totais.saldo_realizado}
          hint="recebido − pago no mês"
          icon={Scale}
          color={totais.saldo_realizado >= 0 ? 'var(--success)' : 'var(--danger)'}
          soft={totais.saldo_realizado >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)'}
          delay={240}
        />
      </div>
    </section>
  )
}
