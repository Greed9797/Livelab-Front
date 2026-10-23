// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ClientesLayout } from './ClientesLayout'

afterEach(cleanup)

function show(initial = '/clientes') {
  render(<MemoryRouter initialEntries={[initial]}><Routes>
    <Route path="/clientes" element={<ClientesLayout />}>
      <Route index element={<p>Registros da carteira</p>} />
      <Route path="crm" element={<p>Quadro de oportunidades</p>} />
    </Route>
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
})
