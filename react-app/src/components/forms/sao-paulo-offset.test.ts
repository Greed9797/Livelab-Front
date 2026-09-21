import { describe, expect, it } from 'vitest'
import { makeAgendaDateTime, saoPauloCivilOffset } from './sao-paulo-offset'

describe('saoPauloCivilOffset', () => {
  it('uses UTC-3 for a civil date in the current Sao Paulo zone and keeps the clock hour', () => {
    expect(saoPauloCivilOffset('2026-09-21')).toBe('-03:00')
    expect(makeAgendaDateTime('2026-09-21', '14:30')).toBe('2026-09-21T14:30:00-03:00')
  })
})
