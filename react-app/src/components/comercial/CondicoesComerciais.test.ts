import { describe, expect, it } from 'vitest'
import { buildMarcaCondicaoProposal, initialForm, submitMarcaCondicao } from './CondicoesComerciais'
import { commercialConfigCodes, commercialConfigSummary } from '../../utils/comercial-config'
import type { JsonRecord } from '../../types/models'

describe('condições comerciais temporais', () => {
  it('renderiza somente os códigos canônicos de pendência recebidos do backend', () => {
    expect(commercialConfigCodes({ status: 'a_revisar', codigos: ['a_revisar'] }, true)).toEqual(['a_revisar'])
    expect(commercialConfigSummary({ status: 'a_revisar', codigos: ['a_revisar'] }, true)).toBe('Condição legada a revisar')
  })

  it('mantém a ausência de marca como indicador estrutural separado', () => {
    expect(commercialConfigCodes(null, false)).toEqual(['sem_marca'])
    expect(commercialConfigCodes({ status: 'incompleto', codigos: ['fixo_nao_informado', 'comissao_nao_informada'] }, true)).toEqual(['fixo_nao_informado', 'comissao_nao_informada'])
  })

  it('não cria alerta local para zeros confirmados ou entidade não aplicável', () => {
    expect(commercialConfigCodes({ status: 'configurado', codigos: [] }, true)).toEqual([])
    expect(commercialConfigCodes({ status: 'nao_aplicavel', codigos: ['nao_aplicavel'] }, true)).toEqual([])
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

  it('começa com fixo e comissões vazios, sem zero inventado', () => {
    const form = initialForm()
    expect(form.fixo_mensal).toBe('')
    expect(form.comissao_franquia_pct).toBe('')
    expect(form.comissao_franqueadora_pct).toBe('')
  })

  it('não chama a API quando um valor numérico está vazio', () => {
    const calls: JsonRecord[] = []
    const error = submitMarcaCondicao({
      ...initialForm(),
      fixo_mensal: '1.200,00',
      comissao_franquia_pct: '8',
      comissao_franqueadora_pct: '',
    }, (payload) => { calls.push(payload) })

    expect(error).toBe('informe o valor')
    expect(calls).toEqual([])
  })

  it('envia zero numérico só com o checkbox de confirmação', () => {
    const calls: JsonRecord[] = []
    const blocked = submitMarcaCondicao({
      ...initialForm(),
      fixo_mensal: '0',
      comissao_franquia_pct: '0',
      comissao_franqueadora_pct: '0',
      fixo_confirmado: false,
      comissao_confirmada: false,
    }, (payload) => { calls.push(payload) })
    expect(blocked).toBe('Confirme o valor zero.')
    expect(calls).toEqual([])

    const error = submitMarcaCondicao({
      ...initialForm(),
      fixo_mensal: '0,00',
      comissao_franquia_pct: '0',
      comissao_franqueadora_pct: '0',
      fixo_confirmado: true,
      comissao_confirmada: true,
      motivo: 'Contrato zerado',
    }, (payload) => { calls.push(payload) })

    expect(error).toBeNull()
    expect(calls).toEqual([{
      inicio_vigencia: initialForm().competencia,
      fixo_mensal: 0,
      comissao_franquia_pct: 0,
      comissao_franqueadora_pct: 0,
      tipo_cobranca: 'fixo_mais_comissao',
      fixo_confirmado: true,
      comissao_confirmada: true,
      origem: 'gestao',
      motivo: 'Contrato zerado',
    }])
  })
})
