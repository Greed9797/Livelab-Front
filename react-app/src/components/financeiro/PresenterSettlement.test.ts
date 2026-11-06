import { describe, expect, it } from 'vitest'
import { buildSettlementPdfInput, specialDaysPdfTable, getMonthWeekendDates, hoursGoalLabel, monthLabel, settlementCsv } from './PresenterSettlement'
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
    expect(pdf.metrics.map((metric) => metric.value)).toEqual(['R$ 1.500,00', 'R$ 1.000,00/h', '1 · 1h30', 'R$ 2.700,00', 'R$ 125,50', 'R$ 0,00', 'R$ 300,00', 'R$ 3.125,50', '—'])
    expect(pdf.tables[0].head).toEqual(['Data', 'Marca', 'Cabine', 'Duração', 'GMV', 'Pedidos', 'Comissão'])
    expect(pdf.tables[0].body).toEqual([['05/09/2026', 'Marca A', 'Cabine 2', '1h30', 'R$ 1.500,00', '0', 'R$ 0,00']])
    expect(pdf.tables[1].title).toContain('Memória de cálculo')
    expect(pdf.tables[2].body).toEqual([
      ['Fim de semana', '05/09/2026', 'Presença confirmada', 'R$ 100,00'],
      ['Ajuste excepcional', '—', 'Meta atingida', 'R$ 200,00'],
    ])
  })

  it('shows the automatic weekend/holiday bonus, hours goal and replaced manual extras from November on', () => {
    const details: PresenterSettlementDetails = {
      mes: '2026-11', apresentadora_id: 'ap-1', total_variavel: 200, memoria_completa: true,
      performance: { total_lives: 0, horas_live: 0, gmv_lives: 0, gmv_por_hora: null },
      lives: [], memoria: [],
    }
    const row = {
      apresentadora_id: 'ap-1', nome: 'Ana', fixo: '2700', comissao: '200', bonus_fim_de_semana: '300', adicionais: '0', total: '3200',
      horas: { dias_uteis: 20, meta: 120, realizadas_dias_uteis: 121.5, dias_especiais: 9, bateu_meta: true },
      dias_especiais: [
        { data: '2026-11-15', tipo: 'domingo' as const, feriado: null, horas: 4.5, blocos_4h: 1, bonus: '100', gmv: 5000, comissao: 100 },
        { data: '2026-11-20', tipo: 'feriado' as const, feriado: 'Consciência Negra', horas: 8, blocos_4h: 2, bonus: '200', gmv: 5000, comissao: 100 },
      ],
      extras: [{ id: 'extra-1', tipo: 'fim_de_semana' as const, data_referencia: '2026-11-15', descricao: 'Diária', valor: '100', substituido_por_bonus: true }],
    }
    const pdf = buildSettlementPdfInput(row, '2026-11', details)
    expect(pdf.metrics.slice(5).map((m) => [m.label, m.value])).toEqual([
      ['Bônus fds/feriado', 'R$ 300,00'], ['Ajustes excepcionais', 'R$ 0,00'], ['Total a pagar', 'R$ 3.200,00'],
      ['Horas em dias úteis / meta', '121h30 de 120h00 · bateu a meta'],
    ])
    expect(pdf.tables[0].title).toBe('Sábados, domingos e feriados · bônus: R$ 100,00 a cada 4h fechadas')
    expect(pdf.tables[0].body).toEqual([
      ['15/11/2026', 'Domingo', '4h30', '1', 'R$ 100,00', 'R$ 5.000,00', 'R$ 100,00'],
      ['20/11/2026', 'Feriado · Consciência Negra', '8h00', '2', 'R$ 200,00', 'R$ 5.000,00', 'R$ 100,00'],
    ])
    expect(pdf.tables.at(-1)?.body[0][0]).toBe('Fim de semana (substituído pelo bônus automático)')
    expect(hoursGoalLabel(null)).toBe('—')

    const csv = settlementCsv([row], { fixo: '2700', comissao: '200', bonus_fim_de_semana: '300', adicionais: '0', total: '3200' })
    // Campos com vírgula decimal saem entre aspas (padrão do gerarCsv).
    const [header, ana, total] = csv.replace('\uFEFF', '').split('\n').map((line) => line.replace(/"/g, ''))
    expect(header.split(';').slice(0, 6)).toEqual(['Apresentadora', 'Fixo', 'Comissão', 'Bônus fds/feriado', 'Ajustes excepcionais', 'Total a pagar'])
    expect(ana.split(';')).toEqual(['Ana', '2.700,00', '200,00', '300,00', '0,00', '3.200,00', '120', '121,5', 'Sim', '9', '15/11/2026 Domingo 4h30 | 20/11/2026 Feriado · Consciência Negra 8h00'])
    expect(total.split(';').slice(0, 6)).toEqual(['Total', '2.700,00', '200,00', '300,00', '0,00', '3.200,00'])
  })

  it('outubro/2026: PDF mostra bônus por dia, sem coluna de blocos de 4h', () => {
    const t = specialDaysPdfTable([{ data: '2026-10-24', tipo: 'sabado', feriado: null, horas: 3.47, blocos_4h: null, bonus: 100, gmv: 10, comissao: 1 }], '2026-10')
    expect(t.title).toBe('Sábados, domingos e feriados · bônus: R$ 100,00 por dia com live')
    expect(t.head).not.toContain('Blocos de 4h')
    expect(t.body[0][3]).toBe('R$ 100,00')
  })
})
