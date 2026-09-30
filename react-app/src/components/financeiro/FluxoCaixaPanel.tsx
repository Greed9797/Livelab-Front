import clsx from 'clsx'
import { Info } from 'lucide-react'
import { useState } from 'react'
import { useDre, useFluxoCaixa } from '../../hooks/useFinanceiro'
import { extractErrorMessage } from '../../services/api'
import type { FluxoLinha, FluxoSerieMes, Lancamento } from '../../types/financeiro'
import { fluxoDeLancamentos, mesCurto, mesLabel } from '../../utils/financeiro'
import { formatMoney } from '../../utils/format'
import { parseBRMoneyToDecimal } from '../../utils/money'
import { MoneyInput } from '../ui/MoneyInput'
import { ErrorState, LoadingState } from '../ui/States'
import { Segmented } from './primitives'

type Visao = 'ambos' | 'realizado' | 'previsto'

function Bar({ value, max, color, ghost }: { value: number; max: number; color: string; ghost?: number }) {
  const pct = (v: number) => (max > 0 ? Math.min(100, (Math.abs(v) / max) * 100) : 0)
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden>
      {ghost != null ? <div className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ width: `${pct(ghost)}%`, background: color }} /> : null}
      <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500" style={{ width: `${pct(value)}%`, background: color }} />
    </div>
  )
}

function SerieAnual({ serie, mes, visao }: { serie: FluxoSerieMes[]; mes: string; visao: Visao }) {
  const pick = (v: { previsto: number; realizado: number }) => (visao === 'previsto' ? v.previsto : v.realizado)
  const max = Math.max(1, ...serie.flatMap((s) => [s.entradas.previsto, s.saidas.previsto, s.entradas.realizado, s.saidas.realizado]))
  const ano = mes.slice(0, 4)
  return (
    <div>
      <div className="flex h-44 items-end gap-1.5 sm:gap-3" role="img" aria-label={`Entradas e saídas por mês em ${ano}`}>
        {serie.map((s) => {
          const saldo = pick(s.saldo)
          return (
            <div key={s.mes} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${mesLabel(s.mes)} — entradas ${formatMoney(pick(s.entradas))} · saídas ${formatMoney(pick(s.saidas))} · saldo ${formatMoney(saldo)}`}>
              <div className="flex h-full w-full items-end justify-center gap-[3px]">
                {(['entradas', 'saidas'] as const).map((k) => {
                  const color = k === 'entradas' ? 'var(--success)' : 'var(--warning)'
                  const prev = s[k].previsto
                  const real = s[k].realizado
                  return (
                    <div key={k} className="relative h-full w-full max-w-[14px]">
                      {visao === 'ambos' ? (
                        <div className="absolute bottom-0 w-full rounded-t-[4px] opacity-25" style={{ height: `${(prev / max) * 100}%`, background: color }} />
                      ) : null}
                      <div
                        className="absolute bottom-0 w-full rounded-t-[4px] transition-[height] duration-500"
                        style={{ height: `${((visao === 'previsto' ? prev : real) / max) * 100}%`, background: color }}
                      />
                    </div>
                  )
                })}
              </div>
              <span className={clsx('text-[10px] font-bold uppercase tracking-[0.06em]', s.mes === mes ? 'text-brand' : 'text-ink-muted')}>{mesCurto(s.mes)}</span>
              <span className={clsx('num hidden text-[10px] sm:block', saldo < 0 ? 'text-[var(--danger)]' : 'text-ink-muted')}>
                {saldo === 0 ? '·' : `${saldo > 0 ? '+' : '−'}${formatMoney(Math.abs(saldo)).replace('R$', '').trim()}`}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--success)]" /> Entradas</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--warning)]" /> Saídas</span>
        {visao === 'ambos' ? <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--text-muted)] opacity-40" /> Previsto (fundo)</span> : null}
      </div>
      <table className="sr-only">
        <caption>Série anual de fluxo de caixa {ano}</caption>
        <thead><tr><th>Mês</th><th>Entradas previstas</th><th>Entradas realizadas</th><th>Saídas previstas</th><th>Saídas realizadas</th></tr></thead>
        <tbody>
          {serie.map((s) => (
            <tr key={s.mes}>
              <td>{mesLabel(s.mes)}</td>
              <td>{formatMoney(s.entradas.previsto)}</td>
              <td>{formatMoney(s.entradas.realizado)}</td>
              <td>{formatMoney(s.saidas.previsto)}</td>
              <td>{formatMoney(s.saidas.realizado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function FluxoCaixaPanel({ mes, itensMes }: { mes: string; itensMes: Lancamento[] }) {
  const [saldoRaw, setSaldoRaw] = useState('')
  const [saldoInicial, setSaldoInicial] = useState(0)
  const [visao, setVisao] = useState<Visao>('ambos')
  const ano = mes.slice(0, 4)
  const q = useFluxoCaixa(mes, saldoInicial)
  const serieBackend = q.data?.serie_anual ?? []
  // Série anual: usa a do backend; se vier vazia (formato legado), deriva da DRE do ano.
  const dre = useDre(`${ano}-01`, `${ano}-12`, q.isSuccess && serieBackend.length === 0)

  if (q.isLoading && !q.data) return <LoadingState label="Calculando fluxo de caixa" />
  if (q.isError) return <ErrorState message={extractErrorMessage(q.error)} onRetry={() => void q.refetch()} />

  const legado = q.data === null
  const linhas: FluxoLinha[] = q.data?.linhas?.length ? q.data.linhas : fluxoDeLancamentos(itensMes, saldoInicial)
  const serie: FluxoSerieMes[] = serieBackend.length
    ? serieBackend
    : Array.from({ length: 12 }, (_, i) => {
        const key = `${ano}-${String(i + 1).padStart(2, '0')}`
        const m = dre.data?.meses.find((x) => x.mes === key)
        const entradas = m?.receita ?? { previsto: 0, realizado: 0 }
        const saidas = {
          previsto: (m?.custos.previsto ?? 0) + (m?.apresentadoras.previsto ?? 0) + (m?.imposto.previsto ?? 0),
          realizado: (m?.custos.realizado ?? 0) + (m?.apresentadoras.realizado ?? 0) + (m?.imposto.realizado ?? 0),
        }
        return {
          mes: key,
          entradas,
          saidas,
          saldo: { previsto: entradas.previsto - saidas.previsto, realizado: entradas.realizado - saidas.realizado },
        }
      })

  const pick = (v: { previsto: number; realizado: number }) => (visao === 'previsto' ? v.previsto : v.realizado)
  const max = Math.max(1, ...linhas.flatMap((l) => [l.entradas.previsto, l.saidas.previsto, l.entradas.realizado, l.saidas.realizado]))
  const final = linhas[linhas.length - 1]?.acumulado ?? { previsto: saldoInicial, realizado: saldoInicial }
  const menorAcumulado = Math.min(...linhas.map((l) => pick(l.acumulado)))

  function commitSaldo() {
    setSaldoInicial(parseBRMoneyToDecimal(saldoRaw))
  }

  return (
    <section className="space-y-4">
      <div className="design-card overflow-hidden">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-base font-bold text-ink">
              Fluxo de caixa <span className="serif font-normal text-brand">{mesLabel(mes)}</span>
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">Agrupado pelas datas de vencimento (5, 10, 15, 20, 25, 30) e fatura do cartão.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1">
              <span className="text-[11px] font-semibold text-ink-muted">Saldo inicial</span>
              <MoneyInput
                className="design-input h-9 w-36 px-3 text-sm"
                placeholder="0,00"
                value={saldoRaw}
                onChange={(raw) => setSaldoRaw(raw)}
                onBlur={commitSaldo}
                onKeyDown={(e) => e.key === 'Enter' && commitSaldo()}
              />
            </label>
            <Segmented<Visao>
              label="Visão"
              size="sm"
              value={visao}
              onChange={setVisao}
              options={[
                { value: 'ambos', label: 'Real × previsto' },
                { value: 'realizado', label: 'Realizado' },
                { value: 'previsto', label: 'Previsto' },
              ]}
            />
          </div>
        </header>

        {legado ? (
          <p className="flex items-center gap-2 border-b border-line bg-[var(--info-soft)] px-4 py-2 text-xs text-[var(--info)] sm:px-5">
            <Info className="h-3.5 w-3.5" /> Calculado a partir dos lançamentos do mês.
          </p>
        ) : null}

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <caption className="sr-only">Fluxo de caixa de {mesLabel(mes)} por faixa de vencimento</caption>
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                <th scope="col" className="fin-sticky-col px-4 py-3 text-left font-bold sm:px-5">Vencimento</th>
                <th scope="col" className="px-3 py-3 text-left font-bold">Entradas</th>
                <th scope="col" className="px-3 py-3 text-left font-bold">Saídas</th>
                <th scope="col" className="px-3 py-3 text-right font-bold">Saldo</th>
                <th scope="col" className="px-4 py-3 text-right font-bold sm:px-5">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const acc = pick(l.acumulado)
                const saldo = pick(l.saldo)
                const vazio = !l.entradas.previsto && !l.saidas.previsto && !l.entradas.realizado && !l.saidas.realizado
                return (
                  <tr key={l.chave} className={clsx('border-b border-[var(--hairline)]', vazio && 'opacity-50')}>
                    <th scope="row" className="fin-sticky-col px-4 py-3 text-left sm:px-5">
                      <span className={clsx('fin-daystamp text-xl', l.chave === 'cartao' ? 'text-brand' : 'text-ink')}>{l.label}</span>
                    </th>
                    {(['entradas', 'saidas'] as const).map((k) => (
                      <td key={k} className="w-[26%] px-3 py-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={clsx('num text-[13px] font-semibold', k === 'entradas' ? 'text-[var(--success)]' : 'text-ink')}>{formatMoney(pick(l[k]))}</span>
                          {visao === 'ambos' ? <span className="num text-[11px] text-ink-muted">prev. {formatMoney(l[k].previsto)}</span> : null}
                        </div>
                        <div className="mt-1.5">
                          <Bar value={pick(l[k])} ghost={visao === 'ambos' ? l[k].previsto : undefined} max={max} color={k === 'entradas' ? 'var(--success)' : 'var(--warning)'} />
                        </div>
                      </td>
                    ))}
                    <td className={clsx('num px-3 py-3 text-right text-[13px] font-semibold', saldo < 0 ? 'text-[var(--danger)]' : 'text-ink')}>{formatMoney(saldo)}</td>
                    <td className={clsx('num px-4 py-3 text-right text-[13px] font-bold sm:px-5', acc < 0 ? 'text-[var(--danger)]' : 'text-ink')}>{formatMoney(acc)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[color-mix(in_srgb,var(--bg-elev-3)_60%,transparent)]">
                <th scope="row" className="fin-sticky-col bg-[color-mix(in_srgb,var(--bg-elev-3)_60%,var(--bg-elev-1))] px-4 py-3 text-left text-sm font-bold text-ink sm:px-5">Saldo final</th>
                <td colSpan={3} className="px-3 py-3 text-xs text-ink-muted">
                  {menorAcumulado < 0 ? (
                    <span className="font-semibold text-[var(--danger)]">Atenção: o caixa fica negativo em algum momento do mês ({formatMoney(menorAcumulado)}).</span>
                  ) : (
                    'Caixa positivo durante todo o mês.'
                  )}
                </td>
                <td className={clsx('num px-4 py-3 text-right text-base font-bold sm:px-5', pick(final) < 0 ? 'text-[var(--danger)]' : 'text-ink')}>{formatMoney(pick(final))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="design-card p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-ink">
            Série anual <span className="serif font-normal text-brand">{ano}</span>
          </h3>
          {dre.isFetching ? <span className="text-xs text-ink-muted">atualizando…</span> : null}
        </div>
        <SerieAnual serie={serie} mes={mes} visao={visao} />
      </div>
    </section>
  )
}
