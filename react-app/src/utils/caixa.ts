// Helpers puros do Caixa (saldo de abertura, data de corte, receita avulsa) — cobertos por caixa.test.ts.
import type { FinanceiroConfig, GrupoReceitaAvulsa, ReceitaAvulsaPayload } from '../types/financeiro'
import { GRUPOS_RECEITA_AVULSA } from '../types/financeiro'
import { asNumber } from './format'
import { parseBRMoneyToDecimal } from './money'

const r2 = (n: number) => Math.round(n * 100) / 100

export function isDataISO(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

/** 'YYYY-MM-DD' → 'DD/MM/AAAA' sem passar por fuso; vazio quando inválido. */
export function formatDataBR(date: string | null | undefined): string {
  const m = date ? /^(\d{4})-(\d{2})-(\d{2})/.exec(date) : null
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

function dataOuNull(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const d = v.slice(0, 10)
  return isDataISO(d) ? d : null
}

export function normalizarConfig(raw: unknown): FinanceiroConfig {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    aliquota_imposto_pct: r.aliquota_imposto_pct == null ? 10 : asNumber(r.aliquota_imposto_pct),
    data_corte: dataOuNull(r.data_corte),
    saldo_abertura: asNumber(r.saldo_abertura),
  }
}

export type TomSaldo = 'positivo' | 'negativo' | 'neutro'

export function tomSaldo(v: number): TomSaldo {
  if (v > 0.004) return 'positivo'
  if (v < -0.004) return 'negativo'
  return 'neutro'
}

/** 'Mostrando a partir de DD/MM/AAAA' ou null quando não há corte. */
export function textoCorte(dataCorte: string | null | undefined): string | null {
  const f = formatDataBR(dataCorte)
  return f ? `Mostrando a partir de ${f}` : null
}

export interface CaixaFormInput {
  valor: string // texto pt-BR, aceita negativo
  dataCorte: string // 'YYYY-MM-DD'
}

export type PayloadResult<T> = { ok: true; payload: T } | { ok: false; error: string }

export function montarPayloadCaixa(f: CaixaFormInput): PayloadResult<{ saldo_abertura: number; data_corte: string }> {
  if (!f.valor.trim()) return { ok: false, error: 'Informe o saldo de caixa (pode ser zero ou negativo).' }
  if (!isDataISO(f.dataCorte)) return { ok: false, error: 'Informe uma data de corte válida.' }
  return { ok: true, payload: { saldo_abertura: r2(parseBRMoneyToDecimal(f.valor)), data_corte: f.dataCorte } }
}

/** Pede confirmação só ao ALTERAR um corte/saldo já configurados. */
export function precisaConfirmarAlteracao(atual: Pick<FinanceiroConfig, 'data_corte' | 'saldo_abertura'>, novo: { saldo_abertura: number; data_corte: string }): boolean {
  if (!atual.data_corte) return false
  return atual.data_corte !== novo.data_corte || r2(atual.saldo_abertura) !== r2(novo.saldo_abertura)
}

export interface ReceitaAvulsaFormInput {
  descricao: string
  grupo: string
  valor: string
  vencimento: string
  observacao: string
  jaRecebido: boolean
  dataRecebimento: string
}

export function isGrupoReceitaAvulsa(v: unknown): v is GrupoReceitaAvulsa {
  return typeof v === 'string' && (GRUPOS_RECEITA_AVULSA as readonly string[]).includes(v)
}

export function montarPayloadReceitaAvulsa(f: ReceitaAvulsaFormInput, opts: { permitirRecebido?: boolean } = {}): PayloadResult<ReceitaAvulsaPayload> {
  const descricao = f.descricao.trim()
  const valor = r2(parseBRMoneyToDecimal(f.valor))
  if (!descricao) return { ok: false, error: 'Informe a descrição.' }
  if (!isGrupoReceitaAvulsa(f.grupo)) return { ok: false, error: 'Escolha o grupo.' }
  if (!(valor > 0)) return { ok: false, error: 'Informe um valor maior que zero.' }
  if (!isDataISO(f.vencimento)) return { ok: false, error: 'Informe o vencimento.' }
  const payload: ReceitaAvulsaPayload = {
    descricao,
    grupo: f.grupo,
    valor,
    data_vencimento: f.vencimento,
    observacao: f.observacao.trim() || null,
  }
  if (f.jaRecebido && opts.permitirRecebido !== false) {
    if (!isDataISO(f.dataRecebimento)) return { ok: false, error: 'Informe a data do recebimento.' }
    payload.valor_pago = valor
    payload.data_pagamento = f.dataRecebimento
  }
  return { ok: true, payload }
}

/** Frase do bloco Caixa do DRE: abertura (quando o corte cai no mês) e saldo de caixa no início do mês. */
export function textoAberturaCaixa(c: { saldo_abertura: number; data_corte: string | null }, mes: string, moeda: (v: number) => string): string | null {
  if (!c.data_corte) return null
  return c.data_corte.slice(0, 7) === mes ? `Abertura em ${formatDataBR(c.data_corte)}: ${moeda(c.saldo_abertura)}` : `Corte em ${formatDataBR(c.data_corte)}`
}
