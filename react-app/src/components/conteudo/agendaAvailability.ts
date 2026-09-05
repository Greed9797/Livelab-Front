import { asArray, asString } from '../../utils/format'
import { presenterProfileId } from '../../utils/presenters'
import type { JsonRecord } from '../../types/models'
import { GRADE_SLOTS, type GradeCelula } from './gradeUtils'

export type AgendaAvailabilityEntry = {
  id: string
  nome: string
  slots: number
}

export type AgendaAvailabilitySummary = {
  marcasSemHorario: AgendaAvailabilityEntry[]
  apresentadorasComVaga: AgendaAvailabilityEntry[]
  marcasAtivas: number
  apresentadorasAtivas: number
  hasUnknownSchedule: boolean
}

type TimeRange = { start: number; end: number }

function timeInSaoPaulo(date: string, time: string): number | null {
  const value = new Date(`${date}T${time}:00-03:00`).getTime()
  return Number.isFinite(value) ? value : null
}

function eventRange(item: JsonRecord): TimeRange | null {
  const start = new Date(asString(item.data_inicio)).getTime()
  const end = new Date(asString(item.data_fim)).getTime()
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? { start, end } : null
}

function intersects(left: TimeRange, right: TimeRange) {
  return left.start < right.end && left.end > right.start
}

function cellRange(cell: GradeCelula, date: string): TimeRange | null {
  const start = timeInSaoPaulo(date, cell.hora_inicio)
  const end = timeInSaoPaulo(date, cell.hora_fim)
  return start !== null && end !== null && end > start ? { start, end } : null
}

function activeMarcaId(row: JsonRecord): string {
  const status = asString(row.status).toLowerCase()
  if (row.ativo === false || row.arquivada === true || (status && status !== 'ativa' && status !== 'ativo')) return ''
  return asString(row.marca_id ?? row.id)
}

function activePresenterId(row: JsonRecord): string {
  const status = asString(row.status).toLowerCase()
  if (row.ativo === false || row.arquivada === true || ['inativa', 'inativo', 'arquivada', 'cancelada'].includes(status)) return ''
  return presenterProfileId(row)
}

function addSlot(target: Map<string, Set<string>>, id: string, slot: string) {
  if (!id) return
  const slots = target.get(id) ?? new Set<string>()
  slots.add(slot)
  target.set(id, slots)
}

function rangeKey(range: TimeRange) {
  return `${range.start}:${range.end}`
}

function clipped(range: TimeRange, boundary: TimeRange): TimeRange {
  return { start: Math.max(range.start, boundary.start), end: Math.min(range.end, boundary.end) }
}

function fullyCovered(target: TimeRange, ranges: TimeRange[]) {
  let cursor = target.start
  for (const range of ranges
    .filter((range) => intersects(range, target))
    .map((range) => clipped(range, target))
    .sort((a, b) => a.start - b.start || a.end - b.end)) {
    if (range.start > cursor) return false
    cursor = Math.max(cursor, range.end)
    if (cursor >= target.end) return true
  }
  return false
}

function toAvailable(
  rows: JsonRecord[],
  getId: (row: JsonRecord) => string,
  scheduled: Map<string, Set<string>>,
  maxSlots: number,
): AgendaAvailabilityEntry[] {
  const known = new Map<string, JsonRecord>()
  for (const row of rows) {
    const id = getId(row)
    if (id && !known.has(id)) known.set(id, row)
  }
  return [...known.entries()]
    .map(([id, row]) => ({ id, nome: asString(row.nome ?? row.razao_social, 'Sem nome'), slots: scheduled.get(id)?.size ?? 0 }))
    .filter((row) => row.slots < maxSlots)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

function activeCount(rows: JsonRecord[], getId: (row: JsonRecord) => string) {
  return new Set(rows.map(getId).filter(Boolean)).size
}

/**
 * Reconcilia a escala da Grade com reservas reais. Uma reserva que ocupa uma
 * célula substitui a pessoa/modelo da Grade naquela faixa; seus turnos entram
 * separadamente. Isso evita tanto esconder substituições quanto contar a mesma
 * faixa duas vezes.
 */
export function summarizeAgendaAvailability({
  date,
  gradeCells,
  agendaRows,
  marcaRows,
  apresentadoraRows,
  maxPresenterSlots = 2,
}: {
  date: string
  gradeCells: GradeCelula[]
  agendaRows: JsonRecord[]
  marcaRows: JsonRecord[]
  apresentadoraRows: JsonRecord[]
  maxPresenterSlots?: number
}): AgendaAvailabilitySummary {
  const marcas = new Map<string, Set<string>>()
  const apresentadoras = new Map<string, Set<string>>()
  const dayStart = timeInSaoPaulo(date, '00:00')
  const dayEnd = dayStart === null ? null : dayStart + 24 * 60 * 60 * 1000
  const dayRange = dayStart !== null && dayEnd !== null ? { start: dayStart, end: dayEnd } : null
  const cells = gradeCells.map((cell, index) => ({ cell, index, range: cellRange(cell, date) }))
  const gradeSlots = GRADE_SLOTS
    .map((slot) => ({ range: cellRange({ hora_inicio: slot.inicio, hora_fim: slot.fim } as GradeCelula, date) }))
    .filter((slot): slot is { range: TimeRange } => slot.range !== null)
  const eventCoverageByCell = new Map<number, TimeRange[]>()
  let hasUnknownSchedule = false

  for (const event of agendaRows) {
    if (asString(event.status).toLowerCase() === 'cancelado') continue
    const range = eventRange(event)
    if (!range) { hasUnknownSchedule = true; continue }
    if (!dayRange || !intersects(range, dayRange)) continue

    const matching = cells.filter(({ cell, range: cellSlot }) => {
      if (!cellSlot || asString(cell.cabine_id) !== asString(event.cabine_id)) return false
      return intersects(range, cellSlot)
    })
    matching.forEach(({ index, range: cellSlot }) => {
      if (!cellSlot) return
      eventCoverageByCell.set(index, [...(eventCoverageByCell.get(index) ?? []), clipped(range, cellSlot)])
    })

    // Reserva real ocupa os slots fixos que atravessa mesmo sem célula da Grade.
    // Fora deles preservamos o intervalo real do dia, sem inventar capacidade.
    const slots = gradeSlots.filter((slot) => intersects(range, slot.range))
    const projectedSlots = slots.length > 0 ? slots : [{ range: clipped(range, dayRange) }]
    const fallbackCell = matching[0]?.cell
    const brandId = asString(event.marca_id || fallbackCell?.marca_id)
    const cabineId = asString(event.cabine_id, 'sem-cabine')
    projectedSlots.forEach(({ range: slotRange }) => addSlot(marcas, brandId, `event:${cabineId}:${rangeKey(slotRange)}`))

    const turns = asArray<JsonRecord>(event.apresentadoras)
    if (turns.length > 0) {
      let hasTurnInSelectedDay = false
      for (const turn of turns) {
        const presenterId = asString(turn.apresentadora_id)
        const turnRange = eventRange(turn)
        if (!presenterId || !turnRange) { hasUnknownSchedule = true; continue }
        if (!intersects(turnRange, range) || !intersects(turnRange, dayRange)) continue
        const matchingTurnSlots = projectedSlots.filter((slot) => intersects(turnRange, slot.range))
        matchingTurnSlots.forEach(({ range: slotRange }) => addSlot(apresentadoras, presenterId, `time:${rangeKey(slotRange)}`))
        hasTurnInSelectedDay ||= matchingTurnSlots.length > 0
      }
      if (!hasTurnInSelectedDay) hasUnknownSchedule = true
    } else {
      const presenterId = asString(event.apresentadora_id || fallbackCell?.apresentadora_id)
      if (presenterId) projectedSlots.forEach(({ range: slotRange }) => addSlot(apresentadoras, presenterId, `time:${rangeKey(slotRange)}`))
      else hasUnknownSchedule = true
    }
  }

  for (const { cell, index, range } of cells) {
    if (!range) { hasUnknownSchedule = true; continue }
    if (fullyCovered(range, eventCoverageByCell.get(index) ?? [])) continue
    addSlot(marcas, asString(cell.marca_id), `grade:${cell.cabine_id}:${rangeKey(range)}`)
    // Para apresentadoras, duas cabines no mesmo horário continuam sendo um horário.
    addSlot(apresentadoras, asString(cell.apresentadora_id), `time:${rangeKey(range)}`)
  }

  return {
    marcasSemHorario: toAvailable(marcaRows, activeMarcaId, marcas, 1),
    apresentadorasComVaga: toAvailable(apresentadoraRows, activePresenterId, apresentadoras, maxPresenterSlots),
    marcasAtivas: activeCount(marcaRows, activeMarcaId),
    apresentadorasAtivas: activeCount(apresentadoraRows, activePresenterId),
    hasUnknownSchedule,
  }
}
