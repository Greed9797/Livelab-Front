import { describe, expect, it } from 'vitest'
import { buildReport } from './LiveDetailModal'

describe('buildReport', () => {
  it('adds stored views and impressions and omits missing ones', () => {
    const withMetrics = buildReport({
      marca_nome: 'Marca B',
      iniciado_em: '2026-09-11T12:00:00-03:00',
      encerrado_em: '2026-09-11T15:00:00-03:00',
      gmv: 1234.56,
      manual_orders: 12,
      manual_views: 1250,
      live_impressions: 8400,
    })
    expect(withMetrics).toContain('👁️ Visualizações: 1.250')
    expect(withMetrics).toContain('📣 Impressões: 8.400')

    const missing = buildReport({
      marca_nome: 'Marca B',
      iniciado_em: '2026-09-11T12:00:00-03:00',
      gmv: 10,
      manual_orders: 1,
    })
    expect(missing).not.toContain('Visualizações')
    expect(missing).not.toContain('Impressões')

    const peakOnly = buildReport({
      iniciado_em: '2026-09-11T12:00:00-03:00',
      manual_views: null,
      final_peak_viewers: 80,
      live_impressions: null,
    })
    expect(peakOnly).toContain('👁️ Visualizações: 80')
    expect(peakOnly).not.toContain('Impressões')
  })

  it('formats the calendar day in America/Sao_Paulo', () => {
    const report = buildReport({
      marca_nome: 'Marca B',
      iniciado_em: '2026-09-08T01:30:00.000Z',
      encerrado_em: '2026-09-08T04:30:00.000Z',
      gmv: 100,
      manual_orders: 1,
    })
    expect(report).toContain('📅 Data: 07/09')
    expect(report).not.toContain('📅 Data: 08/09')
  })
})
