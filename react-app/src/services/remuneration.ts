import { apiDelete, apiGet, apiPost } from './api'

export type PresenterExtraType = 'fim_de_semana' | 'bonificacao'

export interface PresenterExtra {
  id: string
  tipo: PresenterExtraType
  data_referencia: string | null
  descricao: string
  valor: number | string
}

export interface PresenterSettlementRow {
  apresentadora_id: string
  nome: string
  fixo: number | string
  comissao: number | string
  adicionais: number | string
  total: number | string
  extras: PresenterExtra[]
}

export interface PresenterSettlement {
  mes: string
  apresentadoras: PresenterSettlementRow[]
  totais: { fixo: number | string; comissao: number | string; adicionais: number | string; total: number | string }
  pode_editar: boolean
}

export function getPresenterSettlement(mes: string) {
  return apiGet<PresenterSettlement>('/financeiro/fechamento-apresentadoras', { mes })
}

export function createPresenterExtra(payload: {
  mes: string
  apresentadora_id: string
  tipo: PresenterExtraType
  descricao: string
  data_referencia?: string
  valor?: number
  /** Chave da intenção de bonificação; o servidor a usa para repetir com segurança após falha de rede. */
  request_id?: string
}) {
  return apiPost<PresenterExtra>('/financeiro/adicionais-apresentadoras', payload)
}

export function deletePresenterExtra(id: string) {
  return apiDelete(`/financeiro/adicionais-apresentadoras/${encodeURIComponent(id)}`)
}
