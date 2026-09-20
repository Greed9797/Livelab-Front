import { describe, expect, it } from 'vitest'
import { buildReport } from './LiveDetailModal'

const live = {
  marca_nome: 'Rovitex',
  iniciado_em: '2026-09-11T12:00:00-03:00',
  encerrado_em: '2026-09-11T14:00:00-03:00',
  manual_gmv: 1234.56,
  manual_orders: 12,
  apresentadora_nome: 'Ana',
}

describe('buildReport', () => {
  it('appends stored views and impressions and omits empty ones', () => {
    const withMetrics = buildReport({
      ...live,
      manual_views: 12400,
      live_impressions: '80000',
      product_impressions: 9,
      final_peak_viewers: 3,
    })
    expect(withMetrics).toContain('👁️ Visualizações: 12.400')
    expect(withMetrics).toContain('📣 Impressões: 80.000')
    expect(withMetrics).not.toContain('Impressões: 9')
    expect(withMetrics.indexOf('Pedidos')).toBeLessThan(withMetrics.indexOf('Visualizações'))

    const missing = buildReport({
      ...live,
      manual_views: null,
      live_impressions: null,
      product_impressions: 999,
      final_peak_viewers: 40,
    })
    expect(missing).not.toContain('Visualizações')
    expect(missing).not.toContain('Impressões')
    expect(missing).toContain('🛒 Pedidos: 12')

    const zeros = buildReport({ ...live, manual_views: 0, live_impressions: 0 })
    expect(zeros).toContain('👁️ Visualizações: 0')
    expect(zeros).toContain('📣 Impressões: 0')
  })

  it('uses the stored count of one without dropping the line', () => {
    const text = buildReport({ ...live, manual_views: 1, live_impressions: 1 })
    expect(text).toContain('👁️ Visualizações: 1')
    expect(text).toContain('📣 Impressões: 1')
  })
})
