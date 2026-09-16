import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { invalidateOperational, QK } from './query-keys'

describe('invalidateOperational', () => {
  it('discards empty link candidates after an operational change', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: 300_000 } } })
    const key = ['submission-candidates', 'tenant', 'actor', 'submission', 0]
    let available: string[] = []
    const query = { queryKey: key, queryFn: async () => available }
    expect(await client.fetchQuery(query)).toEqual([])
    available = ['new-live']
    invalidateOperational(client)
    expect(await client.fetchQuery(query)).toEqual(['new-live'])
    client.clear()
  })
  it('refreshes reports and portal summaries after a submission is reviewed', () => {
    const client = new QueryClient()
    const keys = [QK.analyticsDashboard(), QK.funilAnalytics('2026-09'), QK.dailyAnalytics('2026-09'), QK.presenterPortalHome('tenant', 'actor', '2026-09'), QK.presenterPortalLives('tenant', 'actor', '2026-09'), QK.presenterReviewQueue('tenant', 'actor', 'pendente')]
    keys.forEach(key => client.setQueryData(key, { pending: true }))
    invalidateOperational(client)
    keys.forEach(key => expect(client.getQueryState(key)?.isInvalidated).toBe(true))
  })
  it('invalidates the selected live detail together with the paginated list', async () => {
    const client = new QueryClient()
    client.setQueryData(QK.live('live-1'), { id: 'live-1', apresentadoras: [] })

    expect(client.getQueryState(QK.live('live-1'))?.isInvalidated).toBe(false)
    invalidateOperational(client)

    await vi.waitFor(() => {
      expect(client.getQueryState(QK.live('live-1'))?.isInvalidated).toBe(true)
    })
  })
  it('invalidates union history, operational financial totals and customer reports after consolidation', () => {
    const client = new QueryClient()
    const keys = [
      ['live-union', 'live-1'],
      QK.financeiroOperacional('2026-09'),
      QK.comissoesDaLive('live-1'),
      QK.clienteConteudoLives({ mes: 9, ano: 2026 }),
      QK.masterConsolidated({ mes: 9, ano: 2026 }),
    ]
    keys.forEach((key) => client.setQueryData(key, { stale: false }))
    invalidateOperational(client)
    keys.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true))
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
