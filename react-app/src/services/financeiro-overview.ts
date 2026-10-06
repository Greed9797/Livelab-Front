import { apiGet } from './api'

export interface OverviewTotals {
  quantidade: number
  previsto: string
  pago: string
  aberto: string
}

export interface FinanceiroOverview {
  mes: string
  data_referencia: string
  estado: 'apurado' | 'incompleto' | 'vazio'
  incompletos: number
  total_excecoes: number
  totais: { receber: OverviewTotals; pagar: OverviewTotals } | null
}

export interface FinanceiroException {
  tipo: 'revisao_dados' | 'vencido'
  motivo: string | null
  natureza: string | null
  origem: string | null
  id: string | null
  componente: string | null
  data_vencimento: string | null
  saldo_aberto: string | null
}

export interface FinanceiroExceptions {
  estado: 'apurado' | 'incompleto' | 'vazio'
  itens: FinanceiroException[]
  total_registros: number
  pagina: number
  limite: number
  total_paginas: number
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const MONEY = /^-?\d+\.\d{2}$/

function validTotals(value: unknown): value is OverviewTotals {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return Number.isSafeInteger(row.quantidade) && Number(row.quantidade) >= 0 &&
    ['previsto', 'pago', 'aberto'].every((key) => typeof row[key] === 'string' && MONEY.test(row[key] as string))
}

function endpoint(path: string, mes: string, dataReferencia: string, pagina?: number) {
  const parsed = new Date(`${dataReferencia}T00:00:00Z`)
  if (!MONTH.test(mes) || !DATE.test(dataReferencia) || Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== dataReferencia) {
    throw new Error('Período inválido.')
  }
  const query = new URLSearchParams({ mes, data_referencia: dataReferencia })
  if (pagina !== undefined) {
    if (!Number.isSafeInteger(pagina) || pagina < 1) throw new Error('Página inválida.')
    query.set('pagina', String(pagina))
  }
  return `/financeiro/${path}?${query}`
}

export async function consultarOverview(mes: string, dataReferencia: string): Promise<FinanceiroOverview> {
  const data = await apiGet<FinanceiroOverview>(endpoint('overview', mes, dataReferencia))
  if (!data || data.mes !== mes || data.data_referencia !== dataReferencia ||
      !['apurado', 'incompleto', 'vazio'].includes(data.estado) ||
      !Number.isSafeInteger(data.incompletos) || data.incompletos < 0 ||
      !Number.isSafeInteger(data.total_excecoes) || data.total_excecoes < 0 ||
      (data.estado === 'apurado' && (!data.totais || !validTotals(data.totais.receber) || !validTotals(data.totais.pagar))) ||
      (data.estado !== 'apurado' && data.totais !== null)) {
    throw new Error('Resposta da visão geral incompleta.')
  }
  return data
}

export async function consultarExceptions(mes: string, dataReferencia: string, pagina: number): Promise<FinanceiroExceptions> {
  const data = await apiGet<FinanceiroExceptions>(endpoint('exceptions', mes, dataReferencia, pagina))
  if (!data || !Array.isArray(data.itens) || !Number.isSafeInteger(data.total_registros) ||
      data.total_registros < 0 || !Number.isSafeInteger(data.total_paginas) || data.total_paginas < 0 ||
      data.pagina !== pagina || !Number.isSafeInteger(data.limite) || data.limite < 1 ||
      !data.itens.every((item) => item && ['revisao_dados', 'vencido'].includes(item.tipo) &&
        (item.saldo_aberto === null || (typeof item.saldo_aberto === 'string' && MONEY.test(item.saldo_aberto))))) {
    throw new Error('Resposta da fila de exceções incompleta.')
  }
  return data
}
