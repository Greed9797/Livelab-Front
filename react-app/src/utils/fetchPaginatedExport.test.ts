import { describe, expect, it, vi } from 'vitest'

import { fetchAllPaginatedRows, PAGINATED_EXPORT_ROW_CAP, PAGINATED_FETCH_PAGE_SIZE } from './fetchPaginatedExport'

describe('fetchAllPaginatedRows', () => {
  it('loads every page with stable filters and ignores the UI page', async () => {
    const fetchPage = vi.fn(async (page: number, limit: number) => ({
      items: [{ id: `${page}-${limit}` }],
      total: 3,
    }))

    const result = await fetchAllPaginatedRows(fetchPage, { pageSize: 1, cap: 10 })

    expect(result.items).toHaveLength(3)
    expect(result.capped).toBe(false)
    expect(fetchPage).toHaveBeenCalledTimes(3)
    expect(fetchPage.mock.calls.map(([page, limit]) => [page, limit])).toEqual([
      [0, 1],
      [1, 1],
      [2, 1],
    ])
  })

  it('stops at the export cap and reports truncation', async () => {
    const fetchPage = vi.fn(async (page: number, limit: number) => ({
      items: Array.from({ length: limit }, (_, index) => ({ id: `${page}-${index}` })),
      total: PAGINATED_EXPORT_ROW_CAP + 50,
    }))

    const result = await fetchAllPaginatedRows(fetchPage, {
      cap: 5,
      pageSize: 2,
    })

    expect(result.items).toHaveLength(5)
    expect(result.capped).toBe(true)
    expect(result.total).toBe(PAGINATED_EXPORT_ROW_CAP + 50)
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })

  it('uses the default page size constant', () => {
    expect(PAGINATED_FETCH_PAGE_SIZE).toBe(200)
  })
})
