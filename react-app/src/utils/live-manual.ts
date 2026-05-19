import type { JsonRecord } from '../types/models'
import { asNumber } from './format'
import { parseBRMoneyToDecimal } from './money'

export type ManualLiveForm = {
  cabine_id: string
  cliente_id: string
  marca_id: string
  apresentador_id: string
  data: string
  hora_inicio: string
  hora_fim: string
  fat_gerado: string
  qtd_pedidos: string
  manual_views: string
  manual_likes: string
  resumo: string
  status_publicacao: string
  tipo: string
}

export function buildManualLivePayload(form: ManualLiveForm): JsonRecord {
  const gmv = parseBRMoneyToDecimal(form.fat_gerado)
  return {
    cabine_id: form.cabine_id,
    cliente_id: form.cliente_id || undefined,
    marca_id: form.marca_id || undefined,
    apresentador_id: form.apresentador_id || undefined,
    data: form.data,
    hora_inicio: form.hora_inicio,
    hora_fim: form.hora_fim,
    fat_gerado: gmv,
    qtd_pedidos: asNumber(form.qtd_pedidos),
    manual_orders: asNumber(form.qtd_pedidos),
    manual_views: form.manual_views ? asNumber(form.manual_views) : undefined,
    manual_likes: form.manual_likes ? asNumber(form.manual_likes) : undefined,
    manual_gmv: gmv,
    resumo: form.resumo || undefined,
    status_publicacao: form.status_publicacao,
    tipo: form.tipo,
  }
}
