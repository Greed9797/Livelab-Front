import { describe, expect, it } from 'vitest'
import type { Lancamento } from '../types/financeiro'
import { csvLancamentos, gerarCsv } from './exportar-csv'

function lancamento(parcial: Partial<Lancamento> = {}): Lancamento {
  return {
    id: '1',
    natureza: 'receita',
    origem: 'manual',
    descricao: 'Teste',
    competencia: '2026-10-01',
    data_vencimento: '2026-10-05',
    valor_previsto: 0,
    valor_pago: 0,
    data_pagamento: null,
    status: 'pendente',
    grupo: null,
    componente: null,
    classe: null,
    marca_id: null,
    marca_nome: null,
    cliente_id: null,
    cliente_nome: null,
    apresentadora_id: null,
    recorrente_id: null,
    parcela_grupo_id: null,
    parcela_num: null,
    parcelas_total: null,
    observacao: null,
    virtual: false,
    ...parcial,
  }
}

describe('gerarCsv', () => {
  it('prefixa BOM UTF-8 e preserva acentos em cabeçalho e conteúdo', () => {
    const csv = gerarCsv(
      [{ descricao: 'São José — ação' }],
      [{ chave: 'descricao', cabecalho: 'Descrição' }],
    )

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('Descrição')
    expect(csv).toContain('São José — ação')
  })

  it('usa ponto e vírgula e formata valores monetários com vírgula decimal', () => {
    const csv = gerarCsv(
      [{ descricao: 'Aluguel, sala 2', valor: 1234.5 }],
      [
        { chave: 'descricao', cabecalho: 'Descrição' },
        { chave: 'valor', cabecalho: 'Valor previsto', monetario: true },
      ],
    )
    const corpo = csv.replace(/^\uFEFF/, '')

    expect(corpo.split('\n')[0]).toBe('Descrição;Valor previsto')
    expect(corpo).toContain('"Aluguel, sala 2"')
    expect(corpo).toContain('"1.234,50"')
  })

  it('escapa aspas duplas no conteúdo', () => {
    const csv = gerarCsv(
      [{ descricao: 'Live "Black Friday"' }],
      [{ chave: 'descricao', cabecalho: 'Descrição' }],
    )
    const corpo = csv.replace(/^\uFEFF/, '')

    expect(corpo).toBe('Descrição\n"Live ""Black Friday"""')
  })
})

describe('csvLancamentos', () => {
  it('exporta cabeçalhos em pt-BR e acentos da linha', () => {
    const csv = csvLancamentos([
      lancamento({
        descricao: 'Comissão São Paulo',
        origem: 'marca_comissao',
        valor_previsto: 2500.9,
        observacao: 'Obs "urgente", ok',
      }),
    ])
    const corpo = csv.replace(/^\uFEFF/, '')
    const [cabecalho, linha] = corpo.split('\n')

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(cabecalho).toContain('Descrição')
    expect(cabecalho).toContain('Natureza')
    expect(cabecalho).toContain('Valor previsto')
    expect(linha).toContain('Comissão São Paulo')
    expect(linha).toContain('Comissão da marca')
    expect(linha).toContain('"2.500,90"')
    expect(linha).toContain('"Obs ""urgente"", ok"')
  })
})
