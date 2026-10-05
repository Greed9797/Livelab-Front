import { describe, expect, it } from 'vitest'
import {
  detalheVazio,
  margemPct,
  normalizarAportes,
  normalizarCaixa,
  normalizarDreAnualV3,
  normalizarDreMesDetalhe,
  normalizarItem,
  normalizarLinhaV3,
  normalizarPerdas,
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

  it('normaliza caixa mensal e preserva compatibilidade quando o bloco não existe', () => {
    const d = normalizarDreAnualV3(
      {
        meses: [
          { mes: '2026-01', ...linhaAntiga, caixa: { saldo_inicio_mes: '123.45' } },
          { mes: '2026-02', ...linhaAntiga, caixa: { saldo_inicio_mes: 0 } },
          { mes: '2026-03', ...linhaAntiga },
          { mes: '2026-04', ...linhaAntiga, caixa: { saldo_inicio_mes: null } },
          { mes: '2026-05', ...linhaAntiga, caixa: { saldo_inicio_mes: 'indisponível' } },
        ],
      },
      { inicio: '2026-01', fim: '2026-12' },
    )
    expect(d.meses.map((m) => m.caixa.saldo_inicio_mes)).toEqual([123.45, 0, null, null, null])
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

  it('desconta perdas da margem sintetizada como faz a API', () => {
    const d = normalizarDreMesDetalhe({ ...raw, perdas: { receita: { valor: 1000 } } }, '2026-10')
    expect(d.margem.contribuicao).toEqual({ previsto: 7400, realizado: 7500 })
    expect(d.margem.pct).toEqual({ previsto: 74, realizado: 93.75 })
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

describe('caixa (bloco informativo do mês)', () => {
  it('normaliza o bloco caixa do detalhe', () => {
    const d = normalizarDreMesDetalhe({ mes: '2026-10', atual: linhaAntiga, caixa: { saldo_inicio_mes: '12500.5', saldo_abertura: 10000, data_corte: '2026-10-01T00:00:00Z', origem: 'caixa' } }, '2026-10')
    expect(d.caixa).toEqual({ saldo_inicio_mes: 12500.5, saldo_abertura: 10000, data_corte: '2026-10-01', origem: 'caixa' })
  })
  it('backend sem caixa: null; origem desconhecida vira padrao; corte inválido vira null', () => {
    expect(normalizarDreMesDetalhe({ mes: '2026-10', atual: linhaAntiga }, '2026-10').caixa).toBeNull()
    expect(normalizarCaixa(undefined)).toBeNull()
    expect(normalizarCaixa({ saldo_inicio_mes: 5, origem: 'x', data_corte: 'abc' })).toEqual({ saldo_inicio_mes: 5, saldo_abertura: 0, data_corte: null, origem: 'padrao' })
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

describe('perdas (SPEC perdas)', () => {
  it('normalizarPerdas aceita {receita:{valor}}, número e ausência', () => {
    expect(normalizarPerdas({ receita: { valor: '350.5' } })).toEqual({ receita: 350.5 })
    expect(normalizarPerdas({ receita: 90 })).toEqual({ receita: 90 })
    expect(normalizarPerdas(undefined)).toEqual({ receita: 0 })
  })

  it('linha: receita.previsto intacto e resultado da API preservado; sem perdas = 0', () => {
    const com = normalizarLinhaV3({ ...linhaAntiga, perdas: { receita: { valor: 1000 } } })
    expect(com.perdas.receita).toBe(1000)
    expect(com.receita.previsto).toBe(10000)
    expect(com.resultado).toEqual({ previsto: 4400, realizado: 4500 })
    expect(normalizarLinhaV3(linhaAntiga).perdas.receita).toBe(0)
  })

  it('sem resultado da API, a perda desconta só do previsto', () => {
    const { resultado: _r, ...semResultado } = linhaAntiga
    const l = normalizarLinhaV3({
      ...semResultado,
      custos_fixos: { previsto: 4000, realizado: 3000 },
      custos_variaveis: { previsto: 1600, realizado: 500 },
      perdas: { receita: { valor: 1000 } },
    })
    expect(l.resultado).toEqual({ previsto: 3400, realizado: 4500 })
  })

  it('anual: totais sem perdas somam os meses', () => {
    const dre = normalizarDreAnualV3(
      {
        meses: [
          { mes: '2026-08', ...linhaAntiga, perdas: { receita: { valor: 200 } } },
          { mes: '2026-09', ...linhaAntiga, perdas: { receita: { valor: 300 } } },
        ],
        totais: linhaAntiga,
      },
      { inicio: '2026-01', fim: '2026-12' },
    )
    expect(dre.totais.perdas.receita).toBe(500)
  })

  it('detalhe do mês: perdidos/cancelados com status e motivo, sem duplicar', () => {
    const d = normalizarDreMesDetalhe(
      {
        mes: '2026-09',
        atual: { ...linhaAntiga, perdas: { receita: { valor: 300 } } },
        receita: {
          por_cliente: [],
          avulsas: [{ id: 'a1', descricao: 'Consultoria', previsto: 300, status: 'perdido', perdido_motivo: 'Calote', perdido_em: '2026-09-20T10:00:00Z' }],
        },
        custos_fixos: {
          por_grupo: [{ grupo: 'estrutural', itens: [{ id: 'c1', descricao: 'Aluguel antigo', previsto: 500, status: 'cancelado', cancelado_motivo: 'Duplicado' }, { id: 'c2', descricao: 'Luz', previsto: 100, status: 'pendente' }] }],
        },
        perdidos: [{ id: 'a1', descricao: 'Consultoria', previsto: 300, status: 'perdido', perdido_motivo: 'Calote' }],
      },
      '2026-09',
    )
    expect(d.atual.perdas.receita).toBe(300)
    expect(d.encerrados.map((i) => [i.id, i.status, i.motivo])).toEqual([
      ['a1', 'perdido', 'Calote'],
      ['c1', 'cancelado', 'Duplicado'],
    ])
    expect(detalheVazio(d)).toBe(false)
  })

  it('backend sem perdas: detalhe sem encerrados e perdas = 0', () => {
    const d = normalizarDreMesDetalhe({ mes: '2026-09', atual: linhaAntiga }, '2026-09')
    expect(d.atual.perdas.receita).toBe(0)
    expect(d.encerrados).toEqual([])
  })
})

describe('normalizarItem — valor encerrado (perda/cancelamento)', () => {
  it('preserva valor_encerrado de um custo cancelado cujo previsto efetivo é 0', () => {
    const i = normalizarItem({
      id: 'k1', descricao: 'Internet', origem: 'recorrente', previsto: 0, valor_previsto: 150,
      valor_encerrado: 150, status: 'cancelado', cancelado_em: '2026-10-12T13:00:00.000Z', cancelado_motivo: 'Duplicado',
    })
    expect(i.status).toBe('cancelado')
    expect(i.previsto).toBe(0)
    expect(i.valor_encerrado).toBe(150)
    expect(i.motivo).toBe('Duplicado')
  })

  it('perda parcial: o valor perdido é só o saldo (1000 previsto, 400 pagos, 600 perdidos)', () => {
    const i = normalizarItem({ id: 't1', descricao: 'Fixo', previsto: 1000, realizado: 400, valor_encerrado: 600, status: 'perdido' })
    expect(i.realizado).toBe(400)
    expect(i.valor_encerrado).toBe(600)
  })

  it('sem o campo vem null (backend antigo ou item normal)', () => {
    expect(normalizarItem({ id: 'x', descricao: 'Normal', previsto: 10, realizado: 0 }).valor_encerrado).toBeNull()
  })
})

describe('normalizarDreMesDetalhe — cliente × marca', () => {
  it('cliente_id nulo (ou sem-cliente:<marca>) fica null; nome cai na marca; marca_tipo preservado', () => {
    const d = normalizarDreMesDetalhe({
      mes: '2026-09',
      receita: { por_cliente: [
        { cliente_id: null, marcas: [{ marca_id: 'm9', marca_nome: 'Rosa', marca_tipo: 'propria', fixo: { previsto: 0, realizado: 0 }, comissao: { previsto: 10, realizado: 0 } }] },
        { cliente_id: 'sem-cliente:m8', cliente_nome: 'Farol', marcas: [{ marca_id: 'm8', marca_nome: 'Farol' }] },
        { cliente_id: 'c1', cliente_nome: 'Grupo', marcas: [] },
      ] },
    }, '2026-09')
    expect(d.receita.por_cliente.map((c) => c.cliente_id)).toEqual([null, null, 'c1'])
    expect(d.receita.por_cliente[0].cliente_nome).toBe('Rosa')
    expect(d.receita.por_cliente[0].marcas[0].marca_tipo).toBe('propria')
    expect(d.receita.por_cliente[1].marcas[0].marca_tipo).toBeNull()
  })
})
