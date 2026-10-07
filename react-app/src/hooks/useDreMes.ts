import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { DRE_QK, getDreAnualV3, getDreMesDetalhe } from '../services/financeiro-dre'
import type { RegimeDre } from '../types/financeiro-dre'
import { FIN_CACHE } from './useFinanceiro'

/** DRE anual v3 (Receita − Custos fixos − Custos variáveis = Resultado; aportes à parte). */
export function useDreAnualV3(inicio: string, fim: string, enabled = true, regime: RegimeDre = 'caixa_vencimento') {
  return useQuery({
    queryKey: DRE_QK.anual(inicio, fim, regime),
    queryFn: () => getDreAnualV3(inicio, fim, regime),
    enabled,
    ...FIN_CACHE,
  })
}

/** Detalhe de um mês do DRE; só busca com `mes` definido. */
export function useDreMes(mes: string | null, regime: RegimeDre = 'caixa_vencimento') {
  return useQuery({
    queryKey: DRE_QK.mes(mes ?? '', regime),
    queryFn: () => getDreMesDetalhe(mes as string, regime),
    enabled: Boolean(mes),
    ...FIN_CACHE,
  })
}

/** Aquece o cache do detalhe de um mês (hover/foco na linha do DRE). */
export function usePrefetchDreMes(regime: RegimeDre = 'caixa_vencimento') {
  const client = useQueryClient()
  return useCallback(
    (mes: string) => {
      void client.prefetchQuery({ queryKey: DRE_QK.mes(mes, regime), queryFn: () => getDreMesDetalhe(mes, regime), ...FIN_CACHE })
    },
    [client, regime],
  )
}
