import { describe, expect, it } from 'vitest'
import { analyticsDailyChartRows, historyPoints, latestPeriodWithData, normalizeCliente, normalizeHome, topDailyPoints } from './page-helpers'

describe('historyPoints', () => {
  it('maps fluxo-caixa rows with entradas and saidas', () => {
    expect(historyPoints([{ dia: '2026-05-19', entradas: 1142, saidas: 100 }])).toEqual([
      { label: '2026-05-19', value: 1142, secondary: 100 },
    ])
  })
})

describe('topDailyPoints', () => {
  it('orders daily rows by best value and formats month days', () => {
    expect(topDailyPoints([
      { dia: '2026-05-01', gmv_total: 100, pedidos: 2 },
      { dia: '2026-05-02', gmv_total: 450, pedidos: 8 },
      { dia: '2026-05-03', gmv_total: 0, pedidos: 0 },
      { dia: '2026-05-04', gmv_total: 220, pedidos: 4 },
    ], ['gmv_total'], ['dia'], 2)).toEqual([
      { label: '02/05', value: 450, secondary: 0 },
      { label: '04/05', value: 220, secondary: 0 },
    ])
  })
})

describe('analyticsDailyChartRows', () => {
  it('uses dashboard daily rows when endpoint rows are empty or stale', () => {
    const rows = analyticsDailyChartRows({
      gmv_diario: [{ dia: '2026-05-22', gmv_total: 5000 }],
      pedidos_diario: [{ dia: '2026-05-22', pedidos: 50 }],
    }, [])

    expect(topDailyPoints(rows.gmvRows, ['gmv_total'])).toEqual([
      { label: '22/05', value: 5000, secondary: 0 },
    ])
    expect(topDailyPoints(rows.pedidosRows, ['pedidos'])).toEqual([
      { label: '22/05', value: 50, secondary: 0 },
    ])
    expect(rows.hasDashboardRows).toBe(true)
  })

  it('prefers endpoint rows when the endpoint has values', () => {
    const rows = analyticsDailyChartRows({
      gmv_diario: [{ dia: '2026-05-22', gmv_total: 5000 }],
      pedidos_diario: [{ dia: '2026-05-22', pedidos: 50 }],
    }, [{ dia: '2026-05-23', gmv_total: 7000, pedidos: 70 }])

    expect(topDailyPoints(rows.gmvRows, ['gmv_total'])).toEqual([
      { label: '23/05', value: 7000, secondary: 0 },
    ])
    expect(topDailyPoints(rows.pedidosRows, ['pedidos'])).toEqual([
      { label: '23/05', value: 70, secondary: 0 },
    ])
  })
})

describe('latestPeriodWithData', () => {
  it('finds the latest non-zero month from monthly GMV history', () => {
    expect(latestPeriodWithData({
      gmv_mensal: [
        { mes: '2026-04', gmv: 0 },
        { mes: '2026-05', gmv: 25049 },
        { mes: '2026-06', gmv: 0 },
      ],
    })).toEqual({ ano: 2026, mes: 5 })
  })
})

describe('normalizeHome', () => {
  it('prioritizes operational home fields over commercial pipeline metrics', () => {
    const data = normalizeHome({
      gmv_lives_mes: 1200.5,
      gmv_total_mes: 1600.5,
      gmv_videos_mes: 400,
      lives_mes: 2,
      horas_live: 4,
      videos_mes: 4,
      gmv_ao_vivo_agora: 350.25,
      lives_hoje: 3,
      lives_ativas_agora: 1,
      ticket_medio_live_mes: 600.25,
      variacao_gmv_mes_anterior_pct: 20.1,
      ocupacao_cabines_hoje: { ao_vivo: 1, operacionais: 7 },
      cabines: [{ numero: 1, status: 'ao_vivo', gmv_atual: 350.25 }],
      agenda_hoje: [{ id: 'agenda-1' }],
      ranking_marcas_mes: [{ nome: 'Marca A', gmv: 800, lives: 1 }],
      ranking_apresentadoras_mes: [{ nome: 'Ana', gmv: 700, lives: 1, fixo: 2700, comissao_variavel: 14, total_recebido: 2714 }],
      alertas_operacionais: [{ tipo: 'cabines_manutencao', label: 'Cabines em manutenção', valor: 1 }],
      valor_pipeline: 999999,
      taxa_conversao: 80,
      clientes_ativos: 50,
    })

    expect(data.hero).toMatchObject({
      gmvMes: 1600.5,
      livesMes: 2,
      ticketMedio: 600.25,
      gmvPorLive: 600.25,
      gmvPorHora: 300.125,
      variacaoMesAnterior: 20.1,
    })
    expect(data.metrics.map((metric) => metric.label)).toEqual([
      'Agenda de hoje',
      'Lives realizadas',
      'GMV / live',
      'GMV / hora',
      'Vídeos gravados',
      'Cabines em live',
    ])
    expect(data.metrics.some((metric) => metric.label === 'GMV do mês')).toBe(false)
    expect(data.liveNow).toHaveLength(1)
    expect(data.agendaHoje).toHaveLength(1)
    expect(data.rankingMarcasMes[0].nome).toBe('Marca A')
    expect(data.rankingApresentadoras[0].nome).toBe('Ana')
    expect(data).not.toHaveProperty('alerts')
  })
})

describe('normalizeCliente', () => {
  it('uses backend cliente dashboard fields for charts and top hours', () => {
    const data = normalizeCliente({
      series_mensais: [{ ano: 2026, mes: 5, gmv_total: 2500 }],
      melhores_horarios_venda: [{ label: '20h', gmv_total: 900 }],
    })

    expect(data.history).toEqual([{ label: '5', value: 2500, secondary: 0 }])
    expect(data.topHorarios).toEqual([{ label: '20h', gmv_total: 900 }])
  })
})
