import { describe, expect, it, vi } from 'vitest'
import { completeUnsavedDiscard, continueUnsavedEditing, unsavedCloseDecision } from './useUnsavedChanges'

describe('useUnsavedChanges actions', () => {
  it('ignores close while busy, closes a clean form, and confirms a dirty form', () => {
    expect(unsavedCloseDecision({ busy: true, dirty: true })).toBe('ignore')
    expect(unsavedCloseDecision({ busy: false, dirty: false })).toBe('close')
    expect(unsavedCloseDecision({ busy: false, dirty: true })).toBe('confirm')
  })

  it('continues editing by resetting Back/Forward and restoring the previous focus', () => {
    const calls: string[] = []
    const returnFocus = { isConnected: true, focus: () => { calls.push('focus') } } as unknown as HTMLElement
    continueUnsavedEditing({
      navigation: { reset: () => calls.push('reset'), proceed: vi.fn() },
      returnFocus,
      setConfirming: (value) => calls.push(`confirming:${value}`),
    })
    expect(calls).toEqual(['confirming:false', 'reset', 'focus'])
  })

  it('discards by closing the form before proceeding with the blocked navigation', () => {
    const calls: string[] = []
    completeUnsavedDiscard({
      navigation: { reset: vi.fn(), proceed: () => calls.push('proceed') },
      onClose: () => calls.push('close'),
      setConfirming: (value) => calls.push(`confirming:${value}`),
    })
    expect(calls).toEqual(['confirming:false', 'close', 'proceed'])
  })
})
