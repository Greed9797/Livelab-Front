import { asNumber, asString } from './format'
import type { JsonRecord } from '../types/models'

export type BrandComparisonSort = 'gmvLives' | 'gmvTotal' | 'gmvHora'

export type PreviousPeriod = { from: string; to: string }

export type BrandComparisonRow = {
  key: string
  marcaId: string | null
  marcaNome: string
  gmvLives: number
  gmvVideos: number
  gmvTotal: number
  horasLive: number
  gmvHora: number | null
  pedidos: number
  totalLives: number
}

function metricValue(row: BrandComparisonRow, sort: BrandComparisonSort): number | null {
  return sort === 'gmvHora' ? row.gmvHora : row[sort]
}

/** Referência ponderada: soma dos numeradores dividida pela soma dos denominadores. */
export function brandComparisonReference(rows: BrandComparisonRow[]) {
  const gmvLives = rows.reduce((sum, row) => sum + row.gmvLives, 0)
  const horasLive = rows.reduce((sum, row) => sum + row.horasLive, 0)
  return {
    marcas: rows.length,
    lives: rows.reduce((sum, row) => sum + row.totalLives, 0),
    gmvLives,
    horasLive,
    gmvHora: horasLive > 0 ? gmvLives / horasLive : null,
  }
}

/** Maior valor do recorte para uma barra de proporção, nunca uma meta de desempenho. */
export function comparisonMetricMaximum(rows: BrandComparisonRow[], sort: BrandComparisonSort): number {
  return rows.reduce((maximum, row) => Math.max(maximum, metricValue(row, sort) ?? 0), 0)
}

export function comparisonMetricWidth(value: number | null, maximum: number): number {
  if (value == null || maximum <= 0) return 0
  return Math.min(100, Math.max(0, (value / maximum) * 100))
}

export function previousPeriodRange(from: string, to: string): PreviousPeriod | null {
  const date = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
    const [year, month, day] = value.split('-').map(Number)
    const parsed = new Date(Date.UTC(year, month - 1, day))
    return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : parsed
  }
  const start = date(from)
  const end = date(to)
  if (!start || !end || start > end) return null
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  const previousTo = new Date(start.getTime() - 86_400_000)
  const previousFrom = new Date(previousTo.getTime() - (days - 1) * 86_400_000)
  return { from: previousFrom.toISOString().slice(0, 10), to: previousTo.toISOString().slice(0, 10) }
}

export function formatCalendarDate(value: string): string {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

export type MetricVariation = { direction: 'up' | 'down' | 'flat'; percent: number } | { direction: 'new' | 'none' }

/** Ausência de marca no recorte anterior não é zero. Base zero só indica valor novo. */
export function metricVariation(current: number | null, previous: number | null | undefined): MetricVariation {
  if (current == null || previous == null) return { direction: 'none' }
  if (previous === 0) return current > 0 ? { direction: 'new' } : { direction: 'flat', percent: 0 }
  const percent = ((current - previous) / Math.abs(previous)) * 100
  if (percent === 0) return { direction: 'flat', percent: 0 }
  return { direction: percent >= 0 ? 'up' : 'down', percent: Math.abs(percent) }
}

export function brandMetric(row: BrandComparisonRow, sort: BrandComparisonSort): number | null {
  return metricValue(row, sort)
}

/** Consolida as linhas diárias já filtradas sem cruzar o período ou a entidade ativa. */
export function aggregateBrandComparison(rows: JsonRecord[]): BrandComparisonRow[] {
  const brands = new Map<string, BrandComparisonRow>()

  for (const row of rows) {
    const marcaId = asString(row.marca_id).trim() || null
    const sourceName = asString(row.marca_nome).trim()
    const marcaNome = sourceName && sourceName !== 'Sem marca' ? sourceName : 'Marca não identificada'
    const key = marcaId ?? `sem-id:${marcaNome}`
    const current = brands.get(key) ?? {
      key,
      marcaId,
      marcaNome,
      gmvLives: 0,
      gmvVideos: 0,
      gmvTotal: 0,
      horasLive: 0,
      gmvHora: null,
      pedidos: 0,
      totalLives: 0,
    }

    current.gmvLives += asNumber(row.gmv_lives)
    current.gmvVideos += asNumber(row.gmv_videos)
    current.horasLive += asNumber(row.horas_live)
    current.pedidos += asNumber(row.pedidos)
    current.totalLives += asNumber(row.total_lives)
    brands.set(key, current)
  }

  return [...brands.values()].map((brand) => ({
    ...brand,
    // Vídeos entram no GMV total, mas não têm horas de live; incluí-los aqui inflaria eficiência.
    gmvTotal: brand.gmvLives + brand.gmvVideos,
    gmvHora: brand.horasLive > 0 ? brand.gmvLives / brand.horasLive : null,
  }))
}

export function sortBrandComparison(rows: BrandComparisonRow[], sort: BrandComparisonSort): BrandComparisonRow[] {
  return [...rows].sort((a, b) => {
    const valueA = sort === 'gmvHora' ? a.gmvHora : a[sort]
    const valueB = sort === 'gmvHora' ? b.gmvHora : b[sort]
    if (valueA === null && valueB === null) return a.marcaNome.localeCompare(b.marcaNome, 'pt-BR')
    if (valueA === null) return 1
    if (valueB === null) return -1
    return valueB - valueA || a.marcaNome.localeCompare(b.marcaNome, 'pt-BR')
  })
}
