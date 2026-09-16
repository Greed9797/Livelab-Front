import { describe, expect, it } from 'vitest'
import { buildMarcaCondicaoProposal, getCondicaoAlertas } from './CondicoesComerciais'

describe('condições comerciais temporais', () => {
  it('classifica baseline legado com zeros sem tratá-los como confirmados', () => {
    expect(getCondicaoAlertas([{
      inicio_vigencia: '1900-01-01', fixo_mensal: 0, comissao_franquia_pct: 0,
      comissao_franqueadora_pct: 0, fixo_confirmado: false, comissao_confirmada: false,
      origem: 'legado_nao_verificado',
    }], 'marca-1', '2026-09')).toEqual(['legado', 'fixo_zero', 'comissao_zero'])
  })

  it('separa marca ausente e campos ainda não cadastrados', () => {
    expect(getCondicaoAlertas([], null, '2026-09')).toEqual(['sem_marca'])
    expect(getCondicaoAlertas([], 'marca-1', '2026-09')).toEqual(['fixo_ausente', 'comissao_ausente'])
  })

  it('mantém visível a confirmação explícita de valores zerados', () => {
    expect(getCondicaoAlertas([{
      inicio_vigencia: '2026-09-01', fixo_mensal: 0, comissao_franquia_pct: 0,
      comissao_franqueadora_pct: 0, fixo_confirmado: true, comissao_confirmada: true,
    }], 'marca-1', '2026-09')).toEqual(['fixo_zero_confirmado', 'comissao_zero_confirmada'])
  })

  it('monta proposta em competência mensal sem transportar os campos legados', () => {
    expect(buildMarcaCondicaoProposal({
      competencia: '2026-09', fixo_mensal: '1.200,00', comissao_franquia_pct: '8',
      comissao_franqueadora_pct: '2', tipo_cobranca: 'fixo_mais_comissao',
      fixo_confirmado: true, comissao_confirmada: true, motivo: 'Novo contrato',
    })).toEqual({
      inicio_vigencia: '2026-09', fixo_mensal: 1200, comissao_franquia_pct: 8,
      comissao_franqueadora_pct: 2, tipo_cobranca: 'fixo_mais_comissao',
      fixo_confirmado: true, comissao_confirmada: true, origem: 'gestao', motivo: 'Novo contrato',
    })
  })
})
