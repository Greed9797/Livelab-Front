/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CadastrosApiKeySettings } from './CadastrosApiKeySettings'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), toast: vi.fn(), user: { id: 'admin-1', tenant_id: 'unit-1', papel: 'franqueado' } as { id: string; tenant_id: string; papel: string } | null }))
vi.mock('../../services/api', () => ({ apiGet: mocks.get, apiPost: mocks.post, extractErrorMessage: () => 'Operação recusada.' }))
vi.mock('../../stores/auth-store', () => ({ useCurrentUser: () => mocks.user }))
vi.mock('../ui/Toast', () => ({ useToast: () => ({ push: mocks.toast }) }))

const metadata = { id: 'key-1', nome: 'Revisão cadastral', prefixo: 'll_live_demo', escopo: 'cadastros', expira_em: '2030-01-08T12:00:00.000Z', revogada_em: null }
const ephemeral = 'synthetic-once-only-value'

function panel(tenantId = 'unit-1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(<QueryClientProvider client={client}><CadastrosApiKeySettings tenantId={tenantId} /></QueryClientProvider>)
  return { ...view, client, change: (tenant: string) => view.rerender(<QueryClientProvider client={client}><CadastrosApiKeySettings tenantId={tenant} /></QueryClientProvider>) }
}

beforeEach(() => {
  mocks.user = { id: 'admin-1', tenant_id: 'unit-1', papel: 'franqueado' }
  mocks.get.mockResolvedValue({ items: [] })
  mocks.post.mockResolvedValue({ ...metadata, chave: ephemeral })
})
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); localStorage.clear(); sessionStorage.clear() })

describe('cadastros API key administration', () => {
  it.each(['cliente_parceiro', 'gerente', 'operacional', 'automacao_cadastros'])('does not request metadata or render controls for %s', (papel) => {
    mocks.user!.papel = papel
    panel()
    expect(screen.queryByRole('button', { name: 'Gerar chave por 7 dias' })).toBeNull()
    expect(mocks.get).not.toHaveBeenCalled()
  })

  it('denies missing identity and mismatched unit', () => {
    const view = panel('other-unit')
    expect(mocks.get).not.toHaveBeenCalled()
    mocks.user = null
    view.change('unit-1')
    expect(mocks.get).not.toHaveBeenCalled()
  })

  it('lists only cadastro metadata and strips unexpected secrets before caching', async () => {
    mocks.get.mockResolvedValue({ items: [{ ...metadata, chave: ephemeral }, { ...metadata, id: 'finance', nome: 'Financeiro privado', escopo: 'financeiro' }] })
    const { client } = panel()
    expect(await screen.findByText('Revisão cadastral')).toBeTruthy()
    expect(screen.queryByText('Financeiro privado')).toBeNull()
    expect(mocks.get).toHaveBeenCalledWith('/api-keys')
    expect(JSON.stringify(client.getQueryCache().getAll().map((query) => query.state.data))).not.toContain(ephemeral)
    expect(client.getQueryCache().getAll()[0].queryKey).toEqual(['cadastros-api-keys', 'unit-1', 'admin-1'])
  })

  it('creates only cadastro scope with seven-day expiry and keeps the result out of caches and storage', async () => {
    const { client } = panel()
    const button = await screen.findByRole('button', { name: 'Gerar chave por 7 dias' })
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false))
    const before = Date.now()
    fireEvent.click(button)
    await screen.findByLabelText('Chave gerada')
    const [path, body] = mocks.post.mock.calls[0]
    expect(path).toBe('/api-keys')
    expect(body.escopo).toBe('cadastros')
    expect(body.nome).toBe('Agente de revisão cadastral')
    expect(Date.parse(body.expira_em) - before).toBeGreaterThanOrEqual(7 * 86400000)
    expect(Date.parse(body.expira_em) - Date.now()).toBeLessThanOrEqual(7 * 86400000)
    const field = screen.getByLabelText('Chave gerada') as HTMLInputElement
    expect(field.type).toBe('password')
    expect(field.value).toBe(ephemeral)
    expect(client.getMutationCache().getAll()).toHaveLength(0)
    expect(JSON.stringify(client.getQueryCache().getAll().map((query) => query.state.data))).not.toContain(ephemeral)
    expect(localStorage.length + sessionStorage.length).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Já guardei a chave' }))
    expect(screen.queryByLabelText('Chave gerada')).toBeNull()
  })

  it('prevents repeated issuance while a request is pending and while an unsaved key is displayed', async () => {
    let resolve!: (value: unknown) => void
    mocks.post.mockImplementation(() => new Promise((done) => { resolve = done }))
    panel()
    const button = await screen.findByRole('button', { name: 'Gerar chave por 7 dias' })
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false))
    fireEvent.click(button)
    fireEvent.click(button)
    expect(mocks.post).toHaveBeenCalledTimes(1)
    resolve({ ...metadata, chave: ephemeral })
    await screen.findByLabelText('Chave gerada')
    expect(screen.getByRole('button', { name: 'Gerar chave por 7 dias' }).hasAttribute('disabled')).toBe(true)
  })

  it('removes the issued value and changes the query identity on unit/user changes', async () => {
    const view = panel()
    const button = await screen.findByRole('button', { name: 'Gerar chave por 7 dias' })
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false))
    fireEvent.click(button)
    await screen.findByLabelText('Chave gerada')
    mocks.user = { id: 'admin-2', tenant_id: 'unit-2', papel: 'franqueador_master' }
    view.change('unit-2')
    expect(screen.queryByLabelText('Chave gerada')).toBeNull()
    await waitFor(() => expect(view.client.getQueryCache().getAll().some((query) => JSON.stringify(query.queryKey) === JSON.stringify(['cadastros-api-keys', 'unit-2', 'admin-2']))).toBe(true))
  })

  it('discards a late response after changing identity', async () => {
    let resolve!: (value: unknown) => void
    mocks.post.mockImplementation(() => new Promise((done) => { resolve = done }))
    const view = panel()
    const button = await screen.findByRole('button', { name: 'Gerar chave por 7 dias' })
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false))
    fireEvent.click(button)
    mocks.user = { id: 'admin-2', tenant_id: 'unit-2', papel: 'franqueado' }
    view.change('unit-2')
    resolve({ ...metadata, chave: ephemeral })
    await waitFor(() => expect(screen.queryByLabelText('Chave gerada')).toBeNull())
  })

  it('fails closed when metadata cannot be loaded and supports retry', async () => {
    mocks.get.mockRejectedValueOnce(new Error('denied'))
    panel()
    expect(await screen.findByText('Operação recusada.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Gerar chave por 7 dias' }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gerar chave por 7 dias' }).hasAttribute('disabled')).toBe(false))
  })

  it('shows issuance failures without a secret and allows a later attempt', async () => {
    mocks.post.mockRejectedValueOnce(new Error('denied'))
    panel()
    const button = await screen.findByRole('button', { name: 'Gerar chave por 7 dias' })
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false))
    fireEvent.click(button)
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Operação recusada.', 'error'))
    expect(screen.queryByLabelText('Chave gerada')).toBeNull()
    expect(button.hasAttribute('disabled')).toBe(false)
  })

  it('revokes only a selected cadastro key after a second explicit click', async () => {
    mocks.get.mockResolvedValue({ items: [metadata, { ...metadata, id: 'old', nome: 'Revogada', revogada_em: '2030-01-01' }] })
    panel()
    fireEvent.click(await screen.findByRole('button', { name: 'Revogar Revisão cadastral' }))
    expect(mocks.post).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar revogação' }))
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api-keys/key-1/revogar'))
    expect(screen.queryByRole('button', { name: 'Revogar Revogada' })).toBeNull()
  })

  it('reveals only on demand, copies via a user action, and warns before leaving', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    panel()
    const button = await screen.findByRole('button', { name: 'Gerar chave por 7 dias' })
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false))
    fireEvent.click(button)
    const field = await screen.findByLabelText('Chave gerada') as HTMLInputElement
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar chave' }))
    expect(field.type).toBe('text')
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar chave' }))
    expect(field.type).toBe('password')
    fireEvent.click(screen.getByRole('button', { name: 'Copiar chave' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ephemeral))
    writeText.mockRejectedValueOnce(new Error('clipboard denied'))
    fireEvent.click(screen.getByRole('button', { name: 'Copiar chave' }))
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Não foi possível copiar. Use Mostrar chave e copie manualmente.', 'error'))
  })

  it('can cancel revocation and reports failed revocation without dropping the selection', async () => {
    mocks.get.mockResolvedValue({ items: [metadata] })
    mocks.post.mockRejectedValueOnce(new Error('denied'))
    panel()
    fireEvent.click(await screen.findByRole('button', { name: 'Revogar Revisão cadastral' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar revogação' }))
    expect(mocks.post).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Revogar Revisão cadastral' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar revogação' }))
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Operação recusada.', 'error'))
    expect(screen.getByRole('button', { name: 'Confirmar revogação' }).hasAttribute('disabled')).toBe(false)
  })
})
