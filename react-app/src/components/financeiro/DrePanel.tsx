import clsx from 'clsx'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Fragment, useCallback, useState, useSyncExternalStore } from 'react'
import { useDreAnualV3, usePrefetchDreMes } from '../../hooks/useDreMes'
import { extractErrorMessage } from '../../services/api'
import type { PrevistoRealizado } from '../../types/financeiro'
import type { DreLinhaV3, VisaoDre } from '../../types/financeiro-dre'
import { somarPR, ZERO_PR } from '../../utils/dre-detalhe'
import { mesLabel } from '../../utils/financeiro'
import { formatMoney, formatPercent } from '../../utils/format'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { DreMesInline } from './DreMesInline'
import { Segmented } from './primitives'

type Visao = VisaoDre

const VAZIA: DreLinhaV3 = {
  receita: ZERO_PR,
  custos: { ...ZERO_PR, por_grupo: {} },
  apresentadoras: ZERO_PR,
  imposto: { ...ZERO_PR, aliquota: 0, base: 0 },
  resultado: ZERO_PR,
  custos_fixos: ZERO_PR,
  custos_variaveis: ZERO_PR,
  aportes: ZERO_PR,
  perdas: { receita: 0 },
  receita_partes: null,
  classificacao: 'api',
}

/** `min-width` reativo sem flash de layout (lê o matchMedia no primeiro render; false quando indisponível). */
function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`
  const subscribe = useCallback(
    (cb: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false),
    () => false,
  )
}

type Coluna = { key: string; label: string; sinal: '+' | '−' | '=' | '·'; sel: (m: DreLinhaV3) => PrevistoRealizado; destaque?: boolean; informativa?: boolean; dica?: string }

function Celula({ v, visao, destaque, negativo }: { v: PrevistoRealizado; visao: Visao; destaque?: boolean; negativo?: boolean }) {
  const main = visao === 'previsto' ? v.previsto : v.realizado
  const cor = destaque ? (main < 0 ? 'text-[var(--danger)]' : 'text-ink') : negativo ? 'text-[var(--text-secondary)]' : 'text-ink'
  return (
    <div className="text-right">
      <span className={clsx('num block whitespace-nowrap text-[13px]', destaque ? 'font-bold' : 'font-medium', cor)}>
        {main === 0 ? <span className="text-ink-muted">—</span> : formatMoney(main)}
      </span>
      {visao === 'ambos' ? (
        <span className="num block whitespace-nowrap text-[11px] text-ink-muted" title="Previsto">
          {v.previsto === 0 ? '·' : `prev. ${formatMoney(v.previsto)}`}
        </span>
      ) : null}
    </div>
  )
}

export function DrePanel({ mes }: { mes: string }) {
  const [ano, setAno] = useState(Number(mes.slice(0, 4)))
  const [visao, setVisao] = useState<Visao>('ambos')
  // Meses com o detalhe aberto (vários ao mesmo tempo); persiste enquanto o painel está na tela.
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => new Set())
  const inicio = `${ano}-01`
  const fim = `${ano}-12`
  const q = useDreAnualV3(inicio, fim)
  const prefetch = usePrefetchDreMes()
  const sm = useMinWidth(640)
  const lg = useMinWidth(1024)

  if (q.isLoading && !q.data) return <LoadingState label="Montando DRE" />
  if (q.isError && !q.data) return <ErrorState message={extractErrorMessage(q.error)} onRetry={() => void q.refetch()} />
  const dre = q.data
  if (!dre) return null

  const porMes = new Map(dre.meses.map((m) => [m.mes, m]))
  const mesesAno = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`)
  const estimada = dre.totais.classificacao === 'estimada'
  const temAportes = dre.totais.aportes.previsto !== 0 || dre.totais.aportes.realizado !== 0
  // Backend antigo não manda `perdas` (= 0): a coluna só aparece quando há perda no ano.
  const temPerdas = dre.totais.perdas.receita !== 0 || dre.meses.some((m) => m.perdas.receita !== 0)

  const colunas: Coluna[] = [
    { key: 'receita', label: 'Receita', sinal: '+', sel: (m) => m.receita },
    ...(temPerdas && lg
      ? ([{ key: 'perdas', label: 'Receita perdida', sinal: '−', sel: (m) => ({ previsto: m.perdas.receita, realizado: 0 }), dica: 'Saldo de títulos dados como perdidos. O previsto da receita não muda; a perda desconta só do resultado previsto.' }] satisfies Coluna[])
      : []),
    ...(sm
      ? ([
          { key: 'fixos', label: 'Custos fixos', sinal: '−', sel: (m) => m.custos_fixos },
          { key: 'variaveis', label: 'Custos variáveis', sinal: '−', sel: (m) => m.custos_variaveis },
        ] satisfies Coluna[])
      : ([{ key: 'custos', label: 'Custos', sinal: '−', sel: (m) => somarPR(m.custos_fixos, m.custos_variaveis) }] satisfies Coluna[])),
    { key: 'resultado', label: 'Resultado', sinal: '=', sel: (m) => m.resultado, destaque: true },
    ...(temAportes && lg
      ? ([{ key: 'aportes', label: 'Aportes', sinal: '·', sel: (m) => m.aportes, informativa: true, dica: 'Fora do resultado' }] satisfies Coluna[])
      : []),
  ]
  const nCols = colunas.length + 1

  const t = dre.totais
  const margem = (v: number, r: number) => (r > 0 ? (v / r) * 100 : 0)
  const margemMain = visao === 'previsto' ? margem(t.resultado.previsto, t.receita.previsto) : margem(t.resultado.realizado, t.receita.realizado)

  function alternar(m: string) {
    setAbertos((prev) => {
      const next = new Set(prev)
      if (next.has(m)) next.delete(m)
      else next.add(m)
      return next
    })
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Receita no ano', v: t.receita, color: 'var(--success)' },
          { label: 'Custos no ano', v: somarPR(t.custos_fixos, t.custos_variaveis), color: 'var(--warning)' },
          { label: 'Resultado no ano', v: t.resultado, color: t.resultado.realizado >= 0 ? 'var(--success)' : 'var(--danger)' },
        ].map((c) => (
          <div key={c.label} className="design-card fin-rise min-w-0 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{c.label}</p>
            <p className="num mt-2 break-words text-2xl font-bold tracking-[-0.02em] text-ink">{formatMoney(c.v.realizado, true)}</p>
            <p className="num mt-1 text-xs text-ink-muted">
              previsto <span className="font-semibold" style={{ color: c.color }}>{formatMoney(c.v.previsto, true)}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="design-card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">
              DRE <span className="serif font-normal text-brand">mensal</span>
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Regime de competência · margem {visao === 'previsto' ? 'prevista' : 'realizada'} {formatPercent(margemMain)}
              {q.isFetching ? ' · atualizando…' : ''}
            </p>
          </div>
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-line p-1" role="group" aria-label="Ano">
              <button type="button" aria-label="Ano anterior" className="grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink sm:h-8 sm:w-8" onClick={() => setAno((a) => a - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="num px-2 text-sm font-bold text-ink" aria-live="polite">{ano}</span>
              <button type="button" aria-label="Próximo ano" className="grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink sm:h-8 sm:w-8" onClick={() => setAno((a) => a + 1)}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
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

        {dre.meses.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Sem dados de DRE" description="O resumo mensal aparece assim que houver receitas ou custos no ano." />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">DRE mensal de {ano}: receita, custos e resultado por mês. Cada mês expande o detalhe logo abaixo.</caption>
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                  <th scope="col" className="px-3 py-3 text-left font-bold sm:px-5">Mês</th>
                  {colunas.map((c) => (
                    <th key={c.key} scope="col" title={c.dica} className={clsx('px-2 py-3 text-right font-bold sm:px-3', c.destaque && 'text-ink')}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mesesAno.map((m) => {
                  const linha = porMes.get(m)
                  const aberto = abertos.has(m)
                  const id = `dre-detalhe-${m}`
                  const atual = m === mes
                  return (
                    <Fragment key={m}>
                      <tr
                        className={clsx('fin-row cursor-pointer border-b border-[var(--hairline)]', atual && 'bg-[var(--primary-softer)]', aberto && 'bg-[color-mix(in_srgb,var(--bg-elev-3)_60%,transparent)]', !linha && 'opacity-60')}
                        onClick={() => alternar(m)}
                        onMouseEnter={() => prefetch(m)}
                        onFocus={() => prefetch(m)}
                      >
                        <th scope="row" className="px-1.5 py-1 text-left sm:px-3">
                          <button
                            type="button"
                            aria-expanded={aberto}
                            aria-controls={aberto ? id : undefined}
                            aria-label={`Detalhe de ${mesLabel(m)}`}
                            className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-1.5 text-left font-semibold text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 sm:min-h-9 sm:px-2"
                          >
                            <ChevronDown className={clsx('h-4 w-4 shrink-0 text-ink-muted transition', !aberto && '-rotate-90')} aria-hidden />
                            <span className={clsx('first-letter:uppercase', atual && 'text-brand')}>
                              <span className="sm:hidden">{mesLabel(m, true)}</span>
                              <span className="hidden sm:inline">{mesLabel(m).split(' de ')[0]}</span>
                            </span>
                          </button>
                        </th>
                        {colunas.map((c) => (
                          <td key={c.key} className={clsx('px-2 py-2 sm:px-3', c.informativa && 'opacity-80')}>
                            <Celula v={c.sel(linha ?? VAZIA)} visao={visao} destaque={c.destaque} negativo={c.sinal === '−'} />
                          </td>
                        ))}
                      </tr>
                      {aberto ? (
                        <tr id={id} className="border-b border-line bg-[var(--bg-base)]">
                          <td colSpan={nCols} className="p-0">
                            <div className="px-3 py-4 sm:px-5">
                              <DreMesInline mes={m} visao={visao} />
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
                <tr className="border-t-2 border-t-[var(--border-strong)] bg-[color-mix(in_srgb,var(--bg-elev-3)_60%,transparent)]">
                  <th scope="row" className="px-3 py-3 text-left text-sm font-bold text-ink sm:px-5">Total</th>
                  {colunas.map((c) => (
                    <td key={c.key} className="px-2 py-3 sm:px-3">
                      <Celula v={c.sel(t)} visao={visao} destaque={c.destaque || c.key === 'receita'} negativo={c.sinal === '−'} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-line px-4 py-3 text-xs text-ink-muted sm:px-5">
          Resultado = receita{temPerdas ? ' − receita perdida' : ''} − custos fixos − custos variáveis. Fixos = recorrentes, parcelas e fixo das apresentadoras; variáveis =
          custos pontuais, comissão e adicionais das apresentadoras e imposto (alíquota × recebido no mês anterior). Aportes ficam fora do
          resultado. Clique no mês para expandir o detalhe.
          {temPerdas
            ? ' Receita perdida = saldo em aberto de títulos que o cliente não vai pagar: o previsto da receita não muda, a perda aparece em coluna própria e desconta apenas do resultado previsto (o realizado não muda).'
            : ''}
          {estimada ? ' Classificação fixo/variável estimada (fixos = custos lançados; variáveis = apresentadoras + imposto).' : ''}
        </p>
      </div>
    </section>
  )
}
