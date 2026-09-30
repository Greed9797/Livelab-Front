import { apiGet, apiPatch, apiPost } from './api'
import type { JsonRecord } from '../types/models'
import type { VencimentoCondicao } from '../utils/condicoes-vencimento'

export const CONDICOES_QK = {
  lista: (marcaId: string) => ['marca-condicoes', marcaId] as const,
}

export function getCondicoesMarca(marcaId: string) {
  return apiGet<JsonRecord[]>(`/marcas/${marcaId}/condicoes`)
}

/** Ajusta só o vencimento (fixo/comissão) de uma versão existente. */
export function patchVencimentoCondicao(marcaId: string, condicaoId: string, vencimento: Partial<VencimentoCondicao>) {
  return apiPatch<JsonRecord>(`/marcas/${marcaId}/condicoes/${condicaoId}/vencimento`, vencimento)
}

export interface NovaCondicaoPayload extends Partial<VencimentoCondicao> {
  inicio_vigencia: string // 'YYYY-MM'
  fixo_mensal: number
  comissao_franquia_pct: number
  comissao_franqueadora_pct: number
  tipo_cobranca: string
  fixo_confirmado: boolean
  comissao_confirmada: boolean
  motivo?: string
  expected_revision: number
}

/** Cria nova versão da condição (Idempotency-Key obrigatório no back). */
export function createCondicaoMarca(marcaId: string, payload: NovaCondicaoPayload, idempotencyKey: string) {
  return apiPost<JsonRecord>(`/marcas/${marcaId}/condicoes`, payload, { headers: { 'Idempotency-Key': idempotencyKey } })
}
