import clsx from 'clsx'
import { ArrowDownLeft, ArrowUpRight, CalendarClock, Landmark, Wallet } from 'lucide-react'
import type { CaixaResumo } from '../../types/financeiro'
import { formatDataBR, tomSaldo } from '../../utils/caixa'
import { formatMoney } from '../../utils/format'
import { Button } from '../ui/Button'

const TOM_COR = { positivo: 'var(--success)', negativo: 'var(--danger)', neutro: 'var(--text-primary)' } as const

function Mini({ label, value, icon: Icon, tom }: { label: string; value: number; icon: typeof Wallet; tom?: 'positivo' | 'negativo' | 'neutro' }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> <span className="truncate">{label}</span>
      </p>
      <p className="num mt-1.5 break-words text-base font-bold leading-tight text-ink sm:text-lg" style={tom ? { color: TOM_COR[tom] } : undefined}>
        {formatMoney(value, true)}
      </p>
    </div>
  )
}

/** Faixa "Caixa hoje" no topo de Lançamentos; sem saldo de abertura vira CTA. */
export function CaixaHoje({
  caixa,
  isLoading,
  isError,
  podeEscrever,
  onConfigurar,
  onRetry,
}: {
  caixa: CaixaResumo | undefined
  isLoading: boolean
  isError: boolean
  podeEscrever: boolean
  onConfigurar: () => void
  onRetry: () => void
}) {
  if (isLoading && !caixa) {
    return <div className="h-40 animate-pulse rounded-[18px] bg-surface-muted" aria-busy="true" aria-label="Carregando caixa" />
  }
  if (!caixa) {
    return isError ? (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
        Não foi possível carregar o caixa.
        <Button variant="ghost" onClick={onRetry}>Tentar de novo</Button>
      </div>
    ) : null
  }

  if (!caixa.configurado) {
    return (
      <section aria-label="Caixa hoje" className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-dashed border-[var(--primary)] bg-brand-soft px-5 py-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface text-brand">
            <Landmark className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">Cadastre o saldo de hoje para começar</h2>
            <p className="mt-0.5 max-w-xl text-sm text-ink-muted">
              Informe quanto há em caixa agora. O que vence antes dessa data é ignorado e, a partir daí, o saldo acompanha cada entrada e saída.
            </p>
          </div>
        </div>
        {podeEscrever ? (
          <Button icon={Wallet} onClick={onConfigurar}>Cadastrar saldo de hoje</Button>
        ) : (
          <p className="text-sm font-semibold text-ink-muted">Peça a quem gerencia o financeiro para cadastrar o saldo.</p>
        )}
      </section>
    )
  }

  const tom = tomSaldo(caixa.saldo_atual)
  const tomProj = tomSaldo(caixa.saldo_projetado_fim_mes)
  return (
    <section aria-label="Caixa hoje" className="design-card space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            <Landmark className="h-4 w-4 text-brand" aria-hidden /> Caixa hoje
          </p>
          <p
            className={clsx('num mt-2 break-words text-[28px] font-bold leading-none tracking-[-0.03em] sm:text-[40px]')}
            style={{ color: TOM_COR[tom] }}
            aria-label={`Saldo atual ${formatMoney(caixa.saldo_atual, true)}${tom === 'negativo' ? ', negativo' : ''}`}
          >
            {formatMoney(caixa.saldo_atual, true)}
          </p>
          <p className="mt-1.5 text-xs text-ink-muted">
            Saldo de abertura {formatMoney(caixa.saldo_abertura, true)}
            {caixa.data_corte ? ` em ${formatDataBR(caixa.data_corte)}` : ''}
          </p>
        </div>
        {podeEscrever ? (
          <Button variant="ghost" icon={Wallet} onClick={onConfigurar}>Ajustar</Button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Mini label="Entradas" value={caixa.entradas_realizadas} icon={ArrowDownLeft} tom="positivo" />
        <Mini label="Saídas" value={caixa.saidas_realizadas} icon={ArrowUpRight} />
        <Mini label="A receber" value={caixa.a_receber} icon={ArrowDownLeft} />
        <Mini label="A pagar" value={caixa.a_pagar} icon={ArrowUpRight} />
        <div className="col-span-2 lg:col-span-1">
          <Mini label="Projetado fim do mês" value={caixa.saldo_projetado_fim_mes} icon={CalendarClock} tom={tomProj} />
        </div>
      </div>
      <p className="text-[11px] text-ink-muted">Entradas e saídas realizadas desde o corte. A receber e a pagar: em aberto.</p>
    </section>
  )
}
