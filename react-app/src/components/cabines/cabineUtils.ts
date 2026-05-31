import { asArray, asString } from '../../utils/format'
import type { Cabine, JsonRecord } from '../../types/models'

export function isCabineActive(cabine: Cabine): boolean {
  return (cabine as Cabine & JsonRecord).ativo !== false
}

export function getNestedValue(value: unknown, key: string): unknown {
  return value && typeof value === 'object' ? (value as JsonRecord)[key] : undefined
}

export function suggestedClienteId(cabine?: Cabine | null): string {
  if (!cabine) return ''
  const record = cabine as Cabine & JsonRecord
  const agenda = asArray<JsonRecord>(record.agenda)
  return asString(
    record.cliente_id ??
      record.cliente_em_live_id ??
      getNestedValue(record.cliente_em_live, 'id') ??
      record.proxima_cliente_id ??
      getNestedValue(record.proxima_agenda, 'cliente_id') ??
      record.cliente_reservado_id ??
      getNestedValue(record.cliente_reservado, 'id') ??
      agenda[0]?.cliente_id,
    '',
  )
}

export function toDatetimeLocal(value?: unknown): string {
  const date = value ? new Date(asString(value, '')) : new Date()
  const valid = Number.isNaN(date.getTime()) ? new Date() : date
  return new Date(valid.getTime() - valid.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
