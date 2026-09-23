import type { JsonRecord } from '../../types/models'
import { asString } from '../../utils/format'

export function isPendingGroupSubmission(live: JsonRecord): boolean {
  return live.registro_tipo === 'submissao'
    && String(live.revisao_status ?? '') === 'pendente'
    && asString(live.submissao_id, '') !== ''
}

export function splitPendingGroupSubmissions(lives: JsonRecord[]) {
  const pending = lives.filter(isPendingGroupSubmission)
  // O lote manda todos os pendentes. "Em conciliação", mesma marca no dia e
  // cabine vazia não são conflito: o servidor só pula sobreposição real da
  // apresentadora e devolve esses envios em skipped_conflito.
  return { pending, conflitos: [] as JsonRecord[], limpos: pending }
}
