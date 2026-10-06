import { apiGet } from './api'

export interface AgingFiltro {
  data_referencia: string
  competencia_inicio: string
  competencia_fim: string
  faixas: string
}

export interface AgingBucket {
  quantidade: number
  saldo_aberto: string
}

export interface AgingFaixa extends AgingBucket {
  de_dias: number
  ate_dias: number | null
}

export interface AgingResponse extends Omit<AgingFiltro, 'faixas'> {
  limites_dias: number[]
  atrasado: AgingBucket
  vence_hoje: AgingBucket
  futuro: AgingBucket
  faixas: AgingFaixa[]
}

const MONTH = /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/
const MONEY = /^\d+\.\d{2}$/

export function agingFilterError(filtro: AgingFiltro): string | null {
  const { data_referencia, competencia_inicio, competencia_fim, faixas } = filtro
  const date = new Date(`${data_referencia}T00:00:00.000Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_referencia) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== data_referencia) {
    return 'Informe uma data de referência válida.'
  }
  const start = Number(competencia_inicio.slice(0, 4)) * 12 + Number(competencia_inicio.slice(5))
  const end = Number(competencia_fim.slice(0, 4)) * 12 + Number(competencia_fim.slice(5))
  if (!MONTH.test(competencia_inicio) || !MONTH.test(competencia_fim) || start > end || end - start >= 36) {
    return 'Escolha competências em ordem, em um intervalo de até 36 meses.'
  }
  if (!/^[1-9]\d*(?:,[1-9]\d*)*$/.test(faixas)) return 'Informe limites de dias positivos separados por vírgula.'
  const limites = faixas.split(',').map(Number)
  if (limites.length > 12 || limites.some((value, index) => !Number.isSafeInteger(value) || value > 365_000 || (index > 0 && value <= limites[index - 1]))) {
    return 'Informe até 12 limites estritamente crescentes, de no máximo 365000 dias.'
  }
  return null
}

function bucket(raw: unknown): AgingBucket {
  if (!raw || typeof raw !== 'object') throw new Error('Resposta de aging incompleta. Tente novamente.')
  const value = raw as Record<string, unknown>
  if (!Number.isSafeInteger(value.quantidade) || Number(value.quantidade) < 0 || typeof value.saldo_aberto !== 'string' || !MONEY.test(value.saldo_aberto)) {
    throw new Error('Resposta de aging incompleta. Tente novamente.')
  }
  return { quantidade: value.quantidade as number, saldo_aberto: value.saldo_aberto }
}

export async function consultarAging(filtro: AgingFiltro): Promise<AgingResponse> {
  const error = agingFilterError(filtro)
  if (error) throw new Error(error)
  const raw = await apiGet<Record<string, unknown>>('/financeiro/aging', { ...filtro })
  if (!raw || typeof raw !== 'object' || raw.data_referencia !== filtro.data_referencia || raw.competencia_inicio !== filtro.competencia_inicio || raw.competencia_fim !== filtro.competencia_fim) {
    throw new Error('Resposta de aging incompleta. Tente novamente.')
  }
  const limites = filtro.faixas.split(',').map(Number)
  const limitesResposta = raw.limites_dias
  if (!Array.isArray(limitesResposta) || limitesResposta.length !== limites.length || !limites.every((value, index) => limitesResposta[index] === value)
    || !Array.isArray(raw.faixas) || raw.faixas.length !== limites.length + 1) {
    throw new Error('Resposta de aging incompleta. Tente novamente.')
  }
  const faixas = raw.faixas.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error('Resposta de aging incompleta. Tente novamente.')
    const faixa = item as Record<string, unknown>
    if (faixa.de_dias !== (index === 0 ? 1 : limites[index - 1] + 1) || faixa.ate_dias !== (limites[index] ?? null)) {
      throw new Error('Resposta de aging incompleta. Tente novamente.')
    }
    return { de_dias: faixa.de_dias as number, ate_dias: faixa.ate_dias as number | null, ...bucket(faixa) }
  })
  return {
    data_referencia: filtro.data_referencia,
    competencia_inicio: filtro.competencia_inicio,
    competencia_fim: filtro.competencia_fim,
    limites_dias: limites,
    atrasado: bucket(raw.atrasado),
    vence_hoje: bucket(raw.vence_hoje),
    futuro: bucket(raw.futuro),
    faixas,
  }
}
