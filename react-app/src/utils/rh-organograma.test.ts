import { describe, expect, it } from 'vitest'
import type { RhColaborador } from '../types/models'
import {
  buildHierarchyEdges,
  layoutHierarquia,
  layoutPorSetor,
  wouldCreateCycle,
} from './rh-organograma'

function colaborador(overrides: Partial<RhColaborador> & { id: string; nome?: string }): RhColaborador {
  const { id, nome, ...resto } = overrides
  return {
    id,
    nome: nome ?? id,
    cargo: 'Analista',
    setor: 'RH',
    email: null,
    telefone: null,
    cpf: null,
    data_nascimento: null,
    data_admissao: null,
    data_desligamento: null,
    salario_fixo: 0,
    comissao_pct: 0,
    status: 'ativo',
    tipo_contrato: 'clt',
    centro_custo: null,
    responsavel_id: null,
    ote_comissao: null,
    chave_pix: null,
    ativo: true,
    observacoes: null,
    ...resto,
  }
}

describe('wouldCreateCycle', () => {
  it('detecta ciclo direto', () => {
    const lista = [
      colaborador({ id: 'a', responsavel_id: 'b' }),
      colaborador({ id: 'b', responsavel_id: 'a' }),
    ]
    expect(wouldCreateCycle('a', 'b', lista)).toBe(true)
  })

  it('detecta ciclo indireto', () => {
    const lista = [
      colaborador({ id: 'a', responsavel_id: null }),
      colaborador({ id: 'b', responsavel_id: 'a' }),
      colaborador({ id: 'c', responsavel_id: 'b' }),
    ]
    expect(wouldCreateCycle('a', 'c', lista)).toBe(true)
  })

  it('detecta auto-vínculo', () => {
    expect(wouldCreateCycle('a', 'a', [colaborador({ id: 'a' })])).toBe(true)
  })

  it('libera cadeia sem ciclo', () => {
    const lista = [
      colaborador({ id: 'a', responsavel_id: 'b' }),
      colaborador({ id: 'b', responsavel_id: null }),
    ]
    expect(wouldCreateCycle('a', 'b', lista)).toBe(false)
  })
})

describe('buildHierarchyEdges', () => {
  it('ignora pai ausente, auto-vínculo e ciclos, mantendo arestas válidas', () => {
    const lista = [
      colaborador({ id: 'r' }),
      colaborador({ id: 'c', responsavel_id: 'r' }),
      colaborador({ id: 'ghost', responsavel_id: 'nao-existe' }),
      colaborador({ id: 'self', responsavel_id: 'self' }),
      colaborador({ id: 'x', responsavel_id: 'y' }),
      colaborador({ id: 'y', responsavel_id: 'x' }),
    ]

    expect(buildHierarchyEdges(lista)).toEqual([{ source: 'r', target: 'c' }])
  })
})

describe('layoutHierarquia', () => {
  it('deixa pai acima do filho e inclui todos os ids', () => {
    const lista = [
      colaborador({ id: 'raiz' }),
      colaborador({ id: 'filho', responsavel_id: 'raiz' }),
      colaborador({ id: 'neto', responsavel_id: 'filho' }),
    ]
    const posicoes = layoutHierarquia(lista)

    expect(Object.keys(posicoes).sort()).toEqual(['filho', 'neto', 'raiz'])
    expect(posicoes.raiz.y).toBeLessThan(posicoes.filho.y)
    expect(posicoes.filho.y).toBeLessThan(posicoes.neto.y)
  })
})

describe('layoutPorSetor', () => {
  it('usa o mesmo x para o mesmo setor e x diferente para setores distintos', () => {
    const lista = [
      colaborador({ id: 'a', setor: 'RH' }),
      colaborador({ id: 'b', setor: 'RH' }),
      colaborador({ id: 'c', setor: 'Vendas' }),
    ]
    const posicoes = layoutPorSetor(lista)

    expect(posicoes.a.x).toBe(posicoes.b.x)
    expect(posicoes.a.x).not.toBe(posicoes.c.x)
    expect(posicoes.a.y).not.toBe(posicoes.b.y)
  })
})
