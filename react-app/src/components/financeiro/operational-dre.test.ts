import { describe, expect, it } from 'vitest'
import { buildOperationalDre, moneyEquals } from './operational-dre'
import type { JsonRecord } from '../../types/models'

function fixture(overrides: JsonRecord = {}): JsonRecord {
  return {
    entradas: [
      {
        categoria: 'comissao_franquia',
        descricao: 'Comissão de franquia — Marca A',
        valor: 250,
        memoria: { marca_id: 'm1', marca_nome: 'Marca A', gmv: 10000, lives: 4, pct_medio: 2.5 },
      },
      {
        categoria: 'fixo_marca',
        descricao: 'Fixo mensal — Marca A',
        valor: 300,
        memoria: { marca_id: 'm1', marca_nome: 'Marca A', criterio: 'mes_com_atividade', meses_ativos: 1 },
      },
      {
        categoria: 'comissao_franquia',
        descricao: 'Comissão de franquia — Marca B',
        valor: 900,
        memoria: { marca_id: 'm2', marca_nome: 'Marca B', gmv: 9000, lives: 3, pct_medio: 10 },
      },
    ],
    saidas: [
      {
        categoria: 'fixo_apresentadora',
        descricao: 'Fixo mensal — Ana',
        valor: 2700,
        memoria: { apresentadora_id: 'a1', nome: 'Ana', criterio: 'fixo_mensal' },
      },
      {
        categoria: 'comissao_apresentadora',
        descricao: 'Comissão — Ana',
        valor: 100,
        memoria: { apresentadora_id: 'a1', nome: 'Ana', gmv_atribuido: 10000, pct_medio: 1 },
      },
      {
        categoria: 'adicional_apresentadora',
        descricao: 'Bonificação — Ana: Meta',
        valor: 25.5,
        memoria: { adicional_id: 'x1', apresentadora_id: 'a1', nome: 'Ana', tipo: 'bonificacao' },
      },
      {
        categoria: 'custo_manual',
        descricao: 'Aluguel galpão',
        valor: 1000,
        memoria: { custo_id: 'c1', tipo: 'aluguel' },
      },
      {
        categoria: 'custo_manual',
        descricao: 'Material descartável',
        valor: 50,
        memoria: { custo_id: 'c2', tipo: 'outros' },
      },
    ],
    totais: { entradas: 1450, despesas_fixas: 3700, despesas_variaveis: 175.5, resultado: -2425.5 },
    ...overrides,
  }
}

describe('buildOperationalDre', () => {
  it('groups brands, presenters and manual costs and reconciles the full result', () => {
    const dre = buildOperationalDre(fixture())

    expect(dre?.receita).toMatchObject({ total: 1450 })
    expect(dre?.receita.marcas).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'm1', nome: 'Marca A', fixoCalculado: 300, comissaoCalculada: 250, receitaReconhecida: 550 }),
      expect.objectContaining({ id: 'm2', nome: 'Marca B', fixoCalculado: 0, comissaoCalculada: 900, receitaReconhecida: 900 }),
    ]))
    expect(dre?.apresentadoras).toEqual({
      total: 2825.5,
      fixo: 2700,
      comissao: 100,
      adicionais: 25.5,
      pessoas: [{ id: 'a1', nome: 'Ana', fixo: 2700, comissao: 100, adicionais: 25.5, total: 2825.5 }],
    })
    expect(dre?.custos).toEqual({
      total: 1050,
      grupos: [
        { tipo: 'aluguel', total: 1000, itens: [{ id: 'c1', descricao: 'Aluguel galpão', valor: 1000 }] },
        { tipo: 'outros', total: 50, itens: [{ id: 'c2', descricao: 'Material descartável', valor: 50 }] },
      ],
    })
    expect(dre).toMatchObject({ totalDespesas: 3875.5, resultado: -2425.5, margemPct: -167.28 })
  })

  it('keeps both compared values and the winning criterion for fixed-or-commission brands', () => {
    const dre = buildOperationalDre({
      ...fixture(),
      entradas: [
        {
          categoria: 'fixo_marca',
          descricao: 'Fixo mensal — Marca Fixo',
          valor: 300,
          memoria: { marca_id: 'mf', marca_nome: 'Marca Fixo', criterio: 'fixo_ou_comissao_venceu_fixo', comissao_comparada: 250, meses_ativos: 1 },
        },
        {
          categoria: 'comissao_franquia',
          descricao: 'Comissão de franquia — Marca Comissão',
          valor: 900,
          memoria: { marca_id: 'mc', marca_nome: 'Marca Comissão', criterio: 'fixo_ou_comissao_venceu_comissao', fixo_comparado: 500, gmv: 9000, lives: 3 },
        },
      ],
      saidas: [],
      totais: { entradas: 1200, despesas_fixas: 0, despesas_variaveis: 0, resultado: 1200 },
    })

    expect(dre?.receita.marcas).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'mf', tipoCobranca: 'fixo_ou_comissao', fixoCalculado: 300, comissaoCalculada: 250, receitaReconhecida: 300, criterio: 'fixo_ou_comissao_venceu_fixo' }),
      expect.objectContaining({ id: 'mc', tipoCobranca: 'fixo_ou_comissao', fixoCalculado: 500, comissaoCalculada: 900, receitaReconhecida: 900, criterio: 'fixo_ou_comissao_venceu_comissao' }),
    ]))
  })

  it('returns null margin when revenue is zero without inventing a percentage', () => {
    const dre = buildOperationalDre({ entradas: [], saidas: [], totais: { entradas: 0, despesas_fixas: 0, despesas_variaveis: 0, resultado: 0 } })

    expect(dre).toMatchObject({ receita: { total: 0 }, totalDespesas: 0, resultado: 0, margemPct: null })
    expect(dre?.receita.marcas).toEqual([])
    expect(dre?.apresentadoras.pessoas).toEqual([])
    expect(dre?.custos.grupos).toEqual([])
  })

  it('preserves a negative result when costs exceed revenue', () => {
    const dre = buildOperationalDre({
      entradas: [{ categoria: 'fixo_marca', descricao: 'Fixo — A', valor: 550, memoria: { marca_id: 'm1', marca_nome: 'A', criterio: 'mes_com_atividade' } }],
      saidas: [{ categoria: 'custo_manual', descricao: 'Salários', valor: 3850, memoria: { custo_id: 'c1', tipo: 'salario' } }],
      totais: { entradas: 550, despesas_fixas: 3850, despesas_variaveis: 0, resultado: -3300 },
    })

    expect(dre).toMatchObject({ totalDespesas: 3850, resultado: -3300, margemPct: -600 })
  })

  it('rejects missing totals or launch arrays instead of converting absence to zero', () => {
    expect(buildOperationalDre({ entradas: [], totais: { entradas: 0, despesas_fixas: 0, despesas_variaveis: 0, resultado: 0 } })).toBeNull()
    expect(buildOperationalDre({ entradas: [], saidas: [], totais: { entradas: 0, despesas_fixas: 0, resultado: 0 } })).toBeNull()
    expect(buildOperationalDre(null as unknown as JsonRecord)).toBeNull()
  })

  it('rejects a detail total that diverges by one cent', () => {
    expect(buildOperationalDre({ ...fixture(), totais: { entradas: 1450.01, despesas_fixas: 3700, despesas_variaveis: 175.5, resultado: -2425.5 } })).toBeNull()
    expect(moneyEquals(10.001, 10)).toBe(true)
    expect(moneyEquals(10.006, 10)).toBe(false)
  })

  it('rejects an unknown outgoing category or incomplete identity', () => {
    expect(buildOperationalDre({ ...fixture(), saidas: [{ categoria: 'despesa_desconhecida', valor: 1, memoria: {} }], totais: { entradas: 0, despesas_fixas: 0, despesas_variaveis: 0, resultado: 0 } })).toBeNull()
    expect(buildOperationalDre({ ...fixture(), entradas: [{ categoria: 'fixo_marca', valor: 1, memoria: { marca_nome: 'Sem id' } }], totais: { entradas: 1, despesas_fixas: 0, despesas_variaveis: 0, resultado: 1 } })).toBeNull()
  })
})
