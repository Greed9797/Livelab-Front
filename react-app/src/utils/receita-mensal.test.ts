import { describe, expect, it } from 'vitest'
import { rotaBaixa } from './financeiro'
import {
  agruparPorVencimento,
  calcularAReceberMes,
  contextoTitulo,
  filtrarClientes,
  formatPct,
  isPerdido,
  janelaInicioDia,
  labelTipoCobranca,
  motivoPerda,
  normalizarItemVencimento,
  normalizarMarca,
  normalizarReceitaMensal,
  notaCompetenciaVencimento,
  notaFixoOuComissao,
  notaJanelaComissao,
  pctRecebido,
  receitaVazia,
  totaisDaVisao,
} from './receita-mensal'

const titulo = (over: Record<string, unknown> = {}) => ({
  id: 'calc:fixo:m1:2026-09',
  componente: 'fixo',
  valor_previsto: '1000.00',
  valor_pago: 0,
  data_vencimento: '2026-10-05',
  data_pagamento: null,
  competencia: '2026-09-01',
  status: 'pendente',
  virtual: true,
  divergente: false,
  ...over,
})

const resposta = {
  mes: '2026-09',
  hoje: '2026-10-01',
  corte: { data_corte: '2026-08-01' },
  competencia: {
    total: { previsto: 3500, pago: 1000, aberto: 2500 },
    clientes: [
      {
        cliente_id: 'c1',
        cliente_nome: 'Grupo Ação',
        total: { previsto: 3000, pago: 1000 },
        marcas: [
          {
            marca_id: 'm1',
            marca_nome: 'Haag',
            tipo_cobranca: 'fixo_mais_comissao',
            pct: '10',
            gmv: '20000',
            comissao_bruta: 2000,
            em_apuracao: false,
            fixo: titulo({ valor_pago: 1000, status: 'pago', data_pagamento: '2026-10-03' }),
            comissao: titulo({ id: '7b0c', componente: 'comissao', valor_previsto: 2000, data_vencimento: '2026-10-15' }),
            total: { previsto: 3000, pago: 1000 },
          },
        ],
      },
    ],
    avulsas: [
      { id: 'av1', descricao: 'Consultoria', grupo: 'servico', valor_previsto: 500, valor_pago: 0, data_vencimento: '2026-09-20', competencia: '2026-09-01' },
      { id: 'av2', descricao: 'Aporte sócio', grupo: 'aporte', valor_previsto: 9000, valor_pago: 9000, data_vencimento: '2026-09-02', status: 'pago' },
    ],
    aportes: [],
  },
  vencimento: {
    total: { previsto: 2500, pago: 0, aberto: 2500 },
    itens: [
      { ...titulo({ id: '7b0c', componente: 'comissao', valor_previsto: 2000, data_vencimento: '2026-09-15' }), cliente_nome: 'Grupo Ação', marca_nome: 'Haag', descricao: 'Comissão · Haag' },
      { id: 'av1', descricao: 'Consultoria', grupo: 'servico', valor_previsto: 500, valor_pago: 0, data_vencimento: '2026-09-20' },
    ],
  },
  a_receber_mes: '2500',
}

describe('normalizarReceitaMensal', () => {
  it('normaliza o contrato completo, números em string e corte', () => {
    const r = normalizarReceitaMensal(resposta, '2026-09')
    expect(r.mes).toBe('2026-09')
    expect(r.hoje).toBe('2026-10-01')
    expect(r.data_corte).toBe('2026-08-01')
    expect(r.a_receber_mes).toBe(2500)
    expect(r.competencia.total).toEqual({ previsto: 3500, pago: 1000, aberto: 2500, perdido: 0 })
    const m = r.competencia.clientes[0].marcas[0]
    expect(m.pct).toBe(10)
    expect(m.gmv).toBe(20000)
    expect(m.fixo?.valor_previsto).toBe(1000)
    expect(m.fixo?.status).toBe('pago')
    expect(m.fixo?.natureza).toBe('receita')
    expect(m.fixo?.marca_nome).toBe('Haag')
    expect(m.fixo?.cliente_nome).toBe('Grupo Ação')
    expect(m.comissao?.componente).toBe('comissao')
  })

  it('move aporte misturado nas avulsas para o bloco de aportes (fora da receita)', () => {
    const r = normalizarReceitaMensal(resposta, '2026-09')
    expect(r.competencia.avulsas.map((a) => a.id)).toEqual(['av1'])
    expect(r.competencia.aportes.map((a) => a.id)).toEqual(['av2'])
    expect(r.competencia.avulsas[0].origem).toBe('avulsa')
  })

  it('aceita envelope { data } e resposta vazia sem quebrar', () => {
    expect(normalizarReceitaMensal({ data: resposta }, '2026-01').mes).toBe('2026-09')
    const vazio = normalizarReceitaMensal(null, '2026-10')
    expect(vazio.mes).toBe('2026-10')
    expect(vazio.competencia.clientes).toEqual([])
    expect(vazio.competencia.total).toEqual({ previsto: 0, pago: 0, aberto: 0, perdido: 0 })
    expect(vazio.a_receber_mes).toBe(0)
    expect(vazio.data_corte).toBeNull()
    expect(receitaVazia(vazio, 'competencia')).toBe(true)
    expect(receitaVazia(vazio, 'vencimento')).toBe(true)
  })

  it('calcula totais quando o backend não manda (receita = clientes + avulsas, sem aportes)', () => {
    const semTotais = {
      mes: '2026-09',
      competencia: {
        clientes: [{ cliente_id: 'c1', cliente_nome: 'X', marcas: [{ marca_id: 'm1', marca_nome: 'A', fixo: titulo({ valor_pago: 400 }), comissao: null }] }],
        avulsas: [{ id: 'a', valor_previsto: 100, grupo: 'servico' }],
        aportes: [{ id: 'p', valor_previsto: 5000 }],
      },
    }
    const r = normalizarReceitaMensal(semTotais, '2026-09')
    expect(r.competencia.clientes[0].total).toEqual({ previsto: 1000, pago: 400 })
    expect(r.competencia.total).toEqual({ previsto: 1100, pago: 400, aberto: 700, perdido: 0 })
    expect(r.competencia.aportes[0].grupo).toBe('aporte')
  })

  it('a_receber_mes cai no cálculo local quando ausente', () => {
    const r = normalizarReceitaMensal({ ...resposta, a_receber_mes: undefined }, '2026-09')
    expect(r.a_receber_mes).toBe(2500)
  })

  it('ordena a visão vencimento por data', () => {
    const r = normalizarReceitaMensal(resposta, '2026-09')
    expect(r.vencimento.itens.map((i) => i.data_vencimento)).toEqual(['2026-09-15', '2026-09-20'])
    expect(totaisDaVisao(r, 'vencimento').previsto).toBe(2500)
    expect(totaisDaVisao(r, 'competencia').previsto).toBe(3500)
  })
})

describe('marca e títulos', () => {
  const cli = { cliente_id: 'c1', cliente_nome: 'Cliente' }

  it('comissão null com pct vira "em apuração" quando o backend não diz', () => {
    const m = normalizarMarca({ marca_id: 'm', marca_nome: 'M', pct: 8, gmv: 1000, fixo: null, comissao: null }, cli)!
    expect(m.em_apuracao).toBe(true)
    expect(m.comissao).toBeNull()
  })

  it('respeita em_apuracao explícito e deriva pct do GMV quando falta', () => {
    const m = normalizarMarca({ marca_id: 'm', marca_nome: 'M', gmv: 10000, comissao_bruta: 1250, em_apuracao: false }, cli)!
    expect(m.em_apuracao).toBe(false)
    expect(m.pct).toBe(12.5)
  })

  it('títulos usam a rota de baixa de receita comercial (calc: e uuid)', () => {
    const m = normalizarMarca(resposta.competencia.clientes[0].marcas[0], cli)!
    expect(rotaBaixa(m.fixo!, 'pagar')).toBe('/financeiro/receitas/calc%3Afixo%3Am1%3A2026-09/receber')
    expect(rotaBaixa(m.comissao!, 'desfazer')).toBe('/financeiro/receitas/7b0c/desfazer')
    expect(m.fixo!.virtual).toBe(true)
  })

  it('itens de vencimento: avulsa vai para /receitas-avulsas', () => {
    const av = normalizarItemVencimento({ id: 'av1', valor_previsto: 10, data_vencimento: '2026-09-01' })!
    expect(av.origem).toBe('avulsa')
    expect(rotaBaixa(av, 'pagar')).toBe('/financeiro/receitas-avulsas/av1/receber')
    const tit = normalizarItemVencimento({ id: 'u1', componente: 'fixo', valor_previsto: 10, marca_nome: 'Haag' })!
    expect(tit.origem).toBe('comercial')
    expect(tit.descricao).toBe('Fixo · Haag')
  })
})

describe('apresentação', () => {
  it('formata % e tipo de cobrança', () => {
    expect(formatPct(10)).toBe('10%')
    expect(formatPct(12.5)).toBe('12,5%')
    expect(formatPct(null)).toBe('—')
    expect(labelTipoCobranca('fixo_mais_comissao')).toBe('Fixo + comissão')
    expect(labelTipoCobranca('fixo_ou_comissao')).toBe('Fixo ou comissão')
  })

  it('nota de fixo_ou_comissao mostra a comissão bruta e a regra do maior', () => {
    const cli = { cliente_id: 'c', cliente_nome: 'C' }
    const m = normalizarMarca({ marca_nome: 'M', tipo_cobranca: 'fixo_ou_comissao', comissao_bruta: 1800, fixo: titulo() }, cli)!
    const nota = notaFixoOuComissao(m)!
    expect(nota).toMatch(/Comissão bruta R\$ 1\.800,00/)
    expect(nota).toMatch(/cobra-se o maior/)
    expect(notaFixoOuComissao({ ...m, tipo_cobranca: 'fixo_mais_comissao' })).toBeNull()
  })

  it('nota competência × vencimento usa o mês selecionado no exemplo', () => {
    const n = notaCompetenciaVencimento('2026-10')
    expect(n.exemplo).toBe('Ex.: o fixo de setembro vence em 05/10 — conta na competência de setembro, mas entra no caixa em outubro.')
    expect(notaCompetenciaVencimento('2026-01').exemplo).toMatch(/fixo de dezembro vence em 05\/01/)
  })

  it('filtra por cliente ou marca, sem acento', () => {
    const r = normalizarReceitaMensal(resposta, '2026-09')
    expect(filtrarClientes(r.competencia.clientes, 'acao')).toHaveLength(1)
    expect(filtrarClientes(r.competencia.clientes, 'HAAG')[0].marcas).toHaveLength(1)
    expect(filtrarClientes(r.competencia.clientes, 'zzz')).toEqual([])
    expect(filtrarClientes(r.competencia.clientes, '  ')).toBe(r.competencia.clientes)
  })

  it('agrupa por vencimento e soma o dia', () => {
    const r = normalizarReceitaMensal(resposta, '2026-09')
    const g = agruparPorVencimento([...r.vencimento.itens, { ...r.vencimento.itens[0], id: 'x' }])
    expect(g.map((x) => x.data)).toEqual(['2026-09-15', '2026-09-20'])
    expect(g[0].previsto).toBe(4000)
  })

  it('a receber no mês considera só o em aberto com vencimento no mês', () => {
    expect(
      calcularAReceberMes(
        [
          { data_vencimento: '2026-10-05', valor_previsto: 1000, valor_pago: 400 },
          { data_vencimento: '2026-11-05', valor_previsto: 999, valor_pago: 0 },
          { data_vencimento: null, valor_previsto: 50, valor_pago: 0 },
          { data_vencimento: '2026-10-10', valor_previsto: 100, valor_pago: 100 },
        ],
        '2026-10',
      ),
    ).toBe(600)
  })

  it('percentual recebido e contexto do título', () => {
    expect(pctRecebido({ previsto: 0, pago: 0 })).toBe(0)
    expect(pctRecebido({ previsto: 200, pago: 50 })).toBe(25)
    expect(contextoTitulo({ competencia: '2026-09-01', data_vencimento: '2026-10-05' })).toBe('competência set/26 · vence 05/10')
  })
})

describe('receita perdida (SPEC perdas)', () => {
  const perdido = (over: Record<string, unknown> = {}) =>
    titulo({
      id: 'calc:comissao:m1:2026-09',
      componente: 'comissao',
      valor_previsto: 2000,
      valor_pago: 500,
      data_vencimento: '2026-09-10',
      status: 'perdido',
      perdido_em: '2026-09-20T12:00:00Z',
      perdido_motivo: ' Cliente encerrou o contrato ',
      ...over,
    })
  const base = (comissao: unknown, extra: Record<string, unknown> = {}) => ({
    mes: '2026-09',
    hoje: '2026-10-01',
    competencia: {
      clientes: [
        {
          cliente_id: 'c1',
          cliente_nome: 'Grupo Ação',
          marcas: [{ marca_id: 'm1', marca_nome: 'Haag', fixo: titulo({ valor_previsto: 1000, data_vencimento: '2026-09-05' }), comissao }],
        },
      ],
      avulsas: [],
      ...extra,
    },
    vencimento: { itens: [] },
  })

  it('marca o título como perdido, com motivo e data da perda', () => {
    const r = normalizarReceitaMensal(base(perdido()), '2026-09')
    const t = r.competencia.clientes[0].marcas[0].comissao!
    expect(isPerdido(t)).toBe(true)
    expect(t.status).toBe('perdido')
    expect(motivoPerda(t)).toBe('Cliente encerrou o contrato')
    expect(t.perdido_em).toBe('2026-09-20T12:00:00Z')
  })

  it('perdido_em preenchido basta, mesmo com status não perdido', () => {
    const r = normalizarReceitaMensal(base(perdido({ status: 'atrasado', perdido_motivo: null })), '2026-09')
    const t = r.competencia.clientes[0].marcas[0].comissao!
    expect(t.status).toBe('perdido')
    expect(motivoPerda(t)).toBeNull()
  })

  it('sem a chave de totais: aberto não conta o saldo perdido e perdido = previsto − pago do perdido', () => {
    const r = normalizarReceitaMensal(base(perdido()), '2026-09')
    const t = r.competencia.total
    expect(t.previsto).toBe(3000) // previsto não muda
    expect(t.pago).toBe(500)
    expect(t.perdido).toBe(1500)
    expect(t.aberto).toBe(1000) // só o fixo
  })

  it('usa perdido/aberto do backend quando vierem', () => {
    const raw = base(perdido())
    ;(raw.competencia as Record<string, unknown>).total = { previsto: 3000, pago: 500, aberto: 900, perdido: '1500.00' }
    const t = normalizarReceitaMensal(raw, '2026-09').competencia.total
    expect(t).toMatchObject({ aberto: 900, perdido: 1500 })
  })

  it('sem perdas: perdido = 0 e aberto igual ao de antes', () => {
    const r = normalizarReceitaMensal(base(null), '2026-09')
    expect(r.competencia.total).toMatchObject({ previsto: 1000, pago: 0, aberto: 1000, perdido: 0 })
  })

  it('avulsa perdida (competência e vencimento) carrega o motivo', () => {
    const avulsa = { id: 'a1', descricao: 'Consultoria', grupo: 'servico', valor_previsto: 300, valor_pago: 0, data_vencimento: '2026-09-10', status: 'perdido', perdido_motivo: 'Calote' }
    const r = normalizarReceitaMensal(base(null, { avulsas: [avulsa] }), '2026-09')
    expect(r.competencia.avulsas[0].status).toBe('perdido')
    expect(motivoPerda(r.competencia.avulsas[0])).toBe('Calote')
    expect(r.competencia.total.perdido).toBe(300)
    expect(r.competencia.total.aberto).toBe(1000)
    const v = normalizarItemVencimento({ ...avulsa, origem: 'avulsa' })!
    expect(isPerdido(v)).toBe(true)
  })

  it('a_receber_mes (fallback) e total do dia ignoram perdidos', () => {
    const itens = [
      normalizarItemVencimento(perdido({ id: 'x1' }))!,
      normalizarItemVencimento(titulo({ id: 'x2', valor_previsto: 400, data_vencimento: '2026-09-10' }))!,
    ]
    expect(calcularAReceberMes(itens, '2026-09')).toBe(400)
    const g = agruparPorVencimento(itens)
    expect(g).toHaveLength(1)
    expect(g[0].previsto).toBe(400)
    expect(g[0].itens).toHaveLength(2)
  })
})

describe('janela de comissão', () => {
  const cli = { cliente_id: 'c1', cliente_nome: 'Grupo Ação' }

  it('expõe janela_inicio_dia por marca (default 1 = mês civil, inválido cai em 1)', () => {
    expect(normalizarMarca({ marca_id: 'm1', marca_nome: 'Pure Up', janela_inicio_dia: '16' }, cli, '2026-10-01')?.janela_inicio_dia).toBe(16)
    expect(normalizarMarca({ marca_id: 'm1', marca_nome: 'Haag' }, cli, '2026-10-01')?.janela_inicio_dia).toBe(1)
    expect(janelaInicioDia({ janela_inicio_dia: 40 })).toBe(1)
    expect(janelaInicioDia({ janela_inicio_dia: 0 })).toBe(1)
  })

  it('hint da janela só aparece com janela diferente de 1', () => {
    expect(notaJanelaComissao({ janela_inicio_dia: 1 })).toBeNull()
    expect(notaJanelaComissao({})).toBeNull()
    expect(notaJanelaComissao({ janela_inicio_dia: 16 })).toBe('Janela 16→15 · competência = mês de início · GMV da aba Comissões é por mês civil')
  })
})
