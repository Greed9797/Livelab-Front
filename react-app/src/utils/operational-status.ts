import type { JsonRecord } from '../types/models'
import { asString } from './format'

/** Regras únicas para escolhas operacionais novas. Registros históricos não são apagados. */
export function isOperationalClient(row: JsonRecord): boolean {
  const status = asString(row.status, '').toLowerCase()
  return status === 'ativo' || status === 'inadimplente'
}

export function isOperationalBrand(row: JsonRecord): boolean {
  return asString(row.status, '').toLowerCase() === 'ativa'
}

export function isOperationalPresenter(row: JsonRecord): boolean {
  return row.ativo !== false && row.arquivada !== true
}
