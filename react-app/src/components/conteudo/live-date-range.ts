export type DateRange = 'todos' | 'hoje' | '7d' | '30d' | 'mes' | 'custom'

function localIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function isValidCustomDateRange(from: string, to: string, today = localIsoDate(new Date())): boolean {
  return isIsoCalendarDate(from) && isIsoCalendarDate(to) && from <= to && to <= today
}

/** Converte o preset de período em janela de datas (YYYY-MM-DD) para o servidor. */
export function dateRangeToWindow(range: DateRange, customFrom = '', customTo = ''): { data_inicio?: string; data_fim?: string } {
  if (range === 'todos') return {}
  if (range === 'custom') {
    return isValidCustomDateRange(customFrom, customTo)
      ? { data_inicio: customFrom, data_fim: customTo }
      : {}
  }
  const now = new Date()
  const fim = localIsoDate(now)
  if (range === 'hoje') return { data_inicio: fim, data_fim: fim }
  if (range === 'mes') return { data_inicio: localIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)), data_fim: fim }
  const start = new Date(now)
  start.setDate(now.getDate() - (range === '7d' ? 6 : 29))
  return { data_inicio: localIsoDate(start), data_fim: fim }
}
