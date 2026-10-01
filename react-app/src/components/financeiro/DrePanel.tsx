import clsx from 'clsx'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Fragment, useState } from 'react'
import { useDreAnualV3 } from '../../hooks/useDreMes'
import { extractErrorMessage } from '../../services/api'
import type { PrevistoRealizado } from '../../types/financeiro'
import type { DreLinhaV3, VisaoDre } from '../../types/financeiro-dre'
import { somarPR, subtrairPR, ZERO_PR } from '../../utils/dre-detalhe'
import { mesCurto, mesLabel } from '../../utils/financeiro'
import { formatMoney, formatPercent } from '../../utils/format'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { DreMesDetalhe } from './DreMesDetalhe'
import { Segmented } from './primitives'

type Visao = VisaoDre
type Linha = {
  key: string
  label: string
  sinal: '+' | '−' | '=' | '·'
  sel: (m: DreLinhaV3) => PrevistoRealizado
  destaque?: boolean
  sub?: boolean
  informativa?: boolean
  expansivel?: boolean
}

const VAZIA: DreLinhaV3 = {
  receita: ZERO_PR,
  custos: { ...ZERO_PR, por_grupo: {} },
  apresentadoras: ZERO_PR,
  imposto: { ...ZERO_PR, aliquota: 0, base: 0 },
  resultado: ZERO_PR,
  custos_fixos: ZERO_PR,
  custos_variaveis: ZERO_PR,
  aportes: ZERO_PR,
  receita_partes: null,
  classificacao: 'api',
}

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
  const [abrirVariaveis, setAbrirVariaveis] = useState(false)
  const [detalhe, setDetalhe] = useState<string | null>(null)
  const inicio = `${ano}-01`
  const fim = `${ano}-12`
  const q = useDreAnualV3(inicio, fim)

  if (q.isLoading && !q.data) return <LoadingState label="Montando DRE" />
  if (q.isError) return <ErrorState message={extractErrorMessage(q.error)} onRetry={() => void q.refetch()} />
  const dre = q.data
  if (!dre) return null

  const porMes = new Map(dre.meses.map((m) => [m.mes, m]))
  const colunas = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`)
  const aliquota = dre.meses.find((m) => m.mes === mes)?.imposto.aliquota || dre.totais.imposto.aliquota
  const estimada = dre.totais.classificacao === 'estimada'
  const temPartes = dre.totais.receita_partes != null
  const temAportes = dre.totais.aportes.previsto !== 0 || dre.totais.aportes.realizado !== 0

  const linhas: Linha[] = [
    { key: 'receita', label: 'Receita', sinal: '+', sel: (m) => m.receita, destaque: true },
    ...(temPartes
      ? ([
          { key: 'r-fixo', label: 'Fixo das marcas', sinal: '+', sel: (m) => m.receita_partes?.fixo ?? ZERO_PR, sub: true },
          { key: 'r-comissao', label: 'Comissões', sinal: '+', sel: (m) => m.receita_partes?.comissao ?? ZERO_PR, sub: true },
          { key: 'r-avulsas', label: 'Avulsas', sinal: '+', sel: (m) => m.receita_partes?.avulsas ?? ZERO_PR, sub: true },
        ] satisfies Linha[])
      : []),
    { key: 'fixos', label: 'Custos fixos', sinal: '−', sel: (m) => m.custos_fixos },
    { key: 'variaveis', label: 'Custos variáveis', sinal: '−', sel: (m) => m.custos_variaveis, expansivel: true },
    ...(abrirVariaveis
      ? ([
          {
            key: 'v-demais',
            label: estimada ? 'Apresentadoras' : 'Apresentadoras (var.) e custos',
            sinal: '−',
            sel: (m) => subtrairPR(m.custos_variaveis, m.imposto),
            sub: true,
          },
          { key: 'v-imposto', label: `Imposto${aliquota ? ` (${formatPercent(aliquota)})` : ''}`, sinal: '−', sel: (m) => m.imposto, sub: true },
        ] satisfies Linha[])
      : []),
    { key: 'resultado', label: 'Resultado', sinal: '=', sel: (m) => m.resultado, destaque: true },
    ...(temAportes ? ([{ key: 'aportes', label: 'Aportes (fora do resultado)', sinal: '·', sel: (m) => m.aportes, informativa: true }] satisfies Linha[]) : []),
  ]

  const t = dre.totais
  const margem = (v: number, r: number) => (r > 0 ? (v / r) * 100 : 0)
  const margemMain = visao === 'previsto' ? margem(t.resultado.previsto, t.receita.previsto) : margem(t.resultado.realizado, t.receita.realizado)

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Receita no ano', v: t.receita, color: 'var(--success)' },
          { label: 'Custos no ano', v: somarPR(t.custos_fixos, t.custos_variaveis), color: 'var(--warning)' },
          { label: 'Resultado no ano', v: t.resultado, color: t.resultado.realizado >= 0 ? 'var(--success)' : 'var(--danger)' },
        ].map((c) => (
          <div key={c.label} className="design-card fin-rise p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{c.label}</p>
            <p className="num mt-2 text-2xl font-bold tracking-[-0.02em] text-ink">{formatMoney(c.v.realizado, true)}</p>
            <p className="num mt-1 text-xs text-ink-muted">
              previsto <span className="font-semibold" style={{ color: c.color }}>{formatMoney(c.v.previsto, true)}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="design-card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-base font-bold text-ink">
              DRE <span className="serif font-normal text-brand">mensal</span>
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Regime de competência · margem {visao === 'previsto' ? 'prevista' : 'realizada'} {formatPercent(margemMain)}
              {q.isFetching ? ' · atualizando…' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-line p-1" role="group" aria-label="Ano">
              <button type="button" aria-label="Ano anterior" className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink" onClick={() => setAno((a) => a - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="num px-2 text-sm font-bold text-ink" aria-live="polite">{ano}</span>
              <button type="button" aria-label="Próximo ano" className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink" onClick={() => setAno((a) => a + 1)}>
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
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <caption className="sr-only">DRE mensal de {ano}: receita, custos fixos, custos variáveis e resultado por mês. Os cabeçalhos dos meses abrem o detalhe do mês.</caption>
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                  <th scope="col" className="fin-sticky-col px-4 py-3 text-left font-bold sm:px-5">Linha</th>
                  {colunas.map((c) => (
                    <th key={c} scope="col" className={clsx('px-1.5 py-1.5 text-right font-bold', c === mes && 'bg-brand-soft text-brand')}>
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        aria-label={`Abrir detalhe de ${mesLabel(c)}`}
                        title="Ver detalhe do mês"
                        className="inline-flex w-full items-center justify-end gap-1 rounded-full px-1.5 py-1.5 uppercase tracking-[0.1em] underline decoration-dotted underline-offset-4 transition hover:bg-surface-muted hover:text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
                        onClick={() => setDetalhe(c)}
                      >
                        {mesCurto(c)}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="border-l border-line px-4 py-3 text-right font-bold text-ink">Total</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <Fragment key={l.key}>
                    <tr className={clsx('border-b border-[var(--hairline)]', l.destaque && 'bg-[color-mix(in_srgb,var(--bg-elev-3)_60%,transparent)]', l.key === 'resultado' && 'border-t-2 border-t-[var(--border-strong)]', l.informativa && 'opacity-80')}>
                      <th scope="row" className={clsx('fin-sticky-col px-4 py-2.5 text-left sm:px-5', l.destaque && 'bg-[color-mix(in_srgb,var(--bg-elev-3)_60%,var(--bg-elev-1))]')}>
                        {l.expansivel ? (
                          <button type="button" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-ink" aria-expanded={abrirVariaveis} onClick={() => setAbrirVariaveis((v) => !v)}>
                            <span className="num w-3 text-ink-muted">{l.sinal}</span>
                            {l.label}
                            <ChevronDown className={clsx('h-3.5 w-3.5 text-ink-muted transition', abrirVariaveis && 'rotate-180')} />
                          </button>
                        ) : (
                          <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap', l.sub ? 'pl-5 text-xs text-ink-muted' : l.informativa ? 'text-xs font-semibold italic text-ink-muted' : l.destaque ? 'font-bold text-ink' : 'font-semibold text-ink')}>
                            {!l.sub ? <span className="num w-3 text-ink-muted">{l.sinal}</span> : null}
                            {l.label}
                          </span>
                        )}
                      </th>
                      {colunas.map((c) => (
                        <td key={c} className={clsx('px-3 py-2.5', c === mes && 'bg-[var(--primary-softer)]')}>
                          <Celula v={l.sel(porMes.get(c) ?? VAZIA)} visao={visao} destaque={l.key === 'resultado'} negativo={l.sinal === '−'} />
                        </td>
                      ))}
                      <td className="border-l border-line px-4 py-2.5">
                        <Celula v={l.sel(t)} visao={visao} destaque={l.destaque} negativo={l.sinal === '−'} />
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-line px-4 py-3 text-xs text-ink-muted sm:px-5">
          Resultado = receita − custos fixos − custos variáveis. Fixos = recorrentes, parcelas e fixo das apresentadoras; variáveis =
          custos pontuais, comissão e adicionais das apresentadoras e imposto (alíquota × recebido no mês anterior). Aportes ficam fora do
          resultado. Clique no mês para ver o detalhe.
          {estimada ? ' Classificação fixo/variável estimada (fixos = custos lançados; variáveis = apresentadoras + imposto).' : ''}
        </p>
      </div>
      <DreMesDetalhe mes={detalhe} onClose={() => setDetalhe(null)} onChangeMes={setDetalhe} visaoInicial={visao} />
    </section>
  )
}
