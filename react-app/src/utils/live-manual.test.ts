import { describe, expect, it } from 'vitest'
import { buildManualLivePayload } from './live-manual'

const baseForm = {
  cabine_id: 'cabine-1',
  cliente_id: 'cliente-1',
  marca_id: '',
  apresentador_id: '',
  agenda_evento_id: '',
  data: '2026-05-19',
  hora_inicio: '15:00',
  hora_fim: '21:00',
  fat_gerado: '1142',
  qtd_pedidos: '3',
  manual_views: '',
  manual_likes: '',
  manual_comments: '',
  manual_shares: '',
  manual_diamonds: '',
  resumo: '',
  status_publicacao: 'rascunho',
  tipo: 'cliente',
}

describe('buildManualLivePayload', () => {
  it('keeps plain reais as decimal money and preserves entered times', () => {
    expect(buildManualLivePayload(baseForm)).toMatchObject({
      fat_gerado: 1142,
      manual_gmv: 1142,
      data: '2026-05-19',
      hora_inicio: '15:00',
      hora_fim: '21:00',
    })
  })

  it('accepts BR thousand separators in operational counters', () => {
    expect(buildManualLivePayload({
      ...baseForm,
      qtd_pedidos: '1.234',
      manual_views: '3.466',
      manual_likes: '10.500',
      manual_comments: '1.250',
      manual_shares: '88',
      manual_diamonds: '2.000',
    })).toMatchObject({
      qtd_pedidos: 1234,
      manual_orders: 1234,
      manual_views: 3466,
      manual_likes: 10500,
      manual_comments: 1250,
      manual_shares: 88,
      manual_diamonds: 2000,
    })
  })
})
