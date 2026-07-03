import type { ApiListResponse, JsonRecord, Period } from '../types/models'
import { formatBRL, parseBRMoneyToDecimal } from './money'

export const brlPrecise = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
})

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    if (!value.trim()) return fallback
    const parsed = parseBRMoneyToDecimal(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export function asString(value: unknown, fallback = '—'): string {
  if (typeof value === 'string' && value.trim()) return value
  if (typeof value === 'number') return String(value)
  return fallback
}

export function asArray<T = JsonRecord>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function unwrapList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const payload = value as ApiListResponse<T>
    return payload.data ?? payload.items ?? payload.rows ?? payload.results ?? []
  }
  return []
}

export function formatMoney(value: unknown, precise = false): string {
  const n = asNumber(value)
  return precise ? brlPrecise.format(n).replace(/\u00a0/g, ' ') : formatBRL(n)
}

export function formatPercent(value: unknown): string {
  return `${asNumber(value).toFixed(1).replace('.', ',')}%`
}

// Colunas DATE do Postgres chegam como 'YYYY-MM-DD' (ou, em payloads antigos,
// 'YYYY-MM-DDT00:00:00.000Z'). São datas-calendário: formatar por split, nunca
// via new Date() — UTC-midnight em fuso SP (UTC-3) voltaria um dia na exibição.
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/

export function formatDate(value?: string): string {
  if (!value) return '—'
  const dateOnly = DATE_ONLY_RE.exec(value)
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function currentPeriod(): Period {
  const now = new Date()
  return { mes: now.getMonth() + 1, ano: now.getFullYear() }
}

export function periodLabel(period: Period): string {
  const date = new Date(period.ano, period.mes - 1, 1)
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function periodToParam(period: Period): string {
  return `${period.ano}-${String(period.mes).padStart(2, '0')}`
}

export function shiftPeriod(period: Period, delta: number): Period {
  const date = new Date(period.ano, period.mes - 1 + delta, 1)
  return { mes: date.getMonth() + 1, ano: date.getFullYear() }
}

export function getRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' ? (value as JsonRecord) : {}
}
