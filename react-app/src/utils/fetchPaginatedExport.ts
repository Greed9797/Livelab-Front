import { asArray, asNumber } from './format'

export const PAGINATED_EXPORT_ROW_CAP = 10_000
/** Backend caps GET /lives at 200 rows per page. */
export const PAGINATED_FETCH_PAGE_SIZE = 200

export interface PaginatedFetchResult<T> {
  items: T[]
  total: number
  capped: boolean
}

type PaginatedPageResponse<T> = {
  items?: T[]
  total?: number
}

/**
 * Walks paginated list endpoints until all rows are loaded or `cap` is reached.
 * Ignores the UI page index — pass only filter params to `fetchPage`'s underlying call.
 */
export async function fetchAllPaginatedRows<T>(
  fetchPage: (page: number, limit: number) => Promise<PaginatedPageResponse<T>>,
  options: { cap?: number; pageSize?: number } = {},
): Promise<PaginatedFetchResult<T>> {
  const cap = options.cap ?? PAGINATED_EXPORT_ROW_CAP
  const pageSize = options.pageSize ?? PAGINATED_FETCH_PAGE_SIZE
  const items: T[] = []
  let total = 0

  for (let page = 0; page * pageSize < cap; page += 1) {
    const res = await fetchPage(page, pageSize)
    const batch = asArray<T>(res?.items)
    total = Math.max(total, asNumber(res?.total, items.length + batch.length))
    items.push(...batch)

    if (items.length >= cap) {
      if (items.length > cap) items.length = cap
      return { items, total, capped: total > cap }
    }
    if (batch.length < pageSize || items.length >= total) {
      return { items, total, capped: false }
    }
  }

  return { items, total, capped: total > items.length }
}
