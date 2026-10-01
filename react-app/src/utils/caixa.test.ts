import { describe, expect, it } from 'vitest'
import {
  calcSaldoProjetado,
  formatDataBR,
  isDataISO,
  montarPayloadCaixa,
  montarPayloadReceitaAvulsa,
  normalizarCaixa,
  normalizarConfig,
  precisaConfirmarAlteracao,
  textoCorte,
  tomSaldo,
} from './caixa'
import { isEditavel, isReceitaAvulsa, podeExcluir, rotaBaixa } from './financeiro'

describe('datas e texto de corte', () => {
  it('formata YYYY-MM-DD sem fuso', () => {
    expect(formatDataBR('2026-10-01')).toBe('01/10/2026')
    expect(formatDataBR(null)).toBe('')
  })
  it('valida datas reais', () => {
    expect(isDataISO('2026-02-30')).toBe(false)
    expect(isDataISO('2026-10-01')).toBe(true)
  })
  it('texto de corte', () => {
    expect(textoCorte('2026-10-01')).toBe('Mostrando a partir de 01/10/2026')
    expect(textoCorte(null)).toBeNull()
  })
})

describe('normalização', () => {
  it('config aceita strings e corte nulo', () => {
    expect(normalizarConfig({ aliquota_imposto_pct: '8', data_corte: '2026-10-01T00:00:00Z', saldo_abertura: '1500.5' })).toEqual({
      aliquota_imposto_pct: 8,
      data_corte: '2026-10-01',
      saldo_abertura: 1500.5,
    })
    expect(normalizarConfig(null)).toEqual({ aliquota_imposto_pct: 10, data_corte: null, saldo_abertura: 0 })
  })
  it('caixa converte strings e calcula saldo projetado ausente', () => {
    const c = normalizarCaixa({ configurado: true, data_corte: '2026-10-01', saldo_abertura: '1000', entradas_realizadas: '500', saidas_realizadas: 200, saldo_atual: '1300', a_receber: 400, a_pagar: '900' })
    expect(c.saldo_atual).toBe(1300)
    expect(c.saldo_projetado_fim_mes).toBe(800)
  })
  it('caixa respeita saldo projetado do backend e configurado=false', () => {
    const c = normalizarCaixa({ configurado: false, saldo_projetado_fim_mes: 42 })
    expect(c.configurado).toBe(false)
    expect(c.saldo_projetado_fim_mes).toBe(42)
    expect(c.data_corte).toBeNull()
  })
})

describe('saldo projetado e tom', () => {
  it('atual + a receber - a pagar', () => {
    expect(calcSaldoProjetado({ saldo_atual: 100, a_receber: 50.1, a_pagar: 200.2 })).toBe(-50.1)
  })
  it('tom', () => {
    expect(tomSaldo(10)).toBe('positivo')
    expect(tomSaldo(-0.01)).toBe('negativo')
    expect(tomSaldo(0)).toBe('neutro')
  })
})

describe('payload do caixa', () => {
  it('aceita negativo em pt-BR', () => {
    expect(montarPayloadCaixa({ valor: '-1.234,56', dataCorte: '2026-10-01' })).toEqual({ ok: true, payload: { saldo_abertura: -1234.56, data_corte: '2026-10-01' } })
  })
  it('zero e valido; vazio e data invalida nao', () => {
    expect(montarPayloadCaixa({ valor: '0,00', dataCorte: '2026-10-01' }).ok).toBe(true)
    expect(montarPayloadCaixa({ valor: '', dataCorte: '2026-10-01' }).ok).toBe(false)
    expect(montarPayloadCaixa({ valor: '10', dataCorte: '' }).ok).toBe(false)
  })
  it('confirmacao so ao alterar o que ja estava configurado', () => {
    const novo = { saldo_abertura: 100, data_corte: '2026-10-01' }
    expect(precisaConfirmarAlteracao({ data_corte: null, saldo_abertura: 0 }, novo)).toBe(false)
    expect(precisaConfirmarAlteracao({ data_corte: '2026-10-01', saldo_abertura: 100 }, novo)).toBe(false)
    expect(precisaConfirmarAlteracao({ data_corte: '2026-10-01', saldo_abertura: 90 }, novo)).toBe(true)
    expect(precisaConfirmarAlteracao({ data_corte: '2026-09-01', saldo_abertura: 100 }, novo)).toBe(true)
  })
})

describe('payload da receita avulsa', () => {
  const base = { descricao: ' Aporte socio ', grupo: 'aporte', valor: '5.000,00', vencimento: '2026-10-05', observacao: '  ', jaRecebido: false, dataRecebimento: '2026-10-05' }
  it('monta payload simples', () => {
    expect(montarPayloadReceitaAvulsa(base)).toEqual({
      ok: true,
      payload: { descricao: 'Aporte socio', grupo: 'aporte', valor: 5000, data_vencimento: '2026-10-05', observacao: null },
    })
  })
  it('ja recebido informa valor e data de recebimento', () => {
    const r = montarPayloadReceitaAvulsa({ ...base, jaRecebido: true, dataRecebimento: '2026-10-06' })
    expect(r.ok && r.payload.valor_pago).toBe(5000)
    expect(r.ok && r.payload.data_pagamento).toBe('2026-10-06')
  })
  it('na edicao nao envia baixa', () => {
    const r = montarPayloadReceitaAvulsa({ ...base, jaRecebido: true }, { permitirRecebido: false })
    expect(r.ok && 'valor_pago' in r.payload).toBe(false)
  })
  it('rejeita valor, grupo e descricao invalidos', () => {
    expect(montarPayloadReceitaAvulsa({ ...base, valor: '0' }).ok).toBe(false)
    expect(montarPayloadReceitaAvulsa({ ...base, grupo: 'x' }).ok).toBe(false)
    expect(montarPayloadReceitaAvulsa({ ...base, descricao: ' ' }).ok).toBe(false)
  })
})

describe('roteamento da receita avulsa', () => {
  const av = { id: 'u-1', natureza: 'receita' as const, origem: 'avulsa', competencia: '2026-10-01', apresentadora_id: null }
  it('usa /receitas-avulsas para receber e desfazer', () => {
    expect(rotaBaixa(av, 'pagar')).toBe('/financeiro/receitas-avulsas/u-1/receber')
    expect(rotaBaixa(av, 'desfazer')).toBe('/financeiro/receitas-avulsas/u-1/desfazer')
  })
  it('receitas de marca seguem em /receitas', () => {
    expect(rotaBaixa({ ...av, origem: 'comercial' }, 'pagar')).toBe('/financeiro/receitas/u-1/receber')
  })
  it('e editavel e excluivel', () => {
    expect(isReceitaAvulsa(av)).toBe(true)
    expect(isEditavel(av)).toBe(true)
    expect(podeExcluir(av)).toBe(true)
    expect(isEditavel({ natureza: 'receita', origem: 'comercial' })).toBe(false)
  })
})
