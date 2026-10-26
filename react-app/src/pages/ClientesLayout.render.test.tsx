// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientesLayout } from './ClientesLayout'
import { ProtectedRoute } from '../routes/ProtectedRoute'
import { commercialRoles, masterRoles } from '../utils/access'

const auth = vi.hoisted(() => ({ user: { id: 'user-1', tenant_id: 'tenant-1', papel: 'franqueado', onboarding_completed: true } }))
vi.mock('../stores/auth-store', () => ({
  useAuthStore: (select: (state: { user: typeof auth.user; isBootstrapped: boolean }) => unknown) => select({ user: auth.user, isBootstrapped: true }),
}))

afterEach(cleanup)
beforeEach(() => { auth.user.papel = 'franqueado' })

function show(initial = '/clientes') {
  render(<MemoryRouter initialEntries={[initial]}><Routes>
    <Route element={<ProtectedRoute allowedRoles={[...masterRoles, ...commercialRoles]} fallback="/denied" />}>
      <Route path="/clientes" element={<ClientesLayout />}>
        <Route index element={<p>Registros da carteira</p>} />
        <Route path="crm" element={<p>Quadro de oportunidades</p>} />
      </Route>
    </Route>
    <Route path="/denied" element={<p>Acesso não autorizado</p>} />
    <Route path="/cliente" element={<p>Portal do cliente</p>} />
  </Routes></MemoryRouter>)
}

describe('Abas de Clientes', () => {
  it('opens CRM inside Clientes and preserves the way back to the portfolio', () => {
    show()
    const nav = screen.getByRole('navigation', { name: 'Navegação de Clientes' })
    const portfolio = within(nav).getByRole('link', { name: 'Carteira' })
    const crm = within(nav).getByRole('link', { name: 'CRM' })
    expect(portfolio.getAttribute('aria-current')).toBe('page')
    fireEvent.click(crm)
    expect(screen.getByText('Quadro de oportunidades')).toBeTruthy()
    expect(crm.getAttribute('aria-current')).toBe('page')
    expect(portfolio.getAttribute('aria-current')).toBeNull()
    fireEvent.click(portfolio)
    expect(screen.getByText('Registros da carteira')).toBeTruthy()
  })

  it('supports opening the CRM URL directly with a single Clientes heading', () => {
    show('/clientes/crm')
    expect(screen.getAllByRole('heading', { name: 'Clientes', level: 1 })).toHaveLength(1)
    expect(screen.getByText('Quadro de oportunidades')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'CRM' }).getAttribute('href')).toBe('/clientes/crm')
  })

  it.each([
    ['cliente_parceiro', 'Portal do cliente'],
    ['apresentadora', 'Acesso não autorizado'],
    ['operacional', 'Acesso não autorizado'],
  ])('does not grant commercial access to %s', (papel, destination) => {
    auth.user.papel = papel
    show('/clientes/crm')
    expect(screen.getByText(destination)).toBeTruthy()
    expect(screen.queryByText('Quadro de oportunidades')).toBeNull()
  })
})
