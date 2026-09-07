import { describe, expect, it } from 'vitest'
import { goalPaceLabel, goalProgress, monthToPeriod, parseOptionalGoalValue } from './MonthlyUnitGoals'

describe('MonthlyUnitGoals', () => {
  it('formats the selected Analytics month without relying on the browser timezone', () => {
    expect(monthToPeriod('2026-09')).toBe('setembro de 2026')
  })

  it('keeps an unset goal neutral instead of creating a status', () => {
    expect(goalProgress(840, null)).toBeNull()
    expect(goalPaceLabel(840, null)).toBe('Meta não definida')
  })

  it('uses the projection value as a bounded visual progress', () => {
    expect(goalProgress(840, 1_100)).toBeCloseTo(76.3636)
    expect(goalProgress(1_250, 1_100)).toBe(100)
    expect(goalPaceLabel(840, 1_100)).toBe('Abaixo da meta')
    expect(goalPaceLabel(1_100, 1_100)).toBe('Dentro da meta')
    expect(goalPaceLabel(0, 1_100, false)).toBe('Mês ainda não iniciado')
  })

  it('accepts explicit zero and valid PT-BR values without coercing malformed input to zero', () => {
    expect(parseOptionalGoalValue('0')).toBe(0)
    expect(parseOptionalGoalValue('1.100,25')).toBe(1100.25)
    expect(parseOptionalGoalValue('1100.25')).toBe(1100.25)
    expect(parseOptionalGoalValue('')).toBeNull()
    expect(parseOptionalGoalValue('1..2')).toBeUndefined()
    expect(parseOptionalGoalValue('1,2,3')).toBeUndefined()
    expect(parseOptionalGoalValue('10000000000000')).toBeUndefined()
  })
})
