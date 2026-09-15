import type { BadgeTone } from '../components/ui/Badge'
import type { PresenterSubmissionStatus } from '../services/presenter-portal'
import { getSaoPauloDateInput } from './sao-paulo-date'

export function currentMonth(now: Date = new Date()): string {
  return getSaoPauloDateInput(now).slice(0, 7)
}

export function submissionStatusLabel(status: PresenterSubmissionStatus): string {
  return ({ pendente: 'Em revisão', devolvida: 'Devolvida para ajuste', aprovada: 'Aprovada', cancelada: 'Cancelada' })[status]
}

export function submissionHasOfficialLiveTombstone(submission: { status: PresenterSubmissionStatus; live_oficial_excluida_id?: string | null; live_oficial_excluida_em?: string | null }): boolean {
  return submission.status === 'aprovada' && Boolean(submission.live_oficial_excluida_id && submission.live_oficial_excluida_em)
}

export function submissionStatusTone(status: PresenterSubmissionStatus): BadgeTone {
  const tones: Record<PresenterSubmissionStatus, BadgeTone> = { pendente: 'warning', devolvida: 'danger', aprovada: 'success', cancelada: 'neutral' }
  return tones[status]
}

export function localDateTimeValue(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date)
  return `${getSaoPauloDateInput(date)}T${time}`
}

export function isoFromLocalDateTime(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return ''
  // Portal registration uses current dates in São Paulo (UTC-03 since 2019).
  const date = new Date(`${value}:00-03:00`)
  if (!Number.isFinite(date.valueOf()) || localDateTimeValue(date.toISOString()) !== value) return ''
  return date.toISOString()
}
