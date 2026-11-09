import { describe, expect, it } from 'vitest'
import type { RhColaborador, RhFolhaRow } from '../types/models'
import { aniversariantesDoMes, metaAtingida, resumoFolha, totalFolha } from './rh'

function folhaRow(overrides: Partial<RhFolhaRow> = {}): RhFolhaRow {
  return {
    colaborador_id: 'col-1',
    nome: 'Ana',
    cargo: 'Analista',
    setor: 'RH',
    ativo: true,
    folha_id: 'folha-1',
    competencia: '2026-11',
    salario_fixo: 0,
    meta_valor: 0,
    meta_realizado: 0,
    comissao: 0,
    bonus: 0,
    descontos: 0,
    total: 0,
    status: 'rascunho',
    observacoes: null,
    ...overrides,
  }
}

function colaborador(overrides: Partial<RhColaborador> = {}): RhColaborador {
  return {
    id: 'col-1',
    nome: 'Ana',
    cargo: 'Analista',
    setor: 'RH',
    email: null,
    telefone: null,
    cpf: null,
    data_nascimento: null,
    data_admissao: null,
    data_desligamento: null,
    salario_fixo: 0,
    ativo: true,
    observacoes: null,
    ...overrides,
  }
}

describe('totalFolha', () => {
  it('soma salário, comissão e bônus e subtrai descontos, aceitando strings', () => {
    expect(totalFolha({ salario_fixo: '1000.00', comissao: '100.50', bonus: 50, descontos: '25.00' })).toBe(1125.5)
  })
})

describe('resumoFolha', () => {
  it('agrega cada coluna e o total das linhas', () => {
    const resumo = resumoFolha([
      folhaRow({ salario_fixo: 1000, meta_valor: 5000, meta_realizado: 6000, comissao: 100, bonus: 50, descontos: 25 }),
      folhaRow({ colaborador_id: 'col-2', salario_fixo: '2000', meta_valor: '3000', meta_realizado: '1000', comissao: '200', bonus: 0, descontos: '75' }),
    ])

    expect(resumo).toEqual({
      salario_fixo: 3000,
      meta_valor: 8000,
      meta_realizado: 7000,
      comissao: 300,
      bonus: 50,
      descontos: 100,
      total: 3250,
    })
  })
})

describe('metaAtingida', () => {
  it('só considera atingida quando há meta positiva e realizado maior ou igual', () => {
    expect(metaAtingida({ meta_valor: 1000, meta_realizado: 1000 })).toBe(true)
    expect(metaAtingida({ meta_valor: '1000', meta_realizado: '1200' })).toBe(true)
    expect(metaAtingida({ meta_valor: 1000, meta_realizado: 999 })).toBe(false)
    expect(metaAtingida({ meta_valor: 0, meta_realizado: 500 })).toBe(false)
  })
})

describe('aniversariantesDoMes', () => {
  it('filtra pelo mês, ignora inativos e ordena pelo dia', () => {
    const lista = aniversariantesDoMes(
      [
        colaborador({ id: 'a', nome: 'Dia 20', data_nascimento: '1990-11-20' }),
        colaborador({ id: 'b', nome: 'Dia 05', data_nascimento: '1985-11-05' }),
        colaborador({ id: 'c', nome: 'Outro mês', data_nascimento: '1990-12-01' }),
        colaborador({ id: 'd', nome: 'Inativo', data_nascimento: '1990-11-10', ativo: false }),
        colaborador({ id: 'e', nome: 'Sem data', data_nascimento: null }),
      ],
      '2026-11',
    )

    expect(lista.map((item) => item.nome)).toEqual(['Dia 05', 'Dia 20'])
  })
})
