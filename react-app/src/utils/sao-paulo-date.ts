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

/**
 * Soma dias a uma data-calendário 'YYYY-MM-DD' sem tocar em fuso nenhum.
 *
 * A aritmética é em UTC de propósito: a string já É um dia-calendário (de São Paulo), então
 * reparseá-la com `new Date(iso)` e mexer com setDate reintroduziria o fuso do cliente — e é
 * exatamente essa reintrodução que fazia o preset "Hoje" do Analytics pedir amanhã.
 */
export function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(ano, mes - 1, dia) + dias * 86_400_000)
  const mm = String(t.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(t.getUTCDate()).padStart(2, '0')
  return `${t.getUTCFullYear()}-${mm}-${dd}`
}
