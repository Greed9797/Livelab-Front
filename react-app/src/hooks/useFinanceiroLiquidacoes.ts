import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateFinanceiro } from './useFinanceiro'
import { registrarLiquidacaoIncremental } from '../services/financeiro-liquidacoes'

export function useLiquidacaoIncrementalMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: registrarLiquidacaoIncremental,
    onSuccess: () => invalidateFinanceiro(client),
  })
}
