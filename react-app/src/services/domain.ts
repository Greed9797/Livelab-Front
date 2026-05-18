import type { Cabine, JsonRecord, Lead, LiveAtual, Period, Solicitacao } from '../types/models'
import { apiDelete, apiGet, apiPatch, apiPost } from './api'
import { periodToParam } from '../utils/format'

export function getHomeDashboard() {
  return apiGet<JsonRecord>('/home/dashboard')
}

export function getPublicRanking(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/public/ranking', params)
}

export function getMasterDashboard(period: Period) {
  return apiGet<JsonRecord>('/master/dashboard', { periodo: periodToParam(period) })
}

export function getMasterUnits(period: Period, status = 'all') {
  return apiGet<JsonRecord>('/master/unidades', { periodo: periodToParam(period), status })
}

export function getMasterConsolidated(period: Period, status = 'all') {
  return apiGet<JsonRecord>('/master/consolidado', { periodo: periodToParam(period), status })
}

export function getCrmSummary() {
  return apiGet<JsonRecord>('/crm/summary')
}

export function getLeads() {
  return apiGet<Lead[]>('/leads')
}

export function createLead(payload: JsonRecord) {
  return apiPost<Lead>('/leads', payload)
}

export function updateLead(id: string, payload: JsonRecord) {
  return apiPatch<Lead>(`/leads/${id}`, payload)
}

export function deleteLead(id: string) {
  return apiDelete(`/leads/${id}`)
}

export function addLeadContato(id: string, payload: JsonRecord) {
  return apiPost<JsonRecord>(`/leads/${id}/contato`, payload)
}

export function addLeadTarefa(id: string, payload: JsonRecord) {
  return apiPost<JsonRecord>(`/leads/${id}/tarefa`, payload)
}

export function getClientes() {
  return apiGet<JsonRecord[]>('/clientes')
}

export function getUsuarios(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/usuarios', params)
}

export function getConvitesPendentes() {
  return apiGet<JsonRecord[]>('/usuarios/convites-pendentes')
}

export function convidarUsuario(payload: JsonRecord) {
  return apiPost<JsonRecord>('/usuarios/convidar', payload)
}

export function updateUsuario(id: string, payload: JsonRecord) {
  return apiPatch<JsonRecord>(`/usuarios/${id}`, payload)
}

export function resetSenhaUsuario(id: string) {
  return apiPost<JsonRecord>(`/usuarios/${id}/reset-senha`, {})
}

export function forceLogoutUsuario(id: string) {
  return apiPost<JsonRecord>(`/usuarios/${id}/force-logout`, {})
}

export function reenviarConviteUsuario(id: string) {
  return apiPost<JsonRecord>(`/usuarios/${id}/reenviar-convite`, {})
}

export function getMarcas(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/marcas', params)
}

export function createMarca(payload: JsonRecord) {
  return apiPost<JsonRecord>('/marcas', payload)
}

export function updateMarca(id: string, payload: JsonRecord) {
  return apiPatch<JsonRecord>(`/marcas/${id}`, payload)
}

export function deleteMarca(id: string) {
  return apiDelete(`/marcas/${id}`)
}

export function getAgenda(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/agenda', params)
}

export function createAgendaEvento(payload: JsonRecord) {
  return apiPost<JsonRecord>('/agenda', payload)
}

export function updateAgendaEvento(id: string, payload: JsonRecord) {
  return apiPatch<JsonRecord>(`/agenda/${id}`, payload)
}

export function deleteAgendaEvento(id: string) {
  return apiDelete(`/agenda/${id}`)
}

export function getAgendaConflitos(cabineId: string, dataInicio: string, dataFim: string) {
  return apiGet<JsonRecord>(`/agenda/conflitos?cabine_id=${cabineId}&data_inicio=${encodeURIComponent(dataInicio)}&data_fim=${encodeURIComponent(dataFim)}`)
}

export function criarEventoAgenda(payload: {
  tipo: string
  cabine_id: string
  marca_id?: string
  data_inicio: string
  data_fim: string
  recorrencia?: {
    frequencia: 'diaria' | 'semanal' | 'quinzenal' | 'mensal'
    ate?: string
    total_ocorrencias?: number
    dias_semana?: number[]
  }
}) {
  return apiPost<JsonRecord>('/agenda', payload)
}

export function atualizarEventoAgenda(id: string, payload: Record<string, unknown>, modoRecorrencia = 'apenas_este') {
  return apiPatch<JsonRecord>(`/agenda/${id}`, { ...payload, modo_recorrencia: modoRecorrencia })
}

export function getVideos(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/videos', params)
}

export function createVideo(payload: JsonRecord) {
  return apiPost<JsonRecord>('/videos', payload)
}

export function updateVideo(id: string, payload: JsonRecord) {
  return apiPatch<JsonRecord>(`/videos/${id}`, payload)
}

export function deleteVideo(id: string) {
  return apiDelete(`/videos/${id}`)
}

export function getVendasAtribuidas(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/vendas-atribuidas', params)
}

export function getComissoesResumo(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord>('/comissoes/resumo', params)
}

export function getComissoesApresentadoras(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/comissoes/apresentadoras', params)
}

export function getComissoesMarcas(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/comissoes/marcas', params)
}

export function getContratos(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/contratos', params)
}

export function getClienteDashboard(period: Period) {
  return apiGet<JsonRecord>('/cliente/dashboard', { mes: period.mes, ano: period.ano })
}

export function getClienteLives(period: Period) {
  return apiGet<JsonRecord>('/cliente/lives', { mes: period.mes, ano: period.ano })
}

export function getClientePerfil() {
  return apiGet<JsonRecord>('/cliente/perfil')
}

export function updateClienteTiktok(tiktok_username: string | null) {
  return apiPost<JsonRecord>('/cliente/perfil/tiktok', { tiktok_username })
}

export function getClienteMeta(period: Period) {
  return apiGet<JsonRecord>('/cliente/meta', { mes: period.mes, ano: period.ano })
}

export function updateClienteMeta(payload: JsonRecord) {
  return apiPatch<JsonRecord>('/cliente/meta', payload)
}

export function getClienteAgenda(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord>('/cliente/agenda', params)
}

export function getClienteReservas() {
  return apiGet<JsonRecord[]>('/cliente/reservas')
}

export function solicitarClienteLive(payload: JsonRecord) {
  return apiPost<JsonRecord>('/cliente/solicitacao', payload)
}

export function getCabines() {
  return apiGet<Cabine[]>('/cabines')
}

export function getCabinesFilaAtivacao() {
  return apiGet<JsonRecord[]>('/cabines/fila-ativacao')
}

export function createCabine(payload: JsonRecord) {
  return apiPost<JsonRecord>('/cabines', payload)
}

export function updateCabine(id: string, payload: JsonRecord) {
  return apiPatch<JsonRecord>(`/cabines/${id}`, payload)
}

export function liberarCabine(id: string) {
  return apiPatch(`/cabines/${id}/liberar`, {})
}

export function reservarCabine(id: string, contratoId: string) {
  return apiPatch(`/cabines/${id}/reservar`, { contrato_id: contratoId })
}

export function atualizarStatusCabine(id: string, status: string) {
  return apiPatch(`/cabines/${id}/status`, { status })
}

export function getCabineHistorico(id: string) {
  return apiGet<JsonRecord>(`/cabines/${id}/historico`)
}

export function getCabineLiveAtual(id: string) {
  return apiGet<JsonRecord>(`/cabines/${id}/live-atual`)
}

export function getLives() {
  return apiGet<JsonRecord[]>('/lives')
}

export async function getLiveAtualDaCabine(cabineId: string): Promise<LiveAtual | null> {
  const res = await apiGet<JsonRecord>(`/cabines/${cabineId}/live-atual`)
  if (!res.live_ativa) return null
  return {
    ...res,
    id: String(res.live_id ?? res.id ?? ''),
    status: 'em_andamento',
    tipo: 'cliente',
    status_publicacao: 'rascunho',
    origem_dados: 'api',
    cabine_id: cabineId,
  } as unknown as LiveAtual
}

export function getLivePorId(liveId: string): Promise<LiveAtual> {
  return apiGet<LiveAtual>(`/lives/${liveId}`)
}

export function publishLive(liveId: string, statusPublicacao: 'revisado' | 'publicado'): Promise<LiveAtual> {
  return apiPatch<LiveAtual>(`/lives/${liveId}/publicar`, { status_publicacao: statusPublicacao })
}

export function iniciarLive(payload: JsonRecord) {
  return apiPost<JsonRecord>('/lives', payload)
}

export function encerrarLive(id: string, payload: JsonRecord) {
  return apiPatch(`/lives/${id}/encerrar`, payload)
}

export function getSolicitacoes(status = 'all') {
  return apiGet<Solicitacao[]>('/solicitacoes', { status })
}

export function aprovarSolicitacao(id: string) {
  return apiPatch(`/solicitacoes/${id}/aprovar`, {})
}

export function recusarSolicitacao(id: string, motivo?: string) {
  return apiPatch(`/solicitacoes/${id}/recusar`, { motivo_recusa: motivo })
}

export function criarSolicitacao(payload: JsonRecord) {
  return apiPost<JsonRecord>('/solicitacoes', payload)
}

export function getApresentadoras() {
  return apiGet<JsonRecord[]>('/apresentadoras')
}

export function createApresentadora(payload: JsonRecord) {
  return apiPost<JsonRecord>('/apresentadoras', payload)
}

export function updateApresentadora(id: string, payload: JsonRecord) {
  return apiPatch<JsonRecord>(`/apresentadoras/${id}`, payload)
}

export function deleteApresentadora(id: string) {
  return apiDelete(`/apresentadoras/${id}`)
}

export function getAnalyticsDashboard(filters: Record<string, unknown> = {}) {
  return apiGet<JsonRecord>('/analytics/dashboard', filters)
}

export function getFinanceiroResumo(filters: Record<string, unknown> = {}) {
  return apiGet<JsonRecord>('/financeiro/resumo', filters)
}

export function getFinanceiroFluxo(filters: Record<string, unknown> = {}) {
  return apiGet<JsonRecord>('/financeiro/fluxo-caixa', filters)
}

export function getFinanceiroFaturamento(filters: Record<string, unknown> = {}) {
  return apiGet<JsonRecord>('/financeiro/faturamento', filters)
}

export function getFinanceiroCustos(filters: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/financeiro/custos', filters)
}

export function createFinanceiroCusto(payload: JsonRecord) {
  return apiPost<JsonRecord>('/financeiro/custos', payload)
}

export function deleteFinanceiroCusto(id: string) {
  return apiDelete(`/financeiro/custos/${id}`)
}

export function getBoletos() {
  return apiGet<JsonRecord[]>('/boletos')
}

export function getBoletoAlertas() {
  return apiGet<JsonRecord | null>('/boletos/alertas')
}

export function getBoletoDetalhe(id: string) {
  return apiGet<JsonRecord>(`/boletos/${id}`)
}

export function marcarBoletoVisto(id: string) {
  return apiPatch(`/boletos/${id}/visto`, {})
}

export function marcarBoletoPago(id: string) {
  return apiPatch(`/boletos/${id}/pagar`, {})
}

export function getConfiguracoes() {
  return apiGet<JsonRecord>('/configuracoes')
}

export function updateConfiguracoes(payload: JsonRecord) {
  return apiPatch<JsonRecord>('/configuracoes', payload)
}

export function trocarSenha(payload: JsonRecord) {
  return apiPatch<JsonRecord>('/auth/senha', payload)
}

export function getKnowledgeCategories() {
  return apiGet<JsonRecord[]>('/knowledge/categories')
}

export function getKnowledgeArticles(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/knowledge/articles', params)
}
