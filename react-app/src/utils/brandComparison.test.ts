import { describe, expect, it } from 'vitest'
import { aggregateBrandComparison, brandComparisonReference, brandPeriodDiagnostic, comparisonMetricMaximum, comparisonMetricWidth, formatCalendarDate, metricVariation, previousPeriodRange, sortBrandComparison } from './brandComparison'

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

  it('uses a weighted GMV/h reference and a bounded relative scale', () => {
    const rows = aggregateBrandComparison([
      { marca_id: 'a', marca_nome: 'A', gmv_lives: 100, horas_live: 1, total_lives: 1 },
      { marca_id: 'b', marca_nome: 'B', gmv_lives: 100, horas_live: 9, total_lives: 2 },
      { marca_id: 'video', marca_nome: 'Vídeo', gmv_videos: 50, horas_live: 0, total_lives: 0 },
    ])
    expect(brandComparisonReference(rows)).toMatchObject({ marcas: 3, lives: 3, gmvLives: 200, horasLive: 10, gmvHora: 20 })
    expect(comparisonMetricMaximum(rows, 'gmvLives')).toBe(100)
    expect(comparisonMetricWidth(100, 100)).toBe(100)
    expect(comparisonMetricWidth(0, 100)).toBe(0)
    expect(comparisonMetricWidth(null, 100)).toBe(0)
  })

  it('calculates the prior calendar window in UTC across month/year boundaries', () => {
    expect(previousPeriodRange('2026-01-01', '2026-01-07')).toEqual({ from: '2025-12-25', to: '2025-12-31' })
    expect(previousPeriodRange('2024-03-01', '2024-03-01')).toEqual({ from: '2024-02-29', to: '2024-02-29' })
    expect(previousPeriodRange('2026-02-30', '2026-03-01')).toBeNull()
    expect(previousPeriodRange('2026-03-02', '2026-03-01')).toBeNull()
    expect(formatCalendarDate('2025-12-31')).toBe('31/12/2025')
  })

  it('does not manufacture a percentage for a missing or zero base', () => {
    expect(metricVariation(20, undefined)).toEqual({ direction: 'none' })
    expect(metricVariation(null, 10)).toEqual({ direction: 'none' })
    expect(metricVariation(20, 0)).toEqual({ direction: 'new' })
    expect(metricVariation(0, 0)).toEqual({ direction: 'flat', percent: 0 })
    expect(metricVariation(100, 100)).toEqual({ direction: 'flat', percent: 0 })
    expect(metricVariation(150, 100)).toEqual({ direction: 'up', percent: 50 })
    expect(metricVariation(50, 100)).toEqual({ direction: 'down', percent: 50 })
  })

  it('diagnoses GMV, hours, and GMV/h independently without including video GMV', () => {
    const [previous] = aggregateBrandComparison([
      { marca_id: 'a', marca_nome: 'A', gmv_lives: 100, gmv_videos: 80, horas_live: 2, total_lives: 1 },
    ])
    const [current] = aggregateBrandComparison([
      { marca_id: 'a', marca_nome: 'A', gmv_lives: 150, gmv_videos: 500, horas_live: 3, total_lives: 1 },
    ])

    expect(brandPeriodDiagnostic(current, previous)).toEqual({
      gmvLives: { direction: 'up', percent: 50 },
      horasLive: { direction: 'up', percent: 50 },
      gmvHora: { direction: 'flat', percent: 0 },
    })
  })

  it('keeps absence, a real zero, and no-hour rate distinct in the diagnosis', () => {
    const [withoutHours] = aggregateBrandComparison([
      { marca_id: 'a', marca_nome: 'A', gmv_lives: 0, horas_live: 0, total_lives: 0 },
    ])
    expect(brandPeriodDiagnostic(withoutHours)).toEqual({
      gmvLives: { direction: 'none' },
      horasLive: { direction: 'none' },
      gmvHora: { direction: 'none' },
    })

    const [zeroThenValue] = aggregateBrandComparison([
      { marca_id: 'a', marca_nome: 'A', gmv_lives: 50, horas_live: 1, total_lives: 1 },
    ])
    const [zeroBase] = aggregateBrandComparison([
      { marca_id: 'a', marca_nome: 'A', gmv_lives: 0, horas_live: 1, total_lives: 1 },
    ])
    expect(brandPeriodDiagnostic(zeroThenValue, zeroBase).gmvLives).toEqual({ direction: 'new' })
  })
})
