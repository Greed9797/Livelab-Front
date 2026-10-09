// API do Financeiro (lançamentos, baixas, custos, DRE, fluxo, config).
// Funções novas — as antigas de domain.ts continuam intactas para outras telas.
import type {
  BaixaPayload,
  CaixaOperacionalDia,
  CaixaOperacionalItem,
  CaixaOperacionalMes,
  CaixaOperacionalMovimento,
  CaixaOperacionalResponse,
  CustoParceladoPayload,
  CustoPontualPayload,
  CustoRecorrente,
  CustoRecorrentePayload,
  EscopoExclusao,
  FinanceiroConfig,
  FinanceiroConfigPatch,
  ImportarCustosPayload,
  ImportarCustosResultado,
  ImportarResumo,
  Lancamento,
  LancamentosFiltro,
  ModoPerda,
  PainelFinanceiro,
  ReceitaAvulsaPayload,
} from '../types/financeiro'
import { normalizarConfig } from '../utils/caixa'
import { asArray, asNumber, getRecord } from '../utils/format'
import {
  type AcaoBaixa,
  normalizarDre,
  normalizarFluxo,
  normalizarLancamentosResponse,
  rotaBaixa,
  rotaPerda,
} from '../utils/financeiro'
import { montarPayloadImportacao } from '../utils/importar-custos'
import { normalizarPainel } from '../utils/painel'
import { apiDelete, apiGet, apiPatch, apiPost } from './api'

// Query keys próprias (prefixo 'fin2' para não colidir com QK.financeiro* legados).
export const FQK = {
  all: ['fin2'] as const,
  caixaOperacional: ['fin2', 'caixa-operacional'] as const,
  lancamentos: (f?: LancamentosFiltro) => (f ? ['fin2', 'lancamentos', f] as const : ['fin2', 'lancamentos'] as const),
  dre: (inicio?: string, fim?: string) => (inicio ? ['fin2', 'dre', inicio, fim] as const : ['fin2', 'dre'] as const),
  fluxo: (mes?: string, saldoInicial?: number) => (mes ? ['fin2', 'fluxo', mes, saldoInicial ?? 0] as const : ['fin2', 'fluxo'] as const),
  config: ['fin2', 'config'] as const,
  painel: (mes: string) => ['fin2', 'painel', mes] as const,
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

function textoOpcional(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function dinheiroOpcional(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = asNumber(value, Number.NaN)
  return Number.isFinite(parsed) ? parsed : null
}

function dinheiroObrigatorio(value: unknown, campo: string): number {
  const parsed = dinheiroOpcional(value)
  if (parsed === null) throw new Error(`Contrato do caixa operacional incompleto: ${campo}`)
  return parsed
}

function naturezaObrigatoria(value: unknown, campo: string): 'receita' | 'custo' {
  if (value === 'receita' || value === 'custo') return value
  throw new Error(`Contrato do caixa operacional incompleto: ${campo}`)
}

function normalizarItemCaixa(raw: unknown): CaixaOperacionalItem {
  const r = getRecord(raw)
  return {
    id: String(r.id ?? ''),
    natureza: naturezaObrigatoria(r.natureza, 'obrigacoes.natureza'),
    origem: String(r.origem ?? 'nao_informada'),
    descricao: String(r.descricao ?? r.id ?? 'Item financeiro'),
    data_vencimento: textoOpcional(r.data_vencimento)?.slice(0, 10) ?? null,
    valor_projetado: dinheiroObrigatorio(r.valor_projetado, 'obrigacoes.valor_projetado'),
    saldo_aberto: dinheiroOpcional(r.saldo_aberto),
    valor_original: dinheiroOpcional(r.valor_original),
    liquidado_acumulado: dinheiroOpcional(r.liquidado_acumulado),
    virtual: r.virtual === true,
    inconsistente: r.inconsistente === true,
  }
}

function normalizarMovimentoCaixa(raw: unknown): CaixaOperacionalMovimento {
  const r = getRecord(raw)
  return {
    id: String(r.id ?? ''),
    natureza: naturezaObrigatoria(r.natureza, 'movimentos.natureza'),
    origem: String(r.origem ?? r.origem_tipo ?? 'nao_informada'),
    descricao: String(r.descricao ?? r.id ?? 'Movimento financeiro'),
    data: textoOpcional(r.data)?.slice(0, 10) ?? null,
    valor: dinheiroObrigatorio(r.valor, 'movimentos.valor'),
    tipo: String(r.tipo ?? 'movimento'),
    fonte: String(r.fonte ?? 'sistema'),
  }
}

function normalizarDiaCaixa(raw: unknown): CaixaOperacionalDia {
  const r = getRecord(raw)
  return {
    dia: String(r.dia ?? '').slice(0, 10),
    saldo_inicial: dinheiroOpcional(r.saldo_inicial),
    entradas_realizadas: dinheiroObrigatorio(r.entradas_realizadas, 'serie_diaria.entradas_realizadas'),
    saidas_realizadas: dinheiroObrigatorio(r.saidas_realizadas, 'serie_diaria.saidas_realizadas'),
    entradas_projetadas: dinheiroObrigatorio(r.entradas_projetadas, 'serie_diaria.entradas_projetadas'),
    saidas_projetadas: dinheiroObrigatorio(r.saidas_projetadas, 'serie_diaria.saidas_projetadas'),
    reserva_vencida: dinheiroObrigatorio(r.reserva_vencida, 'serie_diaria.reserva_vencida'),
    saldo_final_projetado: dinheiroOpcional(r.saldo_final_projetado),
    saldo_disponivel_projetado: dinheiroOpcional(r.saldo_disponivel_projetado),
  }
}

function normalizarMesCaixa(raw: unknown): CaixaOperacionalMes {
  const r = getRecord(raw)
  return {
    mes: String(r.mes ?? '').slice(0, 7),
    saldo_inicial: dinheiroOpcional(r.saldo_inicial),
    entradas_realizadas: dinheiroObrigatorio(r.entradas_realizadas, 'meses.entradas_realizadas'),
    saidas_realizadas: dinheiroObrigatorio(r.saidas_realizadas, 'meses.saidas_realizadas'),
    entradas_projetadas: dinheiroObrigatorio(r.entradas_projetadas, 'meses.entradas_projetadas'),
    saidas_projetadas: dinheiroObrigatorio(r.saidas_projetadas, 'meses.saidas_projetadas'),
    reserva_vencida: dinheiroObrigatorio(r.reserva_vencida, 'meses.reserva_vencida'),
    saldo_final_projetado: dinheiroOpcional(r.saldo_final_projetado),
    saldo_disponivel_final: dinheiroOpcional(r.saldo_disponivel_final),
    menor_saldo_diario: dinheiroOpcional(r.menor_saldo_diario),
    primeiro_dia_negativo: textoOpcional(r.primeiro_dia_negativo)?.slice(0, 10) ?? null,
  }
}

export function normalizarCaixaOperacional(raw: unknown): CaixaOperacionalResponse {
  const r = getRecord(raw)
  const horizonte = getRecord(r.horizonte)
  const caixa = getRecord(r.caixa)
  const indicadores = getRecord(r.indicadores)
  const pendencias = getRecord(r.pendencias)
  const completude = getRecord(r.completude)
  const dataBase = textoOpcional(r.data_base)?.slice(0, 10) ?? ''
  const inicio = textoOpcional(horizonte.inicio)?.slice(0, 10) ?? ''
  const fim = textoOpcional(horizonte.fim)?.slice(0, 10) ?? ''
  const horizonteMeses = asNumber(horizonte.meses, Number.NaN)
  if (!dataBase || !inicio || !fim || horizonteMeses !== 6 || typeof caixa.configurado !== 'boolean') {
    throw new Error('Contrato do caixa operacional incompleto: horizonte ou configuração')
  }
  const meses = asArray(r.meses).map(normalizarMesCaixa)
  if (meses.length !== horizonteMeses) throw new Error('Contrato do caixa operacional incompleto: meses')
  return {
    data_base: dataBase,
    horizonte: { inicio, fim, meses: horizonteMeses },
    caixa: {
      configurado: caixa.configurado === true,
      data_corte: textoOpcional(caixa.data_corte)?.slice(0, 10) ?? null,
      saldo_abertura: dinheiroOpcional(caixa.saldo_abertura),
      saldo_atual: dinheiroOpcional(caixa.saldo_atual),
      reserva_pagaveis_vencidos: dinheiroObrigatorio(caixa.reserva_pagaveis_vencidos, 'caixa.reserva_pagaveis_vencidos'),
      saldo_disponivel: dinheiroOpcional(caixa.saldo_disponivel),
      origem: String(caixa.origem ?? 'registrado_no_sistema'),
      escopo: String(caixa.escopo ?? 'agregado'),
    },
    serie_diaria: asArray(r.serie_diaria).map(normalizarDiaCaixa),
    meses,
    indicadores: {
      menor_saldo_diario: dinheiroOpcional(indicadores.menor_saldo_diario),
      primeiro_dia_negativo: textoOpcional(indicadores.primeiro_dia_negativo)?.slice(0, 10) ?? null,
    },
    obrigacoes: asArray(r.obrigacoes).map(normalizarItemCaixa),
    movimentos: asArray(r.movimentos).map(normalizarMovimentoCaixa),
    pendencias: {
      recebiveis_vencidos: asArray(pendencias.recebiveis_vencidos).map(normalizarItemCaixa),
      pagaveis_vencidos: asArray(pendencias.pagaveis_vencidos).map(normalizarItemCaixa),
      sem_data: asArray(pendencias.sem_data).map(normalizarItemCaixa),
      comissao_futura: String(pendencias.comissao_futura ?? 'nao_estimada'),
      comissoes_nao_estimadas: asArray(pendencias.comissoes_nao_estimadas).map(normalizarItemCaixa),
      movimentos_futuros: asArray(pendencias.movimentos_futuros).map(normalizarMovimentoCaixa),
      historico: asArray<Record<string, unknown>>(pendencias.historico),
    },
    completude: {
      saldo_configurado: completude.saldo_configurado === true,
      obrigacoes_com_data: completude.obrigacoes_com_data === true,
      obrigacoes_consistentes: completude.obrigacoes_consistentes === true,
      comissoes_futuras_estimadas: completude.comissoes_futuras_estimadas === true,
      historico_obrigacoes_completo: completude.historico_obrigacoes_completo === true,
      repasses_pendentes_incluidos_no_saldo: completude.repasses_pendentes_incluidos_no_saldo === true,
      escopo: String(completude.escopo ?? 'obrigacoes_e_movimentos_registrados'),
    },
  }
}

export async function getCaixaOperacional(): Promise<CaixaOperacionalResponse> {
  return normalizarCaixaOperacional(await apiGet<unknown>('/financeiro/caixa-operacional'))
}

export async function getFinanceiroConfig(): Promise<FinanceiroConfig> {
  return normalizarConfig(await apiGet<unknown>('/financeiro/config'))
}

export async function updateFinanceiroConfig(payload: FinanceiroConfigPatch): Promise<FinanceiroConfig> {
  const raw = await apiPatch<Record<string, unknown>>('/financeiro/config', payload)
  // A resposta pode vir parcial: o que não veio cai no que acabamos de enviar.
  return normalizarConfig({ ...payload, ...(raw && typeof raw === 'object' ? raw : {}) })
}

/** Painel do mês: A receber / A pagar em regime de caixa (vencimento até o fim do mês) + projeções. */
export async function getPainel(mes: string): Promise<PainelFinanceiro> {
  return normalizarPainel(await apiGet<unknown>('/financeiro/painel', { mes }), mes)
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

// ── Perdas / cancelamentos ───────────────────────────────────────────────────

export function perdaLancamento(l: Lancamento, modo: ModoPerda, motivo?: string, valor?: string, chaveOperacao?: string) {
  const texto = motivo?.trim()
  const valorCampo = l.natureza === 'receita' && valor
    ? { [modo === 'desfazer' ? 'valor_reversao' : 'valor_perda']: valor }
    : {}
  return apiPatch<unknown>(rotaPerda(l, modo), texto
    ? { motivo: texto.slice(0, 300), ...valorCampo, ...(l.natureza === 'receita' && chaveOperacao ? { chave_operacao: chaveOperacao } : {}) }
    : undefined)
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
    classe_custo: raw.classe_custo === 'fixo' || raw.classe_custo === 'variavel' ? raw.classe_custo : null,
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
