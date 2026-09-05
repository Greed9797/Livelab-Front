import { describe, expect, it } from 'vitest'
import { aggregateBrandComparison, sortBrandComparison } from './brandComparison'

describe('brand comparison aggregation', () => {
  it('sums daily rows by brand and keeps GMV videos out of GMV/h', () => {
    const rows = aggregateBrandComparison([
      { marca_id: 'a', marca_nome: 'Marca A', gmv_lives: 100, gmv_videos: 25, horas_live: 2, pedidos: 4, total_lives: 1 },
      { marca_id: 'a', marca_nome: 'Marca A', gmv_lives: 50, gmv_videos: 0, horas_live: 1, pedidos: 2, total_lives: 1 },
    ])

    expect(rows).toEqual([expect.objectContaining({
      marcaId: 'a', gmvLives: 150, gmvVideos: 25, gmvTotal: 175, horasLive: 3, gmvHora: 50, pedidos: 6, totalLives: 2,
    })])
  })

  it('preserves a real zero and reports no rate when there are only videos', () => {
    const rows = aggregateBrandComparison([
      { marca_id: 'zero', marca_nome: 'Zero', gmv_lives: 0, gmv_videos: 0, horas_live: 2, pedidos: 0, total_lives: 1 },
      { marca_id: 'video', marca_nome: 'Vídeo', gmv_lives: 0, gmv_videos: 80, horas_live: 0, pedidos: 1, total_lives: 0 },
    ])

    expect(rows.find((row) => row.marcaId === 'zero')).toEqual(expect.objectContaining({ gmvTotal: 0, gmvHora: 0 }))
    expect(rows.find((row) => row.marcaId === 'video')).toEqual(expect.objectContaining({ gmvTotal: 80, gmvHora: null }))
  })

  it('sorts by the selected metric and keeps an unavailable GMV/h last', () => {
    const rows = aggregateBrandComparison([
      { marca_id: 'a', marca_nome: 'A', gmv_lives: 100, gmv_videos: 0, horas_live: 2, pedidos: 0, total_lives: 1 },
      { marca_id: 'b', marca_nome: 'B', gmv_lives: 90, gmv_videos: 100, horas_live: 3, pedidos: 0, total_lives: 1 },
      { marca_id: 'c', marca_nome: 'C', gmv_lives: 0, gmv_videos: 200, horas_live: 0, pedidos: 0, total_lives: 0 },
    ])

    expect(sortBrandComparison(rows, 'gmvLives').map((row) => row.marcaId)).toEqual(['a', 'b', 'c'])
    expect(sortBrandComparison(rows, 'gmvTotal').map((row) => row.marcaId)).toEqual(['c', 'b', 'a'])
    expect(sortBrandComparison(rows, 'gmvHora').map((row) => row.marcaId)).toEqual(['a', 'b', 'c'])
  })
})
