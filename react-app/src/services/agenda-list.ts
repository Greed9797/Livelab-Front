import type { JsonRecord } from '../types/models'

/** Copy shown when GET /v1/agenda hits the server cap. */
export const AGENDA_TRUNCATED_MESSAGE = 'A lista parou em 500 eventos. Afine o período.'

export type AgendaList = {
  eventos: JsonRecord[]
  truncated: boolean
}

/**
 * GET /v1/agenda is `{ eventos, truncated }`. A bare array is the previous
 * contract (and the shape e2e still stubs) — keep those rows and report
 * truncated false. Never invent events when the body has none.
 */
export function unwrapAgendaList(payload: unknown): AgendaList {
  if (Array.isArray(payload)) {
    return { eventos: payload as JsonRecord[], truncated: false }
  }
  if (payload && typeof payload === 'object') {
    const body = payload as { eventos?: unknown; truncated?: unknown }
    if (Array.isArray(body.eventos) || body.truncated === true) {
      return {
        eventos: Array.isArray(body.eventos) ? body.eventos as JsonRecord[] : [],
        truncated: body.truncated === true,
      }
    }
  }
  return { eventos: [], truncated: false }
}
