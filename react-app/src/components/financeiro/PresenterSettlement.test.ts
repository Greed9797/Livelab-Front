import { describe, expect, it } from 'vitest'
import { buildSettlementPdfInput, getMonthWeekendDates, monthLabel } from './PresenterSettlement'

describe('PresenterSettlement helpers', () => {
  it('lists only calendar Saturdays and Sundays without UTC date shifts', () => {
    expect(getMonthWeekendDates('2026-09')).toEqual([
      '2026-09-05', '2026-09-06', '2026-09-12', '2026-09-13', '2026-09-19', '2026-09-20', '2026-09-26', '2026-09-27',
    ])
    expect(getMonthWeekendDates('invalid')).toEqual([])
  })

  it('builds the financial PDF from the exact API row totals and extras', () => {
    const pdf = buildSettlementPdfInput({
      apresentadora_id: 'ap-1', nome: 'Ana', fixo: '2700', comissao: '125.5', adicionais: '300', total: '3125.5',
      extras: [
        { id: 'extra-1', tipo: 'fim_de_semana', data_referencia: '2026-09-05', descricao: 'Presença confirmada', valor: '100' },
        { id: 'extra-2', tipo: 'bonificacao', data_referencia: null, descricao: 'Meta atingida', valor: '200' },
      ],
    }, '2026-09')

    expect(pdf.titulo).toContain('Ana')
    expect(pdf.mes).toBe(monthLabel('2026-09'))
    expect(pdf.metrics.map((metric) => metric.value)).toEqual(['R$ 2.700,00', 'R$ 125,50', 'R$ 300,00', 'R$ 3.125,50'])
    expect(pdf.tables[0].body).toEqual([
      ['Fim de semana', '05/09/2026', 'Presença confirmada', 'R$ 100,00'],
      ['Bonificação', '—', 'Meta atingida', 'R$ 200,00'],
    ])
  })
})
