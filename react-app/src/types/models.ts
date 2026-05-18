/**
 * Official roles in the product (5)
 * @see OfficialRole for the canonical set
 */
export type Role =
  | 'franqueador_master'
  | /** @deprecated use franqueador_master */ 'admin_master'
  | /** @deprecated use franqueador_master */ 'gerente_regional'
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
  etapa?: string
  status?: string
  valor_estimado?: number | string
  criado_em?: string
}

export interface Cabine {
  id: string
  numero?: number
  status?: string
  cliente_id?: string
  cliente_nome?: string
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
  status: 'em_andamento' | 'encerrada' | 'cancelada'
  tipo: 'cliente' | 'afiliado' | 'teste'
  status_publicacao: 'rascunho' | 'revisado' | 'publicado'
  origem_dados: 'manual' | 'api'
  cabine_id: string
  cabine_numero?: number
  cliente_id?: string | null
  cliente_nome?: string | null
  apresentador_id?: string | null
  apresentador_nome?: string | null
  fat_gerado?: number
  qtd_pedidos?: number
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
