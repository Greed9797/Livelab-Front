/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AgingPanel } from './AgingPanel'

const consultar = vi.fn()
vi.mock('../../services/financeiro-aging', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/financeiro-aging')>()
  return { ...original, consultarAging: (...args: unknown[]) => consultar(...args) }
})

function Harness() {
  const location = useLocation()
  return <><output data-testid="url">{location.search}</output><AgingPanel /></>
}

function mount(url = '/financeiro?tab=aging&mes=2026-10') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[url]}><Harness /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => consultar.mockReset().mockResolvedValue({
  data_referencia: '2026-10-06', competencia_inicio: '2026-07', competencia_fim: '2026-10', limites_dias: [7, 30],
  atrasado: { quantidade: 1, saldo_aberto: '123456789012345.67' }, vence_hoje: { quantidade: 1, saldo_aberto: '0.01' },
  futuro: { quantidade: 0, saldo_aberto: '0.00' },
  faixas: [{ de_dias: 1, ate_dias: 7, quantidade: 1, saldo_aberto: '123456789012345.67' },
    { de_dias: 8, ate_dias: 30, quantidade: 0, saldo_aberto: '0.00' }, { de_dias: 31, ate_dias: null, quantidade: 0, saldo_aberto: '0.00' }],
}))
afterEach(cleanup)

describe('AgingPanel', () => {
  it('requires explicit filters, persists them in the URL and renders distinct buckets', async () => {
    mount()
    expect(consultar).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Data de referência'), { target: { value: '2026-10-06' } })
    fireEvent.change(screen.getByLabelText('Competência inicial'), { target: { value: '2026-07' } })
    fireEvent.change(screen.getByLabelText('Competência final'), { target: { value: '2026-10' } })
    fireEvent.change(screen.getByLabelText('Limites das faixas (dias)'), { target: { value: '7,30' } })
    await waitFor(() => expect(consultar).toHaveBeenLastCalledWith({ data_referencia: '2026-10-06', competencia_inicio: '2026-07', competencia_fim: '2026-10', faixas: '7,30' }))
    expect(screen.getByTestId('url').textContent).toContain('aging_faixas=7%2C30')
    expect(await screen.findByText('Vence hoje')).toBeTruthy()
    expect(screen.getByText('Vence no futuro')).toBeTruthy()
    expect(screen.getAllByText('R$ 123.456.789.012.345,67')).toHaveLength(2)
    expect(screen.getByText('Acima de 30 dias')).toBeTruthy()
  })

  it('does not request invalid bounds or show stale balances', async () => {
    mount('/financeiro?tab=aging&aging_data_referencia=2026-10-06&aging_competencia_inicio=2026-07&aging_competencia_fim=2026-10&aging_faixas=30,7')
    expect(screen.getByRole('alert').textContent).toContain('crescentes')
    expect(consultar).not.toHaveBeenCalled()
    expect(screen.queryByText('R$ 0,00')).toBeNull()
  })
})
