import type { JsonRecord } from '../types/models'
import { asNumber } from './format'

/**
 * Brand and day totals count one shared live once.
 * Rows that carry live_ids are distinct-counted. Rows without that array
 * keep the previous sum, so a video-only line still adds its own total.
 * An empty live_ids array is zero and does not also add total_lives.
 */
export function countDistinctLives(rows: JsonRecord[]): number {
  const ids = new Set<string>()
  let fallback = 0
  for (const row of rows) {
    const liveIds = row.live_ids
    if (Array.isArray(liveIds)) {
      for (const id of liveIds) {
        if (id != null && String(id) !== '') ids.add(String(id))
      }
    } else {
      fallback += asNumber(row.total_lives ?? row.lives)
    }
  }
  return ids.size + fallback
}
