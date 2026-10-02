import { describe, expect, it } from 'vitest'
import { normalizarPainel, temProjecaoRitmo } from './painel'

// Fixture no contrato de GET /financeiro/painel (valores como string/number misturados de propósito).
const completo = {
  mes: '2026-10',
  hoje: '2026-10-12',
  fim_mes: '2026-10-31',
  mes_relativo: 'corrente',
  configurado: true,
  data_corte: '2026-10-01',
  saldo_abertura: '1000.00',
  caixa: { saldo_atual: '1500.50', ate: '2026-10-12' },
  recebido_mes: { total: 800, receitas: '600', aportes: 200 },
  pago_mes: { total: '300' },
  a_receber: { no_mes: 4000, atrasado_anterior: 500, total: 4500, qtd: 7, atrasados: { qtd: 2, valor: 700 } },
  a_pagar: { no_mes: '2500', atrasado_anterior: '0', total: '2500', qtd: 5, atrasados: { qtd: 0, valor: 0 } },
  projetado_fim_mes: 3500.5,
  projecao_comissao: { competencia: '2026-10', previsto_atual: 1000, projetado: 2400, ajuste: 1400, dias_decorridos: 12, dias_mes: 31, qtd: 3, vence_em: '2026-11-05', entra_no_painel: false },
  projetado_fim_mes_ritmo: 3500.5,
  competencia: { receita: { previsto: 5000, realizado: 800 }, custos: { previsto: 3000, realizado: 300 }, resultado: { previsto: 2000, realizado: 500 } },
}

describe('normalizarPainel', () => {
  it('converte strings, mantém hierarquia e projeção separada', () => {
    const p = normalizarPainel(completo, '2026-10')
    expect(p.saldo_abertura).toBe(1000)
    expect(p.caixa).toEqual({ saldo_atual: 1500.5, ate: '2026-10-12' })
    expect(p.a_receber.total).toBe(4500)
    expect(p.a_receber.atrasados).toEqual({ qtd: 2, valor: 700 })
    expect(p.a_pagar.no_mes).toBe(2500)
    expect(p.recebido_mes).toEqual({ total: 800, receitas: 600, aportes: 200 })
    expect(p.projetado_fim_mes).toBe(3500.5)
    expect(p.projecao_comissao).toMatchObject({ competencia: '2026-10', previsto_atual: 1000, projetado: 2400, ajuste: 1400, vence_em: '2026-11-05', entra_no_painel: false })
    expect(p.projetado_fim_mes_ritmo).toBe(3500.5)
    expect(temProjecaoRitmo(p)).toBe(true)
    expect(p.competencia.resultado).toEqual({ previsto: 2000, realizado: 500 })
  })

  it('resposta vazia/inválida vira painel zerado e não configurado', () => {
    for (const bad of [null, undefined, 'x', [], {}]) {
      const p = normalizarPainel(bad, '2026-10')
      expect(p.mes).toBe('2026-10')
      expect(p.configurado).toBe(false)
      expect(p.fim_mes).toBe('2026-10-31')
      expect(p.a_receber).toEqual({ no_mes: 0, atrasado_anterior: 0, total: 0, qtd: 0, atrasados: { qtd: 0, valor: 0 } })
      expect(p.projecao_comissao).toBeNull()
      expect(p.projetado_fim_mes_ritmo).toBeNull()
      expect(temProjecaoRitmo(p)).toBe(false)
    }
  })

  it('deriva o que o backend omitiu: total do lado, projetado e configurado pelo corte', () => {
    const p = normalizarPainel(
      { mes: '2026-10', data_corte: '2026-10-01', caixa: { saldo_atual: 100 }, a_receber: { no_mes: 50, atrasado_anterior: 25 }, a_pagar: { no_mes: 30 } },
      '2026-10',
    )
    expect(p.configurado).toBe(true)
    expect(p.a_receber.total).toBe(75)
    expect(p.a_pagar.total).toBe(30)
    expect(p.projetado_fim_mes).toBe(145)
  })

  it('configurado=false explícito vence a presença de corte; ritmo sem projeção não aparece', () => {
    const p = normalizarPainel({ ...completo, configurado: false, projecao_comissao: null }, '2026-10')
    expect(p.configurado).toBe(false)
    expect(p.projetado_fim_mes_ritmo).toBe(3500.5)
    expect(temProjecaoRitmo(p)).toBe(false)
  })

  it('mes_relativo: usa o do backend e, na falta, deriva de hoje', () => {
    expect(normalizarPainel({ ...completo, mes_relativo: 'futuro' }, '2026-10').mes_relativo).toBe('futuro')
    expect(normalizarPainel({ mes: '2026-08', hoje: '2026-10-12' }, '2026-08').mes_relativo).toBe('passado')
    expect(normalizarPainel({ mes: '2026-12', hoje: '2026-10-12' }, '2026-12').mes_relativo).toBe('futuro')
    expect(normalizarPainel({ mes: '2026-10', hoje: '2026-10-12', mes_relativo: 'lixo' }, '2026-10').mes_relativo).toBe('corrente')
  })

  it('datas inválidas viram null / quantidades negativas viram 0', () => {
    const p = normalizarPainel({ ...completo, data_corte: 'ontem', caixa: { saldo_atual: 1, ate: '31/10' }, a_receber: { ...completo.a_receber, qtd: -3 } }, '2026-10')
    expect(p.data_corte).toBeNull()
    expect(p.caixa.ate).toBeNull()
    expect(p.a_receber.qtd).toBe(0)
  })
})
