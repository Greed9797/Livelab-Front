import { useQuery } from '@tanstack/react-query'
import { RECEITA_QK, getReceitaMensal } from '../services/financeiro-receita'
import { isMes } from '../utils/financeiro'

/** Receita do mês (competência + vencimento). Baixas usam useBaixaMutation, que invalida FQK.all ('fin2'). */
export function useReceitaMensal(mes: string, enabled = true) {
  return useQuery({
    queryKey: RECEITA_QK.mes(mes),
    queryFn: () => getReceitaMensal(mes),
    enabled: enabled && isMes(mes),
  })
}
