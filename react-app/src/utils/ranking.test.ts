import { describe, expect, it } from 'vitest'

import { rankingCommission, rankingGmv, rankingId, rankingLives, rankingName, rankingPedidos } from './ranking'

describe('ranking utils', () => {
  it('normalizes presenter ranking fields from canonical backend payload', () => {
    const row = {
      id: 'ap-1',
      apresentadora_nome: 'Ana',
      gmv_total: '1200.50',
      total_lives: '3',
      pedidos_total: '12',
      total_recebido: '180.25',
    }

    expect(rankingId(row, 'apresentadora')).toBe('ap-1')
    expect(rankingName(row, 'apresentadora')).toBe('Ana')
    expect(rankingGmv(row)).toBe(1200.5)
    expect(rankingLives(row)).toBe(3)
    expect(rankingPedidos(row)).toBe(12)
    expect(rankingCommission(row)).toBe(180.25)
  })

  it('normalizes brand ranking fields from canonical backend payload', () => {
    const row = {
      marca_id: 'marca-1',
      marca_nome: 'Haag',
      gmv_total: 900,
      total_lives: 2,
    }

    expect(rankingId(row, 'marca')).toBe('marca-1')
    expect(rankingName(row, 'marca')).toBe('Haag')
    expect(rankingGmv(row)).toBe(900)
    expect(rankingLives(row)).toBe(2)
  })
})
