import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ASAAS_QK,
  conciliarAsaas,
  desfazerConciliacaoAsaas,
  getAsaasConciliacao,
  getAsaasExtrato,
  getAsaasSaldo,
  sincronizarAsaas,
} from '../services/asaas'
import type { TipoTransacao } from '../types/asaas'

export function useAsaasSaldo() {
  return useQuery({ queryKey: ASAAS_QK.saldo, queryFn: getAsaasSaldo, retry: false })
}

/** Extrato lido do cache local (gateway_transacoes): inclui o vínculo de conciliação. */
export function useAsaasExtrato(inicio: string, fim: string) {
  return useQuery({ queryKey: ASAAS_QK.extrato(inicio, fim, 'cache'), queryFn: () => getAsaasExtrato(inicio, fim, 'cache') })
}

export function useAsaasConciliacao(inicio: string, fim: string, tipo: TipoTransacao) {
  return useQuery({ queryKey: ASAAS_QK.conciliacao(inicio, fim, tipo), queryFn: () => getAsaasConciliacao(inicio, fim, tipo) })
}

function useInvalidateAsaas() {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: ASAAS_QK.all })
    // conciliar/desfazer altera baixa de lançamentos do Financeiro
    void client.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === 'string' && q.queryKey[0].startsWith('financeiro') })
  }
}

export function useSincronizarAsaas() {
  const invalidate = useInvalidateAsaas()
  return useMutation({ mutationFn: ({ inicio, fim }: { inicio: string; fim: string }) => sincronizarAsaas(inicio, fim), onSuccess: invalidate })
}

export function useConciliarAsaas() {
  const invalidate = useInvalidateAsaas()
  return useMutation({ mutationFn: conciliarAsaas, onSuccess: invalidate })
}

export function useDesfazerConciliacaoAsaas() {
  const invalidate = useInvalidateAsaas()
  return useMutation({ mutationFn: desfazerConciliacaoAsaas, onSuccess: invalidate })
}
