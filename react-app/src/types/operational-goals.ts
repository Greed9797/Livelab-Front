export type OperationalGoalsConfig = {
  horas_por_apresentador: number
  cabines_consideradas: number
  turnos: { inicio: string; fim: string }[]
}

export type OperationalGoalsPatch = {
  ano_mes: string
  meta_gmv: number
  meta_gmv_hora: number
  configuracao: OperationalGoalsConfig
  pisos_apresentadoras?: { id: string; meta_gmv_hora: number | null }[]
  pisos_marcas?: { id: string; meta_gmv_hora: number | null }[]
}

export type OperationalGoalsRangeParams = {
  from: string
  to: string
  marca_id?: string
  apresentadora_id?: string
}

export type OperationalGoalsStatus = 'dentro_da_meta' | 'abaixo_do_ritmo' | 'abaixo_da_meta' | 'dados_pendentes' | 'nao_iniciado' | 'sem_meta' | 'sem_dados' | 'nao_util' | 'consolidado' | 'em_andamento' | 'sem_permissao' | 'indisponivel'

export type OperationalLiveDetail = {
  id: string
  dia: string
  marca_id?: string | null
  marca_nome?: string | null
  cabine_nome?: string | null
  status?: string
  gmv: number | null
  horas: number | null
  tempo_incompleto?: boolean
  gmv_incompleto?: boolean
}

export type OperationalGoalEntity = {
  id: string
  nome: string
  horas: number
  gmv: number
  gmv_hora: number | null
  meta_horas?: number | null
  piso?: number | null
  piso_origem?: string
  desvio?: number | null
  status: OperationalGoalsStatus
  status_horas?: OperationalGoalsStatus | null
  lives: Array<Omit<OperationalLiveDetail, 'gmv' | 'horas'> & { gmv: number; horas: number }>
}

export type OperationalGoalsDaily = {
  data: string
  ano_mes: string
  editavel: boolean
  configurado: boolean
  configuracao: OperationalGoalsConfig | null
  pode_editar: boolean
  equipe_ativa: number
  dias_uteis: number
  estado: OperationalGoalsStatus
  pendencias: { submissoes: number; videos: number; lives_abertas: number; tempos_incompletos: number; gmv_incompletos?: number }
  horas: { realizado: number; meta: number | null; esperado_agora: number | null; faltante: number | null; status: OperationalGoalsStatus }
  gmv: { realizado: number; lives: number; videos: number; meta_diaria: number | null; meta_mensal: number | null; esperado_agora: number | null; faltante_dia: number | null; realizado_mes: number; esperado_mes: number | null; faltante_mes: number | null; necessario_dia: number | null; dias_restantes_equivalentes: number; status: OperationalGoalsStatus }
  produtividade: { realizado: number | null; piso: number | null; necessario: number | null; potencial_mensal_piso: number | null; piso_sustenta_meta: boolean | null }
  capacidade: { horas_apresentadores: number | null; horas_operacao: number; horas_cabines: number | null; horas_cabines_realizadas: number; gmv_hora_operacao_necessario: number | null; cabines_ativas?: number }
  serie: { dia: string; realizado: number; esperado: number | null }[]
  apresentadoras: OperationalGoalEntity[]
  marcas: OperationalGoalEntity[]
}

export type OperationalRangeTotals = {
  gmv: number | null
  gmv_lives: number | null
  gmv_videos: number | null
  horas_apresentadoras: number | null
  horas_cabines: number | null
  gmv_hora: number | null
  lives: number
  status: 'indisponivel'
  dados_incompletos: { gmv: boolean; horas: boolean }
}

export type OperationalRangeEntity = {
  id: string
  nome: string
  gmv: number | null
  horas: number | null
  gmv_hora: number | null
  status: 'indisponivel'
  lives: OperationalLiveDetail[]
}

export type OperationalGoalsRange = {
  tipo: 'intervalo'
  from: string
  to: string
  filtros: { marca_id: string | null; apresentadora_id: string | null }
  resumo: OperationalRangeTotals
  serie: Array<OperationalRangeTotals & { dia: string }>
  pendencias: { submissoes: number; videos: number; lives_abertas: number; tempos_incompletos: number; gmv_incompletos: number }
  apresentadoras: OperationalRangeEntity[]
  marcas: OperationalRangeEntity[]
  competencias: Array<{ ano_mes: string; from: string; to: string; configurado: boolean }>
  contexto_mensal: { ano_mes: string; corte: string; escopo: 'unidade'; dados: OperationalGoalsDaily }
  pode_editar: boolean
  editavel: false
  consolidavel: false
}

export type OperationalGoalsResponse = OperationalGoalsDaily | OperationalGoalsRange
