import { describe, expect, it } from 'vitest'
import {
  buildImportMetricReview,
  importedGmvPresence,
  importedMetricPresence,
  summarizeImportedGmv,
  summarizeMetricPresence,
} from './analyticsImportCoverage'

describe('analytics import coverage', () => {
  it('keeps an explicit zero distinct from a missing official GMV', () => {
    expect(importedGmvPresence({ attributed_gmv: 0 })).toBe('zero')
    expect(importedGmvPresence({ ads_gmv: '0' }, 'tiktok_ads')).toBe('zero')
    expect(importedGmvPresence({ attributed_gmv: null, ads_gmv: null })).toBe('missing')
    expect(importedGmvPresence({ attributed_gmv: 12.5 })).toBe('provided')
    for (const invalid of [' ', 'indisponível', Number.NaN, true]) {
      expect(importedGmvPresence({ attributed_gmv: invalid })).toBe('missing')
    }
  })

  it('summarizes only the nullable GMV signal already supplied by the API', () => {
    expect(summarizeImportedGmv([
      { attributed_gmv: 100 },
      { attributed_gmv: 0 },
      { ads_gmv: null },
    ])).toEqual({ total: 3, provided: 1, zero: 1, missing: 1, unknown: 0 })
  })

  it('uses explicit per-metric presence without treating zero as missing', () => {
    const row = {
      attributed_orders: 0,
      views: 12,
      metric_presence: {
        official_gmv: 'missing',
        attributed_orders: 'zero',
        views: 'provided',
        product_clicks: 'unknown',
      },
    }
    expect(importedMetricPresence(row, 'attributed_orders')).toBe('zero')
    expect(importedMetricPresence(row, 'views')).toBe('provided')
    expect(importedMetricPresence(row, 'product_clicks')).toBe('unknown')
    expect(summarizeMetricPresence([row], 'attributed_orders')).toEqual({ total: 1, provided: 0, zero: 1, missing: 0, unknown: 0 })
  })

  it('uses the source-specific official GMV and keeps null counters out of zero', () => {
    const adsRow = {
      official_gmv: 300,
      attributed_gmv: 900,
      ads_gmv: 300,
      attributed_orders: null,
      metric_presence: { official_gmv: 'provided', attributed_orders: 'missing' },
    }
    expect(importedGmvPresence(adsRow, 'tiktok_ads')).toBe('provided')
    expect(buildImportMetricReview(adsRow, 'tiktok_ads')).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'official_gmv', incoming: 300 }),
      expect.objectContaining({ key: 'attributed_orders', presence: 'missing' }),
    ]))
  })

  it('keeps old non-GMV fields unknown, while showing each new field action', () => {
    expect(importedMetricPresence({ likes: 0 }, 'likes')).toBe('unknown')

    const review = buildImportMetricReview({
      attributed_gmv: 0,
      attributed_orders: 4,
      metric_presence: { official_gmv: 'zero', attributed_orders: 'provided', views: 'missing' },
      current_metrics: { official_gmv: 900, attributed_orders: 2, views: 100 },
      gmv_manually_corrected: true,
    })

    expect(review).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'official_gmv', presence: 'zero', current: 900, manuallyCorrected: true, presenceConfirmed: true }),
      expect.objectContaining({ key: 'attributed_orders', presence: 'provided', incoming: 4, current: 2 }),
      expect.objectContaining({ key: 'views', presence: 'missing', current: 100 }),
    ]))
    expect(review.find((item) => item.key === 'likes')).toMatchObject({ presence: 'unknown' })
    expect(buildImportMetricReview({ attributed_gmv: 50 })[0]).toMatchObject({ presenceConfirmed: false })
  })
})
