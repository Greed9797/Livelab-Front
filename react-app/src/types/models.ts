/**
 * Official roles in the product (5)
 * @see OfficialRole for the canonical set
 */
export type Role =
  | 'franqueador_master'
  // Papel real do backend (migration 070 + src/plugins/auth.js). Multi-tenant
  // Tier 4: enxerga um subset de unidades. No front é normalizado para
  // franqueador_master até a Fase C ter UI própria.
  | 'gerente_regional'
  | 'franqueado'
  | /** @deprecated use franqueado or operacional */ 'gerente'
  | /** @deprecated use operacional */ 'gerente_comercial'
  | /** @deprecated use franqueado */ 'financeiro'
  | /** @deprecated use operacional */ 'financeiro_readonly'
  | 'operacional'
  | /** @deprecated use operacional */ 'auditor'
  | /** @deprecated use operacional */ 'suporte'
  | /** @deprecated use operacional */ 'produtor_live'
  | /** @deprecated use operacional */ 'marketing'
  | /** @deprecated use operacional */ 'comercial_readonly'
  | 'apresentador'
  | /** @deprecated use apresentador (typo fix) */ 'apresentadora'
  | 'cliente_parceiro'
  | string

/**
 * The 5 official roles in the product
 * Use this for new code; legacy roles in Role should be normalized via normalizeRole()
 */
export type OfficialRole =
  | 'franqueador_master'
  | 'franqueado'
  | 'operacional'
  | 'apresentador'
  | 'cliente_parceiro'

export type JsonRecord = Record<string, unknown>

export interface User {
  id: string
  nome: string
  email: string
  papel: Role
  tenant_id: string
  tenant_nome: string
  foto_url?: string | null
  onboarding_completed?: boolean
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

export interface Session {
  accessToken: string
  refreshToken: string
  user: User
}

export interface Metric {
  label: string
  value: string
  hint?: string
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

export interface ChartPoint {
  label: string
  value: number
  secondary?: number
}

export interface TableColumn<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
  align?: 'left' | 'right' | 'center'
}

export interface Period {
  mes: number
  ano: number
}

export interface Lead {
  id: string
  nome?: string
  nome_cliente?: string
  cliente_nome?: string
  origem?: string
  nicho?: string
  cidade?: string
  estado?: string
  etapa?: string
  status?: string
  crm_etapa?: string
  valor_estimado?: number | string
  valor_oportunidade?: number | string
  responsavel_nome?: string
  contato_email?: string
  contato_whatsapp?: string
  observacoes_internas?: string
  motivo_perda?: string
  historico_contatos?: JsonRecord[]
  tarefas?: JsonRecord[]
  contatos_estruturados?: JsonRecord[]
  tarefas_estruturadas?: JsonRecord[]
  etapa_historico?: JsonRecord[]
  convertido_cliente_id?: string
  ganho_em?: string
  atualizado_em?: string
  dados_extras?: JsonRecord
  criado_em?: string
}

export interface Cabine {
  id: string
  numero?: number
  status?: string
  cliente_id?: string
  cliente_nome?: string
  cliente_em_live_id?: string
  cliente_em_live?: JsonRecord | string | null
  cliente_reservado_id?: string
  cliente_reservado?: JsonRecord | string | null
  proxima_cliente_id?: string
  proxima_agenda?: JsonRecord | null
  marca_logo_url?: string
  apresentador_nome?: string
  live_atual_id?: string
  tiktok_username?: string
  viewer_count?: number
  gmv_atual?: number | string
  total_orders?: number
  agenda?: JsonRecord[]
}

export interface Solicitacao {
  id: string
  status?: string
  cliente_nome?: string
  cabine_numero?: number
  data_solicitada?: string
  hora_inicio?: string
  solicitante_nome?: string
  tipo_live?: string
}

export interface ApiListResponse<T> {
  data?: T[]
  items?: T[]
  rows?: T[]
  results?: T[]
}

export interface LiveAtual {
  id: string
  live_ativa?: boolean
  live_id?: string
  status: 'em_andamento' | 'encerrada' | 'cancelada'
  tipo: 'cliente' | 'afiliado' | 'teste'
  status_publicacao: 'rascunho' | 'revisado' | 'publicado'
  origem_dados: 'manual' | 'api' | 'bot'
  cabine_id: string
  cabine_numero?: number
  cliente_id?: string | null
  cliente_nome?: string | null
  apresentador_id?: string | null
  apresentador_nome?: string | null
  fat_gerado?: number
  qtd_pedidos?: number
  viewer_count?: number
  total_viewers?: number
  total_orders?: number
  gmv_atual?: number
  likes_count?: number
  comments_count?: number
  gifts_diamonds?: number
  shares_count?: number
  iniciado_em: string
  encerrado_em?: string | null
  agenda_evento_id?: string | null
  agenda_data_inicio?: string | null
  agenda_titulo?: string | null
  // métricas manuais
  manual_views?: number
  manual_likes?: number
  manual_comments?: number
  manual_shares?: number
  manual_gmv?: number
}

/**
 * Turno de apresentadora dentro de um evento de agenda (revezamento).
 * O evento continua com `apresentadora_id` escalar — ela é o ESPELHO da
 * apresentadora principal do revezamento, não uma fonte concorrente.
 */
export interface AgendaTurno {
  apresentadora_id: string
  apresentadora_nome?: string | null
  data_inicio: string
  data_fim: string
}
