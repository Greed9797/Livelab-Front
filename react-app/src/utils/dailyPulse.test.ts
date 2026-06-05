import { describe, expect, it } from 'vitest'
import { buildDailyPulse, computeStatus, formatHoras } from './dailyPulse'

describe('formatHoras', () => {
  it('formats fractional hours as HhMM', () => {
    expect(formatHoras(6.02)).toBe('6h01')
    expect(formatHoras(0.75)).toBe('0h45')
    expect(formatHoras(12)).toBe('12h00')
  })
})

describe('computeStatus (regras agressivas)', () => {
  it('2h+ no ar e zero pedidos = critico', () => {
    expect(computeStatus({ gmv: 0, pedidos: 0, horas: 6.02, totalLives: 1, gmvHora: 0, pedidosHora: 0 })).toBe('critico')
  })
  it('pedidos>0 e gmvHora baixa = atencao', () => {
    expect(computeStatus({ gmv: 100, pedidos: 5, horas: 5, totalLives: 1, gmvHora: 20, pedidosHora: 1 })).toBe('atencao')
  })
  it('pedidos>0 e gmvHora>=50 = ok', () => {
    expect(computeStatus({ gmv: 300, pedidos: 10, horas: 4, totalLives: 1, gmvHora: 75, pedidosHora: 2.5 })).toBe('ok')
  })
  it('gmvHora>=150 e pedidosHora>=2 = otimo', () => {
    expect(computeStatus({ gmv: 800, pedidos: 12, horas: 4, totalLives: 1, gmvHora: 200, pedidosHora: 3 })).toBe('otimo')
  })
})

describe('buildDailyPulse', () => {
  const rows = [
    // Make Zone: 6h01 no ar, zero pedido = crítico
    { dia: '2026-06-05', marca_id: 'm1', marca_nome: 'Make Zone', apresentadora_id: 'a1', apresentadora_nome: 'Jady', gmv_total: 0, pedidos: 0, horas_live: 6.02, total_lives: 1 },
    // Cliente Y: ok
    { dia: '2026-06-04', marca_id: 'm2', marca_nome: 'Cliente Y', apresentadora_id: 'a1', apresentadora_nome: 'Jady', gmv_total: 1000, pedidos: 17, horas_live: 4.33, total_lives: 1 },
  ]
  const pulse = buildDailyPulse(rows)

  it('agrega resumo correto', () => {
    expect(pulse.resumo.gmvTotal).toBe(1000)
    expect(pulse.resumo.pedidosTotal).toBe(17)
    expect(pulse.resumo.clientesCriticos).toBe(1)
    expect(pulse.resumo.statusGeral).toBe('critico')
  })
  it('ordena clientes com crítico primeiro', () => {
    expect(pulse.clientes[0].clienteNome).toBe('Make Zone')
    expect(pulse.clientes[0].status).toBe('critico')
  })
  it('gera alerta crítico de live longa sem venda', () => {
    expect(pulse.alertas.length).toBeGreaterThan(0)
    expect(pulse.alertas[0].severity).toBe('critical')
    expect(pulse.alertas[0].clienteNome).toBe('Make Zone')
  })
  it('série diária ordenada por data', () => {
    expect(pulse.serieDiaria.map((d) => d.data)).toEqual(['2026-06-04', '2026-06-05'])
  })
})
