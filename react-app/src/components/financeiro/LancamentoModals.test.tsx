/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LiquidacaoIncrementalResultado } from '../../services/financeiro-liquidacoes'
import type { Lancamento } from '../../types/financeiro'
import { BaixaModal } from './LancamentoModals'

const mutate = vi.fn()
const reset = vi.fn()
const mutationState: {
  mutate: typeof mutate
  reset: typeof reset
  isPending: boolean
  error: unknown
} = { mutate, reset, isPending: false, error: null }

vi.mock('../../hooks/useFinanceiroLiquidacoes', () => ({
  useLiquidacaoIncrementalMutation: () => mutationState,
}))

const lancamento: Lancamento = {
  id: 'receita-1', natureza: 'receita', origem: 'comercial', descricao: 'Mensalidade outubro',
  competencia: '2026-10-01', data_vencimento: '2026-10-10', valor_previsto: 1000,
  valor_pago: 400, data_pagamento: null, status: 'parcial', grupo: null, componente: 'fixo',
  classe: null, marca_id: null, marca_nome: null, cliente_id: null, cliente_nome: null,
  apresentadora_id: null, recorrente_id: null, parcela_grupo_id: null, parcela_num: null,
  parcelas_total: null, observacao: null, virtual: false,
}

const resultado: LiquidacaoIncrementalResultado = {
  liquidacao_id: 'liq-1', tipo: 'receita', origem_id: 'receita-1', valor_operacao: '300.00',
  valor_pago_anterior: '400.00', valor_pago: '700.00', saldo_restante: '300.00',
  data: '2099-01-01', replay: false, situacao_data: 'agendada', afeta_caixa_atual: false,
  mensagem: 'Operação de R$ 300.00 agendada para 2099-01-01.',
}

function renderModal() {
  return render(<BaixaModal
    lancamento={lancamento}
    onClose={vi.fn()}
    onConfirm={vi.fn()}
    isPending={false}
  />)
}

beforeEach(() => {
  mutate.mockReset()
  reset.mockReset()
  mutationState.isPending = false
  mutationState.error = null
})
afterEach(cleanup)

describe('BaixaModal incremental', () => {
  it('mostra operação, acumulado anterior, residual e preview de data futura', () => {
    renderModal()
    const valor = screen.getByRole('textbox', { name: /^Valor desta operação/ })
    fireEvent.change(valor, { target: { value: '300,00' } })
    fireEvent.change(screen.getByLabelText('Data desta operação'), { target: { value: '2099-01-01' } })

    const preview = screen.getByLabelText('Prévia da operação')
    expect(preview.textContent).toContain('Valor desta operaçãoR$ 300,00')
    expect(preview.textContent).toContain('Acumulado antesR$ 400,00')
    expect(preview.textContent).toContain('Acumulado depoisR$ 700,00')
    expect(preview.textContent).toContain('Saldo restanteR$ 300,00')
    expect(preview.textContent).toContain('Agendado: não altera o caixa atual')
    expect(preview.textContent).toContain('não executa transferência bancária')
  })

  it('mantém a chave no retry idêntico e cria outra para uma operação distinta', () => {
    renderModal()
    const valor = screen.getByRole('textbox', { name: /^Valor desta operação/ })
    fireEvent.change(valor, { target: { value: '300,00' } })
    const confirmar = screen.getByRole('button', { name: 'Registrar parcial' })
    fireEvent.click(confirmar)
    fireEvent.click(confirmar)

    const primeira = mutate.mock.calls[0][0]
    const retry = mutate.mock.calls[1][0]
    expect(primeira).toMatchObject({ tipo: 'receita', id: 'receita-1', valor_operacao: '300.00' })
    expect(primeira.chave_operacao).toMatch(/^[0-9a-f-]{36}$/)
    expect(retry.chave_operacao).toBe(primeira.chave_operacao)

    fireEvent.change(valor, { target: { value: '200,00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar parcial' }))
    expect(mutate.mock.calls[2][0].chave_operacao).not.toBe(primeira.chave_operacao)
  })

  it('confirma exatamente o que foi aplicado e deixa operação futura como agendada', () => {
    mutate.mockImplementation((_payload, options) => options.onSuccess(resultado))
    renderModal()
    fireEvent.change(screen.getByRole('textbox', { name: /^Valor desta operação/ }), { target: { value: '300,00' } })
    fireEvent.change(screen.getByLabelText('Data desta operação'), { target: { value: '2099-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar parcial' }))

    expect(screen.getByRole('dialog', { name: 'Operação agendada' })).toBeTruthy()
    const status = screen.getByRole('status')
    expect(status.textContent).toContain('Operação aplicada com sucesso')
    expect(status.textContent).toContain('Valor desta operaçãoR$ 300,00')
    expect(status.textContent).toContain('Acumulado antesR$ 400,00')
    expect(status.textContent).toContain('Saldo restanteR$ 300,00')
    expect(status.textContent).toContain('Não altera o caixa atual')
  })

  it('expõe erro da operação sem descartar o formulário', () => {
    mutationState.error = new Error('A chave já foi usada com outro valor.')
    renderModal()
    expect(screen.getByRole('alert').textContent).toBe('A chave já foi usada com outro valor.')
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar recebimento' })).toBeTruthy()
  })
})
