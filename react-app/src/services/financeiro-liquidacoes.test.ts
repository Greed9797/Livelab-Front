import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Lancamento } from '../types/financeiro'
import { apiPost } from './api'
import {
  normalizarLiquidacaoIncremental,
  origemLiquidacaoIncremental,
  registrarLiquidacaoIncremental,
} from './financeiro-liquidacoes'

vi.mock('./api', () => ({ apiPost: vi.fn() }))

const base: Lancamento = {
  id: 'titulo-1', natureza: 'receita', origem: 'comercial', descricao: 'Mensalidade',
  competencia: '2026-10-01', data_vencimento: '2026-10-10', valor_previsto: 1000,
  valor_pago: 400, data_pagamento: null, status: 'parcial', grupo: null, componente: 'fixo',
  classe: null, marca_id: null, marca_nome: null, cliente_id: null, cliente_nome: null,
  apresentadora_id: null, recorrente_id: null, parcela_grupo_id: null, parcela_num: null,
  parcelas_total: null, observacao: null, virtual: false,
}

const resposta = {
  liquidacao_id: 'liq-1', tipo: 'receita', origem_id: 'titulo-1', valor_operacao: '300.00',
  valor_pago_anterior: '400.00', valor_pago: '700.00', saldo_restante: '300.00',
  data: '2026-10-09', replay: false, situacao_data: 'realizada', afeta_caixa_atual: true,
  mensagem: 'Operação registrada.',
}

beforeEach(() => vi.clearAllMocks())

describe('liquidação incremental', () => {
  it('usa a rota aditiva e envia o valor desta operação sem converter para acumulado', async () => {
    vi.mocked(apiPost).mockResolvedValue(resposta)
    const payload = {
      tipo: 'receita' as const, id: 'titulo-1', valor_operacao: '300.00', data: '2026-10-09',
      chave_operacao: '018f5b65-3fb2-7f44-8d5d-4b3c2a190001',
    }
    await expect(registrarLiquidacaoIncremental(payload)).resolves.toMatchObject({
      valor_operacao: '300.00', valor_pago_anterior: '400.00', valor_pago: '700.00', saldo_restante: '300.00',
    })
    expect(apiPost).toHaveBeenCalledWith('/financeiro/liquidacoes/incrementais', payload)
  })

  it('mapeia as cinco origens para a identidade aceita pelo comando', () => {
    expect(origemLiquidacaoIncremental(base)).toEqual({ tipo: 'receita', id: 'titulo-1' })
    expect(origemLiquidacaoIncremental({ ...base, id: 'av-1', origem: 'avulsa' })).toEqual({ tipo: 'avulsa', id: 'av-1' })
    expect(origemLiquidacaoIncremental({ ...base, natureza: 'custo', origem: 'manual', id: 'custo-1' })).toEqual({ tipo: 'custo', id: 'custo-1' })
    expect(origemLiquidacaoIncremental({
      ...base, natureza: 'custo', origem: 'apresentadora', id: 'apresentadora:legado:2026-10',
      apresentadora_id: '11111111-1111-4111-8111-111111111111', componente: 'variavel',
    })).toEqual({ tipo: 'apresentadora', id: 'apresentadora:11111111-1111-4111-8111-111111111111:2026-10:variavel' })
    expect(origemLiquidacaoIncremental({ ...base, natureza: 'custo', origem: 'imposto', id: 'uuid-antigo' })).toEqual({ tipo: 'imposto', id: 'imposto:2026-10' })
  })

  it('rejeita resposta incompleta em vez de exibir dinheiro ausente como zero', () => {
    expect(() => normalizarLiquidacaoIncremental({ ...resposta, saldo_restante: null })).toThrow('Resposta inválida')
    expect(() => normalizarLiquidacaoIncremental({ ...resposta, valor_pago: '700' })).toThrow('Resposta inválida')
  })
})
