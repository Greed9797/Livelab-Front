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
  mocks.createLead.mockResolvedValue(lead)
  mocks.addLeadContato.mockResolvedValue({ id: 'contact-1' })
  mocks.addLeadTarefa.mockResolvedValue({ id: 'task-1' })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); clients.splice(0).forEach((client) => client.clear()) })

describe('CRM dos clientes', () => {
  it('lets a franchisee create a lead using the existing API', async () => {
    showPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Novo lead' }))
    fireEvent.change(screen.getByLabelText('Nome da marca/lead'), { target: { value: 'Nova marca' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar lead' }))
    await waitFor(() => expect(mocks.createLead).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Nova marca', crm_etapa: 'lead_novo' })))
  })

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

  it('closes the previous unit draft when the authenticated unit changes', async () => {
    const view = showPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Novo lead' }))
    fireEvent.change(screen.getByLabelText('Nome da marca/lead'), { target: { value: 'Rascunho privado' } })
    mocks.user = { ...mocks.user, tenant_id: 'tenant-2' }
    view.rerender(<QueryClientProvider client={clients[0]}><MemoryRouter><CrmPage /></MemoryRouter></QueryClientProvider>)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByDisplayValue('Rascunho privado')).toBeNull()
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

  it('requires the loss reason and saves it only after confirmation', async () => {
    showPage()
    fireEvent.click(await screen.findByRole('button', { name: /Marca Blumenau/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar perdido' }))
    const dialog = await screen.findByRole('dialog', { name: /Marcar.*perdido/i })
    expect(mocks.updateLead).not.toHaveBeenCalled()
    fireEvent.change(within(dialog).getByLabelText('Motivo da perda'), { target: { value: 'Orçamento adiado' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(mocks.updateLead).toHaveBeenCalledWith('lead-1', { crm_etapa: 'perdido', motivo_perda: 'Orçamento adiado' }))
  })

  it.each([
    ['Registrar contato', 'Resumo do contato', 'Conversa inicial', 'addLeadContato'],
    ['Criar tarefa', 'Título da tarefa', 'Enviar proposta', 'addLeadTarefa'],
  ] as const)('saves %s with the current modal', async (button, label, value, method) => {
    showPage()
    fireEvent.click(await screen.findByRole('button', { name: /Marca Blumenau/ }))
    fireEvent.click(await screen.findByRole('button', { name: button }))
    const dialog = await screen.findByRole('dialog', { name: button })
    fireEvent.change(within(dialog).getByLabelText(label), { target: { value } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(mocks[method]).toHaveBeenCalledWith('lead-1', expect.objectContaining(method === 'addLeadContato' ? { resumo: value } : { titulo: value })))
  })

  it('offers conversion for a won lead that has no linked client yet', async () => {
    mocks.getLead.mockResolvedValue({ ...lead, crm_etapa: 'ganho', convertido_cliente_id: null })
    showPage()
    fireEvent.click(await screen.findByRole('button', { name: /Marca Blumenau/ }))
    expect(await screen.findByRole('button', { name: 'Converter em cliente' })).toBeTruthy()
  })

  it('keeps an action error in its modal and removes it from view on cancel', async () => {
    mocks.addLeadContato.mockRejectedValue(new Error('Falha ao registrar contato'))
    showPage()
    fireEvent.click(await screen.findByRole('button', { name: /Marca Blumenau/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar contato' }))
    const dialog = await screen.findByRole('dialog', { name: 'Registrar contato' })
    fireEvent.change(within(dialog).getByLabelText('Resumo do contato'), { target: { value: 'Contato de teste' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))
    await within(dialog).findByText('Falha ao registrar contato')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('Falha ao registrar contato')).toBeNull()
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
