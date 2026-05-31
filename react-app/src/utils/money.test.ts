import { describe, expect, it } from 'vitest'
import { formatBRL, parseBRMoneyToDecimal } from './money'

describe('money utilities', () => {
  it.each([
    ['1142', 1142],
    ['1.142', 1142],
    ['1142,00', 1142],
    ['1.142,50', 1142.5],
    ['R$ 1.142,50', 1142.5],
    ['1142.00', 1142],
  ])('parses %s as decimal reais', (input, expected) => {
    expect(parseBRMoneyToDecimal(input)).toBe(expected)
  })

  it('formats BRL with thousands and cents', () => {
    expect(formatBRL(1142)).toBe('R$ 1.142,00')
    expect(formatBRL(1142.5)).toBe('R$ 1.142,50')
  })
})
