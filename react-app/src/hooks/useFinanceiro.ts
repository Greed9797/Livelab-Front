import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  BaixaPayload,
  CustoParceladoPayload,
  CustoPontualPayload,
  CustoRecorrentePayload,
  EscopoExclusao,
  FinanceiroConfigPatch,
  ImportarCustosPayload,
  Lancamento,
  LancamentosFiltro,
  ModoPerda,
  ReceitaAvulsaPayload,
} from '../types/financeiro'
import {
  FQK,
  baixarLancamento,
  createCustoParcelado,
  createCustoPontual,
  createCustoRecorrente,
  createReceitaAvulsa,
  deleteCusto,
  deleteCustoRecorrente,
  deleteReceitaAvulsa,
  getCustosRecorrentes,
  getDre,
  getFinanceiroConfig,
  getFluxoCaixa,
  getLancamentos,
  getPainel,
  importarCustos,
  perdaLancamento,
  updateCusto,
  updateCustoRecorrente,
  updateFinanceiroConfig,
  updateReceitaAvulsa,
} from '../services/financeiro'
import { QK } from '../services/query-keys'
import type { AcaoBaixa } from '../utils/financeiro'

/** Cache das leituras financeiras: navegar entre abas/meses já vistos não refaz a rede. */
export const FIN_CACHE = { staleTime: 60_000, gcTime: 60 * 60_000 } as const

export function useLancamentos(filtro: LancamentosFiltro, enabled = true) {
  return useQuery({
    queryKey: FQK.lancamentos(filtro),
    queryFn: () => getLancamentos(filtro),
    placeholderData: keepPreviousData,
    enabled,
    ...FIN_CACHE,
  })
}

export function useDre(inicio: string, fim: string, enabled = true) {
  return useQuery({ queryKey: FQK.dre(inicio, fim), queryFn: () => getDre(inicio, fim), placeholderData: keepPreviousData, enabled, ...FIN_CACHE })
}

export function useFluxoCaixa(mes: string, saldoInicial: number, enabled = true) {
  return useQuery({
    queryKey: FQK.fluxo(mes, saldoInicial),
    queryFn: () => getFluxoCaixa(mes, saldoInicial),
    placeholderData: keepPreviousData,
    enabled,
    ...FIN_CACHE,
  })
}

export function useFinanceiroConfig(enabled = true) {
  return useQuery({ queryKey: FQK.config, queryFn: getFinanceiroConfig, enabled, ...FIN_CACHE })
}

/** Painel do mês (caixa hoje, a receber/a pagar, projeções). Mantém o mês anterior na tela enquanto troca. */
export function usePainel(mes: string, enabled = true) {
  return useQuery({
    queryKey: FQK.painel(mes),
    queryFn: () => getPainel(mes),
    placeholderData: keepPreviousData,
    enabled,
    ...FIN_CACHE,
  })
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

export function usePerdaMutation() {
  const invalidate = useInvalidateFinanceiro()
  return useMutation({
    mutationFn: ({ lancamento, modo, motivo }: { lancamento: Lancamento; modo: ModoPerda; motivo?: string }) =>
      perdaLancamento(lancamento, modo, motivo),
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
  return useMutation({ mutationFn: (p: FinanceiroConfigPatch) => updateFinanceiroConfig(p), onSuccess: invalidate })
}

export function useReceitaAvulsaMutations() {
  const invalidate = useInvalidateFinanceiro()
  const opts = { onSuccess: invalidate }
  return {
    criar: useMutation({ mutationFn: (p: ReceitaAvulsaPayload) => createReceitaAvulsa(p), ...opts }),
    atualizar: useMutation({ mutationFn: ({ id, payload }: { id: string; payload: Partial<ReceitaAvulsaPayload> }) => updateReceitaAvulsa(id, payload), ...opts }),
    excluir: useMutation({ mutationFn: (id: string) => deleteReceitaAvulsa(id), ...opts }),
  }
}

/** Importação da planilha: `dryRun` só confere; sem ele grava e invalida o financeiro. */
export function useImportarCustos() {
  const invalidate = useInvalidateFinanceiro()
  return useMutation({
    mutationFn: ({ seed, dryRun }: { seed: ImportarCustosPayload; dryRun: boolean }) => importarCustos(seed, dryRun),
    onSuccess: (res) => {
      if (!res.dry_run) invalidate()
    },
  })
}
