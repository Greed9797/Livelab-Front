import { describe, expect, it } from 'vitest'
import {
  alvoLabel,
  alvoRotulo,
  componenteDe,
  melhorSugestao,
  motivoLabel,
  periodoDoMes,
  scoreTone,
  separarConciliadas,
  shiftMes,
  somaValores,
  tipoAlvoPadrao,
  valorComSinal,
} from './asaas-conciliacao'
import type { AsaasSugestao, AsaasTransacao } from '../types/asaas'

const sug = (id: string, score: number): AsaasSugestao => ({ tipo: 'receita', id, descricao: null, data_referencia: null, valor_casado: 10, score, motivos: [] })
const tx = (over: Partial<AsaasTransacao>): AsaasTransacao => ({
  asaas_id: 'a', tipo: 'entrada', tipo_asaas: null, valor: 10, valor_bruto: null, data: '2026-09-01', descricao: null, customer_id: null, payment_id: null, ...over,
})

describe('asaas-conciliacao', () => {
  it('calcula o período do mês, inclusive fevereiro bissexto', () => {
    expect(periodoDoMes('2026-09')).toEqual({ inicio: '2026-09-01', fim: '2026-09-30' })
    expect(periodoDoMes('2024-02')).toEqual({ inicio: '2024-02-01', fim: '2024-02-29' })
    expect(periodoDoMes('2026-13')).toBeNull()
  })

  it('navega entre meses', () => {
    expect(shiftMes('2026-01', -1)).toBe('2025-12')
    expect(shiftMes('2026-12', 1)).toBe('2027-01')
  })

  it('mapeia direção para tipo de alvo e rótulos', () => {
    expect(tipoAlvoPadrao('entrada')).toBe('receita')
    expect(tipoAlvoPadrao('saida')).toBe('custo')
    expect(alvoLabel('apresentadora')).toBe('Apresentadora')
    expect(alvoLabel(null)).toBe('—')
    expect(motivoLabel('valor_exato')).toBe('valor exato')
    expect(motivoLabel('algo_novo')).toBe('algo novo')
  })

  it('rotula alvos avulsa e apresentadora com componente', () => {
    expect(alvoLabel('avulsa')).toBe('Receita avulsa')
    expect(alvoRotulo('apresentadora', 'fixo')).toBe('Apresentadora (fixo)')
    expect(alvoRotulo('apresentadora', null, 'apresentadora:u1:2026-09:variavel')).toBe('Apresentadora (variável)')
    expect(alvoRotulo('apresentadora', null, 'apresentadora:u1:2026-09')).toBe('Apresentadora')
    expect(alvoRotulo('custo', 'fixo')).toBe('Custo')
    expect(componenteDe('receita', 'fixo')).toBeNull()
  })

  it('classifica score', () => {
    expect(scoreTone(90)).toBe('success')
    expect(scoreTone(60)).toBe('warning')
    expect(scoreTone(10)).toBe('neutral')
  })

  it('escolhe melhor sugestão só quando não ambígua', () => {
    expect(melhorSugestao({ sugestoes: [sug('a', 50), sug('b', 90)], ambiguo: false })?.id).toBe('b')
    expect(melhorSugestao({ sugestoes: [sug('a', 90), sug('b', 90)], ambiguo: true })).toBeNull()
    expect(melhorSugestao({ sugestoes: [], ambiguo: false })).toBeNull()
  })

  it('soma em centavos sem erro de float e separa conciliadas', () => {
    expect(somaValores([{ valor: 0.1 }, { valor: 0.2 }, { valor: -0.3 }])).toBe(0.6)
    const r = separarConciliadas([tx({ asaas_id: '1', conciliado_com_id: 'x' }), tx({ asaas_id: '2' })])
    expect(r.conciliadas).toHaveLength(1)
    expect(r.abertas[0].asaas_id).toBe('2')
    expect(valorComSinal(tx({ tipo: 'saida', valor: 5 }))).toBe(-5)
    expect(valorComSinal(tx({ tipo: 'entrada', valor: -5 }))).toBe(5)
  })
})
