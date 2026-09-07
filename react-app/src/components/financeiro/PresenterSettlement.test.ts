import { describe, expect, it } from 'vitest'
import { buildSettlementPdfInput, getMonthWeekendDates, monthLabel } from './PresenterSettlement'
import type { PresenterSettlementDetails } from '../../services/remuneration'

describe('PresenterSettlement helpers', () => {
  it('lists only calendar Saturdays and Sundays without UTC date shifts', () => {
    expect(getMonthWeekendDates('2026-09')).toEqual([
      '2026-09-05', '2026-09-06', '2026-09-12', '2026-09-13', '2026-09-19', '2026-09-20', '2026-09-26', '2026-09-27',
    ])
    expect(getMonthWeekendDates('invalid')).toEqual([])
  })

  it('builds one monthly performance and payment PDF from the exact totals, history, memory and extras', () => {
    const details: PresenterSettlementDetails = {
      mes: '2026-09', apresentadora_id: 'ap-1', total_variavel: 125.5, memoria_completa: true,
      performance: { total_lives: 1, horas_live: 1.5, gmv_lives: 1500, gmv_por_hora: 1000 },
      lives: [{ live_id: 'live-1', data: '2026-09-05', marca_nome: 'Marca A', cabine_nome: 'Cabine 2', duracao_horas: 1.5, gmv: 1500, gmv_atribuido: 750, pedidos: 0, comissao: 0 }],
      memoria: [{ id: 'sale-1', data: '2026-09-05', origem: 'live', marca_nome: 'Marca A', gmv: 1500, comissao_apresentadora: 125.5, pct_aplicado: 8.37, base_gmv_mes: 1500, faixa: null, fim_de_semana: false }],
    }
    const pdf = buildSettlementPdfInput({
      apresentadora_id: 'ap-1', nome: 'Ana', fixo: '2700', comissao: '125.5', adicionais: '300', total: '3125.5',
      extras: [
        { id: 'extra-1', tipo: 'fim_de_semana', data_referencia: '2026-09-05', descricao: 'Presença confirmada', valor: '100' },
        { id: 'extra-2', tipo: 'bonificacao', data_referencia: null, descricao: 'Meta atingida', valor: '200' },
      ],
    }, '2026-09', details)

    expect(pdf.titulo).toContain('Ana')
    expect(pdf.mes).toBe(monthLabel('2026-09'))
    expect(pdf.metrics.map((metric) => metric.value)).toEqual(['R$ 1.500,00', 'R$ 1.000,00/h', '1 · 1h30', 'R$ 2.700,00', 'R$ 125,50', 'R$ 300,00', 'R$ 3.125,50'])
    expect(pdf.tables[0].head).toEqual(['Data', 'Marca', 'Cabine', 'Duração', 'GMV', 'Pedidos', 'Comissão'])
    expect(pdf.tables[0].body).toEqual([['05/09/2026', 'Marca A', 'Cabine 2', '1h30', 'R$ 1.500,00', '0', 'R$ 0,00']])
    expect(pdf.tables[1].title).toContain('Memória de cálculo')
    expect(pdf.tables[2].body).toEqual([
      ['Fim de semana', '05/09/2026', 'Presença confirmada', 'R$ 100,00'],
      ['Bonificação', '—', 'Meta atingida', 'R$ 200,00'],
    ])
  })
})
