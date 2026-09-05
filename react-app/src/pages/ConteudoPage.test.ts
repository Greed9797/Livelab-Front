import { describe, expect, it } from 'vitest'
import { isLatestLiveEditRequest, shouldOpenLiveDetail } from './ConteudoPage'

describe('shouldOpenLiveDetail', () => {
  it('does not reopen a detail dismissed before the URL state settles', () => {
    expect(shouldOpenLiveDetail({
      selectedLiveId: 'live-1',
      hasSelectedLive: true,
      liveModalMode: null,
      metricsModalMode: null,
      dismissedLiveId: 'live-1',
    })).toBe(false)
  })

  it('keeps deep links opening when the URL selects a live', () => {
    expect(shouldOpenLiveDetail({
      selectedLiveId: 'live-2',
      hasSelectedLive: true,
      liveModalMode: null,
      metricsModalMode: null,
      dismissedLiveId: null,
    })).toBe(true)
  })
})

describe('isLatestLiveEditRequest', () => {
  it('descarta a resposta de edição que chegou depois de uma solicitação mais nova', () => {
    expect(isLatestLiveEditRequest(3, 3)).toBe(true)
    expect(isLatestLiveEditRequest(2, 3)).toBe(false)
  })
})
