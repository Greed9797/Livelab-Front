import { describe, expect, it } from 'vitest'
import { buildMarcaCondicaoProposal, initialForm, submitMarcaCondicao } from './CondicoesComerciais'
import { parseVencimentoForm, previewJanelaComissao, vencimentoDaCondicao } from '../../utils/condicoes-vencimento'
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

  describe('janela de apuração da comissão', () => {
    const base = { fixo_vencimento_dia: '5', fixo_vencimento_mes_offset: '1', comissao_vencimento_dia: '20', comissao_vencimento_mes_offset: '1' }

    it('default 1 e lê o valor da condição', () => {
      expect(vencimentoDaCondicao(null).comissao_janela_inicio_dia).toBe(1)
      expect(vencimentoDaCondicao({ comissao_janela_inicio_dia: 16 }).comissao_janela_inicio_dia).toBe(16)
      expect(vencimentoDaCondicao({ comissao_janela_inicio_dia: 40 }).comissao_janela_inicio_dia).toBe(1)
    })

    it('valida 1..28 e inclui no payload', () => {
      expect(parseVencimentoForm({ ...base, comissao_janela_inicio_dia: '16' })).toMatchObject({ ok: true, value: { comissao_janela_inicio_dia: 16 } })
      expect(parseVencimentoForm(base)).toMatchObject({ ok: true, value: { comissao_janela_inicio_dia: 1 } })
      expect(parseVencimentoForm({ ...base, comissao_janela_inicio_dia: '0' }).ok).toBe(false)
      expect(parseVencimentoForm({ ...base, comissao_janela_inicio_dia: '29' }).ok).toBe(false)
    })

    it('monta o preview da janela', () => {
      expect(previewJanelaComissao('2026-09', 16, 20, 1)).toBe('16/set → 15/out · competência set · vence 20/out')
      expect(previewJanelaComissao('2026-09', 1, 5, 1)).toBe('01/set → 30/set · competência set · vence 05/out')
      expect(previewJanelaComissao('2026-12', 16, 20, 1)).toBe('16/dez → 15/jan · competência dez · vence 20/jan')
    })
  })
})
