import { describe, expect, it } from 'vitest'
import { submissionStatusLabel, submissionStatusTone } from './presenter-portal'

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
})
