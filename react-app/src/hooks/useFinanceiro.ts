import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  BaixaPayload,
  CustoParceladoPayload,
  CustoPontualPayload,
  CustoRecorrentePayload,
  EscopoExclusao,
  FinanceiroConfig,
  Lancamento,
  LancamentosFiltro,
} from '../types/financeiro'
import {
  FQK,
  baixarLancamento,
  createCustoParcelado,
  createCustoPontual,
  createCustoRecorrente,
  deleteCusto,
  deleteCustoRecorrente,
  getCustosRecorrentes,
  getDre,
  getFinanceiroConfig,
  getFluxoCaixa,
  getLancamentos,
  updateCusto,
  updateCustoRecorrente,
  updateFinanceiroConfig,
} from '../services/financeiro'
import { QK } from '../services/query-keys'
import type { AcaoBaixa } from '../utils/financeiro'

export function useLancamentos(filtro: LancamentosFiltro, enabled = true) {
  return useQuery({
    queryKey: FQK.lancamentos(filtro),
    queryFn: () => getLancamentos(filtro),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useDre(inicio: string, fim: string, enabled = true) {
  return useQuery({ queryKey: FQK.dre(inicio, fim), queryFn: () => getDre(inicio, fim), placeholderData: keepPreviousData, enabled })
}

export function useFluxoCaixa(mes: string, saldoInicial: number, enabled = true) {
  return useQuery({
    queryKey: FQK.fluxo(mes, saldoInicial),
    queryFn: () => getFluxoCaixa(mes, saldoInicial),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useFinanceiroConfig(enabled = true) {
  return useQuery({ queryKey: FQK.config, queryFn: getFinanceiroConfig, enabled })
}

export function useCustosRecorrentes(enabled = true) {
  return useQuery({ queryKey: FQK.recorrentes, queryFn: getCustosRecorrentes, enabled })
}

/** Invalida tudo que depende de lançamentos (novo financeiro + telas legadas que leem resumo/fluxo). */
export function useInvalidateFinanceiro() {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: FQK.all })
    void client.invalidateQueries({ queryKey: QK.financeiroResumo() })
    void client.invalidateQueries({ queryKey: QK.financeiroFluxo() })
    void client.invalidateQueries({ queryKey: QK.financeiroOperacional() })
  }
}

export function useBaixaMutation() {
  const invalidate = useInvalidateFinanceiro()
  return useMutation({
    mutationFn: ({ lancamento, acao, payload }: { lancamento: Lancamento; acao: AcaoBaixa; payload?: BaixaPayload }) =>
      baixarLancamento(lancamento, acao, payload),
    onSuccess: invalidate,
  })
}

export function useCustoMutations() {
  const invalidate = useInvalidateFinanceiro()
  const opts = { onSuccess: invalidate }
  return {
    criarPontual: useMutation({ mutationFn: (p: CustoPontualPayload) => createCustoPontual(p), ...opts }),
    criarParcelado: useMutation({ mutationFn: (p: CustoParceladoPayload) => createCustoParcelado(p), ...opts }),
    atualizar: useMutation({ mutationFn: ({ id, payload }: { id: string; payload: Partial<CustoPontualPayload> }) => updateCusto(id, payload), ...opts }),
    excluir: useMutation({ mutationFn: ({ id, escopo }: { id: string; escopo?: EscopoExclusao }) => deleteCusto(id, escopo), ...opts }),
    criarRecorrente: useMutation({ mutationFn: (p: CustoRecorrentePayload) => createCustoRecorrente(p), ...opts }),
    atualizarRecorrente: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Partial<CustoRecorrentePayload> }) => updateCustoRecorrente(id, payload),
      ...opts,
    }),
    excluirRecorrente: useMutation({ mutationFn: (id: string) => deleteCustoRecorrente(id), ...opts }),
  }
}

export function useConfigMutation() {
  const invalidate = useInvalidateFinanceiro()
  return useMutation({ mutationFn: (p: FinanceiroConfig) => updateFinanceiroConfig(p), onSuccess: invalidate })
}
