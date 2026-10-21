// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClienteConteudoPage } from './ClienteConteudoPage'
import { getClienteConteudoLives } from '../services/domain'

let currentUser = { id: 'user-a', tenant_id: 'tenant-1' }
vi.mock('../services/domain', () => ({ getClienteConteudoLives: vi.fn() }))
vi.mock('../stores/auth-store', () => ({ useCurrentUser: () => currentUser }))

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><ClienteConteudoPage /></QueryClientProvider>)
}

describe('ClienteConteudoPage', () => {
  beforeEach(() => { currentUser = { id: 'user-a', tenant_id: 'tenant-1' }; vi.mocked(getClienteConteudoLives).mockReset() })
  afterEach(cleanup)

  it('does not keep account A lives on screen while account B is loading', async () => {
    vi.mocked(getClienteConteudoLives).mockImplementation(async () => {
      if (currentUser.id === 'user-a') return { periodo: { mes: 10, ano: 2026 }, resumo: { gmv: 0, lives: 1, pedidos: 0, horas: 0 }, total: 1, limit: 50, offset: 0, lives: [{ id: 'a', iniciado_em: '2026-10-01', encerrado_em: '2026-10-01', duracao_min: 0, gmv: 0, pedidos: 0, status: 'encerrada', status_publicacao: 'revisado' }] } as never
      return new Promise(() => undefined) as never
    })
    const view = mount()
    await screen.findByText(/1\s*lives/)
    currentUser = { id: 'user-b', tenant_id: 'tenant-1' }
    view.rerender(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ClienteConteudoPage /></QueryClientProvider>)
    await waitFor(() => expect(screen.queryByText(/1\s*lives/)).toBeNull())
    expect(screen.getByText('Carregando lives')).toBeTruthy()
  })
})
