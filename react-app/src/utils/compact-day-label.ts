const SAO_PAULO = 'America/Sao_Paulo'

/** Cabeçalho de grupo no celular e no tablet: "Hoje · qui, 24/09". */
export function compactOperationalDayLabel(dateKey: string, todayKey: string): string {
  if (!dateKey || dateKey === '1970-01-01') return 'Sem data'
  const date = new Date(`${dateKey}T12:00:00-03:00`)
  if (Number.isNaN(date.getTime())) return dateKey
  const weekday = new Intl.DateTimeFormat('pt-BR', { timeZone: SAO_PAULO, weekday: 'short' })
    .format(date)
    .replace('.', '')
    .toLowerCase()
  const dayMonth = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO,
    day: '2-digit',
    month: '2-digit',
  }).format(date)
  const core = `${weekday}, ${dayMonth}`
  return dateKey === todayKey ? `Hoje · ${core}` : core
}

/** Duração de metadado: horas e minutos colados ("11h08"). */
export function compactDuration(totalMins: number): string {
  const mins = Math.max(0, Math.round(totalMins))
  const hours = Math.floor(mins / 60)
  const minutes = mins % 60
  return `${hours}h${String(minutes).padStart(2, '0')}`
}
