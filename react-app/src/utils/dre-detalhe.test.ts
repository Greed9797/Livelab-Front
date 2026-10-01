import { describe, expect, it } from 'vitest'
import {
  detalheVazio,
  margemPct,
  normalizarAportes,
  normalizarDreAnualV3,
  normalizarDreMesDetalhe,
  normalizarLinhaV3,
  normalizarPR,
  ordenarGrupos,
  participacao,
  tomDelta,
  valorVisao,
  variacaoPct,
} from './dre-detalhe'

const linhaAntiga = {
  receita: { previsto: 10000, realizado: 8000 },
  custos: { previsto: 3000, realizado: 2500, por_grupo: { estrutural: { previsto: 3000, realizado: 2500 } } },
  apresentadoras: { previsto: 2000, realizado: 1000 },
  imposto: { previsto: 600, realizado: 0, aliquota: 6, base: 10000 },
  resultado: { previsto: 4400, realizado: 4500 },
}

describe('normalizarPR', () => {
  it('aceita objeto, pago, string e número', () => {
    expect(normalizarPR({ previsto: '10.5', realizado: 3 })).toEqual({ previsto: 10.5, realizado: 3 })
    expect(normalizarPR({ previsto: 5, pago: 2 })).toEqual({ previsto: 5, realizado: 2 })
    expect(normalizarPR(7)).toEqual({ previsto: 7, realizado: 0 })
    expect(normalizarPR(undefined)).toEqual({ previsto: 0, realizado: 0 })
  })
})

describe('normalizarLinhaV3', () => {
  it('usa custos_fixos/custos_variaveis da API quando presentes', () => {
    const l = normalizarLinhaV3({
      ...linhaAntiga,
      custos_fixos: { previsto: 4000, realizado: 3000 },
      custos_variaveis: { previsto: '1600', realizado: 500 },
      aportes: { previsto: 5000, realizado: 5000 },
    })
    expect(l.classificacao).toBe('api')
    expect(l.custos_fixos).toEqual({ previsto: 4000, realizado: 3000 })
    expect(l.custos_variaveis).toEqual({ previsto: 1600, realizado: 500 })
    expect(l.aportes).toEqual({ previsto: 5000, realizado: 5000 })
    expect(l.resultado).toEqual({ previsto: 4400, realizado: 4500 })
  })

  it('cai nas chaves antigas: fixos = custos, variáveis = apresentadoras + imposto', () => {
    const l = normalizarLinhaV3(linhaAntiga)
    expect(l.classificacao).toBe('estimada')
    expect(l.custos_fixos).toEqual({ previsto: 3000, realizado: 2500 })
    expect(l.custos_variaveis).toEqual({ previsto: 2600, realizado: 1000 })
    expect(l.aportes).toEqual({ previsto: 0, realizado: 0 })
    expect(l.imposto.aliquota).toBe(6)
  })

  it('sem resultado da API, calcula receita − fixos − variáveis', () => {
    const { resultado: _r, ...semResultado } = linhaAntiga
    const l = normalizarLinhaV3({ ...semResultado, custos_fixos: { previsto: 4000, realizado: 3000 }, custos_variaveis: { previsto: 1600, realizado: 500 } })
    expect(l.resultado).toEqual({ previsto: 4400, realizado: 4500 })
  })

  it('lê quebra opcional da receita', () => {
    const l = normalizarLinhaV3({ ...linhaAntiga, receita: { previsto: 100, realizado: 50, fixo: { previsto: 60, realizado: 50 }, comissao: { previsto: 40, realizado: 0 } } })
    expect(l.receita_partes?.fixo).toEqual({ previsto: 60, realizado: 50 })
    expect(l.receita_partes?.avulsas).toEqual({ previsto: 0, realizado: 0 })
    expect(normalizarLinhaV3(linhaAntiga).receita_partes).toBeNull()
  })

  it('tolera lixo', () => {
    const l = normalizarLinhaV3(null)
    expect(l.receita).toEqual({ previsto: 0, realizado: 0 })
    expect(l.custos_variaveis).toEqual({ previsto: 0, realizado: 0 })
  })
})

describe('normalizarAportes', () => {
  it('soma lista de itens ou lê {previsto, realizado}', () => {
    expect(normalizarAportes([{ valor_previsto: 100, valor_pago: 100 }, { previsto: '50', realizado: 0 }])).toEqual({ previsto: 150, realizado: 100 })
    expect(normalizarAportes({ previsto: 1, realizado: 2 })).toEqual({ previsto: 1, realizado: 2 })
  })
})

describe('normalizarDreAnualV3', () => {
  it('ordena meses, descarta inválidos e soma totais quando ausentes', () => {
    const d = normalizarDreAnualV3(
      {
        meses: [
          { mes: '2026-02', ...linhaAntiga, custos_fixos: { previsto: 1, realizado: 1 }, custos_variaveis: { previsto: 2, realizado: 2 }, aportes: { previsto: 10, realizado: 0 } },
          { mes: '2026-01-01', ...linhaAntiga, custos_fixos: { previsto: 3, realizado: 3 }, custos_variaveis: { previsto: 4, realizado: 4 } },
          { mes: 'lixo' },
        ],
      },
      { inicio: '2026-01', fim: '2026-12' },
    )
    expect(d.meses.map((m) => m.mes)).toEqual(['2026-01', '2026-02'])
    expect(d.inicio).toBe('2026-01')
    expect(d.totais.custos_fixos).toEqual({ previsto: 4, realizado: 4 })
    expect(d.totais.custos_variaveis).toEqual({ previsto: 6, realizado: 6 })
    expect(d.totais.aportes).toEqual({ previsto: 10, realizado: 0 })
    expect(d.totais.classificacao).toBe('api')
  })

  it('totais antigos sem chaves novas usam a soma dos meses classificados', () => {
    const d = normalizarDreAnualV3(
      { meses: [{ mes: '2026-01', ...linhaAntiga, custos_fixos: { previsto: 3, realizado: 3 }, custos_variaveis: { previsto: 4, realizado: 4 } }], totais: linhaAntiga },
      { inicio: '2026-01', fim: '2026-12' },
    )
    expect(d.totais.receita).toEqual({ previsto: 10000, realizado: 8000 })
    expect(d.totais.custos_fixos).toEqual({ previsto: 3, realizado: 3 })
    expect(d.totais.classificacao).toBe('api')
  })
})

describe('normalizarDreMesDetalhe', () => {
  const raw = {
    mes: '2026-10',
    atual: { ...linhaAntiga, custos_fixos: { previsto: 4000, realizado: 3000 }, custos_variaveis: { previsto: 1600, realizado: 500 } },
    anterior: { ...linhaAntiga, receita: { previsto: 8000, realizado: 8000 }, custos_fixos: { previsto: 4000, realizado: 4000 }, custos_variaveis: { previsto: 1000, realizado: 1000 }, resultado: { previsto: 3000, realizado: 3000 } },
    receita: {
      por_cliente: [
        { cliente_id: 'c1', cliente_nome: 'Cliente A', marcas: [{ marca_id: 'm1', marca_nome: 'Marca 1', fixo: { previsto: 3000, realizado: 3000 }, comissao: { previsto: '700', realizado: 0 }, gmv: '7000', pct: 10 }] },
      ],
      avulsas: [{ id: 'av1', descricao: 'Serviço', valor_previsto: 300, valor_pago: 300, status: 'pago' }],
      total: { previsto: 10000, realizado: 8000 },
    },
    custos_fixos: {
      total: { previsto: 4000, realizado: 3000 },
      por_grupo: [{ grupo: 'estrutural', total: { previsto: 1000, realizado: 1000 }, itens: [{ id: 'x', descricao: 'Aluguel', origem: 'recorrente', previsto: 1000, realizado: 1000, status: 'pago', data_vencimento: '2026-10-05' }] }],
      apresentadoras_fixo: [{ apresentadora_id: 'a1', nome: 'Ana', previsto: 3000, realizado: 2000 }],
    },
    custos_variaveis: {
      por_grupo: { marketing: { previsto: 100, realizado: 0, itens: [] } },
      apresentadoras_variavel: [{ apresentadora_id: 'a1', nome: 'Ana', comissao: 800, adicionais: '100' }],
      imposto: { previsto: 600, realizado: 0, aliquota: 6, base: 10000, base_tipo: 'recebido', mes_base: '2026-09-01' },
    },
    aportes: [{ id: 'ap', descricao: 'Aporte sócio', valor_previsto: 5000, valor_pago: 5000 }],
  }

  it('normaliza seções, itens e imposto', () => {
    const d = normalizarDreMesDetalhe(raw, '2026-10')
    expect(d.mes).toBe('2026-10')
    const marca = d.receita.por_cliente[0].marcas[0]
    expect(marca.comissao).toEqual({ previsto: 700, realizado: 0 })
    expect(marca.total).toEqual({ previsto: 3700, realizado: 3000 })
    expect(marca.gmv).toBe(7000)
    expect(d.receita.por_cliente[0].total).toEqual({ previsto: 3700, realizado: 3000 })
    expect(d.receita.avulsas[0]).toMatchObject({ id: 'av1', previsto: 300, realizado: 300, status: 'pago' })
    expect(d.custos_fixos.por_grupo[0].itens[0].data_vencimento).toBe('2026-10-05')
    expect(d.custos_variaveis.por_grupo).toEqual([{ grupo: 'marketing', total: { previsto: 100, realizado: 0 }, itens: [] }])
    expect(d.custos_variaveis.apresentadoras_variavel[0]).toMatchObject({ previsto: 900, comissao: 800, adicionais: 100 })
    expect(d.custos_variaveis.total).toEqual({ previsto: 1600, realizado: 500 })
    expect(d.custos_variaveis.imposto).toMatchObject({ aliquota: 6, base: 10000, base_tipo: 'recebido', mes_base: '2026-09' })
    expect(d.aportes[0]).toMatchObject({ previsto: 5000, realizado: 5000 })
  })

  it('calcula delta e margem quando a API não manda', () => {
    const d = normalizarDreMesDetalhe(raw, '2026-10')
    expect(d.delta.receita).toEqual({ previsto: 2000, realizado: 0 })
    expect(d.delta.custos_variaveis).toEqual({ previsto: 600, realizado: -500 })
    expect(d.delta.resultado).toEqual({ previsto: 1400, realizado: 1500 })
    expect(d.margem.contribuicao).toEqual({ previsto: 8400, realizado: 7500 })
    expect(d.margem.pct).toEqual({ previsto: 84, realizado: 93.75 })
  })

  it('respeita delta/margem da API', () => {
    const d = normalizarDreMesDetalhe({ ...raw, delta: { receita: { previsto: 1, realizado: 2 } }, margem: { pct: { previsto: 50, realizado: 40 } } }, '2026-10')
    expect(d.delta.receita).toEqual({ previsto: 1, realizado: 2 })
    expect(d.margem.pct).toEqual({ previsto: 50, realizado: 40 })
  })

  it('sem atual/anterior: sintetiza a linha e deixa delta zerado', () => {
    const { atual: _a, anterior: _b, ...semLinhas } = raw
    const d = normalizarDreMesDetalhe(semLinhas, '2026-10')
    expect(d.anterior).toBeNull()
    expect(d.atual.receita).toEqual({ previsto: 10000, realizado: 8000 })
    expect(d.atual.resultado).toEqual({ previsto: 4400, realizado: 5000 })
    expect(d.delta.resultado).toEqual({ previsto: 0, realizado: 0 })
  })

  it('resposta vazia vira detalhe vazio', () => {
    const d = normalizarDreMesDetalhe({}, '2026-10')
    expect(d.mes).toBe('2026-10')
    expect(detalheVazio(d)).toBe(true)
    expect(detalheVazio(normalizarDreMesDetalhe(raw, '2026-10'))).toBe(false)
  })
})

describe('apresentação', () => {
  it('valorVisao, margem, participação e variação', () => {
    expect(valorVisao({ previsto: 1, realizado: 2 }, 'previsto')).toBe(1)
    expect(valorVisao({ previsto: 1, realizado: 2 }, 'ambos')).toBe(2)
    expect(margemPct(25, 100)).toBe(25)
    expect(margemPct(25, 0)).toBe(0)
    expect(participacao(1, 3)).toBe(33.33)
    expect(variacaoPct(150, 100)).toBe(50)
    expect(variacaoPct(-50, -100)).toBe(50)
    expect(variacaoPct(10, 0)).toBeNull()
  })

  it('tomDelta inverte a leitura para custos', () => {
    expect(tomDelta('receita', 10)).toBe('bom')
    expect(tomDelta('resultado', -10)).toBe('ruim')
    expect(tomDelta('custos_fixos', 10)).toBe('ruim')
    expect(tomDelta('custos_variaveis', -10)).toBe('bom')
    expect(tomDelta('receita', 0)).toBe('neutro')
  })

  it('ordenarGrupos por valor desc e rótulo', () => {
    const g = (grupo: string, v: number) => ({ grupo, total: { previsto: v, realizado: v }, itens: [] })
    expect(ordenarGrupos([g('outros', 1), g('marketing', 5), g('estrutural', 5)], 'realizado').map((x) => x.grupo)).toEqual(['estrutural', 'marketing', 'outros'])
  })
})
