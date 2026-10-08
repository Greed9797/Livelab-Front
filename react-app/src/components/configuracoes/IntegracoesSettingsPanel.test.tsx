/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IntegracoesSettingsPanel } from './IntegracoesSettingsPanel'

const mocks = vi.hoisted(() => ({
  getStatus: vi.fn(),
  getConnectUrl: vi.fn(),
  updateSettings: vi.fn(),
  toastPush: vi.fn(),
}))

vi.mock('../../services/domain', () => ({
  getTikTokIntegrationStatus: mocks.getStatus,
  getTikTokConnectUrl: mocks.getConnectUrl,
  updateConfiguracoes: mocks.updateSettings,
}))

vi.mock('../ui/Toast', () => ({ useToast: () => ({ push: mocks.toastPush }) }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderPanel(settings: Record<string, unknown> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><IntegracoesSettingsPanel tenantId="tenant-1" settings={settings} /></QueryClientProvider>)
}

describe('integrations settings panel', () => {
  it('does not offer OAuth when the server has not declared it available or render credentials', async () => {
    mocks.getStatus.mockResolvedValue({
      connected: true,
      capability: { supported: true, oauth: { available: false, reason: 'oauth_disabled' }, scope: 'user.info.basic' },
      credential: { registered: true, valid_by_expiry: true, access_token: 'do-not-render', user_id: 'private-id' },
    })
    renderPanel()

    expect(await screen.findByText('Credencial registrada e dentro da validade local')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Conectar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reconectar' })).toBeNull()
    expect(document.body.textContent).not.toContain('do-not-render')
    expect(document.body.textContent).not.toContain('private-id')
  })

  it('opens OAuth in the user gesture popup and invalidates status after callback message', async () => {
    mocks.getStatus.mockResolvedValue({ capability: { oauth: { available: true } }, credential: { registered: false } })
    mocks.getConnectUrl.mockResolvedValue({ url: 'https://www.tiktok.com/authorize' })
    const popup = { closed: false, document: { title: '' }, location: { href: '' }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
    const view = renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: 'Conectar' }))
    expect(open).toHaveBeenCalledOnce()
    await waitFor(() => expect(popup.location.href).toBe('https://www.tiktok.com/authorize'))
    const popupWindow = open.mock.results[0]?.value as Window
    window.dispatchEvent(new MessageEvent('message', { source: popupWindow, data: 'tiktok_oauth_complete' }))
    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(2))
    view.unmount()
    open.mockRestore()
  })

  it('saves only the changed email notification preference', async () => {
    mocks.getStatus.mockResolvedValue({ capability: { oauth: { available: false } }, credential: { registered: false } })
    mocks.updateSettings.mockResolvedValue({ ok: true })
    renderPanel({ notif_email_ativo: true, notif_live_meta: true, notif_lead_novo: true, notif_contrato: true })

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Metas de live' }))
    await waitFor(() => expect(mocks.updateSettings.mock.calls[0]?.[0]).toEqual({ notif_live_meta: false }))
  })
})
