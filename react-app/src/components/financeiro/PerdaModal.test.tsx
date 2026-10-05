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
    expect(screen.getByText(/efeito no Resultado será considerado no mês em que esta ação for registrada/)).toBeTruthy()

    const confirmar = screen.getByRole('button', { name: 'Dar como perdida' })
    expect((confirmar as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByRole('textbox', { name: /^Motivo/ }), { target: { value: '  Cliente encerrou sem quitar  ' } })
    expect((confirmar as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(confirmar)

    expect(mutate).toHaveBeenCalledWith(
      { lancamento: item, modo: 'perder', motivo: 'Cliente encerrou sem quitar', valor: '600.00' },
      expect.any(Object),
    )
  })

  it('também exige motivo na reversão e preserva o motivo anterior como contexto', () => {
    const perdido = { ...item, status: 'perdido' as const, perdido_motivo: 'Cliente encerrou' }
    renderModal('desfazer', perdido)

    expect(screen.getByText(/Máximo que pode ser reaberto:/).textContent).toContain('R$ 600,00')
    expect(screen.getByText('Motivo registrado anteriormente: Cliente encerrou')).toBeTruthy()
    const confirmar = screen.getByRole('button', { name: 'Desfazer perda' })
    expect((confirmar as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByRole('textbox', { name: /^Motivo da reversão/ }), { target: { value: 'Pagamento negociado novamente' } })
    fireEvent.click(confirmar)

    expect(mutate).toHaveBeenCalledWith(
      { lancamento: perdido, modo: 'desfazer', motivo: 'Pagamento negociado novamente', valor: '600.00' },
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
    fireEvent.change(valor, { target: { value: '125,50' } })
    expect((confirmar as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(confirmar)
    expect(mutate).toHaveBeenCalledWith(
      { lancamento: item, modo: 'perder', motivo: 'Sem perspectiva de pagamento', valor: '125.50' },
      expect.any(Object),
    )
  })
})
