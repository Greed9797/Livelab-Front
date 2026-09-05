import { describe, expect, it } from 'vitest'
import { aggregateBrandComparison, brandComparisonReference, brandLivesDrilldownUrl, brandPeriodDiagnostic, comparisonMetricMaximum, comparisonMetricWidth, formatCalendarDate, metricVariation, previousPeriodRange, sortBrandComparison } from './brandComparison'

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

  it('distinguishes a missing base, an unavailable rate, and a real zero base', () => {
    expect(metricVariation(20, undefined)).toEqual({ direction: 'missing' })
    expect(metricVariation(null, 10)).toEqual({ direction: 'unavailable' })
    expect(metricVariation(20, null)).toEqual({ direction: 'unavailable-base' })
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

    expect(brandPeriodDiagnostic(current, previous)).toMatchObject({
      gmvLives: { direction: 'up', percent: 50 },
      horasLive: { direction: 'up', percent: 50 },
      gmvHora: { direction: 'flat', percent: 0 },
      gmvChange: 50,
      hoursEffect: 50,
      productivityEffect: 0,
      base: { state: 'small', currentLives: 1, previousLives: 1 },
    })
  })

  it('keeps absence, a real zero, and no-hour rate distinct in the diagnosis', () => {
    const [withoutHours] = aggregateBrandComparison([
      { marca_id: 'a', marca_nome: 'A', gmv_lives: 0, horas_live: 0, total_lives: 0 },
    ])
    expect(brandPeriodDiagnostic(withoutHours)).toMatchObject({
      gmvLives: { direction: 'missing' },
      horasLive: { direction: 'missing' },
      gmvHora: { direction: 'unavailable' },
      base: { state: 'no-current-lives', currentLives: 0, previousLives: null },
    })

    const [zeroThenValue] = aggregateBrandComparison([
      { marca_id: 'a', marca_nome: 'A', gmv_lives: 50, horas_live: 1, total_lives: 1 },
    ])
    const [zeroBase] = aggregateBrandComparison([
      { marca_id: 'a', marca_nome: 'A', gmv_lives: 0, horas_live: 1, total_lives: 1 },
    ])
    expect(brandPeriodDiagnostic(zeroThenValue, zeroBase).gmvLives).toEqual({ direction: 'new' })
  })

  it('decomposes the exact GMV change into hours and GMV/h contributions', () => {
    const previous = { gmvLives: 100, horasLive: 2, gmvHora: 50, totalLives: 4 }
    const current = { gmvLives: 240, horasLive: 3, gmvHora: 80, totalLives: 5 }
    const diagnostic = brandPeriodDiagnostic(current, previous)

    expect(diagnostic.gmvChange).toBe(140)
    expect(diagnostic.hoursEffect).toBe(65)
    expect(diagnostic.productivityEffect).toBe(75)
    expect((diagnostic.hoursEffect ?? 0) + (diagnostic.productivityEffect ?? 0)).toBe(diagnostic.gmvChange)
    expect(diagnostic.base.state).toBe('ready')
  })

  it('builds the existing Conteúdo lives route with the selected brand and window', () => {
    expect(brandLivesDrilldownUrl('marca-a', { from: '2026-09-01', to: '2026-09-05' })).toBe(
      '/conteudo?tab=lives&periodo=custom&data_inicio=2026-09-01&data_fim=2026-09-05&marca=marca-a&origem=analytics',
    )
    expect(brandLivesDrilldownUrl(null, { from: '2026-09-01', to: '2026-09-05' })).toBe(
      '/conteudo?tab=lives&periodo=custom&data_inicio=2026-09-01&data_fim=2026-09-05&origem=analytics',
    )
  })
})
