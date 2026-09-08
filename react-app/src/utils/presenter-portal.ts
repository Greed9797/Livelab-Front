import type { BadgeTone } from '../components/ui/Badge'
import type { PresenterSubmissionStatus } from '../services/presenter-portal'

export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
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
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function isoFromLocalDateTime(value: string): string {
  return value ? new Date(value).toISOString() : ''
}
