import type { JsonRecord } from '../../types/models'

// Helpers de formatação de live compartilhados entre LivesTab e LiveDetailModal.

export interface LiveFilterOption {
  id: string
  nome: string
}

export function fmtTime(value: unknown): string {
  const d = typeof value === 'string' ? new Date(value) : null
  if (!d || Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d)
}

export function calcDuration(live: JsonRecord): { text: string; mins: number } {
  const start = live.iniciado_em ? new Date(live.iniciado_em as string) : null
  const end = live.encerrado_em ? new Date(live.encerrado_em as string) : null
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { text: '—', mins: 0 }
  }
  const mins = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return { text: h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`, mins }
}
