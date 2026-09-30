import { describe, expect, it } from 'vitest'
import {
  STATUS_META,
  agruparPorDia,
  derivarStatus,
  dividirParcelas,
  faixaDoLancamento,
  filtrarLancamentos,
  fluxoDeLancamentos,
  isCustoManual,
  mesLabel,
  normalizarDre,
  normalizarFluxo,
  normalizarLancamento,
  normalizarLancamentosResponse,
  origemLabel,
  podeExcluir,
  rotaBaixa,
  shiftMes,
  statusLabel,
  totalizar,
  vencimentoNoMes,
} from './financeiro'

const HOJE = '2026-09-15'

function l(over: Record<string, unknown> = {}) {
  return normalizarLancamento(
    { id: 'x', natureza: 'custo', origem: 'manual', descricao: 'Aluguel', competencia: '2026-09-01', data_vencimento: '2026-09-20', valor_previsto: 100, valor_pago: 0, ...over },
    HOJE,
  )
}

describe('meses', () => {
  it('shiftMes cruza o ano', () => {
    expect(shiftMes('2026-01', -1)).toBe('2025-12')
    expect(shiftMes('2026-12', 1)).toBe('2027-01')
    expect(shiftMes('2026-09', 0)).toBe('2026-09')
  })
  it('mesLabel longo e curto', () => {
    expect(mesLabel('2026-09')).toBe('setembro de 2026')
    expect(mesLabel('2026-03', true)).toBe('mar/26')
  })
  it('vencimentoNoMes respeita o último dia', () => {
    expect(vencimentoNoMes('2026-02', 31)).toBe('2026-02-28')
    expect(vencimentoNoMes('2028-02', 30)).toBe('2028-02-29')
    expect(vencimentoNoMes('2026-09', 5)).toBe('2026-09-05')
  })
})

describe('status', () => {
  it('deriva igual ao backend', () => {
    expect(derivarStatus({ valor_previsto: 100, valor_pago: 100, data_vencimento: '2026-09-01' }, HOJE)).toBe('pago')
    expect(derivarStatus({ valor_previsto: 100, valor_pago: 40, data_vencimento: '2026-09-20' }, HOJE)).toBe('parcial')
    expect(derivarStatus({ valor_previsto: 100, valor_pago: 40, data_vencimento: '2026-09-10' }, HOJE)).toBe('atrasado')
    expect(derivarStatus({ valor_previsto: 100, valor_pago: 0, data_vencimento: '2026-09-14' }, HOJE)).toBe('atrasado')
    expect(derivarStatus({ valor_previsto: 100, valor_pago: 0, data_vencimento: '2026-09-15' }, HOJE)).toBe('pendente')
    expect(derivarStatus({ valor_previsto: 100, valor_pago: 0, data_vencimento: '2026-10-05' }, HOJE)).toBe('previsto')
    expect(derivarStatus({ valor_previsto: 100, valor_pago: 0, data_vencimento: null }, HOJE)).toBe('pendente')
  })
  it('mapeia cores: previsto azul, pendente amarelo, atrasado vermelho, parcial laranja, pago verde', () => {
    expect(STATUS_META.previsto.color).toBe('var(--info)')
    expect(STATUS_META.pendente.color).toBe('var(--warning)')
    expect(STATUS_META.atrasado.color).toBe('var(--danger)')
    expect(STATUS_META.parcial.color).toBe('var(--primary)')
    expect(STATUS_META.pago.color).toBe('var(--success)')
  })
  it('pago de receita vira "Recebido"', () => {
    expect(statusLabel('pago', 'receita')).toBe('Recebido')
    expect(statusLabel('pago', 'custo')).toBe('Pago')
  })
})

describe('normalização', () => {
  it('aceita números em string e deriva status ausente', () => {
    const item = normalizarLancamento({ id: 'a', natureza: 'receita', valor_previsto: '1.234,50', valor_pago: '0', data_vencimento: '2026-09-01T00:00:00.000Z' }, HOJE)
    expect(item.valor_previsto).toBe(1234.5)
    expect(item.data_vencimento).toBe('2026-09-01')
    expect(item.status).toBe('atrasado')
    expect(item.origem).toBe('comercial')
    expect(item.competencia).toBe('2026-09-01')
  })
  it('infere origem por id virtual', () => {
    expect(normalizarLancamento({ id: 'apresentadora:u:2026-09', natureza: 'custo' }, HOJE).origem).toBe('apresentadora')
    expect(normalizarLancamento({ id: 'imposto:2026-09', natureza: 'custo' }, HOJE).grupo).toBe('imposto')
    expect(normalizarLancamento({ id: 'rec:u:2026-09', natureza: 'custo' }, HOJE).virtual).toBe(true)
  })
  it('usa totais do backend e cai para o cálculo local quando ausentes', () => {
    const itens = [
      { id: '1', natureza: 'receita', valor_previsto: 1000, valor_pago: 400, data_vencimento: '2026-09-05' },
      { id: '2', natureza: 'custo', valor_previsto: 300, valor_pago: 0, data_vencimento: '2026-09-25' },
    ]
    const semTotais = normalizarLancamentosResponse({ hoje: HOJE, itens }, { inicio: '2026-09', fim: '2026-09' })
    expect(semTotais.totais.receita).toEqual({ previsto: 1000, pago: 400, atrasado: 600, pendente: 0 })
    expect(semTotais.totais.custo.pendente).toBe(300)
    expect(semTotais.totais.saldo_previsto).toBe(700)
    expect(semTotais.totais.saldo_realizado).toBe(400)

    const comTotais = normalizarLancamentosResponse(
      { hoje: HOJE, itens, totais: { receita: { previsto: 1, pago: 2, atrasado: 3, pendente: 4 }, custo: { previsto: 5, pago: 6, atrasado: 7, pendente: 8 }, saldo_previsto: 9, saldo_realizado: 10 } },
      { inicio: '2026-09', fim: '2026-09' },
    )
    expect(comTotais.totais.saldo_previsto).toBe(9)
    expect(comTotais.totais.custo.pago).toBe(6)
  })
  it('aceita array puro', () => {
    expect(normalizarLancamentosResponse([{ id: '1' }], { inicio: '2026-09', fim: '2026-09' }).itens).toHaveLength(1)
  })
})

describe('filtros e agrupamento', () => {
  const itens = [
    l({ id: '1', natureza: 'receita', origem: 'comercial', componente: 'fixo', descricao: 'Fixo Marca Açaí', data_vencimento: '2026-09-05', valor_previsto: 500 }),
    l({ id: '2', descricao: 'Aluguel', grupo: 'estrutural', data_vencimento: '2026-09-05', valor_previsto: 200 }),
    l({ id: '3', descricao: 'Canva', grupo: 'ferramentas', data_vencimento: '2026-09-20', valor_previsto: 50, valor_pago: 50 }),
    l({ id: '4', descricao: 'Sem data', data_vencimento: null }),
  ]
  it('filtra por natureza, status, grupo e busca sem acento', () => {
    expect(filtrarLancamentos(itens, { natureza: 'receita' }).map((i) => i.id)).toEqual(['1'])
    expect(filtrarLancamentos(itens, { status: 'pago' }).map((i) => i.id)).toEqual(['3'])
    expect(filtrarLancamentos(itens, { grupo: 'estrutural' }).map((i) => i.id)).toEqual(['2'])
    expect(filtrarLancamentos(itens, { q: 'acai' }).map((i) => i.id)).toEqual(['1'])
  })
  it('agrupa por dia com receitas primeiro e sem vencimento no fim', () => {
    const dias = agruparPorDia(itens)
    expect(dias.map((d) => d.data)).toEqual(['2026-09-05', '2026-09-20', ''])
    expect(dias[0].itens.map((i) => i.id)).toEqual(['1', '2'])
    expect(dias[0].entradas).toBe(500)
    expect(dias[0].saidas).toBe(200)
  })
  it('totalizar separa atrasado de pendente pelo valor em aberto', () => {
    const t = totalizar([l({ valor_previsto: 100, valor_pago: 30, data_vencimento: '2026-09-01' }), l({ valor_previsto: 50 })])
    expect(t.custo.atrasado).toBe(70)
    expect(t.custo.pendente).toBe(50)
  })
})

describe('ações', () => {
  it('roteia baixa conforme o tipo', () => {
    expect(rotaBaixa(l({ id: 'calc:m1:2026-09:fixo', natureza: 'receita' }), 'pagar')).toBe('/financeiro/receitas/calc%3Am1%3A2026-09%3Afixo/receber')
    expect(rotaBaixa(l({ id: 'uuid-1', natureza: 'receita' }), 'desfazer')).toBe('/financeiro/receitas/uuid-1/desfazer')
    expect(rotaBaixa(l({ id: 'apresentadora:ap1:2026-08', origem: 'apresentadora', apresentadora_id: 'ap1' }), 'pagar')).toBe('/financeiro/apresentadoras-pagamentos/ap1/2026-08/pagar')
    expect(rotaBaixa(l({ id: 'imposto:2026-09', origem: 'imposto' }), 'desfazer')).toBe('/financeiro/impostos/2026-09/desfazer')
    expect(rotaBaixa(l({ id: 'uuid-imp', origem: 'imposto', competencia: '2026-10-01' }), 'pagar')).toBe('/financeiro/impostos/2026-10/pagar')
    expect(rotaBaixa(l({ id: 'rec:r1:2026-09', origem: 'recorrente' }), 'pagar')).toBe('/financeiro/custos/rec%3Ar1%3A2026-09/pagar')
  })
  it('só custos manuais são editáveis; recorrente virtual não é excluível', () => {
    expect(isCustoManual(l({ origem: 'manual' }))).toBe(true)
    expect(isCustoManual(l({ origem: 'apresentadora' }))).toBe(false)
    expect(isCustoManual(l({ natureza: 'receita', origem: 'comercial' }))).toBe(false)
    expect(podeExcluir(l({ id: 'rec:r1:2026-09', origem: 'recorrente' }))).toBe(false)
    expect(podeExcluir(l({ id: 'uuid', origem: 'parcela' }))).toBe(true)
  })
  it('rótulo de origem da receita usa o componente', () => {
    expect(origemLabel({ origem: 'comercial', componente: 'comissao' })).toBe('Comissão da marca')
    expect(origemLabel({ origem: 'marca_fixo', componente: null })).toBe('Fixo da marca')
  })
  it('divide parcelas em centavos', () => {
    expect(dividirParcelas(100, 3)).toEqual([33.33, 33.33, 33.34])
    expect(dividirParcelas(0, 3)).toEqual([])
  })
})

describe('fluxo de caixa', () => {
  it('faixa por dia de vencimento e cartão', () => {
    expect(faixaDoLancamento({ natureza: 'custo', grupo: null, data_vencimento: '2026-09-01' })).toBe('5')
    expect(faixaDoLancamento({ natureza: 'custo', grupo: null, data_vencimento: '2026-09-06' })).toBe('10')
    expect(faixaDoLancamento({ natureza: 'custo', grupo: null, data_vencimento: '2026-09-25' })).toBe('25')
    expect(faixaDoLancamento({ natureza: 'custo', grupo: null, data_vencimento: '2026-09-31' })).toBe('30')
    expect(faixaDoLancamento({ natureza: 'custo', grupo: 'cartao', data_vencimento: '2026-09-10' })).toBe('cartao')
    expect(faixaDoLancamento({ natureza: 'receita', grupo: 'cartao', data_vencimento: '2026-09-10' })).toBe('10')
  })
  it('monta linhas com acumulado a partir do saldo inicial', () => {
    const linhas = fluxoDeLancamentos(
      [
        l({ natureza: 'receita', data_vencimento: '2026-09-05', valor_previsto: 1000, valor_pago: 1000 }),
        l({ data_vencimento: '2026-09-10', valor_previsto: 300 }),
        l({ grupo: 'cartao', data_vencimento: '2026-09-12', valor_previsto: 200 }),
      ],
      100,
    )
    expect(linhas.map((x) => x.chave)).toEqual(['5', '10', '15', '20', '25', '30', 'cartao'])
    expect(linhas[0].acumulado).toEqual({ previsto: 1100, realizado: 1100 })
    expect(linhas[1].acumulado.previsto).toBe(800)
    expect(linhas[6].acumulado.previsto).toBe(600)
  })
  it('normaliza formatos alternativos do backend e retorna null no legado', () => {
    expect(normalizarFluxo({ entradas: [], saidas: [] }, '2026-09')).toBeNull()
    const f = normalizarFluxo(
      {
        saldo_inicial: 50,
        linhas: [
          { dia: 5, entradas_previstas: 100, entradas_realizadas: 80, saidas: { previsto: 30, realizado: 0 } },
          { faixa: 'cartao', entradas: 0, saidas: { previsto: 20, realizado: 20 } },
        ],
        serie_anual: [{ mes: 1, entradas: { previsto: 10, realizado: 5 }, saidas: { previsto: 2, realizado: 1 } }],
      },
      '2026-09',
    )!
    expect(f.linhas[0].chave).toBe('5')
    expect(f.linhas[0].entradas).toEqual({ previsto: 100, realizado: 80 })
    expect(f.linhas[0].acumulado).toEqual({ previsto: 120, realizado: 130 })
    expect(f.linhas[1].chave).toBe('cartao')
    expect(f.serie_anual[0].mes).toBe('2026-01')
    expect(f.serie_anual[0].saldo.previsto).toBe(8)
  })
})

describe('DRE', () => {
  it('normaliza meses, calcula resultado ausente e soma totais', () => {
    const dre = normalizarDre(
      {
        meses: [
          { mes: '2026-02', receita: { previsto: 100, realizado: 90 }, custos: { previsto: 30, realizado: 20, por_grupo: { estrutural: { previsto: 30, realizado: 20 } } }, apresentadoras: { previsto: 10, realizado: 10 }, imposto: { previsto: 5, realizado: 0, aliquota: 10, base: 50 } },
          { mes: '2026-01', receita: { previsto: 50, realizado: 50 }, resultado: { previsto: 50, realizado: 50 } },
        ],
      },
      { inicio: '2026-01', fim: '2026-12' },
    )
    expect(dre.meses.map((m) => m.mes)).toEqual(['2026-01', '2026-02'])
    expect(dre.meses[1].resultado).toEqual({ previsto: 55, realizado: 60 })
    expect(dre.totais.receita).toEqual({ previsto: 150, realizado: 140 })
    expect(dre.totais.custos.por_grupo.estrutural.previsto).toBe(30)
    expect(dre.totais.imposto.aliquota).toBe(10)
  })
})
