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

export interface PresenterSettlementLive {
  live_id: string
  data: string
  marca_nome: string | null
  cabine_nome: string | null
  duracao_horas: number
  gmv: number
  gmv_atribuido: number
  pedidos: number
  comissao: number
}

export interface PresenterSettlementMemory {
  id: string
  data: string
  origem: string
  marca_nome: string | null
  gmv: number
  comissao_apresentadora: number
  pct_aplicado: number
  base_gmv_mes: number
  faixa: { gmv_inicio: number; gmv_fim: number | null; comissao_pct: number } | null
  fim_de_semana: boolean
}

export interface PresenterSettlementDetails {
  mes: string
  apresentadora_id: string
  total_variavel: number
  memoria_completa: boolean
  performance: {
    total_lives: number
    horas_live: number
    gmv_lives: number
    gmv_por_hora: number | null
  }
  lives: PresenterSettlementLive[]
  memoria: PresenterSettlementMemory[]
}

export function getPresenterSettlement(mes: string) {
  return apiGet<PresenterSettlement>('/financeiro/fechamento-apresentadoras', { mes })
}

export function getPresenterSettlementDetails(apresentadoraId: string, mes: string) {
  return apiGet<PresenterSettlementDetails>(`/financeiro/fechamento-apresentadoras/${encodeURIComponent(apresentadoraId)}/detalhes`, { mes })
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
