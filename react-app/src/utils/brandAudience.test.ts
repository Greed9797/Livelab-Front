import { describe, expect, it } from 'vitest'
import { buildBrandAudienceRows, coveragePercent } from './brandAudience'

describe('brand audience rows', () => {
  it('preserves an informed zero and a missing metric separately', () => {
    const [zero, missing] = buildBrandAudienceRows([
      { marca_id: 'a', marca_nome: 'A', lives_total: 2, lives_com_impressoes_registradas: 2, lives_com_visualizacoes_registradas: 1, impressoes_live: 0 },
      { marca_id: 'b', marca_nome: 'B', lives_total: 1, lives_com_impressoes_registradas: 0, lives_com_visualizacoes_registradas: 0, impressoes_live: null },
    ])
    expect(zero.impressoesLive).toBe(0)
    expect(zero.livesComImpressoesRegistradas).toBe(2)
    expect(zero.livesComVisualizacoesRegistradas).toBe(1)
    expect(missing.impressoesLive).toBeNull()
    expect(missing.livesComImpressoesRegistradas).toBe(0)
  })

  it('renders coverage as a bounded fraction without changing the reported values', () => {
    expect(coveragePercent(2, 4)).toBe(50)
    expect(coveragePercent(0, 4)).toBe(0)
    expect(coveragePercent(4, 0)).toBe(0)
    expect(coveragePercent(8, 4)).toBe(100)
  })
})
