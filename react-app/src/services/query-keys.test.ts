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
