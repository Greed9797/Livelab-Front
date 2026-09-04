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
  return value ? parseManualCounter(value) : undefined
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

function parseManualCounter(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0

  const cleaned = value.trim().replace(/\s/g, '').replace(/[^\d,.-]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === ',' || cleaned === '.') return 0

  const separators = [...cleaned.matchAll(/[,.]/g)]
  if (separators.length === 0) return Number(cleaned) || 0

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

  const normalized = lastSeparator === ',' ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
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
    qtd_pedidos: parseManualCounter(form.qtd_pedidos),
    manual_orders: parseManualCounter(form.qtd_pedidos),
    manual_views: form.manual_views ? parseManualCounter(form.manual_views) : undefined,
    manual_likes: form.manual_likes ? parseManualCounter(form.manual_likes) : undefined,
    manual_comments: form.manual_comments ? parseManualCounter(form.manual_comments) : undefined,
    manual_shares: form.manual_shares ? parseManualCounter(form.manual_shares) : undefined,
    manual_diamonds: form.manual_diamonds ? parseManualCounter(form.manual_diamonds) : undefined,
    manual_gmv: gmv,
    ...buildFunilPayload(form),
    resumo: form.resumo || undefined,
    status_publicacao: form.status_publicacao,
    tipo: form.tipo,
  }
}
