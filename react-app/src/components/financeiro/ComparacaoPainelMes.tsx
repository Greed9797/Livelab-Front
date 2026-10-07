import { usePainel } from '../../hooks/useFinanceiro'
import { extractErrorMessage } from '../../services/api'
import type { Natureza } from '../../types/financeiro'
import { formatDataBR } from '../../utils/caixa'
import { mesLabel } from '../../utils/financeiro'
import { formatMoney } from '../../utils/format'
import { ErrorState, LoadingState } from '../ui/States'

/** Usa os mesmos saldos do painel; competência e vencimento têm recortes distintos. */
export function ComparacaoPainelMes({ mes, natureza }: { mes: string; natureza: Natureza }) {
  const query = usePainel(mes)
  // usePainel mantém o resultado anterior durante a troca de mês. Não rotular esse saldo como o novo mês.
  const painel = query.data?.mes === mes ? query.data : undefined
  if (query.isError && !painel) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
  if (!painel) return <LoadingState label="Carregando comparação com o painel" />

  const lado = natureza === 'receita' ? painel.a_receber : painel.a_pagar
  const titulo = natureza === 'receita' ? 'A receber no painel' : 'A pagar no painel · todos os custos'
  return (
    <section className="design-card space-y-3 p-4 sm:p-5" aria-label="Comparação com o painel do mês" aria-busy={query.isFetching || undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink">{titulo}</h3>
          <p className="mt-1 text-xs text-ink-muted">Saldo em aberto por vencimento até {formatDataBR(painel.fim_mes)}, incluindo anteriores.</p>
        </div>
        <a className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={`/financeiro?tab=lancamentos&mes=${encodeURIComponent(mes)}`}>
          Ver painel em Lançamentos
        </a>
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
        {([
          [`Vence em ${mesLabel(mes)}`, lado.no_mes],
          ['Vencimentos anteriores', lado.atrasado_anterior],
          ['Total em aberto no painel', lado.total],
        ] as const).map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-ink-muted">{label}</dt>
            <dd className="num mt-1 font-bold text-ink">{formatMoney(value, true)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-ink-muted">
        {natureza === 'custo'
          ? 'O painel reúne custos fixos e variáveis pelas datas de vencimento. Os resumos desta aba seguem a competência selecionada.'
          : 'O painel inclui receitas e aportes pelos vencimentos, com saldos anteriores. A visão por competência reúne a receita gerada no mês.'}
        {painel.data_corte ? ` Corte financeiro: ${formatDataBR(painel.data_corte)}.` : ''}
        {query.isFetching ? ' Atualizando…' : ''}
      </p>
    </section>
  )
}
