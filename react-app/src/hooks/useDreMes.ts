import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { DRE_QK, getDreAnualV3, getDreMesDetalhe } from '../services/financeiro-dre'
import { FIN_CACHE } from './useFinanceiro'

/** DRE anual v3 (Receita − Custos fixos − Custos variáveis = Resultado; aportes à parte). */
export function useDreAnualV3(inicio: string, fim: string, enabled = true) {
  return useQuery({
    queryKey: DRE_QK.anual(inicio, fim),
    queryFn: () => getDreAnualV3(inicio, fim),
    placeholderData: keepPreviousData,
    enabled,
    ...FIN_CACHE,
  })
}

/** Detalhe de um mês do DRE; só busca com `mes` definido. */
export function useDreMes(mes: string | null) {
  return useQuery({
    queryKey: DRE_QK.mes(mes ?? ''),
    queryFn: () => getDreMesDetalhe(mes as string),
    enabled: Boolean(mes),
    ...FIN_CACHE,
  })
}

/** Aquece o cache do detalhe de um mês (hover/foco na linha do DRE). */
export function usePrefetchDreMes() {
  const client = useQueryClient()
  return useCallback(
    (mes: string) => {
      void client.prefetchQuery({ queryKey: DRE_QK.mes(mes), queryFn: () => getDreMesDetalhe(mes), ...FIN_CACHE })
    },
    [client],
  )
}
