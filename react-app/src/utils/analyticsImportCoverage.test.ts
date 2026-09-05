import { describe, expect, it } from 'vitest'
import { importedGmvPresence, summarizeImportedGmv } from './analyticsImportCoverage'

describe('analytics import coverage', () => {
  it('keeps an explicit zero distinct from a missing official GMV', () => {
    expect(importedGmvPresence({ attributed_gmv: 0 })).toBe('zero')
    expect(importedGmvPresence({ ads_gmv: '0' })).toBe('zero')
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
    ])).toEqual({ total: 3, provided: 1, zero: 1, missing: 1 })
  })
})
