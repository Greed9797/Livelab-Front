/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../ui/Toast'
import { ComissoesPendentes, notifyReprocessar } from './ComissoesPendentes'
import { aprovarComissao, listComissoesPendentes } from '../../services/domain'

vi.mock('../../services/domain', () => ({
  listComissoesPendentes: vi.fn(),
  aprovarComissao: vi.fn(),
  reprovarComissao: vi.fn(),
}))

const rows = [
  {
    id: 'zero-1',
    marca_nome: 'Marca Zero',
    apresentadora_nome: 'Ana',
    gmv: 1500,
    comissao_apresentadora: 0,
    comissao_franquia: 12.5,
    comissao_franqueadora: 4,
    diagnostico_operacional: 'comissao_zero',
    diagnostico_label: 'Comissão zerada',
  },
  {
    id: 'sem-marca-1',
    marca_nome: null,
    apresentadora_nome: 'Bia',
    gmv: 800,
    comissao_apresentadora: 10,
    comissao_franquia: 0,
    comissao_franqueadora: 0,
    diagnostico_operacional: 'sem_marca',
    diagnostico_label: 'Sem marca vinculada',
  },
]

function renderQueue(papel: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ComissoesPendentes papel={papel} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('ComissoesPendentes', () => {
  beforeEach(() => {
    cleanup()
    vi.mocked(listComissoesPendentes).mockReset()
    vi.mocked(aprovarComissao).mockReset()
    vi.mocked(listComissoesPendentes).mockResolvedValue(rows)
    vi.mocked(aprovarComissao).mockResolvedValue({ id: 'zero-1', status_aprovacao: 'aprovada' })
  })

  it('keeps a stored zero and sends confirmar_zero only after the checkbox and motivo', async () => {
    renderQueue('franqueado')
    const zero = await screen.findByRole('article', { name: 'pendente zero-1' })
    expect(within(zero).getByText('R$ 0,00')).toBeTruthy()
    expect(within(zero).getByText('R$ 12,50')).toBeTruthy()
    expect(within(zero).getByText('Comissão zerada')).toBeTruthy()

    const approve = within(zero).getByRole('button', { name: 'Aprovar' })
    expect((approve as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(within(zero).getByRole('checkbox', { name: 'Confirmo comissão zero' }))
    fireEvent.change(within(zero).getByRole('textbox', { name: 'Motivo' }), { target: { value: 'ab' } })
    expect((approve as HTMLButtonElement).disabled).toBe(true)
    expect(aprovarComissao).not.toHaveBeenCalled()

    fireEvent.change(within(zero).getByRole('textbox', { name: 'Motivo' }), { target: { value: 'abc' } })
    expect((approve as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(approve)
    await waitFor(() => expect(aprovarComissao).toHaveBeenCalledWith('zero-1', { confirmar_zero: true, motivo: 'abc' }))

    const semMarca = screen.getByRole('article', { name: 'pendente sem-marca-1' })
    expect(within(semMarca).queryByRole('button', { name: 'Aprovar' })).toBeNull()
    expect(within(semMarca).getByText('Sem marca vinculada')).toBeTruthy()
    expect(within(semMarca).getAllByText('R$ 0,00')).toHaveLength(2)
  })

  it('hides the queue from gerente and does not call pendentes', async () => {
    renderQueue('gerente')
    expect(screen.queryByText('Pendentes')).toBeNull()
    await waitFor(() => expect(listComissoesPendentes).not.toHaveBeenCalled())
  })

  it('hides approve actions from financeiro_readonly', async () => {
    renderQueue('financeiro_readonly')
    expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull()
    await waitFor(() => expect(listComissoesPendentes).not.toHaveBeenCalled())
  })

  it('shows the API error and keeps the row pending on 409', async () => {
    const error = new axios.AxiosError('conflict')
    error.response = {
      status: 409,
      data: { error: 'Comissão zerada exige confirmação' },
      statusText: 'Conflict',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    }
    vi.mocked(aprovarComissao).mockRejectedValue(error)
    renderQueue('franqueador_master')
    const zero = await screen.findByRole('article', { name: 'pendente zero-1' })
    fireEvent.click(within(zero).getByRole('checkbox', { name: 'Confirmo comissão zero' }))
    fireEvent.change(within(zero).getByRole('textbox', { name: 'Motivo' }), { target: { value: 'abc' } })
    fireEvent.click(within(zero).getByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByText('Comissão zerada exige confirmação')).toBeTruthy()
    expect(screen.getByRole('article', { name: 'pendente zero-1' })).toBeTruthy()
  })
})

describe('notifyReprocessar', () => {
  it('includes the three counts and keeps a returned zero', () => {
    const push = vi.fn()
    notifyReprocessar(push, { data: { orfas: 0, divergentes_gmv: 2, ignoradas: 4 } })
    expect(push).toHaveBeenCalledWith('0 órfãs, 2 com GMV divergente, 4 ignoradas.', 'success')
  })

  it('does not toast success when reprocessar fails', () => {
    const push = vi.fn()
    notifyReprocessar(push, { error: new Error('falhou'), data: { orfas: 3, divergentes_gmv: 1, ignoradas: 0 } })
    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('falhou', 'error')
  })
})
