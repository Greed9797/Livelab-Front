import { asString } from '../utils/format'
import type { JsonRecord } from '../types/models'
import type { BadgeTone } from '../components/ui/Badge'

// ---- Agenda: cálculo de dias por visão (semana/mês) + range de fetch ----
// O range de fetch DEVE cobrir exatamente os dias exibidos em cada visão, senão
// a agenda fica dessincronizada (mostra dia sem dados que existem fora do range).
function isoDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Domingo→sábado da semana que contém `dateISO`. */
export function weekDays(dateISO: string): string[] {
  const d = new Date(`${dateISO}T00:00:00`)
  const dow = d.getDay() // domingo = 0
  const sunday = new Date(d)
  sunday.setDate(d.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(sunday)
    x.setDate(sunday.getDate() + i)
    return isoDay(x)
  })
}

/** Grade 6×7 (42 dias) do mês de `dateISO`, começando no domingo. */
export function monthGridDays(dateISO: string): string[] {
  const d = new Date(`${dateISO}T00:00:00`)
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  const dow = first.getDay()
  const start = new Date(first)
  start.setDate(first.getDate() - dow)
  return Array.from({ length: 42 }, (_, i) => {
    const x = new Date(start)
    x.setDate(start.getDate() + i)
    return isoDay(x)
  })
}

/** Range ISO (start inclusivo, end exclusivo) que cobre os dias exibidos na visão. */
export function agendaFetchRange(dateISO: string, view: 'dia' | 'semana' | 'mes') {
  const days = view === 'dia' ? [dateISO] : view === 'semana' ? weekDays(dateISO) : monthGridDays(dateISO)
  const start = new Date(`${days[0]}T00:00:00`)
  const end = new Date(`${days[days.length - 1]}T00:00:00`)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export const publicationStatusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  revisado: 'Revisado',
  publicado: 'Publicado',
}

export function publicationStatusLabel(value: unknown) {
  const key = asString(value, 'rascunho')
  return publicationStatusLabels[key] ?? (key || 'Rascunho')
}

export function publicationStatusTone(value: unknown): BadgeTone {
  const key = asString(value, 'rascunho').toLowerCase()
  if (key === 'publicado') return 'success'
  if (key === 'revisado') return 'info'
  return 'neutral'
}

const SAO_PAULO_TZ = 'America/Sao_Paulo'

function parseBareLocalDateTime(value: string) {
  const hasExplicitZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value)
  const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}):(\d{2}))?/)
  if (!match || hasExplicitZone) return null
  return {
    date: match[1],
    minutes: (Number(match[2] ?? 0) * 60) + Number(match[3] ?? 0),
  }
}

export function saoPauloDateTimeParts(value: unknown) {
  if (typeof value !== 'string') return null
  const bare = parseBareLocalDateTime(value)
  if (bare) return bare
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: SAO_PAULO_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date)
    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    const year = byType.year
    const month = byType.month
    const day = byType.day
    const hour = Number(byType.hour)
    const minute = Number(byType.minute)
    if (year && month && day && Number.isFinite(hour) && Number.isFinite(minute)) {
      return {
        date: `${year}-${month}-${day}`,
        minutes: (hour % 24) * 60 + minute,
      }
    }
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2})?(?:T|\b)(\d{2}):(\d{2})/)
  if (!match) return null
  return {
    date: match[1] ?? '',
    minutes: parseInt(match[2], 10) * 60 + parseInt(match[3], 10),
  }
}

export function formatSaoPauloTime(value: unknown) {
  const parts = saoPauloDateTimeParts(value)
  if (!parts) return '—'
  const hour = Math.floor(parts.minutes / 60)
  const minute = parts.minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function compareDateKey(a: string, b: string) {
  if (!a || !b || a === b) return 0
  return a < b ? -1 : 1
}

function eventBoundsInDate(event: JsonRecord, selectedDate?: string) {
  const startParts = saoPauloDateTimeParts(event.data_inicio)
  const endParts = saoPauloDateTimeParts(event.data_fim)
  const fallbackStart = startParts?.minutes ?? 0
  const fallbackEnd = endParts?.minutes ?? fallbackStart + 60
  if (!selectedDate) {
    return {
      start: fallbackStart,
      end: fallbackEnd > fallbackStart ? fallbackEnd : fallbackStart + 60,
    }
  }

  const startDateCmp = compareDateKey(startParts?.date ?? selectedDate, selectedDate)
  const endDateCmp = compareDateKey(endParts?.date ?? selectedDate, selectedDate)
  const start = startDateCmp < 0 ? 0 : startDateCmp > 0 ? 1440 : fallbackStart
  const end = endDateCmp > 0 ? 1440 : endDateCmp < 0 ? 0 : fallbackEnd
  return { start, end }
}

export function eventIntersectsSaoPauloDate(event: JsonRecord, selectedDate: string) {
  const startParts = saoPauloDateTimeParts(event.data_inicio)
  const endParts = saoPauloDateTimeParts(event.data_fim)
  if (!startParts || !endParts) return false
  const bounds = eventBoundsInDate(event, selectedDate)
  return bounds.start < 1440 && bounds.end > 0
}

/**
 * Atribui "lanes" (colunas lado a lado) para eventos concorrentes da mesma cabine.
 * Eventos que se sobrepõem no tempo recebem index distinto e compartilham o total
 * de lanes do grupo, evitando empilhamento visual.
 */
export function assignAgendaLanes(events: JsonRecord[], selectedDate?: string): Map<string, { index: number; total: number }> {
  const result = new Map<string, { index: number; total: number }>()
  const items = events
    .map((e) => {
      const bounds = eventBoundsInDate(e, selectedDate)
      return { id: asString(e.id), start: bounds.start, end: Math.max(bounds.end, bounds.start + 15) }
    })
    .sort((a, b) => a.start - b.start || a.end - b.end)

  // Agrupa eventos que se sobrepõem em cadeia (cluster).
  let cluster: typeof items = []
  let clusterEnd = -Infinity
  const flush = () => {
    if (cluster.length === 0) return
    // Aloca lanes gananciosamente dentro do cluster.
    const laneEnds: number[] = []
    const laneOf = new Map<string, number>()
    for (const it of cluster) {
      let lane = laneEnds.findIndex((end) => end <= it.start)
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.end) }
      else laneEnds[lane] = it.end
      laneOf.set(it.id, lane)
    }
    const total = laneEnds.length
    for (const it of cluster) result.set(it.id, { index: laneOf.get(it.id) ?? 0, total })
    cluster = []
    clusterEnd = -Infinity
  }
  for (const it of items) {
    if (cluster.length > 0 && it.start >= clusterEnd) flush()
    cluster.push(it)
    clusterEnd = Math.max(clusterEnd, it.end)
  }
  flush()
  return result
}

export function getAgendaEventLayout(
  event: JsonRecord,
  config: { startHour: number; endHour: number; rowHeight: number; date?: string },
) {
  const startLimit = config.startHour * 60
  const endLimit = config.endHour * 60
  const bounds = eventBoundsInDate(event, config.date)
  const start = bounds.start ?? startLimit
  const end = bounds.end ?? start + 60
  const clampedStart = Math.max(startLimit, Math.min(start, endLimit))
  const clampedEnd = Math.max(clampedStart + 15, Math.min(end, endLimit))
  return {
    top: Math.round(((clampedStart - startLimit) / 60) * config.rowHeight),
    height: Math.max(44, Math.round(((clampedEnd - clampedStart) / 60) * config.rowHeight)),
  }
}
