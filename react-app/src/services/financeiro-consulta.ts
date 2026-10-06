import { apiGet, apiGetBlob } from './api'
import { normalizarLancamento } from '../utils/financeiro'
import type { Lancamento, Natureza } from '../types/financeiro'

export interface ConsultaFiltro {
  eixo: 'competencia' | 'vencimento' | 'pagamento'
  inicio: string
  fim: string
  competencia_inicio?: string
  competencia_fim?: string
  natureza: Natureza
  componente?: string
  contraparte?: string
  origem?: string
  id?: string
  valor_min?: string
  valor_max?: string
  ordenar?: 'data' | 'valor'
  direcao?: 'asc' | 'desc'
  status?: string
  q?: string
  pagina: number
  limite: number
}

export interface ConsultaResponse {
  itens: ConsultaItem[]
  total_registros: number
  totais: { previsto: string; pago: string; aberto: string }
  pagina: number
  limite: number
  total_paginas: number
}

export type ConsultaItem = Lancamento & {
  valor_previsto_exato: string
  valor_pago_exato: string
  saldo_aberto: string
  inconsistente: boolean
}

/** The consulta endpoint returns decimal strings. Keep them intact for display. */
export function formatConsultaMoney(value: string): string {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value)
  if (!match) return 'Não apurado'
  const integer = match[2].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${match[1] ? '−' : ''}R$ ${integer},${(match[3] ?? '').padEnd(2, '0')}`
}

export async function consultarFinanceiro(filtro: ConsultaFiltro): Promise<ConsultaResponse> {
  const raw = await apiGet<Record<string, unknown>>('/financeiro/consulta', { ...filtro })
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.itens) || !raw.totais || typeof raw.totais !== 'object' ||
      !Number.isSafeInteger(raw.total_registros) || !Number.isSafeInteger(raw.pagina) ||
      !Number.isSafeInteger(raw.limite) || !Number.isSafeInteger(raw.total_paginas)) {
    throw new Error('Resposta da consulta financeira incompleta.')
  }
  const totals = raw.totais as Record<string, unknown>
  const money = /^-?\d+\.\d{2}$/
  if (!['previsto', 'pago', 'aberto'].every((key) => typeof totals[key] === 'string' && money.test(totals[key] as string))) {
    throw new Error('Totais financeiros incompletos.')
  }
  for (const item of raw.itens) {
    if (!item || typeof item !== 'object') throw new Error('Lançamento financeiro incompleto.')
    const row = item as Record<string, unknown>
    if (!['valor_previsto', 'valor_pago', 'saldo_aberto'].every((key) => typeof row[key] === 'string' && money.test(row[key] as string)) ||
        typeof row.inconsistente !== 'boolean') throw new Error('Valores do lançamento incompletos.')
  }
  return {
    itens: raw.itens.map((item) => ({
      ...normalizarLancamento(item),
      valor_previsto_exato: (item as Record<string, string>).valor_previsto,
      valor_pago_exato: (item as Record<string, string>).valor_pago,
      saldo_aberto: (item as Record<string, string>).saldo_aberto,
      inconsistente: (item as Record<string, boolean>).inconsistente,
    })),
    total_registros: raw.total_registros as number,
    totais: {
      previsto: totals.previsto as string,
      pago: totals.pago as string,
      aberto: totals.aberto as string,
    },
    pagina: raw.pagina as number,
    limite: raw.limite as number,
    total_paginas: raw.total_paginas as number,
  }
}

export function exportarConsultaFinanceiro(filtro: ConsultaFiltro): Promise<Blob> {
  const { pagina: _pagina, limite: _limite, ...recorte } = filtro
  return apiGetBlob('/financeiro/consulta.csv', { ...recorte })
}
