import type { JsonRecord } from '../types/models'
import { parseBRMoneyToDecimal } from './money'

export type ManualLiveForm = {
  cabine_id: string
  cliente_id: string
  marca_id: string
  apresentador_id: string
  agenda_evento_id?: string
  data: string
  hora_inicio: string
  hora_fim: string
  fat_gerado: string
  qtd_pedidos: string
  manual_views: string
  manual_likes: string
  manual_comments?: string
  manual_shares?: string
  manual_diamonds?: string
  ads_cost?: string
  live_impressions?: string
  product_impressions?: string
  product_clicks?: string
  avg_viewing_duration?: string
  new_followers?: string
  resumo: string
  status_publicacao: string
  tipo: string
}

/** Funil do CSV do TikTok Studio — contadores inteiros; ads_cost é dinheiro e vai à parte. */
export const CAMPOS_FUNIL = ['live_impressions', 'product_impressions', 'product_clicks', 'new_followers', 'avg_viewing_duration'] as const

function counterOrUndefined(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined
  const err = validateManualCounterInput(value)
  if (err) throw new Error(err)
  return parseManualCounterToInt(value)
}

/** Vírgula com 1–2 casas em contador (ex. 12,5) é decimal — inválido; milhar BR (,00) continua ok. */
export function validateManualCounterInput(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const cleaned = trimmed.replace(/\s/g, '').replace(/[^\d,.-]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === ',' || cleaned === '.') return 'Informe um número inteiro válido.'

  if (hasInvalidDecimalComma(cleaned)) {
    return 'Use apenas números inteiros (sem vírgula decimal).'
  }

  const parsed = parseManualCounterInternal(cleaned)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return 'Use apenas números inteiros.'
  }
  return null
}

function hasInvalidDecimalComma(cleaned: string): boolean {
  const lastComma = cleaned.lastIndexOf(',')
  if (lastComma === -1) return false
  if (cleaned.lastIndexOf('.') > lastComma) return false

  const tail = cleaned.slice(lastComma + 1)
  if (tail.length < 1 || tail.length > 2) return false

  const before = cleaned.slice(0, lastComma)
  if (before.includes(',') || before.includes('.')) {
    if (/^0+$/.test(tail)) return false
  }
  return true
}

export function buildFunilPayload(form: ManualLiveForm): JsonRecord {
  const out: JsonRecord = {}
  for (const key of CAMPOS_FUNIL) {
    const parsed = counterOrUndefined(form[key])
    if (parsed !== undefined) out[key] = parsed
  }
  if (form.ads_cost) out.ads_cost = parseBRMoneyToDecimal(form.ads_cost)
  return out
}

export function parseManualCounterToInt(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0
  if (typeof value !== 'string') return 0

  const cleaned = value.trim().replace(/\s/g, '').replace(/[^\d,.-]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === ',' || cleaned === '.') return 0

  const err = validateManualCounterInput(value)
  if (err) throw new Error(err)

  return parseManualCounterInternal(cleaned)
}

function parseManualCounterInternal(cleaned: string): number {
  const separators = [...cleaned.matchAll(/[,.]/g)]
  if (separators.length === 0) return Math.trunc(Number(cleaned) || 0)

  const lastSeparator = separators.at(-1)?.[0] ?? ''
  const lastIndex = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'))
  const integerPart = cleaned.slice(0, lastIndex)
  const tail = cleaned.slice(lastIndex + 1)

  if (separators.length > 1 && tail.length <= 2 && /^0+$/.test(tail)) {
    return Number(integerPart.replace(/[,.]/g, '')) || 0
  }

  const parts = cleaned.split(lastSeparator)
  const thousands = parts.length > 1 && parts.slice(1).every((part) => /^\d{3}$/.test(part))
  if (thousands) return Number(parts.join('')) || 0

  const normalized = lastSeparator === ','
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(/,/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
}

export function buildManualLivePayload(form: ManualLiveForm): JsonRecord {
  const gmv = parseBRMoneyToDecimal(form.fat_gerado)
  return {
    cabine_id: form.cabine_id,
    cliente_id: form.cliente_id || undefined,
    marca_id: form.marca_id || undefined,
    apresentador_id: form.apresentador_id || undefined,
    agenda_evento_id: form.agenda_evento_id || undefined,
    data: form.data,
    hora_inicio: form.hora_inicio,
    hora_fim: form.hora_fim,
    fat_gerado: gmv,
    qtd_pedidos: parseManualCounterToInt(form.qtd_pedidos),
    manual_orders: parseManualCounterToInt(form.qtd_pedidos),
    manual_views: form.manual_views ? parseManualCounterToInt(form.manual_views) : undefined,
    manual_likes: form.manual_likes ? parseManualCounterToInt(form.manual_likes) : undefined,
    manual_comments: form.manual_comments ? parseManualCounterToInt(form.manual_comments) : undefined,
    manual_shares: form.manual_shares ? parseManualCounterToInt(form.manual_shares) : undefined,
    manual_diamonds: form.manual_diamonds ? parseManualCounterToInt(form.manual_diamonds) : undefined,
    manual_gmv: gmv,
    ...buildFunilPayload(form),
    resumo: form.resumo || undefined,
    status_publicacao: form.status_publicacao,
    tipo: form.tipo,
  }
}
