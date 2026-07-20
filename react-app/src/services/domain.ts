import type { Cabine, JsonRecord, Lead, LiveAtual, Period } from '../types/models'
import { api, apiDelete, apiGet, apiGetBlob, apiPatch, apiPost, apiPut, apiUpload } from './api'
import { periodToParam } from '../utils/format'

export function getHomeDashboard(params: { mes?: string } = {}) {
  return apiGet<JsonRecord>('/home/dashboard', params.mes ? { mes: params.mes } : undefined)
}

export function uploadImageAsset(file: File, folder: 'apresentadoras' | 'clientes' | 'marcas' | 'logos' = 'logos') {
  return apiUpload<JsonRecord>('/uploads/image', file, { folder })
}

export function getPublicRanking(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/public/ranking', params)
}

export function getPublicRankingApresentadoras(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord>('/public/ranking/apresentadoras', params)
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

// ── Portal do cliente final (Fase 2) — leitura, sempre filtrado pelo JWT ──
export function getClienteHome(period: Period) {
  return apiGet<JsonRecord>('/cliente/home', { mes: period.mes, ano: period.ano })
}

export function getClienteConteudoLives(period: Period) {
  return apiGet<JsonRecord>('/cliente/conteudo/lives', { mes: period.mes, ano: period.ano })
}

export function getClienteAnalyticsDiario(params: { from: string; to: string }) {
  return apiGet<JsonRecord[]>('/cliente/analytics/diario', params)
}

export function getClienteFinanceiro(period: Period) {
  return apiGet<JsonRecord>('/cliente/financeiro', { mes: period.mes, ano: period.ano })
}

export function getMasterCrm(period?: Period) {
  return apiGet<JsonRecord>('/master/crm', period ? { periodo: periodToParam(period) } : undefined)
}

export function getCrmSummary() {
  return apiGet<JsonRecord>('/crm/summary')
}

export function getLeads() {
  return apiGet<Lead[]>('/leads')
}

export function getLead(id: string) {
  return apiGet<Lead>(`/leads/${id}`)
}

export function createLead(payload: JsonRecord) {
  return apiPost<Lead>('/leads', payload)
}

export function updateLead(id: string, payload: JsonRecord) {
  return apiPatch<Lead>(`/leads/${id}`, payload)
}

export function ganharLead(id: string, payload: JsonRecord = {}) {
  return apiPost<JsonRecord>(`/leads/${id}/ganhar`, payload)
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

export function getClientes(params: { status?: string } = {}) {
  return apiGet<JsonRecord[]>('/clientes', params.status ? { status: params.status } : undefined)
}

export function createCliente(payload: JsonRecord) {
  return apiPost<JsonRecord>('/clientes', payload)
}

export function updateCliente(id: string, payload: JsonRecord) {
  return apiPatch<JsonRecord>(`/clientes/${id}`, payload)
}

export function deleteCliente(id: string) {
  return apiDelete(`/clientes/${id}`)
}

export function getClienteOperacional(id: string, params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord>(`/clientes/${id}/operacional`, params)
}

export interface ClienteBriefing {
  id: string
  cliente_id: string
  conteudo: string
  atualizado_por_id: string | null
  atualizado_por_nome: string | null
  criado_em: string
  atualizado_em: string
}

export function getClienteBriefing(id: string) {
  return apiGet<ClienteBriefing | null>(`/clientes/${id}/briefing`)
}

export function saveClienteBriefing(id: string, conteudo: string) {
  return apiPut<ClienteBriefing>(`/clientes/${id}/briefing`, { conteudo })
}

export function getRankingPublicoConfig() {
  return apiGet<JsonRecord>('/configuracoes/ranking-publico')
}

export function updateRankingPublicoConfig(payload: JsonRecord) {
  return apiPatch<JsonRecord>('/configuracoes/ranking-publico', payload)
}

export function getUsuarios(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/usuarios', params)
}

export function convidarUsuario(payload: JsonRecord) {
  return apiPost<JsonRecord>('/usuarios/convidar', payload)
}

export function updateUsuario(id: string, payload: JsonRecord) {
  return apiPatch<JsonRecord>(`/usuarios/${id}`, payload)
}

export function deleteUsuario(id: string) {
  return apiDelete(`/usuarios/${id}`)
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

export function getMarcaOperacional(id: string, params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord>(`/marcas/${id}/operacional`, params)
}

export function deleteMarca(id: string) {
  return apiDelete(`/marcas/${id}`)
}

export function getAgenda(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/agenda', params)
}

// ── Grade visual (grade_padrao + grade_excecoes) ──────────────────────────

export function getGrade(params: { data_inicio: string; data_fim: string; marca_id?: string; apresentadora_id?: string }): Promise<{ dias: JsonRecord[] }> {
  return apiGet<{ dias: JsonRecord[] }>('/grade', params)
}

export function getGradePadrao() {
  return apiGet<{ celulas: JsonRecord[] }>('/grade/padrao')
}

export function saveGradePadraoCell(payload: JsonRecord) {
  return apiPut<JsonRecord>('/grade/padrao', payload)
}

export function deleteGradePadraoCell(params: { dia_semana?: number; dias_semana?: number[]; cabine_id: string; hora_inicio: string }) {
  const dow = params.dias_semana?.length
    ? `dias_semana=${params.dias_semana.join(',')}`
    : `dia_semana=${params.dia_semana}`
  return apiDelete(`/grade/padrao?${dow}&cabine_id=${params.cabine_id}&hora_inicio=${encodeURIComponent(params.hora_inicio)}`)
}

export function saveGradeExcecao(payload: JsonRecord) {
  return apiPut<JsonRecord>('/grade/excecoes', payload)
}

export function deleteGradeExcecao(params: { data: string; cabine_id: string; hora_inicio: string }) {
  return apiDelete(`/grade/excecoes?data=${params.data}&cabine_id=${params.cabine_id}&hora_inicio=${encodeURIComponent(params.hora_inicio)}`)
}

export function copiarGradeDia(payload: { data_origem: string; data_destino: string }) {
  return apiPost<JsonRecord>('/grade/copiar-dia', payload)
}

export function createAgendaEvento(payload: JsonRecord) {
  return apiPost<JsonRecord>('/agenda', payload)
}

export function updateAgendaEvento(id: string, payload: JsonRecord) {
  return apiPatch<JsonRecord>(`/agenda/${id}`, payload)
}

export function deleteAgendaEvento(id: string, params: Record<string, unknown> = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  return apiDelete(`/agenda/${id}${search.toString() ? `?${search.toString()}` : ''}`)
}

export function getAgendaConflitos(
  input: string | {
    cabineId?: string
    apresentadoraId?: string
    dataInicio: string
    dataFim: string
    excludeId?: string
  },
  dataInicio?: string,
  dataFim?: string,
) {
  const params = new URLSearchParams()
  if (typeof input === 'string') {
    params.set('cabine_id', input)
    params.set('data_inicio', dataInicio ?? '')
    params.set('data_fim', dataFim ?? '')
  } else {
    if (input.cabineId) params.set('cabine_id', input.cabineId)
    if (input.apresentadoraId) params.set('apresentadora_id', input.apresentadoraId)
    if (input.excludeId) params.set('exclude_id', input.excludeId)
    params.set('data_inicio', input.dataInicio)
    params.set('data_fim', input.dataFim)
  }
  return apiGet<JsonRecord>(`/agenda/conflitos?${params.toString()}`)
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

export function getComissoesApresentadoras(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/comissoes/apresentadoras', params)
}

// Onda 1 — comissão por live de uma apresentadora (coluna "Comissão" do histórico).
export function getComissoesPorApresentadora(id: string, params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord>(`/comissoes/por-apresentadora/${id}`, params)
}

// Onda 1 — memória de cálculo (faixa, base do mês, 2% fds) por linha de venda.
export function getComissaoMemoria(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord>('/comissoes/memoria', params)
}

export function getRankingApresentadoras(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/ranking/apresentadoras', params)
}

export function getComissoesMarcas(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/comissoes/marcas', params)
}

// Força AGORA o recálculo das comissões das lives encerradas sem vendas_atribuidas
// e devolve um diagnóstico das que continuam zeradas (admin).
export function reprocessarComissoes() {
  return apiPost<JsonRecord>('/comissoes/reprocessar', {})
}

export function getApresentadoraFaixasComissao(id: string) {
  return apiGet<JsonRecord[]>(`/apresentadoras/${id}/faixas-comissao`)
}

export function createApresentadoraFaixaComissao(id: string, payload: JsonRecord) {
  return apiPost<JsonRecord>(`/apresentadoras/${id}/faixas-comissao`, payload)
}

export function updateApresentadoraFaixaComissao(id: string, faixaId: string, payload: JsonRecord) {
  return apiPatch<JsonRecord>(`/apresentadoras/${id}/faixas-comissao/${faixaId}`, payload)
}

export function deleteApresentadoraFaixaComissao(id: string, faixaId: string) {
  return apiDelete(`/apresentadoras/${id}/faixas-comissao/${faixaId}`)
}

// Escada padrão de comissão do tenant — fonte editável. Alterar propaga no
// backend para as apresentadoras que estavam no padrão (personalizadas ficam).
export function getComissaoFaixasDefault() {
  return apiGet<JsonRecord[]>('/comissoes/faixas-default')
}

export function createComissaoFaixaDefault(payload: JsonRecord) {
  return apiPost<JsonRecord>('/comissoes/faixas-default', payload)
}

export function updateComissaoFaixaDefault(faixaId: string, payload: JsonRecord) {
  return apiPatch<JsonRecord>(`/comissoes/faixas-default/${faixaId}`, payload)
}

export function deleteComissaoFaixaDefault(faixaId: string) {
  return apiDelete(`/comissoes/faixas-default/${faixaId}`)
}

// Fechamento: recalcula as comissões PENDENTES de um mês (ex.: '2026-06') com a
// escada vigente, antes de consolidar/aprovar. Backend responde 202 e processa
// em background; aprovadas nunca são tocadas.
export function recalcularComissoesMes(mes: string) {
  return apiPost<{ mes: string; apresentadoras: number }>('/comissoes/recalcular-mes', { mes })
}

export function getAuditLog(params: { entity_type?: string; entity_id?: string; action?: string; limit?: number } = {}) {
  return apiGet<{ itens: JsonRecord[]; total: number; pagina: number; por_pagina: number }>('/audit-log', {
    ...(params.entity_type ? { entity_type: params.entity_type } : {}),
    ...(params.entity_id ? { entity_id: params.entity_id } : {}),
    ...(params.action ? { action: params.action } : {}),
    por_pagina: params.limit ?? 50,
  })
}

export function getClienteLives(period: Period) {
  return apiGet<JsonRecord>('/cliente/lives', { mes: period.mes, ano: period.ano })
}

export function getClientePerfil() {
  return apiGet<JsonRecord>('/cliente/perfil')
}

export function getClienteMeta(period: Period) {
  return apiGet<JsonRecord>('/cliente/meta', { mes: period.mes, ano: period.ano })
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

// ── Painel Operacional do Cliente (Fase C) ────────────────────────────────────

export function getClienteOperacionalPainel(period: Period) {
  return apiGet<JsonRecord>('/cliente/operacional', { mes: period.mes, ano: period.ano })
}

export function getClienteSessoes(
  period: Period,
  pagination: { limit?: number; offset?: number } = {},
) {
  return apiGet<JsonRecord>('/cliente/sessoes', {
    mes: period.mes,
    ano: period.ano,
    ...(pagination.limit !== undefined ? { limit: pagination.limit } : {}),
    ...(pagination.offset !== undefined ? { offset: pagination.offset } : {}),
  })
}

export function getClienteRelatorioBlob(period: Period) {
  return apiGetBlob('/cliente/relatorio.pdf', { mes: period.mes, ano: period.ano })
}

export function getCabines() {
  return apiGet<Cabine[]>('/cabines')
}

export function updateCabine(id: string, payload: JsonRecord) {
  return apiPatch<JsonRecord>(`/cabines/${id}`, payload)
}

export function deleteCabine(id: string, confirmacao?: string) {
  const suffix = confirmacao ? `?confirmacao=${encodeURIComponent(confirmacao)}` : ''
  return apiDelete(`/cabines/${id}${suffix}`)
}

export function liberarCabine(id: string) {
  return apiPatch(`/cabines/${id}/liberar`, {})
}

export function atualizarStatusCabine(id: string, status: string) {
  return apiPatch(`/cabines/${id}/status`, { status })
}

export function getCabineHistorico(id: string) {
  return apiGet<JsonRecord>(`/cabines/${id}/historico`)
}

export function getLives(params: Record<string, unknown> = {}) {
  return apiGet<JsonRecord[]>('/lives', params)
}

export interface LivesPaginadoResponse {
  items: JsonRecord[]
  total: number
  page: number
  limit: number
}

// Mesmo endpoint de getLives, mas com paginado=1 → { items, total, page, limit }.
export function getLivesPaginado(params: Record<string, unknown> = {}) {
  return apiGet<LivesPaginadoResponse>('/lives', { ...params, paginado: 1 })
}

export function getLivesDuplicatas() {
  return apiGet<JsonRecord>('/lives/duplicatas')
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

export function getLiveTiktokStatus(liveId: string) {
  return apiGet<JsonRecord>(`/lives/${liveId}/tiktok-status`)
}

export function publishLive(liveId: string, statusPublicacao: 'revisado' | 'publicado'): Promise<LiveAtual> {
  return apiPatch<LiveAtual>(`/lives/${liveId}/publicar`, { status_publicacao: statusPublicacao })
}

export function updateLive(id: string, payload: JsonRecord) {
  return apiPatch<JsonRecord>(`/lives/${id}`, payload)
}

export function deleteLive(id: string) {
  return apiDelete(`/lives/${id}`)
}

export function iniciarLive(payload: JsonRecord) {
  return apiPost<JsonRecord>('/lives', payload)
}

export function encerrarLive(id: string, payload: JsonRecord) {
  return apiPatch(`/lives/${id}/encerrar`, payload)
}

export function getApresentadoras() {
  return apiGet<JsonRecord[]>('/apresentadoras')
}

export function updateApresentadora(id: string, payload: JsonRecord) {
  return apiPatch<JsonRecord>(`/apresentadoras/${id}`, payload)
}

export function deleteApresentadora(id: string) {
  return apiDelete(`/apresentadoras/${id}`)
}

export function getFunilAnalytics(filters: Record<string, unknown> = {}) {
  return apiGet<JsonRecord>('/analytics/funil', filters)
}

export function getDailyAnalytics(filters: Record<string, unknown> = {}) {
  return apiGet<JsonRecord>('/analytics/diario', filters)
}

export function previewAnalyticsImport(file: File) {
  return apiUpload<JsonRecord>('/analytics/imports/preview', file)
}

export function applyAnalyticsImport(batchId: string) {
  return apiPost<JsonRecord>(`/analytics/imports/${batchId}/apply`, {})
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

export function getFinanceiroOperacional(filters: Record<string, unknown> = {}) {
  return apiGet<JsonRecord>('/financeiro/operacional', filters)
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

export async function exportarComissoesCSV(params: Record<string, unknown> = {}): Promise<Blob> {
  const response = await api.get<Blob>('/comissoes/export-csv', { params, responseType: 'blob' })
  return response.data
}

export function getFinanceiroFranqueadora(filters: Record<string, unknown> = {}) {
  return apiGet<JsonRecord>('/financeiro/franqueadora', filters)
}

export function criarLiveManual(payload: JsonRecord) {
  return apiPost<JsonRecord>('/lives/manual', payload)
}

export function getHistoricoGmv(liveId: string) {
  return apiGet<JsonRecord[]>(`/lives/${liveId}/historico-gmv`)
}

export function getMetaUnidade(anoMes?: string) {
  return apiGet<JsonRecord>('/meta-unidade', anoMes ? { ano_mes: anoMes } : {})
}

export function upsertMetaUnidade(anoMes: string, metaGmv: number) {
  return apiPut<JsonRecord>('/meta-unidade', { ano_mes: anoMes, meta_gmv: metaGmv })
}

export function getUltimaLiveCabine(cabineId: string): Promise<{
  avg_fat_gerado?: number
  avg_qtd_pedidos?: number
  avg_views?: number
  avg_likes?: number
  amostra?: number
}> {
  return apiGet(`/cabines/${cabineId}/ultimas-metricas`)
}

// Metas
export function getMetasApresentadoras(mes?: string) {
  return apiGet<JsonRecord[]>('/metas/apresentadoras', mes ? { mes } : undefined)
}

export function upsertMetaApresentadora(id: string, mes: string, payload: { gmv_meta: number }) {
  return apiPut<JsonRecord>(`/metas/apresentadoras/${id}`, payload, { mes })
}

export function getMetaSupervisor(mes?: string) {
  return apiGet<JsonRecord>('/metas/supervisor', mes ? { mes } : undefined)
}

export function upsertMetaSupervisor(mes: string, payload: { gmv_meta_total: number; calculado_automaticamente?: boolean }) {
  return apiPut<JsonRecord>('/metas/supervisor', payload, { mes })
}

export function getMetasMarcasHora(anoMes?: string) {
  return apiGet<JsonRecord[]>('/metas/marcas-hora', anoMes ? { ano_mes: anoMes } : undefined)
}

export function upsertMetaMarcaHora(marcaId: string, anoMes: string, metaGmvHora: number) {
  return apiPut<JsonRecord>(`/metas/marcas-hora/${marcaId}`, { meta_gmv_hora: metaGmvHora }, { ano_mes: anoMes })
}
