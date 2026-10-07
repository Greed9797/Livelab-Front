import clsx from 'clsx'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CalendarClock, ChevronDown, Landmark, TrendingUp, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { useId, useState } from 'react'
import type { Natureza, PainelFinanceiro, PainelLado } from '../../types/financeiro'
import { formatDataBR, tomSaldo } from '../../utils/caixa'
import { mesLabel } from '../../utils/financeiro'
import { formatMoney } from '../../utils/format'
import { temProjecaoRitmo } from '../../utils/painel'
import { Button } from '../ui/Button'

const TOM_COR = { positivo: 'var(--success)', negativo: 'var(--danger)', neutro: 'var(--text-primary)' } as const

function nomeMes(ym: string): string {
  return mesLabel(ym).split(' de ')[0]
}

function LinhaValor({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <dt className="min-w-0 text-ink-muted">
        {label}
        {hint ? <span className="block text-[11px] opacity-80">{hint}</span> : null}
      </dt>
      <dd className="num shrink-0 font-semibold text-ink">{formatMoney(value, true)}</dd>
    </div>
  )
}

/** Cartão de "A receber" / "A pagar": total em caixa (vencimento até o fim do mês) + abertura por origem. */
function CartaoLado({
  natureza,
  nome,
  lado,
  fimMes,
  mostrarDetalhes,
  onVerAtrasados,
}: {
  natureza: Natureza
  nome: string
  lado: PainelLado
  fimMes: string
  mostrarDetalhes: boolean
  onVerAtrasados?: (n: Natureza) => void
}) {
  const entrada = natureza === 'receita'
  const Icon = entrada ? ArrowDownLeft : ArrowUpRight
  const { atrasados } = lado
  return (
    <div className="design-card flex min-w-0 flex-col gap-3 p-4 sm:p-5" role="group" aria-label={`${nome}: ${formatMoney(lado.total, true)}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          {nome} <span className="font-medium normal-case tracking-normal">até {formatDataBR(fimMes).slice(0, 5)}</span>
        </span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl" style={{ background: entrada ? 'var(--info-soft)' : 'var(--warning-soft)', color: entrada ? 'var(--info)' : 'var(--warning)' }}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="num break-words text-[24px] font-bold leading-none tracking-[-0.025em] text-ink sm:text-[30px]">{formatMoney(lado.total, true)}</p>
      {mostrarDetalhes ? (
        <dl className="space-y-1.5 border-t border-line pt-3">
          <LinhaValor label="Vence no mês" value={lado.no_mes} />
          <LinhaValor label="Atrasado de meses anteriores" value={lado.atrasado_anterior} />
        </dl>
      ) : null}
      {atrasados.qtd > 0 && onVerAtrasados ? (
        <button
          type="button"
          onClick={() => onVerAtrasados(natureza)}
          className="inline-flex min-h-11 w-full min-w-0 items-center gap-1.5 rounded-full bg-[var(--danger-soft)] px-3 text-left text-xs font-bold text-[var(--danger)] transition hover:brightness-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 sm:min-h-8 sm:w-fit"
          aria-label={`Ver ${atrasados.qtd} atrasados, ${formatMoney(atrasados.valor, true)}`}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {atrasados.qtd} {atrasados.qtd === 1 ? 'atrasado' : 'atrasados'} · {formatMoney(atrasados.valor, true)}
          </span>
        </button>
      ) : atrasados.qtd > 0 ? (
        <span className="inline-flex min-h-11 w-full min-w-0 items-center gap-1.5 rounded-full bg-[var(--danger-soft)] px-3 text-left text-xs font-bold text-[var(--danger)] sm:min-h-8 sm:w-fit" aria-label={`${atrasados.qtd} atrasados, ${formatMoney(atrasados.valor, true)}`}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {atrasados.qtd} {atrasados.qtd === 1 ? 'atrasado' : 'atrasados'} · {formatMoney(atrasados.valor, true)}
          </span>
        </span>
      ) : (
        <p className="text-[11px] text-ink-muted">
          {lado.qtd} {lado.qtd === 1 ? 'título em aberto' : 'títulos em aberto'} · nada atrasado
        </p>
      )}
    </div>
  )
}

function CartaoRealizado({ label, value, icon: Icon, hint }: { label: string; value: number; icon: typeof Wallet; hint?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface px-4 py-3" role="group" aria-label={`${label}: ${formatMoney(value, true)}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> <span className="truncate">{label}</span>
      </p>
      <p className="num mt-1.5 break-words text-lg font-bold leading-tight text-ink">{formatMoney(value, true)}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-ink-muted">{hint}</p> : null}
    </div>
  )
}

function Referencia({ p }: { p: PainelFinanceiro }) {
  const [aberto, setAberto] = useState(false)
  const id = useId()
  const linhas = [
    { label: 'Receita', v: p.competencia.receita },
    { label: 'Custos', v: p.competencia.custos },
    { label: 'Resultado', v: p.competencia.resultado },
  ]
  return (
    <section className="design-card overflow-hidden" aria-label="Competência (referência)">
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls={id}
          onClick={() => setAberto((v) => !v)}
          className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-surface-muted focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
        >
          <span className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-ink">
            <ChevronDown className={clsx('h-4 w-4 shrink-0 text-ink-muted transition', !aberto && '-rotate-90')} aria-hidden />
            <span className="truncate">Competência (referência)</span>
          </span>
          <span className="shrink-0 text-[11px] text-ink-muted">{nomeMes(p.mes)}</span>
        </button>
      </h3>
      <div id={id} hidden={!aberto} className="border-t border-line px-4 py-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[18rem] text-sm">
            <caption className="sr-only">Receita, custos e resultado por competência de {mesLabel(p.mes)}, previsto e realizado</caption>
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                <th scope="col" className="py-1.5 text-left font-bold"><span className="sr-only">Linha</span></th>
                <th scope="col" className="py-1.5 text-right font-bold">Previsto</th>
                <th scope="col" className="py-1.5 text-right font-bold">Realizado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.label} className="border-t border-[var(--hairline)]">
                  <th scope="row" className="py-2 text-left font-semibold text-ink">{l.label}</th>
                  <td className="num py-2 text-right text-ink">{formatMoney(l.v.previsto, true)}</td>
                  <td className={clsx('num py-2 text-right font-semibold', l.label === 'Resultado' && l.v.realizado < 0 ? 'text-[var(--danger)]' : 'text-ink')}>{formatMoney(l.v.realizado, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">
          Referência por competência (mês a que a receita/custo se refere). Não é a fonte do “A receber” e “A pagar” acima, que seguem o vencimento.
        </p>
      </div>
    </section>
  )
}

export function PainelMesSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando painel do mês">
      <div className="h-36 animate-pulse rounded-[18px] bg-surface-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-52 animate-pulse rounded-[18px] bg-surface-muted" />
        <div className="h-52 animate-pulse rounded-[18px] bg-surface-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 animate-pulse rounded-2xl bg-surface-muted" />
        <div className="h-20 animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    </div>
  )
}

function notaRelativa(p: PainelFinanceiro): string | null {
  if (p.mes_relativo === 'passado') return `Mês encerrado: o que ainda está em aberto com vencimento até ${formatDataBR(p.fim_mes)}.`
  if (p.mes_relativo === 'futuro') return `Mês futuro: tudo o que está em aberto com vencimento até ${formatDataBR(p.fim_mes)}; recebido e pago ainda não se aplicam.`
  return null
}

/**
 * Painel único do mês (substitui "Caixa hoje" + resumo): caixa hoje → a receber / a pagar (caixa) →
 * recebido / pago → projetado no fim do mês → competência como referência recolhível.
 */
export function PainelMes({
  painel,
  isLoading,
  isError,
  podeEscrever,
  onConfigurar,
  onRetry,
  onVerAtrasados,
}: {
  painel: PainelFinanceiro | undefined
  isLoading: boolean
  isError: boolean
  podeEscrever: boolean
  onConfigurar: () => void
  onRetry: () => void
  onVerAtrasados?: (n: Natureza) => void
}) {
  const [detalhesAbertos, setDetalhesAbertos] = useState(false)
  const detalhesId = useId()
  if (isLoading && !painel) return <PainelMesSkeleton />
  if (!painel) {
    return isError ? (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
        Não foi possível carregar o painel do mês.
        <Button variant="ghost" className="min-h-11 sm:min-h-0" onClick={onRetry}>Tentar de novo</Button>
      </div>
    ) : null
  }

  if (!painel.configurado) {
    return (
      <section aria-label="Painel do mês" className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-dashed border-[var(--primary)] bg-brand-soft px-4 py-5 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface text-brand">
            <Landmark className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">Cadastre o saldo de hoje para começar</h2>
            <p className="mt-0.5 max-w-xl text-sm text-ink-muted">
              Informe quanto há em caixa agora e a data de corte. O que vence antes dessa data é ignorado e, a partir daí, o caixa acompanha cada entrada e saída.
            </p>
          </div>
        </div>
        {podeEscrever ? (
          <Button icon={Wallet} className="min-h-11 sm:min-h-0" onClick={onConfigurar}>Cadastrar saldo de hoje</Button>
        ) : (
          <p className="text-sm font-semibold text-ink-muted">Peça a quem gerencia o financeiro para cadastrar o saldo.</p>
        )}
      </section>
    )
  }

  const tomCaixa = tomSaldo(painel.caixa.saldo_atual)
  const tomProj = tomSaldo(painel.projetado_fim_mes)
  const ate = painel.caixa.ate ?? painel.hoje
  const caixaRotulo = ate === painel.hoje ? 'Caixa hoje' : `Caixa em ${formatDataBR(ate).slice(0, 5)}`
  const atrasReceber = painel.a_receber.atrasados.valor
  const atrasPagar = painel.a_pagar.atrasados.valor
  const inclui = [atrasReceber > 0 ? `${formatMoney(atrasReceber, true)} atrasados a receber` : '', atrasPagar > 0 ? `${formatMoney(atrasPagar, true)} atrasados a pagar` : ''].filter(Boolean)
  const nota = notaRelativa(painel)
  const rec = painel.mes_relativo !== 'futuro'

  return (
    <section aria-label="Painel do mês" className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="design-panel fin-rise min-w-0 p-4 sm:p-5" role="group" aria-label={`Saldo atual ${formatMoney(painel.caixa.saldo_atual, true)}`}>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            <Landmark className="h-4 w-4 text-brand" aria-hidden /> {caixaRotulo}
          </p>
          <p
            className="num mt-2 break-words text-[26px] font-bold leading-none tracking-[-0.03em] sm:text-[30px]"
            style={{ color: TOM_COR[tomCaixa] }}
          >
            {formatMoney(painel.caixa.saldo_atual, true)}
          </p>
          <p className="mt-2 text-xs text-ink-muted">Disponível até {formatDataBR(ate)}.</p>
        </div>

        <CartaoLado natureza="receita" nome="A receber" lado={painel.a_receber} fimMes={painel.fim_mes} mostrarDetalhes={detalhesAbertos} onVerAtrasados={onVerAtrasados} />
        <CartaoLado natureza="custo" nome="A pagar" lado={painel.a_pagar} fimMes={painel.fim_mes} mostrarDetalhes={detalhesAbertos} onVerAtrasados={onVerAtrasados} />

        <div className="design-card min-w-0 p-4 sm:p-5" role="group" aria-label={`Projetado no fim do mês: ${formatMoney(painel.projetado_fim_mes, true)}`}>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            <CalendarClock className="h-4 w-4 text-brand" aria-hidden /> Projetado no fim do mês
          </p>
          <p className="num mt-2 break-words text-[26px] font-bold leading-none tracking-[-0.025em] sm:text-[30px]" style={{ color: TOM_COR[tomProj] }}>
            {formatMoney(painel.projetado_fim_mes, true)}
          </p>
          <p className="mt-2 text-xs text-ink-muted">Caixa + a receber − a pagar.{inclui.length ? ` Inclui ${inclui.join(' e ')}.` : ''}</p>
          {temProjecaoRitmo(painel) ? (
            <div className="mt-3 rounded-2xl border border-dashed border-line bg-surface-muted px-3 py-2.5" aria-label="Projeção pelo ritmo atual">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink">
                <span className="inline-flex h-5 items-center gap-1 rounded-full bg-[var(--info-soft)] px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--info)]">
                  <TrendingUp className="h-3 w-3" aria-hidden /> projeção
                </span>
                <span>Ritmo atual: <strong className="num whitespace-nowrap">{formatMoney(painel.projetado_fim_mes_ritmo, true)}</strong></span>
              </p>
              <p className="sr-only">
                Se a comissão de {painel.projecao_comissao.competencia ? nomeMes(painel.projecao_comissao.competencia) : 'o mês'} seguir no ritmo atual. Estimativa: não entra nos totais acima.
              </p>
              <details className="mt-2 border-t border-line pt-2 text-xs text-ink-muted">
                <summary className="min-h-9 cursor-pointer py-2 font-semibold text-ink">Memória da projeção</summary>
                <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                  <div className="flex justify-between gap-2"><dt>Comissão acumulada</dt><dd className="num">{formatMoney(painel.projecao_comissao.previsto_atual, true)}</dd></div>
                  <div className="flex justify-between gap-2"><dt>Comissão projetada</dt><dd className="num">{formatMoney(painel.projecao_comissao.projetado, true)}</dd></div>
                  <div className="flex justify-between gap-2"><dt>Ajuste estimado</dt><dd className="num">{formatMoney(painel.projecao_comissao.ajuste, true)}</dd></div>
                  <div className="flex justify-between gap-2"><dt>Dias do ritmo</dt><dd>{painel.projecao_comissao.dias_decorridos} de {painel.projecao_comissao.dias_mes}</dd></div>
                  <div className="flex justify-between gap-2"><dt>Vencimento estimado</dt><dd>{painel.projecao_comissao.vence_em ? formatDataBR(painel.projecao_comissao.vence_em) : '—'}</dd></div>
                  <div className="flex justify-between gap-2"><dt>Entra no caixa deste mês</dt><dd>{painel.projecao_comissao.entra_no_painel ? 'Sim' : 'Não'}</dd></div>
                </dl>
              </details>
            </div>
          ) : null}
        </div>
      </div>

      <div className="design-card overflow-hidden">
        <button
          type="button"
          aria-expanded={detalhesAbertos}
          aria-controls={detalhesId}
          onClick={() => setDetalhesAbertos((aberto) => !aberto)}
          className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-bold text-ink transition hover:bg-surface-muted focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
        >
          <span>Detalhamento do caixa</span>
          <ChevronDown className={clsx('h-4 w-4 shrink-0 text-ink-muted transition', !detalhesAbertos && '-rotate-90')} aria-hidden />
        </button>
        <div id={detalhesId} hidden={!detalhesAbertos} className="border-t border-line px-4 py-3 text-sm text-ink-muted">
          <p>
            Saldo de abertura {formatMoney(painel.saldo_abertura, true)}
            {painel.data_corte ? ` em ${formatDataBR(painel.data_corte)}` : ''}. O projetado considera só títulos já lançados.
            {inclui.length ? ` Inclui ${inclui.join(' e ')}.` : ''}
          </p>
        </div>
      </div>

      {nota ? <p className="text-xs text-ink-muted">{nota}</p> : null}

      {rec ? (
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
          <CartaoRealizado
            label={`Recebido em ${nomeMes(painel.mes)}`}
            value={painel.recebido_mes.total}
            icon={ArrowDownLeft}
            hint={painel.recebido_mes.aportes > 0 ? `receitas ${formatMoney(painel.recebido_mes.receitas, true)} · aportes ${formatMoney(painel.recebido_mes.aportes, true)}` : undefined}
          />
          <CartaoRealizado label={`Pago em ${nomeMes(painel.mes)}`} value={painel.pago_mes.total} icon={ArrowUpRight} />
        </div>
      ) : null}

      <Referencia p={painel} />
    </section>
  )
}
