import { apiGet } from './api'

export type GradeSituacao =
  | 'cancelada'
  | 'manutencao'
  | 'registro_pendente'
  | 'vinculacao_pendente'
  | 'planejada'
  | 'sem_execucao_vinculada'
  | 'sem_reserva'
  | 'em_andamento'
  | 'realizada'

export interface GradePlanejamentoOperacional {
  id: string
  tipo: string
  status_agenda: string
  situacao: Exclude<GradeSituacao, 'sem_reserva'>
  cancelamento_origem: 'agenda' | 'execucao' | null
  marca_id: string | null
  marca_nome: string | null
  apresentadora_id: string | null
  apresentadora_nome: string | null
  data_inicio: string | null
  data_fim: string | null
  observacoes: string | null
  live_ids: string[]
  live_candidata_ids: string[]
  minutos_reais: number
}

export interface GradeExecucaoSemReserva {
  id: string
  situacao: 'vinculacao_pendente' | 'sem_reserva' | 'cancelada'
  status_live: string
  marca_id: string | null
  marca_nome: string | null
  iniciado_em: string | null
  encerrado_em: string | null
  agenda_candidata_ids: string[]
  minutos_reais: number
}

export interface GradeCabineOperacional {
  id: string | null
  numero: number | null
  nome: string | null
  ativo: boolean | null
  status_fisico: string
  sem_reserva: boolean
  programacao_grade: Array<{ cabine_id: string; hora_inicio: string; hora_fim: string; marca_nome: string }>
  minutos_reais: number
  planejamentos: GradePlanejamentoOperacional[]
  execucoes_sem_reserva: GradeExecucaoSemReserva[]
}

export interface GradeAcompanhamentoResponse {
  data: string
  timezone: 'America/Sao_Paulo'
  cabines: GradeCabineOperacional[]
  cabine_desconhecida: GradeCabineOperacional
}

export function getGradeAcompanhamento(data: string) {
  return apiGet<GradeAcompanhamentoResponse>('/grade/acompanhamento', { data })
}
