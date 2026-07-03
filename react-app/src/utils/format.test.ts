import { describe, expect, it } from 'vitest'
import { asNumber, formatDate, formatMoney, periodToParam, shiftPeriod, unwrapList } from './format'

describe('format utilities', () => {
  it('normalizes numeric strings from API payloads', () => {
    expect(asNumber('1.234,50')).toBe(1234.5)
    expect(asNumber('1142.00')).toBe(1142)
    expect(asNumber(42)).toBe(42)
    expect(asNumber(null, 7)).toBe(7)
  })

  it('formats money with Brazilian separators and cents', () => {
    expect(formatMoney('1142.00')).toBe('R$ 1.142,00')
    expect(formatMoney('1.142,50')).toBe('R$ 1.142,50')
  })

  it('serializes month and year filters for backend period params', () => {
    expect(periodToParam({ mes: 5, ano: 2026 })).toBe('2026-05')
    expect(shiftPeriod({ mes: 1, ano: 2026 }, -1)).toEqual({ mes: 12, ano: 2025 })
  })

  it('formats DATE columns as calendar dates without timezone shift', () => {
    // colunas DATE do backend agora chegam como 'YYYY-MM-DD'
    expect(formatDate('2026-06-01')).toBe('01/06/2026')
    // payload antigo (Date serializado em UTC-midnight) não pode voltar um dia
    expect(formatDate('2026-06-01T00:00:00.000Z')).toBe('01/06/2026')
    expect(formatDate('2026-06-01T00:00:00Z')).toBe('01/06/2026')
    // timestamps reais continuam formatados via Date
    expect(formatDate('2026-06-01T15:30:00.000Z')).toMatch(/^\d{2}\/\d{2}\/2026$/)
    expect(formatDate('')).toBe('—')
    expect(formatDate('inválido')).toBe('inválido')
  })

  it('unwraps common backend list envelopes', () => {
    expect(unwrapList({ items: [{ id: 1 }] })).toEqual([{ id: 1 }])
    expect(unwrapList([{ id: 2 }])).toEqual([{ id: 2 }])
  })
})
