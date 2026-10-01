import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DRE_QK, getDreAnualV3, getDreMesDetalhe } from '../services/financeiro-dre'

/** DRE anual v3 (Receita − Custos fixos − Custos variáveis = Resultado; aportes à parte). */
export function useDreAnualV3(inicio: string, fim: string, enabled = true) {
  return useQuery({ queryKey: DRE_QK.anual(inicio, fim), queryFn: () => getDreAnualV3(inicio, fim), placeholderData: keepPreviousData, enabled })
}

/** Detalhe de um mês do DRE; só busca com `mes` definido. */
export function useDreMes(mes: string | null) {
  return useQuery({
    queryKey: DRE_QK.mes(mes ?? ''),
    queryFn: () => getDreMesDetalhe(mes as string),
    enabled: Boolean(mes),
  })
}
