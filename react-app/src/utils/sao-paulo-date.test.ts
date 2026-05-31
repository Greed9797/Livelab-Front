import { describe, expect, it } from 'vitest'
import { getSaoPauloDateInput, getSaoPauloDayAgendaParams, isSameSaoPauloDate } from './sao-paulo-date'

describe('sao-paulo-date helpers', () => {
  it('builds agenda range params for the selected Sao Paulo day', () => {
    expect(getSaoPauloDayAgendaParams('2026-05-25')).toEqual({
      data_inicio: '2026-05-25T00:00:00-03:00',
      data_fim: '2026-05-25T23:59:59-03:00',
    })
  })

  it('formats an instant using America/Sao_Paulo calendar date', () => {
    expect(getSaoPauloDateInput(new Date('2026-05-25T02:30:00.000Z'))).toBe('2026-05-24')
  })

  it('keeps Gantt events scoped to the selected Sao Paulo day', () => {
    expect(isSameSaoPauloDate('2026-05-25T10:00:00-03:00', '2026-05-25')).toBe(true)
    expect(isSameSaoPauloDate('2026-05-24T10:00:00-03:00', '2026-05-25')).toBe(false)
  })
})
