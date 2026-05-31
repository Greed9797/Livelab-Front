const SAO_PAULO_TZ = 'America/Sao_Paulo'

function datePartsInSaoPaulo(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  return Object.fromEntries(parts.map((part) => [part.type, part.value]))
}

export function getSaoPauloDateInput(value: Date = new Date()): string {
  const parts = datePartsInSaoPaulo(value)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function getSaoPauloDayAgendaParams(dateInput: string): { data_inicio: string; data_fim: string } {
  return {
    data_inicio: `${dateInput}T00:00:00-03:00`,
    data_fim: `${dateInput}T23:59:59-03:00`,
  }
}

export function isSameSaoPauloDate(value: unknown, dateInput: string): boolean {
  if (typeof value !== 'string' || !value.trim()) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return getSaoPauloDateInput(date) === dateInput
}
