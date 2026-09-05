import { describe, expect, it } from 'vitest'
import { buildBrandAudienceRows } from './brandAudience'

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
})
