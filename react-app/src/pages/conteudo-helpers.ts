import { asString } from '../utils/format'
import type { JsonRecord } from '../types/models'

export const publicationStatusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  revisado: 'Revisado',
  publicado: 'Publicado',
}

export function publicationStatusLabel(value: unknown) {
  const key = asString(value, 'rascunho')
  return publicationStatusLabels[key] ?? (key || 'Rascunho')
}

function localMinutes(value: unknown) {
  const date = typeof value === 'string' ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return null
  return date.getHours() * 60 + date.getMinutes()
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
