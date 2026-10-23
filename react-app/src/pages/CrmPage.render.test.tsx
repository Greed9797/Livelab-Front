// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CrmPage } from './CrmPage'
import { QK } from '../services/query-keys'

const mocks = vi.hoisted(() => ({
  user: { id: 'user-1', tenant_id: 'tenant-1', papel: 'franqueado', nome: 'Franqueado', email: 'user@example.test' },
  getLeads: vi.fn(), getLead: vi.fn(), createLead: vi.fn(), updateLead: vi.fn(),
  deleteLead: vi.fn(), ganharLead: vi.fn(), addLeadContato: vi.fn(), addLeadTarefa: vi.fn(),
}))

vi.mock('../stores/auth-store', () => ({ useCurrentUser: () => mocks.user }))
vi.mock('../services/domain', () => ({
  getLeads: mocks.getLeads, getLead: mocks.getLead, createLead: mocks.createLead,
  updateLead: mocks.updateLead, deleteLead: mocks.deleteLead, ganharLead: mocks.ganharLead,
  addLeadContato: mocks.addLeadContato, addLeadTarefa: mocks.addLeadTarefa,
}))

const lead = { id: 'lead-1', nome: 'Marca Blumenau', crm_etapa: 'lead_novo', valor_oportunidade: 1200 }
const clients: QueryClient[] = []
function showPage(client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })) {
  clients.push(client)
  return render(<QueryClientProvider client={client}><MemoryRouter><CrmPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.user = { ...mocks.user, tenant_id: 'tenant-1', papel: 'franqueado' }
  mocks.getLeads.mockResolvedValue([lead])
  mocks.getLead.mockResolvedValue(lead)
  mocks.updateLead.mockResolvedValue(lead)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); clients.splice(0).forEach((client) => client.clear()) })

describe('CRM dos clientes', () => {
  it('does not reuse unscoped leads from another unit', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    client.setQueryData(QK.leads, [{ ...lead, id: 'other-lead', nome: 'Outra unidade' }])
    showPage(client)
    await waitFor(() => expect(mocks.getLeads).toHaveBeenCalled())
    expect(await screen.findByRole('button', { name: /Marca Blumenau/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Outra unidade/ })).toBeNull()
  })

  it('keeps read-only staff from creating, editing or dragging leads', async () => {
    mocks.user.papel = 'auditor'
    showPage()
    const card = await screen.findByRole('button', { name: /Marca Blumenau/ })
    expect(screen.queryByRole('button', { name: 'Novo lead' })).toBeNull()
    expect(card.draggable).toBe(false)
    fireEvent.click(card)
    const drawer = await screen.findByRole('dialog')
    expect(within(drawer).queryByRole('button', { name: 'Editar' })).toBeNull()
    expect(within(drawer).queryByRole('button', { name: 'Excluir' })).toBeNull()
  })

  it('cancels marking a lead lost without writing to the API', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue(null)
    showPage()
    fireEvent.click(await screen.findByRole('button', { name: /Marca Blumenau/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar perdido' }))
    const confirmation = await screen.findByRole('dialog', { name: /Marcar.*perdido/i })
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancelar' }))
    expect(mocks.updateLead).not.toHaveBeenCalled()
  })

  it('restores the original stage when saving a move and refetch both fail', async () => {
    mocks.updateLead.mockRejectedValue(new Error('Falha ao mover lead'))
    mocks.getLeads.mockResolvedValueOnce([lead]).mockRejectedValue(new Error('Sem conexão'))
    showPage()
    await screen.findByRole('button', { name: /Marca Blumenau/ })
    const column = screen.getByRole('region', { name: 'Em negociação' })
    fireEvent.drop(column, { dataTransfer: { getData: () => 'lead-1' } })
    await waitFor(() => expect(mocks.updateLead).toHaveBeenCalled())
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Novo lead' })).getByRole('button', { name: /Marca Blumenau/ })).toBeTruthy())
    expect(within(column).queryByRole('button', { name: /Marca Blumenau/ })).toBeNull()
  })
})
