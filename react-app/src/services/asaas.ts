import { apiDelete, apiGet, apiPost } from './api'
import type {
  AsaasConciliacao,
  AsaasExtrato,
  AsaasSaldo,
  AsaasSincronizacao,
  TipoAlvoConciliacao,
  TipoTransacao,
} from '../types/asaas'

export const ASAAS_QK = {
  all: ['asaas'] as const,
  saldo: ['asaas', 'saldo'] as const,
  extrato: (inicio: string, fim: string, fonte: string) => ['asaas', 'extrato', inicio, fim, fonte] as const,
  conciliacao: (inicio: string, fim: string, tipo: TipoTransacao) => ['asaas', 'conciliacao', inicio, fim, tipo] as const,
}

export function getAsaasSaldo() {
  return apiGet<AsaasSaldo>('/asaas/saldo')
}

export function getAsaasExtrato(inicio: string, fim: string, fonte: 'asaas' | 'cache' = 'cache') {
  return apiGet<AsaasExtrato>('/asaas/extrato', { inicio, fim, ...(fonte === 'cache' ? { fonte } : {}) })
}

export function sincronizarAsaas(inicio: string, fim: string) {
  return apiPost<AsaasSincronizacao>('/asaas/sincronizar', { inicio, fim })
}

export function getAsaasConciliacao(inicio: string, fim: string, tipo: TipoTransacao) {
  return apiGet<AsaasConciliacao>('/asaas/conciliacao', { inicio, fim, tipo })
}

export function conciliarAsaas(payload: { transacao_id: string; tipo: TipoAlvoConciliacao; id: string }) {
  return apiPost<Record<string, unknown>>('/asaas/conciliar', payload)
}

export function desfazerConciliacaoAsaas(transacaoId: string) {
  return apiDelete<{ ok: boolean }>(`/asaas/conciliacao/${transacaoId}`)
}
