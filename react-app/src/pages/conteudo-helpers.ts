import { asString } from '../utils/format'
import type { JsonRecord } from '../types/models'
import type { BadgeTone } from '../components/ui/Badge'

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

function localMinutes(value: unknown) {
  const date = typeof value === 'string' ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return null
  return date.getHours() * 60 + date.getMinutes()
}

/**
 * Atribui "lanes" (colunas lado a lado) para eventos concorrentes da mesma cabine.
 * Eventos que se sobrepõem no tempo recebem index distinto e compartilham o total
 * de lanes do grupo, evitando empilhamento visual.
 */
export function assignAgendaLanes(events: JsonRecord[]): Map<string, { index: number; total: number }> {
  const result = new Map<string, { index: number; total: number }>()
  const items = events
    .map((e) => ({
      id: asString(e.id),
      start: localMinutes(e.data_inicio) ?? 0,
      end: localMinutes(e.data_fim) ?? (localMinutes(e.data_inicio) ?? 0) + 60,
    }))
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
  config: { startHour: number; endHour: number; rowHeight: number },
) {
  const startLimit = config.startHour * 60
  const endLimit = config.endHour * 60
  const start = localMinutes(event.data_inicio) ?? startLimit
  const end = localMinutes(event.data_fim) ?? start + 60
  const clampedStart = Math.max(startLimit, Math.min(start, endLimit))
  const clampedEnd = Math.max(clampedStart + 15, Math.min(end, endLimit))
  return {
    top: Math.round(((clampedStart - startLimit) / 60) * config.rowHeight),
    height: Math.max(44, Math.round(((clampedEnd - clampedStart) / 60) * config.rowHeight)),
  }
}
