import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { presetRange, ymd } from './AnalyticsFilterBar'

/**
 * O período do Analytics viaja para um backend que define "hoje" em São Paulo. Enquanto `ymd` lia
 * o relógio LOCAL, um cliente adiantado em relação a SP (laptop em UTC às 21h de Blumenau, ou data
 * do sistema errada) pedia AMANHÃ no preset "Hoje"; o backend cortava o fim em hoje, a janela
 * voltava invertida e a tira de assiduidade renderizava uma fileira vazia afirmando "sem faltas"
 * para todo mundo.
 *
 * O TZ do processo é forçado para UTC aqui de propósito: com o TZ da máquina do dev (SP) a versão
 * antiga passaria e o teste não provaria nada.
 */
describe('período do Analytics é ancorado em São Paulo, não no relógio do cliente', () => {
  const tzOriginal = process.env.TZ
  beforeAll(() => { process.env.TZ = 'UTC' })
  afterAll(() => { process.env.TZ = tzOriginal; vi.useRealTimers() })

  // 04/09 01:00Z já é dia 4 em UTC, mas ainda são 22:00 do dia 3 em São Paulo.
  const instante = new Date('2026-09-04T01:00:00Z')

  it('ymd devolve o dia-calendário de São Paulo', () => {
    expect(ymd(instante)).toBe('2026-09-03')
  })

  it('o preset "Hoje" não pede um dia que ainda não chegou em São Paulo', () => {
    vi.useFakeTimers({ now: instante })
    expect(presetRange('hoje', '', '')).toEqual({ from: '2026-09-03', to: '2026-09-03' })
    vi.useRealTimers()
  })

  it('os presets relativos contam dias a partir do dia de São Paulo', () => {
    vi.useFakeTimers({ now: instante })
    expect(presetRange('ontem', '', '')).toEqual({ from: '2026-09-02', to: '2026-09-02' })
    expect(presetRange('7d', '', '')).toEqual({ from: '2026-08-28', to: '2026-09-03' })
    expect(presetRange('30d', '', '')).toEqual({ from: '2026-08-05', to: '2026-09-03' })
    expect(presetRange('mes', '', '')).toEqual({ from: '2026-09-01', to: '2026-09-03' })
    vi.useRealTimers()
  })

  it('todos os presets devolvem YYYY-MM-DD, que é o formato que o endpoint valida', () => {
    for (const p of ['hoje', 'ontem', '7d', '30d', 'mes'] as const) {
      const { from, to } = presetRange(p, '', '')
      expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(from <= to).toBe(true)
    }
  })
})
