/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Lancamento } from '../../types/financeiro'
import { ToastProvider } from '../ui/Toast'
import { PerdaModal } from './PerdaModal'

const mutate = vi.fn()

vi.mock('../../hooks/useFinanceiro', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../hooks/useFinanceiro')>()),
  usePerdaMutation: () => ({ mutate, isPending: false, error: null }),
}))

const item: Lancamento = {
  id: 'receita-1',
  natureza: 'receita',
  origem: 'comercial',
  descricao: 'Mensalidade outubro',
  competencia: '2026-10-01',
  data_vencimento: '2026-10-10',
  valor_previsto: 1000,
  valor_pago: 400,
  data_pagamento: null,
  status: 'parcial',
  grupo: null,
  componente: 'fixo',
  classe: null,
  marca_id: 'marca-1',
  marca_nome: 'Marca 1',
  cliente_id: 'cliente-1',
  cliente_nome: 'Cliente 1',
  apresentadora_id: null,
  recorrente_id: null,
  parcela_grupo_id: null,
  parcela_num: null,
  parcelas_total: null,
  observacao: null,
  virtual: false,
}

function renderModal(modo: 'perder' | 'desfazer', lancamento: Lancamento = item) {
  return render(
    <ToastProvider>
      <PerdaModal item={lancamento} modo={modo} onClose={vi.fn()} />
    </ToastProvider>,
  )
}

beforeEach(() => mutate.mockReset())
afterEach(cleanup)

describe('PerdaModal', () => {
  it('mostra somente o saldo remanescente e exige motivo para registrar perda', () => {
    renderModal('perder')

    expect(screen.getByText(/Saldo máximo que pode ser encerrado:/).textContent).toContain('R$ 600,00')
    expect(screen.getByText(/Já recebido:/).textContent).toContain('R$ 400,00 · Em aberto agora: R$ 600,00')
    expect(screen.getByText(/Valor encerrado:/).textContent).toContain('R$ 600,00 · Em aberto depois: R$ 0,00')
    expect(screen.getByText(/efeito no Resultado será considerado no mês em que esta ação for registrada/)).toBeTruthy()

    const confirmar = screen.getByRole('button', { name: 'Dar como perdida' })
    expect((confirmar as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByRole('textbox', { name: /^Motivo/ }), { target: { value: '  Cliente encerrou sem quitar  ' } })
    expect((confirmar as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(confirmar)

    expect(mutate).toHaveBeenCalledWith(
      { lancamento: item, modo: 'perder', motivo: 'Cliente encerrou sem quitar', valor: '600.00', chaveOperacao: expect.any(String) },
      expect.any(Object),
    )
  })

  it('também exige motivo na reversão e preserva o motivo anterior como contexto', () => {
    const perdido = { ...item, status: 'perdido' as const, valor_perdido: 600, perdido_motivo: 'Cliente encerrou' }
    renderModal('desfazer', perdido)

    expect(screen.getByText(/Máximo que pode ser reaberto:/).textContent).toContain('R$ 600,00')
    expect(screen.getByText(/Valor reaberto:/).textContent).toContain('R$ 600,00 · Em aberto depois: R$ 600,00')
    expect(screen.getByText('Motivo registrado anteriormente: Cliente encerrou')).toBeTruthy()
    const confirmar = screen.getByRole('button', { name: 'Desfazer perda' })
    expect((confirmar as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByRole('textbox', { name: /^Motivo da reversão/ }), { target: { value: 'Pagamento negociado novamente' } })
    fireEvent.click(confirmar)

    expect(mutate).toHaveBeenCalledWith(
      { lancamento: perdido, modo: 'desfazer', motivo: 'Pagamento negociado novamente', valor: '600.00', chaveOperacao: expect.any(String) },
      expect.any(Object),
    )
  })

  it('envia apenas o valor parcial escolhido e barra excesso', () => {
    renderModal('perder')
    const valor = screen.getByRole('textbox', { name: /^Valor a encerrar/ })
    const confirmar = screen.getByRole('button', { name: 'Dar como perdida' })
    fireEvent.change(screen.getByRole('textbox', { name: /^Motivo/ }), { target: { value: 'Sem perspectiva de pagamento' } })
    fireEvent.change(valor, { target: { value: '600,01' } })
    expect((confirmar as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByText(/Em aberto depois:/)).toBeNull()
    fireEvent.change(valor, { target: { value: '125,50' } })
    expect((confirmar as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByText(/Valor encerrado:/).textContent).toContain('R$ 125,50 · Em aberto depois: R$ 474,50')
    fireEvent.click(confirmar)
    expect(mutate).toHaveBeenCalledWith(
      { lancamento: item, modo: 'perder', motivo: 'Sem perspectiva de pagamento', valor: '125.50', chaveOperacao: expect.any(String) },
      expect.any(Object),
    )
  })

  it('bloqueia reversão de perda legada sem evento correspondente', () => {
    renderModal('desfazer', { ...item, status: 'perdido', perdido_motivo: 'Histórico antigo' })
    expect(screen.getByText(/Perda antiga sem evento reversível/)).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: /^Motivo da reversão/ }), { target: { value: 'Negociação retomada' } })
    expect((screen.getByRole('button', { name: 'Desfazer perda' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('limita reversão parcial ao valor perdido e mostra o saldo reaberto', () => {
    const perdido = { ...item, status: 'parcial' as const, valor_perdido: 250.01 }
    renderModal('desfazer', perdido)
    const valor = screen.getByRole('textbox', { name: /^Valor a reabrir/ })
    const confirmar = screen.getByRole('button', { name: 'Desfazer perda' }) as HTMLButtonElement
    fireEvent.change(screen.getByRole('textbox', { name: /^Motivo da reversão/ }), { target: { value: 'Acordo retomado' } })
    fireEvent.change(valor, { target: { value: '250,02' } })
    expect(confirmar.disabled).toBe(true)
    fireEvent.change(valor, { target: { value: '0,01' } })
    expect(screen.getByText(/Valor reaberto:/).textContent).toContain('R$ 0,01 · Em aberto depois: R$ 350,00')
    fireEvent.click(confirmar)
    expect(mutate).toHaveBeenCalledWith(
      { lancamento: perdido, modo: 'desfazer', motivo: 'Acordo retomado', valor: '0.01', chaveOperacao: expect.any(String) },
      expect.any(Object),
    )
  })

  it('valida centavos exatos sem arredondar a entrada', () => {
    renderModal('perder', { ...item, valor_previsto: 1000.01, valor_pago: 400 })
    const valor = screen.getByRole('textbox', { name: /^Valor a encerrar/ })
    const confirmar = screen.getByRole('button', { name: 'Dar como perdida' }) as HTMLButtonElement
    fireEvent.change(screen.getByRole('textbox', { name: /^Motivo/ }), { target: { value: 'Saldo irrecuperável' } })
    fireEvent.change(valor, { target: { value: '600,011' } })
    expect(confirmar.disabled).toBe(true)
    fireEvent.change(valor, { target: { value: '600,01' } })
    expect(confirmar.disabled).toBe(false)
  })

  it('reativação de custo segue o contrato atual sem exigir motivo que o servidor ignora', () => {
    const custo = { ...item, natureza: 'custo' as const, origem: 'manual' as const, status: 'cancelado' as const }
    renderModal('desfazer', custo)
    expect(screen.queryByRole('textbox', { name: /^Motivo da reversão/ })).toBeNull()
    const confirmar = screen.getByRole('button', { name: 'Desfazer cancelamento' })
    expect((confirmar as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(confirmar)
    expect(mutate).toHaveBeenCalledWith(
      { lancamento: custo, modo: 'desfazer' },
      expect.any(Object),
    )
  })
})
