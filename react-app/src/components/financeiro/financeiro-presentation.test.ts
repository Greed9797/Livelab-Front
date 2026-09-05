import { describe, expect, it } from 'vitest'
import { hasReportedNumbers } from './financeiro-presentation'

describe('financeiro presentation guards', () => {
  it('keeps reported zero distinct from a missing financial total', () => {
    expect(hasReportedNumbers({ entradas: 0, resultado: '0.00' }, ['entradas', 'resultado'])).toBe(true)
    expect(hasReportedNumbers({ entradas: 0 }, ['entradas', 'resultado'])).toBe(false)
    expect(hasReportedNumbers({ entradas: 'não informado', resultado: 10 }, ['entradas', 'resultado'])).toBe(false)
  })
})
