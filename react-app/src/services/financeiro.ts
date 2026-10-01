// API do Financeiro (lançamentos, baixas, custos, DRE, fluxo, config).
// Funções novas — as antigas de domain.ts continuam intactas para outras telas.
import type {
  BaixaPayload,
  CustoParceladoPayload,
  CustoPontualPayload,
  CustoRecorrente,
  CustoRecorrentePayload,
  EscopoExclusao,
  CaixaResumo,
  FinanceiroConfig,
  FinanceiroConfigPatch,
  ImportarCustosPayload,
  ImportarCustosResultado,
  ImportarResumo,
  Lancamento,
  LancamentosFiltro,
  ReceitaAvulsaPayload,
} from '../types/financeiro'
import { normalizarCaixa, normalizarConfig } from '../utils/caixa'
import { asNumber } from '../utils/format'
import {
  type AcaoBaixa,
  normalizarDre,
  normalizarFluxo,
  normalizarLancamentosResponse,
  rotaBaixa,
} from '../utils/financeiro'
import { montarPayloadImportacao } from '../utils/importar-custos'
import { apiDelete, apiGet, apiPatch, apiPost } from './api'

// Query keys próprias (prefixo 'fin2' para não colidir com QK.financeiro* legados).
export const FQK = {
  all: ['fin2'] as const,
  lancamentos: (f?: LancamentosFiltro) => (f ? ['fin2', 'lancamentos', f] as const : ['fin2', 'lancamentos'] as const),
  dre: (inicio?: string, fim?: string) => (inicio ? ['fin2', 'dre', inicio, fim] as const : ['fin2', 'dre'] as const),
  fluxo: (mes?: string, saldoInicial?: number) => (mes ? ['fin2', 'fluxo', mes, saldoInicial ?? 0] as const : ['fin2', 'fluxo'] as const),
  config: ['fin2', 'config'] as const,
  caixa: ['fin2', 'caixa'] as const,
  recorrentes: ['fin2', 'recorrentes'] as const,
}

function clean(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
}

export async function getLancamentos(filtro: LancamentosFiltro) {
  const raw = await apiGet<unknown>('/financeiro/lancamentos', clean({ ...filtro }))
  return normalizarLancamentosResponse(raw, { inicio: filtro.inicio, fim: filtro.fim })
}

export async function getDre(inicio: string, fim: string) {
  const raw = await apiGet<unknown>('/financeiro/resumo', { inicio, fim })
  return normalizarDre(raw, { inicio, fim })
}

/** Retorna null quando o backend ainda responde no formato legado (sem `linhas`). */
export async function getFluxoCaixa(mes: string, saldoInicial?: number) {
  const raw = await apiGet<unknown>('/financeiro/fluxo-caixa', clean({ mes, saldo_inicial: saldoInicial || undefined }))
  return normalizarFluxo(raw, mes)
}

export async function getFinanceiroConfig(): Promise<FinanceiroConfig> {
  return normalizarConfig(await apiGet<unknown>('/financeiro/config'))
}

export async function updateFinanceiroConfig(payload: FinanceiroConfigPatch): Promise<FinanceiroConfig> {
  const raw = await apiPatch<Record<string, unknown>>('/financeiro/config', payload)
  // A resposta pode vir parcial: o que não veio cai no que acabamos de enviar.
  return normalizarConfig({ ...payload, ...(raw && typeof raw === 'object' ? raw : {}) })
}

export async function getCaixa(): Promise<CaixaResumo> {
  return normalizarCaixa(await apiGet<unknown>('/financeiro/caixa'))
}

// ── Receitas avulsas ─────────────────────────────────────────────────────────

export function createReceitaAvulsa(payload: ReceitaAvulsaPayload) {
  return apiPost<unknown>('/financeiro/receitas-avulsas', clean({ ...payload }))
}

export function updateReceitaAvulsa(id: string, payload: Partial<ReceitaAvulsaPayload>) {
  return apiPatch<unknown>(`/financeiro/receitas-avulsas/${encodeURIComponent(id)}`, payload)
}

export function deleteReceitaAvulsa(id: string) {
  return apiDelete<unknown>(`/financeiro/receitas-avulsas/${encodeURIComponent(id)}`)
}

// ── Baixas ───────────────────────────────────────────────────────────────────

export function baixarLancamento(l: Lancamento, acao: AcaoBaixa, payload: BaixaPayload = {}) {
  const path = rotaBaixa(l, acao)
  return apiPatch<unknown>(path, acao === 'pagar' ? clean({ ...payload }) : undefined)
}

// ── Custos ───────────────────────────────────────────────────────────────────

export function createCustoPontual(payload: CustoPontualPayload) {
  return apiPost<unknown>('/financeiro/custos', clean({ ...payload }))
}

export function createCustoParcelado(payload: CustoParceladoPayload) {
  return apiPost<unknown>('/financeiro/custos/parcelado', clean({ ...payload }))
}

export function updateCusto(id: string, payload: Partial<CustoPontualPayload>) {
  return apiPatch<unknown>(`/financeiro/custos/${encodeURIComponent(id)}`, payload)
}

export function deleteCusto(id: string, escopo: EscopoExclusao = 'um') {
  return apiDelete<unknown>(`/financeiro/custos/${encodeURIComponent(id)}?escopo=${escopo}`)
}

function normalizarRecorrente(raw: Record<string, unknown>): CustoRecorrente {
  return {
    id: String(raw.id ?? ''),
    nome: String(raw.nome ?? ''),
    descricao: typeof raw.descricao === 'string' ? raw.descricao : null,
    grupo: String(raw.grupo ?? 'estrutural'),
    valor: asNumber(raw.valor),
    dia_vencimento: asNumber(raw.dia_vencimento, 5),
    mes_offset: asNumber(raw.mes_offset),
    inicio: String(raw.inicio ?? '').slice(0, 10),
    fim: typeof raw.fim === 'string' && raw.fim ? raw.fim.slice(0, 10) : null,
    ativo: raw.ativo !== false,
  }
}

export async function getCustosRecorrentes(): Promise<CustoRecorrente[]> {
  const raw = await apiGet<unknown>('/financeiro/custos-recorrentes')
  return (Array.isArray(raw) ? raw : []).map((r) => normalizarRecorrente(r as Record<string, unknown>))
}

export function createCustoRecorrente(payload: CustoRecorrentePayload) {
  return apiPost<unknown>('/financeiro/custos-recorrentes', payload)
}

export function updateCustoRecorrente(id: string, payload: Partial<CustoRecorrentePayload>) {
  return apiPatch<unknown>(`/financeiro/custos-recorrentes/${encodeURIComponent(id)}`, payload)
}

export function deleteCustoRecorrente(id: string) {
  return apiDelete<unknown>(`/financeiro/custos-recorrentes/${encodeURIComponent(id)}`)
}

/** Materializa os recorrentes do mês (idempotente). */
export function gerarCustosMes(mes: string) {
  return apiPost<unknown>(`/financeiro/custos/gerar?mes=${mes}`)
}

/** Materializa os títulos de receita do mês (idempotente). */
export function gerarReceitasMes(mes: string) {
  return apiPost<unknown>(`/financeiro/receitas/gerar?mes=${mes}`)
}

// ── Importação da planilha ───────────────────────────────────────────────────

function normalizarResumo(raw: unknown): ImportarResumo {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    criados: asNumber(r.criados),
    ignorados: asNumber(r.ignorados),
    itens: Array.isArray(r.itens) ? (r.itens as ImportarResumo['itens']) : [],
  }
}

export async function importarCustos(seed: ImportarCustosPayload, dryRun = false): Promise<ImportarCustosResultado> {
  const raw = await apiPost<Record<string, unknown>>('/financeiro/custos/importar', montarPayloadImportacao(seed, dryRun))
  return {
    dry_run: raw?.dry_run === true || (dryRun && raw?.dry_run !== false),
    recorrentes: normalizarResumo(raw?.recorrentes),
    pontuais: normalizarResumo(raw?.pontuais),
  }
}
