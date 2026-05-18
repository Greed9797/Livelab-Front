import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getLiveAtualDaCabine, getLivePorId, iniciarLive, publishLive } from './domain'
import { apiGet, apiPatch, apiPost } from './api'

vi.mock('./api', () => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}))

describe('domain live operations', () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset()
    vi.mocked(apiPatch).mockReset()
    vi.mocked(apiPost).mockReset()
  })

  it('posts the old start-live flow to /lives', async () => {
    vi.mocked(apiPost).mockResolvedValue({ id: 'live-1' })

    await iniciarLive({
      cabine_id: 'cabine-1',
      cliente_id: 'cliente-1',
      tiktok_username: 'marca_live',
    })

    expect(apiPost).toHaveBeenCalledWith('/lives', {
      cabine_id: 'cabine-1',
      cliente_id: 'cliente-1',
      tiktok_username: 'marca_live',
    })
  })

  it('loads a selected live by id from the canonical lives endpoint', async () => {
    vi.mocked(apiGet).mockResolvedValue({ id: 'live-1' })

    await getLivePorId('live-1')

    expect(apiGet).toHaveBeenCalledWith('/lives/live-1')
  })

  it('publishes a live through the dedicated publicar endpoint', async () => {
    vi.mocked(apiPatch).mockResolvedValue({ id: 'live-1', status_publicacao: 'publicado' })

    await publishLive('live-1', 'publicado')

    expect(apiPatch).toHaveBeenCalledWith('/lives/live-1/publicar', { status_publicacao: 'publicado' })
  })

  it('normalizes cabine live-atual payload into the selected live shape', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      live_ativa: true,
      live_id: 'live-1',
      viewer_count: 25,
      gmv_atual: 1200,
      total_orders: 8,
      iniciado_em: '2026-05-18T14:00:00.000Z',
    })

    await expect(getLiveAtualDaCabine('cabine-1')).resolves.toMatchObject({
      id: 'live-1',
      live_ativa: true,
      viewer_count: 25,
      gmv_atual: 1200,
      total_orders: 8,
    })
  })

  it('returns null when cabine has no active live', async () => {
    vi.mocked(apiGet).mockResolvedValue({ live_ativa: false })

    await expect(getLiveAtualDaCabine('cabine-1')).resolves.toBeNull()
  })
})
