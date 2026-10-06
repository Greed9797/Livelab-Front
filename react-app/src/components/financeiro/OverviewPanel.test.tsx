/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { OverviewPanel } from './OverviewPanel'

const overview = vi.fn()
const exceptions = vi.fn()
vi.mock('../../services/financeiro-overview', () => ({
  consultarOverview: (...args: unknown[]) => overview(...args),
  consultarExceptions: (...args: unknown[]) => exceptions(...args),
}))

const ID = '00000000-0000-4000-8000-000000000001'

function Harness() {
  const location = useLocation()
  return <><output data-testid="location">{location.search}</output><OverviewPanel mes="2026-10" /></>
}

beforeEach(() => {
  overview.mockReset().mockResolvedValue({
    mes: '2026-10', data_referencia: '2026-10-06', estado: 'apurado', incompletos: 0,
    total_excecoes: 1, totais: { receber: { quantidade: 1, previsto: '10.00', pago: '0.00', aberto: '10.00' },
      pagar: { quantidade: 0, previsto: '0.00', pago: '0.00', aberto: '0.00' } },
  })
  exceptions.mockReset().mockResolvedValue({
    estado: 'apurado', total_registros: 1, pagina: 1, limite: 50, total_paginas: 1,
    itens: [{ tipo: 'vencido', motivo: null, natureza: 'receita', origem: 'marca_fixo', id: ID,
      componente: 'fixo', data_vencimento: '2026-10-01', saldo_aberto: '10.00' }],
  })
})
afterEach(cleanup)

describe('OverviewPanel', () => {
  it('abre a obrigação da exceção por origem, ID e componente', async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/financeiro?mes=2026-10&tab=visao-geral&fin_status=pago']}><Harness /></MemoryRouter>
    </QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir lançamento' }))
    const search = screen.getByTestId('location').textContent ?? ''
    expect(search).toContain('tab=receber')
    expect(search).toContain('fin_origem=marca_fixo')
    expect(search).toContain(`fin_titulo_id=${ID}`)
    expect(search).toContain(`fin_id=marca_fixo%3A${ID}%3Afixo`)
    expect(search).not.toContain('fin_status=pago')
  })

  it('abre a lista correta quando a exceção não tem identidade de obrigação', async () => {
    exceptions.mockResolvedValue({ estado: 'incompleto', total_registros: 1, pagina: 1, limite: 50, total_paginas: 1,
      itens: [{ tipo: 'revisao_dados', motivo: 'identidade_ausente', natureza: 'custo', origem: null,
        id: null, componente: null, data_vencimento: null, saldo_aberto: null }] })
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/financeiro?mes=2026-10&tab=visao-geral']}><Harness /></MemoryRouter>
    </QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir lista' }))
    expect(screen.getByTestId('location').textContent).toContain('tab=pagar')
  })
})
