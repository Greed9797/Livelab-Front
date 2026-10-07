import { useMemo } from 'react'
import { useLancamentos } from '../../hooks/useFinanceiro'
import { extractErrorMessage } from '../../services/api'
import { agruparPorGrupo, filtrarPorClasse, totaisCusto } from '../../utils/custo-classe'
import { mesLabel } from '../../utils/financeiro'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { CustoAcoesModais, CustoGrupoBloco, ResumoCusto, useCustoAcoes } from './CustosCommon'
import { RecorrentesPanel } from './RecorrentesPanel'
import { ComparacaoPainelMes } from './ComparacaoPainelMes'

/** Custos fixos do mês (recorrentes, parcelas, apresentadora fixo) + gestão dos recorrentes. */
export function CustosFixosPanel({ mes, podeEscrever }: { mes: string; podeEscrever: boolean }) {
  const q = useLancamentos({ inicio: mes, fim: mes, natureza: 'custo', classe: 'fixo' })
  const acoes = useCustoAcoes()
  const itens = useMemo(() => filtrarPorClasse(q.data?.itens ?? [], 'fixo'), [q.data])
  const grupos = useMemo(() => agruparPorGrupo(itens), [itens])
  const totais = totaisCusto(itens)

  if (q.isError) return <ErrorState message={extractErrorMessage(q.error)} onRetry={() => void q.refetch()} />

  return (
    <div className="space-y-5">
      <ComparacaoPainelMes mes={mes} natureza="custo" />
      {q.isLoading && !q.data ? (
        <LoadingState label="Carregando custos fixos" />
      ) : (
        <>
          <ResumoCusto titulo={`Custos fixos · Competência ${mesLabel(mes, true)}`} totais={totais} />
          {grupos.length === 0 ? (
            <EmptyState title="Nenhum custo fixo neste mês" description="Use “Gerar mês” abaixo para materializar os recorrentes, ou cadastre um novo recorrente." />
          ) : (
            grupos.map((g) => <CustoGrupoBloco key={g.grupo} g={g} podeEscrever={podeEscrever} acoes={acoes} />)
          )}
        </>
      )}

      <div className="space-y-2 pt-2">
        <h2 className="text-base font-bold text-ink">Recorrentes</h2>
        <RecorrentesPanel
          mes={mes}
          podeEscrever={podeEscrever}
          onNovo={() => acoes.setCustoModal({ kind: 'novo', modo: 'recorrente' })}
          onEditar={(r) => acoes.setCustoModal({ kind: 'editar-recorrente', recorrente: r })}
          onToast={acoes.toastOk}
        />
      </div>

      <CustoAcoesModais acoes={acoes} mes={mes} />
    </div>
  )
}
