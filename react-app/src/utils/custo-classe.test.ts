import { describe, expect, it } from 'vitest'
import { normalizarLancamento } from './financeiro'
import { agruparPorApresentadora, agruparPorGrupo, classeDoLancamento, filtrarPorClasse, totaisCusto } from './custo-classe'

function l(over: Record<string, unknown> = {}) {
  return normalizarLancamento(
    { id: 'x', natureza: 'custo', origem: 'manual', descricao: 'Item', competencia: '2026-10-01', data_vencimento: '2026-10-10', valor_previsto: 100, valor_pago: 0, ...over },
    '2026-10-01',
  )
}

describe('classeDoLancamento', () => {
  it('deriva quando o backend não manda classe', () => {
    expect(classeDoLancamento(l({ origem: 'recorrente' }))).toBe('fixo')
    expect(classeDoLancamento(l({ origem: 'parcela' }))).toBe('fixo')
    expect(classeDoLancamento(l({ origem: 'manual' }))).toBe('variavel')
    expect(classeDoLancamento(l({ origem: 'imposto' }))).toBe('variavel')
    expect(classeDoLancamento(l({ id: 'apresentadora:a:2026-10:fixo', origem: 'apresentadora' }))).toBe('fixo')
    expect(classeDoLancamento(l({ id: 'apresentadora:a:2026-10:variavel', origem: 'apresentadora' }))).toBe('variavel')
  })
  it('classe do backend vence a derivação (override)', () => {
    expect(classeDoLancamento(l({ origem: 'manual', classe: 'fixo' }))).toBe('fixo')
    expect(classeDoLancamento(l({ origem: 'recorrente', classe: 'variavel' }))).toBe('variavel')
  })
  it('filtra só custos da classe', () => {
    const itens = [l({ id: '1', origem: 'recorrente' }), l({ id: '2' }), l({ id: '3', natureza: 'receita', origem: 'comercial' })]
    expect(filtrarPorClasse(itens, 'fixo').map((i) => i.id)).toEqual(['1'])
    expect(filtrarPorClasse(itens, 'variavel').map((i) => i.id)).toEqual(['2'])
  })
})

describe('totais e agrupamento', () => {
  it('soma previsto, pago e em aberto', () => {
    expect(totaisCusto([l({ valor_previsto: 100, valor_pago: 40 }), l({ valor_previsto: 50, valor_pago: 50 })])).toEqual({ previsto: 150, pago: 90, aberto: 60 })
  })
  it('agrupa por grupo, com apresentadoras e imposto em blocos próprios', () => {
    const g = agruparPorGrupo([
      l({ id: '1', grupo: 'estrutural', valor_previsto: 300 }),
      l({ id: '2', grupo: 'diversos', valor_previsto: 50 }),
      l({ id: '3', grupo: 'estrutural', valor_previsto: 200 }),
      l({ id: 'apresentadora:a:2026-10:fixo', origem: 'apresentadora', valor_previsto: 1000 }),
    ])
    expect(g.map((x) => x.grupo)).toEqual(['apresentadoras', 'estrutural', 'diversos'])
    expect(g[1].totais.previsto).toBe(500)
  })
  it('agrupa apresentadoras por pessoa', () => {
    const a = agruparPorApresentadora([
      l({ id: 'apresentadora:a1:2026-10:variavel', origem: 'apresentadora', descricao: 'Ana · comissão' }),
      l({ id: 'apresentadora:a2:2026-10:variavel', origem: 'apresentadora', descricao: 'Bia · comissão' }),
      l({ id: 'apresentadora:a1:2026-10:fixo', origem: 'apresentadora', descricao: 'Ana · fixo', apresentadora_id: 'a1' }),
    ])
    expect(a.map((x) => [x.apresentadora_id, x.itens.length])).toEqual([['a1', 2], ['a2', 1]])
  })
})
