import type { JsonRecord } from '../../types/models'
import { asString } from '../../utils/format'

/** O tipo comercial não define a identidade do cadastro que abre o detalhe. */
export function financeiroClienteRef(row: JsonRecord | null): { kind: 'cliente' | 'marca'; id: string } {
  if (!row || row.tipo_entidade === 'sem_marca') return { kind: 'cliente', id: '' }
  const kind = row.tipo_entidade === 'cliente'
    ? 'cliente'
    : row.tipo_entidade === 'marca' || ['afiliada', 'marca'].includes(asString(row.tipo_operacional))
      ? 'marca'
      : 'cliente'
  return { kind, id: asString((kind === 'marca' ? row.marca_id : row.cliente_id) ?? row.id, '') }
}

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
