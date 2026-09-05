import { asNumber, asString } from './format'
import type { JsonRecord } from '../types/models'

export type BrandComparisonSort = 'gmvLives' | 'gmvTotal' | 'gmvHora'

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
