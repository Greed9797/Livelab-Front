import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useFinanceiroConfig, useLancamentos } from '../../hooks/useFinanceiro'
import { extractErrorMessage } from '../../services/api'
import { agruparPorApresentadora, agruparPorGrupo, filtrarPorClasse, totaisCusto } from '../../utils/custo-classe'
import { mesLabel, valorEmAberto } from '../../utils/financeiro'
import { formatMoney, formatPercent } from '../../utils/format'
import { Button } from '../ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { CustoAcoesModais, CustoGrupoBloco, CustoItemRow, ResumoCusto, useCustoAcoes } from './CustosCommon'
import { ComparacaoPainelMes } from './ComparacaoPainelMes'

/** Custos variáveis do mês: pontuais, apresentadoras (comissão/bônus) e imposto. */
export function CustosVariaveisPanel({ mes, podeEscrever }: { mes: string; podeEscrever: boolean }) {
  const q = useLancamentos({ inicio: mes, fim: mes, natureza: 'custo', classe: 'variavel' })
  const config = useFinanceiroConfig()
  const acoes = useCustoAcoes()
  const itens = useMemo(() => filtrarPorClasse(q.data?.itens ?? [], 'variavel'), [q.data])
  const { pontuais, apresentadoras, imposto } = useMemo(
    () => ({
      pontuais: itens.filter((l) => l.origem !== 'apresentadora' && l.origem !== 'imposto'),
      apresentadoras: itens.filter((l) => l.origem === 'apresentadora'),
      imposto: itens.find((l) => l.origem === 'imposto') ?? null,
    }),
    [itens],
  )
  const gruposPontuais = useMemo(() => agruparPorGrupo(pontuais), [pontuais])
  const pessoas = useMemo(() => agruparPorApresentadora(apresentadoras), [apresentadoras])
  const totais = totaisCusto(itens)
  const aliquota = config.data?.aliquota_imposto_pct
  const base = imposto && aliquota && aliquota > 0 ? (imposto.valor_previsto * 100) / aliquota : null

  if (q.isError) return <ErrorState message={extractErrorMessage(q.error)} onRetry={() => void q.refetch()} />
  if (q.isLoading && !q.data) return <LoadingState label="Carregando custos variáveis" />

  return (
    <div className="space-y-5">
      <ComparacaoPainelMes mes={mes} natureza="custo" />
      <ResumoCusto
        titulo={`Custos variáveis · Competência ${mesLabel(mes, true)}`}
        totais={totais}
        extra={
          podeEscrever ? (
            <Button variant="secondary" icon={Plus} onClick={() => acoes.setCustoModal({ kind: 'novo', modo: 'pontual' })}>
              Novo custo
            </Button>
          ) : null
        }
      />

      {itens.length === 0 ? <EmptyState title="Nenhum custo variável neste mês" description="Custos pontuais, comissões de apresentadoras e imposto aparecem aqui." /> : null}

      {gruposPontuais.length ? (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-ink">Pontuais</h2>
          {gruposPontuais.map((g) => <CustoGrupoBloco key={g.grupo} g={g} podeEscrever={podeEscrever} acoes={acoes} />)}
        </div>
      ) : null}

      {pessoas.length ? (
        <section className="space-y-3" aria-label="Apresentadoras">
          <h2 className="text-base font-bold text-ink">Apresentadoras <span className="font-normal text-ink-muted">· comissão e bônus</span></h2>
          {pessoas.map((p) => (
            <div key={p.apresentadora_id} className="design-card overflow-visible">
              <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
                <h3 className="text-sm font-bold text-ink">{p.nome}</h3>
                <p className="num text-xs font-semibold text-ink-muted">
                  {formatMoney(p.totais.previsto, true)}
                  {p.totais.aberto > 0 ? ` · em aberto ${formatMoney(p.totais.aberto, true)}` : ' · quitado'}
                </p>
              </header>
              <ul className="divide-y divide-[var(--hairline)]">
                {p.itens.map((l) => <CustoItemRow key={l.id} l={l} podeEscrever={podeEscrever} acoes={acoes} />)}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {imposto ? (
        <section className="design-card overflow-visible" aria-label="Imposto">
          <header className="border-b border-line px-4 py-3 sm:px-5">
            <h2 className="text-sm font-bold text-ink">Imposto</h2>
            <p className="num mt-0.5 text-xs text-ink-muted">
              {base != null ? `Base ${formatMoney(base, true)} · ` : ''}
              {aliquota != null ? `alíquota ${formatPercent(aliquota)} · ` : ''}
              {formatMoney(imposto.valor_previsto, true)}
              {valorEmAberto(imposto) > 0 ? ` (em aberto ${formatMoney(valorEmAberto(imposto), true)})` : ''}
            </p>
          </header>
          <ul><CustoItemRow l={imposto} podeEscrever={podeEscrever} acoes={acoes} /></ul>
        </section>
      ) : null}

      <CustoAcoesModais acoes={acoes} mes={mes} />
    </div>
  )
}
