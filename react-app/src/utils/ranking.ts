import type { JsonRecord } from '../types/models'
import { asNumber, asString } from './format'
import { getBrandImage } from './favicon'

export type RankingSubject = 'apresentadora' | 'marca' | 'unidade'

export function rankingId(row: JsonRecord, subject: RankingSubject): string {
  if (subject === 'marca') return asString(row.id ?? row.marca_id)
  if (subject === 'apresentadora') return asString(row.id ?? row.apresentadora_id)
  return asString(row.id ?? row.tenant_id ?? row.unidade_id)
}

export function rankingName(row: JsonRecord, subject: RankingSubject): string {
  if (subject === 'marca') return asString(row.nome ?? row.marca_nome, '—')
  if (subject === 'apresentadora') return asString(row.nome ?? row.apresentadora_nome ?? row.apresentador_nome, '—')
  return asString(row.nome ?? row.tenant_nome, '—')
}

export function rankingImage(row: JsonRecord, subject: RankingSubject): string {
  if (subject === 'marca' || subject === 'unidade') return getBrandImage(row)
  return asString(row.foto_url ?? row.apresentadora_foto_url, '')
}

export function rankingGmv(row: JsonRecord): number {
  return asNumber(row.gmv_total ?? row.gmv)
}

export function rankingLives(row: JsonRecord): number {
  return asNumber(row.total_lives ?? row.lives)
}

export function rankingPedidos(row: JsonRecord): number {
  return asNumber(row.pedidos_total ?? row.pedidos)
}

export function rankingCommission(row: JsonRecord): number {
  return asNumber(row.total_recebido ?? row.comissao_variavel ?? row.comissao_apresentadora)
}
