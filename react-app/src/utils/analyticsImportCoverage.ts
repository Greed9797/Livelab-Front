import type { JsonRecord } from '../types/models'

export type GmvPresence = 'provided' | 'zero' | 'missing'

/** O contrato atual preserva null para GMV, mas normaliza vários contadores ausentes em zero. */
export function importedGmvPresence(row: JsonRecord): GmvPresence {
  const value = row.attributed_gmv ?? row.ads_gmv
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim()) || !Number.isFinite(Number(value))) return 'missing'
  return Number(value) === 0 ? 'zero' : 'provided'
}

export function summarizeImportedGmv(rows: JsonRecord[]) {
  const summary = { total: rows.length, provided: 0, zero: 0, missing: 0 }
  for (const row of rows) summary[importedGmvPresence(row)] += 1
  return summary
}
