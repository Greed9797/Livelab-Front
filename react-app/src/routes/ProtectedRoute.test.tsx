// @vitest-environment jsdom
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuthStore } from '../stores/auth-store'
import type { User } from '../types/models'

const client: User = { id: 'client-1', nome: 'Cliente', email: 'client@example.com', papel: 'cliente_parceiro', tenant_id: 'tenant-1', tenant_nome: 'Tenant' }
const internal: User = { ...client, id: 'internal-1', papel: 'franqueado' }
function Location() { return <p data-testid="location">{useLocation().pathname}{useLocation().search}</p> }
function mount(entry: string) {
  return render(<MemoryRouter initialEntries={[entry]}><Routes>
    <Route element={<ProtectedRoute />}>
      <Route path="/ranking" element={<><p>ranking outlet</p><Location /></>} />
      <Route path="/cliente" element={<Location />} />
      <Route path="/cliente/conteudo" element={<><p>portal outlet</p><Location /></>} />
    </Route>
  </Routes></MemoryRouter>)
}

describe('ProtectedRoute client portal boundary', () => {
  beforeEach(() => useAuthStore.setState({ user: client, isBootstrapped: true }))
  afterEach(() => { cleanup(); useAuthStore.setState({ user: null, isBootstrapped: true }) })

  it('redirects a client from ranking with query parameters before the outlet renders', async () => {
    mount('/ranking?unidade=tenant-2')
    expect((await screen.findByTestId('location')).textContent).toBe('/cliente')
    expect(screen.queryByText('ranking outlet')).toBeNull()
  })

  it('allows client portal paths', async () => {
    mount('/cliente/conteudo')
    expect(await screen.findByText('portal outlet')).toBeTruthy()
  })

  it('preserves ranking access for internal roles', async () => {
    useAuthStore.setState({ user: internal, isBootstrapped: true })
    mount('/ranking')
    expect(await screen.findByText('ranking outlet')).toBeTruthy()
  })
})
