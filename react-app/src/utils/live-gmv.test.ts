import { describe, expect, it } from 'vitest'
import { officialLiveGmv } from './live-gmv'

describe('officialLiveGmv', () => {
  it('prefere o gmv já coalescido pelo backend', () => {
    expect(officialLiveGmv({ gmv: 100, ads_gmv: 200, manual_gmv: 300, fat_gerado: 400 })).toBe(100)
  })

  it('segue a ordem do liveGmvSql quando gmv não vem no payload', () => {
    expect(officialLiveGmv({ ads_gmv: 200, manual_gmv: 300, fat_gerado: 400 })).toBe(200)
    expect(officialLiveGmv({ manual_gmv: 300, fat_gerado: 400 })).toBe(300)
    expect(officialLiveGmv({ fat_gerado: 400 })).toBe(400)
  })

  it('trata 0 explícito como valor (igual ao COALESCE), não como ausente', () => {
    expect(officialLiveGmv({ ads_gmv: 0, manual_gmv: 300 })).toBe(0)
  })

  it('pula null/undefined como o COALESCE do Postgres', () => {
    expect(officialLiveGmv({ gmv: null, ads_gmv: undefined, manual_gmv: 300 })).toBe(300)
  })

  it('cai para 0 quando nenhuma coluna tem valor', () => {
    expect(officialLiveGmv({})).toBe(0)
  })

  it('normaliza numérico vindo como string do Postgres', () => {
    expect(officialLiveGmv({ gmv: '1234.56' })).toBe(1234.56)
  })
})
