import { apiDelete, apiGet, apiPatch, apiPost } from './api'

export type PresenterSubmissionStatus = 'pendente' | 'devolvida' | 'aprovada' | 'cancelada'

export type PresenterPortalPerformance = {
  gmv_validado?: number
  em_conciliacao?: boolean
  total_provisorio?: number | null
  gmv_lives: number
  horas_live: number
  gmv_por_hora: number | null
  total_lives: number
  pedidos: number
  gmv_pendente_aprovacao?: number
  total_lives_pendentes_aprovacao?: number
}

export type PresenterPortalRankingRow = {
  pendente_aprovacao?: boolean
  em_conciliacao?: boolean
  gmv_pendente_aprovacao?: number
  total_provisorio?: number | null
  posicao: number
  apresentadora_id: string
  nome: string
  foto_url: string | null
  gmv_total: number
  gmv_lives: number
  horas_live: number
  gmv_por_hora: number | null
  total_lives: number
  pedidos: number
  fixo: number | null
  comissao_variavel: number | null
  total_recebido: number | null
}

export type PresenterPortalHome = {
  perfil: { id: string; nome: string; foto_url: string | null }
  desempenho: PresenterPortalPerformance
  remuneracao: { mes?: string; fixo: number | null; comissao?: number | null; adicionais?: number | null; total?: number | null; extras?: Array<{ id: string; tipo: string; data_referencia: string; descricao: string; valor: number }> }
  ranking: PresenterPortalRankingRow[]
}

export type PresenterPortalLive = {
  em_conciliacao?: boolean
  id: string
  iniciado_em: string
  encerrado_em: string
  marca_nome: string | null
  cabine_nome: string | null
  gmv: number
  horas: number
  pedidos: number
  pendente_aprovacao?: boolean
}

export type PresenterSubmission = {
  id: string
  status: PresenterSubmissionStatus
  iniciado_em: string
  encerrado_em: string
  marca_id?: string | null
  marca_nome?: string | null
  marca_descricao?: string | null
  cabine_id?: string | null
  cabine_nome?: string | null
  observacao?: string | null
  gmv_declarado?: number | null
  pedidos_declarados?: number | null
  live_impressions_declaradas?: number | null
  manual_views_declaradas?: number | null
  /** Tombstone confirmado pelo backend; ausência isolada de live oficial não basta. */
  live_oficial_excluida_id?: string | null
  live_oficial_excluida_em?: string | null
  motivo_devolucao?: string | null
  arquivamento_status?: 'solicitado' | 'confirmado' | null
  motivo_contestacao?: string | null
  versao?: number
}

export type PresenterPortalLives = {
  items: PresenterPortalLive[]
  submissoes: PresenterSubmission[]
}

export type PresenterPortalOptions = {
  marcas: Array<{ id: string; nome: string }>
  cabines: Array<{ id: string; nome: string; numero?: number | null }>
}

export type PresenterSubmissionPayload = {
  marca_id: string
  cabine_id?: string
  iniciado_em: string
  encerrado_em: string
  observacao?: string
  gmv_declarado: string
  pedidos_declarados: number
  live_impressions_declaradas?: number
  manual_views_declaradas?: number
  request_id?: string
}

export type PresenterReviewSubmission = PresenterSubmission & {
  apresentadora_nome?: string | null
  apresentadora_id?: string
  tenant_nome?: string | null
}

export type PresenterLiveLinkCandidate = {
  id: string
  iniciado_em: string
  encerrado_em: string
  marca_nome?: string | null
  cabine_nome?: string | null
  cabine_numero?: number | null
  gmv: number
  origem_dados?: string | null
}

export function getPresenterPortalHome(mes: string) {
  return apiGet<PresenterPortalHome>('/portal/apresentadora/me', { mes })
}

export function getPresenterPortalLives(mes: string) {
  return apiGet<PresenterPortalLives>('/portal/apresentadora/lives', { mes })
}

export function getPresenterPortalOptions() {
  return apiGet<PresenterPortalOptions>('/portal/apresentadora/opcoes')
}

export function createPresenterSubmission(payload: PresenterSubmissionPayload) {
  return apiPost<PresenterSubmission>('/portal/apresentadora/submissoes', payload)
}

export function updatePresenterSubmission(id: string, payload: PresenterSubmissionPayload) {
  return apiPatch<PresenterSubmission>(`/portal/apresentadora/submissoes/${encodeURIComponent(id)}`, payload)
}

export function resubmitPresenterSubmission(id: string) {
  return apiPost<PresenterSubmission>(`/portal/apresentadora/submissoes/${encodeURIComponent(id)}/reenviar`)
}

export function cancelPresenterSubmission(id: string) {
  return apiDelete<PresenterSubmission>(`/portal/apresentadora/submissoes/${encodeURIComponent(id)}`)
}

export function getPresenterReviewQueue(status = 'pendente') {
  return apiGet<{ items: PresenterReviewSubmission[] }>('/lives/submissoes-apresentadoras', { status })
}

export function getPresenterLiveLinkCandidates(submissionId: string, page = 0) {
  return apiGet<{ items: PresenterLiveLinkCandidate[]; total: number; page: number; limit: number }>(`/lives/submissoes-apresentadoras/${encodeURIComponent(submissionId)}/candidatas-vinculo?page=${page}`)
}

export function approvePresenterSubmission(id: string, payload: ({ live_id: string } | { marca_id: string; cabine_id: string; iniciado_em: string; encerrado_em: string; gmv_oficial: string; pedidos_oficiais: number; live_impressions_oficiais?: number; manual_views_oficiais?: number }) & { versao_esperada?: number; motivo_revisao?: string }) {
  return apiPost(`/lives/submissoes-apresentadoras/${encodeURIComponent(id)}/aprovar`, payload)
}

export function returnPresenterSubmission(id: string, motivo: string, arquivar = false, versao_esperada?: number) {
  return apiPost(`/lives/submissoes-apresentadoras/${encodeURIComponent(id)}/devolver`, { motivo, arquivar, versao_esperada })
}

export function respondPresenterArchive(id: string, payload: { acao: 'confirmar' | 'contestar'; versao_esperada: number; motivo?: string }) {
  return apiPost<PresenterSubmission>(`/portal/apresentadora/submissoes/${encodeURIComponent(id)}/arquivamento`, payload)
}
