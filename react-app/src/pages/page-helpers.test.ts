import { describe, expect, it } from 'vitest'
import { historyPoints, normalizeHome } from './page-helpers'

describe('historyPoints', () => {
  it('maps fluxo-caixa rows with entradas and saidas', () => {
    expect(historyPoints([{ dia: '2026-05-19', entradas: 1142, saidas: 100 }])).toEqual([
      { label: '2026-05-19', value: 1142, secondary: 100 },
    ])
  })
})

describe('normalizeHome', () => {
  it('prioritizes operational home fields over commercial pipeline metrics', () => {
    const data = normalizeHome({
      gmv_lives_mes: 1200.5,
      lives_mes: 2,
      gmv_ao_vivo_agora: 350.25,
      lives_hoje: 3,
      lives_ativas_agora: 1,
      ticket_medio_live_mes: 600.25,
      variacao_gmv_mes_anterior_pct: 20.1,
      ocupacao_cabines_hoje: { ao_vivo: 1, operacionais: 7 },
      cabines: [{ numero: 1, status: 'ao_vivo', gmv_atual: 350.25 }],
      agenda_hoje: [{ id: 'agenda-1' }],
      ranking_dia: [{ nome: 'Marca A', gmv: 800, lives: 1 }],
      ranking_apresentadoras_hoje: [{ nome: 'Ana', gmv: 700, lives: 1 }],
      alertas_operacionais: [{ tipo: 'cabines_manutencao', label: 'Cabines em manutenção', valor: 1 }],
      valor_pipeline: 999999,
      taxa_conversao: 80,
      clientes_ativos: 50,
    })

    expect(data.hero).toMatchObject({
      gmvMes: 1200.5,
      livesMes: 2,
      ticketMedio: 600.25,
      variacaoMesAnterior: 20.1,
    })
    expect(data.metrics.map((metric) => metric.label)).toEqual([
      'Agenda de hoje',
      'GMV ao vivo agora',
      'Cabines em live',
      'Alertas operacionais',
    ])
    expect(data.metrics.some((metric) => metric.label === 'GMV do mês')).toBe(false)
    expect(data.liveNow).toHaveLength(1)
    expect(data.agendaHoje).toHaveLength(1)
    expect(data.rankingGmvDia[0].nome).toBe('Marca A')
    expect(data.rankingApresentadoras[0].nome).toBe('Ana')
    expect(data.operationalAlerts[0].valor).toBe(1)
  })
})
