const SAO_PAULO_TZ = 'America/Sao_Paulo'

function offsetMinutesAt(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const pick = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value)
  const asUtc = Date.UTC(pick('year'), pick('month') - 1, pick('day'), pick('hour'), pick('minute'), pick('second'))
  return Math.round((asUtc - instant.getTime()) / 60_000)
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  const hours = String(Math.floor(abs / 60)).padStart(2, '0')
  const mins = String(abs % 60).padStart(2, '0')
  return `${sign}${hours}:${mins}`
}

/** Offset de America/Sao_Paulo no dia civil YYYY-MM-DD, no formato ±HH:mm. */
export function saoPauloCivilOffset(civilDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(civilDate)
  const probe = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 15, 0, 0))
    : new Date()
  return formatOffset(offsetMinutesAt(probe))
}

/**
 * Horário de slot como o formulário mostra (YYYY-MM-DD + HH:mm) mais o offset
 * de São Paulo naquele dia. Não passa por Date.toISOString, então a hora do
 * relógio não muda.
 */
export function makeAgendaDateTime(date: string, time: string): string {
  return `${date}T${time}:00${saoPauloCivilOffset(date)}`
}
