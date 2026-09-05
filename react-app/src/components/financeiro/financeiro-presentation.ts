import type { JsonRecord } from '../../types/models'

/**
 * A API financeira pode representar NUMERIC como number ou string. Ausência não é
 * zero: esta guarda é usada só para decidir se a interface pode apresentar um total.
 */
export function hasReportedNumber(record: JsonRecord, key: string): boolean {
  const value = record[key]
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value !== 'string' || !value.trim()) return false
  return Number.isFinite(Number(value))
}

export function hasReportedNumbers(record: JsonRecord, keys: readonly string[]): boolean {
  return keys.every((key) => hasReportedNumber(record, key))
}
