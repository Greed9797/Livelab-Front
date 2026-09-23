import type { JsonRecord } from '../../types/models'
import { asString } from '../../utils/format'

export function isPendingGroupSubmission(live: JsonRecord): boolean {
  return live.registro_tipo === 'submissao'
    && String(live.revisao_status ?? '') === 'pendente'
    && asString(live.submissao_id, '') !== ''
}

export function groupSubmissionTitle(live: JsonRecord): string {
  const nome = [asString(live.apresentadora_nome, ''), asString(live.marca_nome, '')].filter(Boolean).join(' · ')
  return nome || asString(live.submissao_id, 'Envio')
}

export function splitPendingGroupSubmissions(lives: JsonRecord[]) {
  const pending = lives.filter(isPendingGroupSubmission)
  const conflitos = pending.filter((live) => live.em_conciliacao === true)
  const limpos = pending.filter((live) => live.em_conciliacao !== true)
  return { pending, conflitos, limpos }
}
