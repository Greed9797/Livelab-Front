import type { JsonRecord } from '../types/models'

export type MetricPresence = 'provided' | 'zero' | 'missing' | 'unknown'

export interface ImportMetricReview {
  key: string
  label: string
  presence: MetricPresence
  incoming: unknown
  current: unknown
  manuallyCorrected: boolean
  presenceConfirmed: boolean
}

export const REVIEW_METRICS = [
  ['official_gmv', 'GMV'],
  ['attributed_orders', 'Pedidos'],
  ['views', 'Visualizações'],
  ['live_impressions', 'Impressões da live'],
  ['product_impressions', 'Impressões do produto'],
  ['product_clicks', 'Cliques no produto'],
  ['ads_cost', 'Custo de anúncios'],
  ['avg_viewing_duration', 'Duração média'],
  ['new_followers', 'Novos seguidores'],
  ['likes', 'Likes'],
  ['comments', 'Comentários'],
  ['shares', 'Compartilhamentos'],
] as const

function isNumericValue(value: unknown) {
  return (typeof value === 'number' || typeof value === 'string')
    && !(typeof value === 'string' && !value.trim())
    && Number.isFinite(Number(value))
}

function presenceFromValue(value: unknown): MetricPresence {
  if (!isNumericValue(value)) return 'missing'
  return Number(value) === 0 ? 'zero' : 'provided'
}

function presenceRecord(row: JsonRecord) {
  return row.metric_presence && typeof row.metric_presence === 'object'
    ? row.metric_presence as JsonRecord
    : null
}

/**
 * Lotes novos trazem metric_presence. Em lotes antigos só GMV ainda é seguro de classificar:
 * os demais campos podiam ter sido normalizados para zero pelo servidor.
 */
function officialGmvValue(row: JsonRecord, sourceType?: string) {
  if (isNumericValue(row.official_gmv)) return row.official_gmv
  if (sourceType === 'tiktok_ads') return row.ads_gmv
  return row.attributed_gmv
}

export function importedMetricPresence(row: JsonRecord, key: string, sourceType?: string): MetricPresence {
  const presence = presenceRecord(row)
  const value = presence?.[key]
  if (value === 'provided' || value === 'zero' || value === 'missing' || value === 'unknown') return value

  if (key === 'official_gmv') return presenceFromValue(officialGmvValue(row, sourceType))
  return 'unknown'
}

/** Mantido para consumidores já existentes do resumo de GMV. */
export function importedGmvPresence(row: JsonRecord, sourceType?: string): MetricPresence {
  return importedMetricPresence(row, 'official_gmv', sourceType)
}

export function summarizeImportedGmv(rows: JsonRecord[], sourceType?: string) {
  const summary = { total: rows.length, provided: 0, zero: 0, missing: 0, unknown: 0 }
  for (const row of rows) summary[importedGmvPresence(row, sourceType)] += 1
  return summary
}

function incomingMetricValue(row: JsonRecord, key: string, sourceType?: string) {
  if (key === 'official_gmv') return officialGmvValue(row, sourceType)
  return row[key]
}

export function buildImportMetricReview(row: JsonRecord, sourceType?: string): ImportMetricReview[] {
  const current = row.current_metrics && typeof row.current_metrics === 'object'
    ? row.current_metrics as JsonRecord
    : {}
  const manuallyCorrected = row.gmv_manually_corrected === true
  const presenceConfirmed = presenceRecord(row) !== null

  return REVIEW_METRICS.flatMap(([key, label]) => {
    const presence = importedMetricPresence(row, key, sourceType)
    // Sem o novo mapa, somente o GMV tem presença confiável. Com ele, mostrar todos os
    // campos enviados, inclusive os ausentes, para explicar exatamente o que será mantido.
    if (!presenceConfirmed && key !== 'official_gmv') return []
    return [{
      key,
      label,
      presence,
      incoming: incomingMetricValue(row, key, sourceType),
      current: current[key],
      manuallyCorrected: manuallyCorrected && key === 'official_gmv',
      presenceConfirmed,
    }]
  })
}

export function summarizeMetricPresence(rows: JsonRecord[], key: string, sourceType?: string) {
  const summary = { total: rows.length, provided: 0, zero: 0, missing: 0, unknown: 0 }
  for (const row of rows) summary[importedMetricPresence(row, key, sourceType)] += 1
  return summary
}
