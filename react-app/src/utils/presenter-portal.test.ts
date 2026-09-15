import { describe, expect, it } from 'vitest'
import { currentMonth, isoFromLocalDateTime, localDateTimeValue, submissionHasOfficialLiveTombstone, submissionStatusLabel, submissionStatusTone } from './presenter-portal'

describe('São Paulo portal dates', () => {
  it('uses the operational month at the UTC month boundary', () => {
    expect(currentMonth(new Date('2026-10-01T02:30:00Z'))).toBe('2026-09')
  })
  it('round trips operational times independent of the browser timezone', () => {
    expect(isoFromLocalDateTime('2026-09-14T09:00')).toBe('2026-09-14T12:00:00.000Z')
    expect(localDateTimeValue('2026-09-14T12:00:00Z')).toBe('2026-09-14T09:00')
    expect(isoFromLocalDateTime('2026-02-30T09:00')).toBe('')
    expect(isoFromLocalDateTime('invalid')).toBe('')
  })
})

describe('presenter portal submission status', () => {
  it('uses review wording without treating a pending submission as official', () => {
    expect(submissionStatusLabel('pendente')).toBe('Em revisão')
    expect(submissionStatusTone('pendente')).toBe('warning')
  })

  it('makes returned submissions actionable and completed ones final', () => {
    expect(submissionStatusLabel('devolvida')).toBe('Devolvida para ajuste')
    expect(submissionStatusTone('devolvida')).toBe('danger')
    expect(submissionStatusLabel('aprovada')).toBe('Aprovada')
    expect(submissionStatusTone('cancelada')).toBe('neutral')
  })

  it('only treats a backend-confirmed pair of tombstone fields as an excluded official live', () => {
    expect(submissionHasOfficialLiveTombstone({ status: 'aprovada', live_oficial_excluida_id: 'live-1', live_oficial_excluida_em: '2026-09-08T01:00:00Z' })).toBe(true)
    expect(submissionHasOfficialLiveTombstone({ status: 'aprovada', live_oficial_excluida_id: 'live-1' })).toBe(false)
    expect(submissionHasOfficialLiveTombstone({ status: 'devolvida', live_oficial_excluida_id: 'live-1', live_oficial_excluida_em: '2026-09-08T01:00:00Z' })).toBe(false)
  })
})
