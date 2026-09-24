import { describe, expect, it } from 'vitest'
import { compactDuration, compactOperationalDayLabel } from './compact-day-label'

describe('compact operational day label', () => {
  it('marks today in lowercase portuguese without a long weekday', () => {
    expect(compactOperationalDayLabel('2026-09-24', '2026-09-24')).toBe('Hoje · qui, 24/09')
  })

  it('keeps other days as weekday plus short date', () => {
    expect(compactOperationalDayLabel('2026-09-23', '2026-09-24')).toBe('qua, 23/09')
  })

  it('does not invent a date when the group has none', () => {
    expect(compactOperationalDayLabel('1970-01-01', '2026-09-24')).toBe('Sem data')
  })

  it('glues hours and minutes', () => {
    expect(compactDuration(11 * 60 + 8)).toBe('11h08')
    expect(compactDuration(45)).toBe('0h45')
  })
})
