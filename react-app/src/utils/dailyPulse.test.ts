import { describe, expect, it } from 'vitest'
import { buildDailyPulse, formatHoras } from './dailyPulse'

describe('formatHoras', () => {
  it('formats fractional hours as HhMM', () => {
    expect(formatHoras(6.02)).toBe('6h01')
    expect(formatHoras(0.75)).toBe('0h45')
    expect(formatHoras(12)).toBe('12h00')
  })
})

describe('buildDailyPulse', () => {
  it('returns neutral empty aggregates without a generated status or diagnosis', () => {
    const pulse = buildDailyPulse([])
    expect(pulse.resumo).toEqual({ gmvTotal: 0, pedidosTotal: 0, horasTotal: 0, gmvHora: 0 })
    expect(pulse.clientes).toEqual([])
    expect(pulse.rankingApresentadoras).toEqual([])
    expect(pulse).not.toHaveProperty('alertas')
    expect(pulse.resumo).not.toHaveProperty('statusGeral')
  })

  it('aggregates numeric metrics without classifying either a zero or high-GMV live', () => {
    const pulse = buildDailyPulse([
      { dia: '2026-06-05', marca_id: 'm1', marca_nome: 'Sem pedidos', apresentadora_id: 'a1', apresentadora_nome: 'Jady', gmv_total: 0, gmv_lives: 0, pedidos: 0, horas_live: 6, total_lives: 1 },
      { dia: '2026-06-04', marca_id: 'm2', marca_nome: 'Alta venda', apresentadora_id: 'a1', apresentadora_nome: 'Jady', gmv_total: 1_200, gmv_lives: 1_000, pedidos: 17, horas_live: 4, total_lives: 1 },
    ])

    expect(pulse.resumo).toEqual({ gmvTotal: 1_200, pedidosTotal: 17, horasTotal: 10, gmvHora: 100 })
    expect(pulse.serieDiaria.map((day) => day.data)).toEqual(['2026-06-04', '2026-06-05'])
    expect(pulse.clientes).toEqual(expect.arrayContaining([
      expect.objectContaining({ clienteNome: 'Sem pedidos', gmv: 0, pedidos: 0, horas: 6, gmvHora: 0 }),
      expect.objectContaining({ clienteNome: 'Alta venda', gmv: 1_200, pedidos: 17, horas: 4, gmvHora: 250 }),
    ]))
    expect(JSON.stringify(pulse)).not.toMatch(/critico|atencao|otimo|status|alerta|diagnostico/i)
  })

  it('uses live-only GMV for GMV/h while keeping total GMV visible', () => {
    const pulse = buildDailyPulse([
      { dia: '2026-06-01', marca_id: 'm1', marca_nome: 'Marca', apresentadora_id: 'a1', apresentadora_nome: 'Ana', gmv_total: 700, gmv_lives: 500, pedidos: 4, horas_live: 2, total_lives: 1 },
    ])

    expect(pulse.resumo.gmvTotal).toBe(700)
    expect(pulse.resumo.gmvHora).toBe(250)
    expect(pulse.clientes[0]).toMatchObject({ gmv: 700, gmvHora: 250 })
  })

  it('keeps a null brand grouped by its name', () => {
    const pulse = buildDailyPulse([
      { dia: '2026-06-01', marca_id: null, marca_nome: 'Sem marca', apresentadora_id: null, apresentadora_nome: 'X', gmv_total: 100, gmv_lives: 100, pedidos: 3, horas_live: 1, total_lives: 1 },
    ])
    expect(pulse.clientes).toHaveLength(1)
    expect(pulse.clientes[0].clienteNome).toBe('Sem marca')
  })
})
