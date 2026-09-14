import { describe, expect, it } from 'vitest'
import { parsePresenterCount, parsePresenterMoney } from './presenter-input'

describe('parsePresenterMoney', () => {
  it.each([
    ['1234', '1234.00'],
    ['1234,56', '1234.56'],
    ['1234.56', '1234.56'],
    ['1.234,56', '1234.56'],
    ['1,234.56', '1234.56'],
    ['1.234', '1234.00'],
    [' R$ 1.234,50 ', '1234.50'],
    ['0', '0.00'],
  ])('normaliza %s', (input, value) => {
    expect(parsePresenterMoney(input)).toEqual({ ok: true, value })
  })

  it.each(['', 'abc', '-1', '1e3', '1..234', '12,34,56', '1,234', '1.2345', '1,2345'])('rejeita %s', (input) => {
    expect(parsePresenterMoney(input)).toMatchObject({ ok: false })
  })
})

describe('parsePresenterCount', () => {
  it('aceita apenas inteiros com agrupamento de milhar pt-BR', () => {
    expect(parsePresenterCount('1.234', 2_147_483_647)).toEqual({ ok: true, value: 1234 })
    expect(parsePresenterCount('0', 2_147_483_647)).toEqual({ ok: true, value: 0 })
  })

  it.each(['', '1,5', '1.5', '-1', '1e3', '1..234'])('rejeita contador inválido %s', (input) => {
    expect(parsePresenterCount(input, 2_147_483_647)).toMatchObject({ ok: false })
  })
})
