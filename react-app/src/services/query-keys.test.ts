import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { invalidateOperational, QK } from './query-keys'

describe('invalidateOperational', () => {
  it('invalidates the selected live detail together with the paginated list', async () => {
    const client = new QueryClient()
    client.setQueryData(QK.live('live-1'), { id: 'live-1', apresentadoras: [] })

    expect(client.getQueryState(QK.live('live-1'))?.isInvalidated).toBe(false)
    invalidateOperational(client)

    await vi.waitFor(() => {
      expect(client.getQueryState(QK.live('live-1'))?.isInvalidated).toBe(true)
    })
  })
})

describe('analytics daily query key', () => {
  it('identifies one daily series by its complete operational filter', () => {
    expect(QK.analyticsDailyRange('2026-09-01', '2026-09-07', 'marca-1', 'ap-1'))
      .toEqual(['daily-pulse', '2026-09-01', '2026-09-07', 'marca-1', 'ap-1'])
  })

  it('keeps an unfiltered range distinct from an entity-filtered range', () => {
    expect(QK.analyticsDailyRange('2026-09-01', '2026-09-07'))
      .toEqual(['daily-pulse', '2026-09-01', '2026-09-07', '', ''])
    expect(QK.analyticsDailyRange('2026-09-01', '2026-09-07'))
      .not.toEqual(QK.analyticsDailyRange('2026-09-01', '2026-09-07', 'marca-1'))
  })
})
