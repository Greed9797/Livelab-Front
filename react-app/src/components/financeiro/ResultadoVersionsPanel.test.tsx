/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ResultadoVersionsPanel } from './ResultadoVersionsPanel'

const consultar = vi.fn()
vi.mock('../../services/financeiro-resultado-versions', () => ({ consultarResultadoVersions: (...args: unknown[]) => consultar(...args) }))

function mount(mes = '2026-09') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ResultadoVersionsPanel mes={mes} /></QueryClientProvider>)
}

beforeEach(() => consultar.mockReset())
afterEach(cleanup)

describe('ResultadoVersionsPanel', () => {
  it('shows loading, closed status and saved versions without a balance', async () => {
    let resolve!: (value: unknown) => void
    consultar.mockReturnValue(new Promise((done) => { resolve = done }))
    mount()
    expect(screen.getByRole('status').textContent).toContain('Carregando')
    resolve({ mes: '2026-09', estado: 'fechado', versao_atual: 2, versoes: [
      { id: 'a', versao: 1, criado_em: '2026-09-30T12:00:00Z' },
      { id: 'b', versao: 2, criado_em: '2026-10-06T12:00:00Z' },
    ] })
    expect(await screen.findByText('Fechado')).toBeTruthy()
    expect(screen.getByText('v1')).toBeTruthy()
    expect(screen.getByText('v2')).toBeTruthy()
    expect(screen.getByText('Fechamento vigente')).toBeTruthy()
    expect(screen.getByText('Histórico')).toBeTruthy()
    expect(screen.queryByText(/saldo|R\$/i)).toBeNull()
    expect(consultar).toHaveBeenCalledWith('2026-09')
  })

  it('shows reopened state and no current closure', async () => {
    consultar.mockResolvedValue({ mes: '2026-09', estado: 'reaberto', versao_atual: 1,
      versoes: [{ id: 'a', versao: 1, criado_em: '2026-09-30T12:00:00Z' }] })
    mount()
    expect(await screen.findByText('Reaberto')).toBeTruthy()
    expect(screen.queryByText('Fechamento vigente')).toBeNull()
    expect(screen.getByText('Histórico')).toBeTruthy()
  })

  it('distinguishes no closure from request failure', async () => {
    consultar.mockResolvedValueOnce({ mes: '2026-09', estado: 'aberto', versao_atual: 0, versoes: [] })
    const view = mount()
    expect(await screen.findByText('Nenhum fechamento registrado para esta competência.')).toBeTruthy()
    view.unmount()
    consultar.mockRejectedValueOnce(new Error('Falha na consulta'))
    mount()
    await waitFor(() => expect(screen.getByText('Falha na consulta')).toBeTruthy())
    expect(screen.queryByText('Nenhum fechamento registrado para esta competência.')).toBeNull()
  })
})
