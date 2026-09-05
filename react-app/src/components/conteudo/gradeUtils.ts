// Utilitários da Grade visual de agenda por cabine.
// Slots são dados no backend; aqui ficam apenas os slots exibidos por padrão
// e a paleta determinística de cores por marca.
import { somarDias } from '../../utils/sao-paulo-date'
import type { GradeSituacao } from '../../services/grade'

export function gradeDateFromLink(value: string, fallback: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && somarDias(value, 0) === value ? value : fallback
}

export interface GradeCelula {
  cabine_id: string
  cabine_numero: number | null
  hora_inicio: string // "HH:MM"
  hora_fim: string
  marca_id: string
  marca_nome: string
  marca_cor?: string | null
  marca_logo_url: string | null
  apresentadora_id: string | null
  apresentadora_nome: string | null
  origem: 'padrao' | 'excecao'
  observacao: string | null
}

export interface GradeDia {
  data: string // "YYYY-MM-DD"
  celulas: GradeCelula[]
}

export interface GradePadraoCelula extends GradeCelula {
  dia_semana: number // 0=domingo (convenção extract(dow)/Date.getDay())
}

/** Slots fixos da operação (linhas da planilha). */
export const GRADE_SLOTS: ReadonlyArray<{ inicio: string; fim: string }> = [
  { inicio: '08:00', fim: '11:00' },
  { inicio: '11:00', fim: '14:00' },
  { inicio: '14:00', fim: '17:00' },
  { inicio: '17:00', fim: '20:00' },
]

/** 0=domingo … 6=sábado — mesma convenção do backend. */
export const DIAS_SEMANA_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

// Paleta fixa de 12 cores com bom contraste sobre fundo claro/escuro.
// Cada entrada: cor sólida (borda/dot) + fundo suave via alpha.
const MARCA_PALETTE = [
  '#e8590c', '#1971c2', '#2f9e44', '#9c36b5', '#e03131', '#0c8599',
  '#f08c00', '#6741d9', '#c2255c', '#099268', '#3b5bdb', '#846358',
] as const

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

/** Cor determinística por marca — mesma marca = mesma cor em qualquer visão. */
export function corDaMarca(marcaId: string): { solid: string; soft: string } {
  const solid = MARCA_PALETTE[hashString(marcaId) % MARCA_PALETTE.length]
  return { solid, soft: `${solid}26` } // ~15% alpha
}

export function gradeCellKey(cabineId: string, horaInicio: string) {
  return `${cabineId}:${horaInicio}`
}

/** Indexa células de um dia por cabine+slot para lookup O(1) na grade. */
export function indexCelulas(celulas: GradeCelula[]): Map<string, GradeCelula> {
  const map = new Map<string, GradeCelula>()
  for (const c of celulas) map.set(gradeCellKey(c.cabine_id, c.hora_inicio), c)
  return map
}

/** Marcas distintas presentes num conjunto de células (para legenda/chips). */
export function marcasPresentes(celulas: GradeCelula[]): Array<{ id: string; nome: string; cor: string | null }> {
  const map = new Map<string, { nome: string; cor: string | null }>()
  for (const c of celulas) {
    if (c.marca_id && !map.has(c.marca_id)) map.set(c.marca_id, { nome: c.marca_nome, cor: c.marca_cor ?? null })
  }
  return [...map.entries()].map(([id, v]) => ({ id, nome: v.nome, cor: v.cor }))
}

export function gradeOperationalLink({
  data,
  cabineId,
  liveId,
  agendaId,
  pendencia,
}: {
  data: string
  cabineId?: string | null
  liveId?: string
  agendaId?: string
  pendencia?: 'cadastro'
}): string {
  const params = new URLSearchParams({
    periodo: 'custom',
    data_inicio: data,
    data_fim: data,
    origem: 'grade',
  })
  if (cabineId) params.set('cabine', cabineId)
  if (liveId) params.set('live', liveId)
  if (agendaId) params.set('agenda', agendaId)
  if (pendencia) params.set('pendencia', pendencia)
  return `/lives?${params.toString()}`
}

export function statusAcompanhamento(situacao: GradeSituacao): {
  label: string
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
} {
  switch (situacao) {
    case 'realizada': return { label: 'Realizada', tone: 'success' }
    case 'em_andamento': return { label: 'Em andamento', tone: 'info' }
    case 'cancelada': return { label: 'Cancelada', tone: 'danger' }
    case 'manutencao': return { label: 'Manutenção', tone: 'warning' }
    case 'registro_pendente': return { label: 'Registro pendente', tone: 'warning' }
    case 'vinculacao_pendente': return { label: 'Vinculação pendente', tone: 'warning' }
    case 'planejada': return { label: 'Planejada', tone: 'neutral' }
    case 'sem_execucao_vinculada': return { label: 'Sem execução vinculada', tone: 'neutral' }
    case 'sem_reserva': return { label: 'Sem reserva', tone: 'neutral' }
  }
}
