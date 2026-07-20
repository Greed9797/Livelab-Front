import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCliente, createVideo, deleteApresentadora, deleteCabine, deleteLive, deleteUsuario, deleteVideo, ganharLead, getAgendaConflitos, getDailyAnalytics, getLead, getLiveAtualDaCabine, getLivePorId, getLives, getLiveTiktokStatus, getMasterCrm, getVideos, iniciarLive, publishLive, updateApresentadora, updateLive, updateUsuario, updateVideo } from './domain'
import { apiDelete, apiGet, apiPatch, apiPost } from './api'

vi.mock('./api', () => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}))

describe('domain live operations', () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset()
    vi.mocked(apiDelete).mockReset()
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

  it('posts manual customer creation to /clientes', async () => {
    vi.mocked(apiPost).mockResolvedValue({ id: 'cliente-1' })

    await createCliente({ nome: 'Marca A', celular: '47999999999' })

    expect(apiPost).toHaveBeenCalledWith('/clientes', { nome: 'Marca A', celular: '47999999999' })
  })

  it('sends explicit CABINE confirmation when deleting a cabine with history', async () => {
    vi.mocked(apiDelete).mockResolvedValue({ ok: true })

    await deleteCabine('cabine-1', 'CABINE')

    expect(apiDelete).toHaveBeenCalledWith('/cabines/cabine-1?confirmacao=CABINE')
  })

  it('converts a lead through the ganhar endpoint', async () => {
    vi.mocked(apiPost).mockResolvedValue({ ok: true, cliente_id: 'cliente-1' })

    await ganharLead('lead-1')

    expect(apiPost).toHaveBeenCalledWith('/leads/lead-1/ganhar', {})
  })

  it('loads a CRM lead detail by id', async () => {
    vi.mocked(apiGet).mockResolvedValue({ id: 'lead-1' })

    await getLead('lead-1')

    expect(apiGet).toHaveBeenCalledWith('/leads/lead-1')
  })

  it('loads master CRM totals from the master endpoint', async () => {
    vi.mocked(apiGet).mockResolvedValue({ bio_totals: { total: 3 } })

    await getMasterCrm()

    expect(apiGet).toHaveBeenCalledWith('/master/crm', undefined)
  })

  it('loads a selected live by id from the canonical lives endpoint', async () => {
    vi.mocked(apiGet).mockResolvedValue({ id: 'live-1' })

    await getLivePorId('live-1')

    expect(apiGet).toHaveBeenCalledWith('/lives/live-1')
  })

  it('loads completed lives with explicit status filter', async () => {
    vi.mocked(apiGet).mockResolvedValue([])

    await getLives({ status: 'encerrada' })

    expect(apiGet).toHaveBeenCalledWith('/lives', { status: 'encerrada' })
  })

  it('loads daily analytics with filters', async () => {
    vi.mocked(apiGet).mockResolvedValue({ rows: [] })

    await getDailyAnalytics({ mesAno: '2026-05', marca_id: 'marca-1', apresentadora_id: 'ap-1' })

    expect(apiGet).toHaveBeenCalledWith('/analytics/diario', { mesAno: '2026-05', marca_id: 'marca-1', apresentadora_id: 'ap-1' })
  })

  it('loads TikTok connector status for the selected live', async () => {
    vi.mocked(apiGet).mockResolvedValue({ status: 'connected' })

    await getLiveTiktokStatus('live-1')

    expect(apiGet).toHaveBeenCalledWith('/lives/live-1/tiktok-status')
  })

  it('checks agenda conflicts by cabine and apresentadora', async () => {
    vi.mocked(apiGet).mockResolvedValue({ total: 0 })

    await getAgendaConflitos({
      cabineId: 'cabine-1',
      apresentadoraId: 'apresentadora-1',
      dataInicio: '2026-05-19T18:00:00.000Z',
      dataFim: '2026-05-19T21:00:00.000Z',
    })

    expect(apiGet).toHaveBeenCalledWith('/agenda/conflitos?cabine_id=cabine-1&apresentadora_id=apresentadora-1&data_inicio=2026-05-19T18%3A00%3A00.000Z&data_fim=2026-05-19T21%3A00%3A00.000Z')
  })

  it('keeps video CRUD wired to the canonical videos endpoints', async () => {
    vi.mocked(apiGet).mockResolvedValue([])
    vi.mocked(apiPost).mockResolvedValue({ id: 'video-1' })
    vi.mocked(apiPatch).mockResolvedValue({ id: 'video-1' })
    vi.mocked(apiDelete).mockResolvedValue({})

    await getVideos({ data_inicio: '2026-05-01' })
    await createVideo({ marca_id: 'marca-1', quantidade: 2 })
    await updateVideo('video-1', { quantidade: 3 })
    await deleteVideo('video-1')

    expect(apiGet).toHaveBeenCalledWith('/videos', { data_inicio: '2026-05-01' })
    expect(apiPost).toHaveBeenCalledWith('/videos', { marca_id: 'marca-1', quantidade: 2 })
    expect(apiPatch).toHaveBeenCalledWith('/videos/video-1', { quantidade: 3 })
    expect(apiDelete).toHaveBeenCalledWith('/videos/video-1')
  })

  it('publishes a live through the dedicated publicar endpoint', async () => {
    vi.mocked(apiPatch).mockResolvedValue({ id: 'live-1', status_publicacao: 'publicado' })

    await publishLive('live-1', 'publicado')

    expect(apiPatch).toHaveBeenCalledWith('/lives/live-1/publicar', { status_publicacao: 'publicado' })
  })

  it('updates and deletes lives through CRUD endpoints', async () => {
    vi.mocked(apiPatch).mockResolvedValue({ ok: true })
    vi.mocked(apiDelete).mockResolvedValue({})

    await updateLive('live-1', { status_publicacao: 'revisado' })
    await deleteLive('live-1')

    expect(apiPatch).toHaveBeenCalledWith('/lives/live-1', { status_publicacao: 'revisado' })
    expect(apiDelete).toHaveBeenCalledWith('/lives/live-1')
  })

  it('soft-deletes users through the usuarios endpoint', async () => {
    vi.mocked(apiDelete).mockResolvedValue({})

    await deleteUsuario('user-1')

    expect(apiDelete).toHaveBeenCalledWith('/usuarios/user-1')
  })

  it('updates users with presenter profile fields through the usuarios endpoint', async () => {
    vi.mocked(apiPatch).mockResolvedValue({ id: 'user-1', apresentadora_id: 'ap-1' })

    await updateUsuario('user-1', {
      nome: 'Yasmin',
      papel: 'apresentadora',
      ativo: true,
      fixo: 2700,
      comissao_pct: 1.5,
      foto_url: 'https://cdn.example.com/yasmin.jpg',
    })

    expect(apiPatch).toHaveBeenCalledWith('/usuarios/user-1', {
      nome: 'Yasmin',
      papel: 'apresentadora',
      ativo: true,
      fixo: 2700,
      comissao_pct: 1.5,
      foto_url: 'https://cdn.example.com/yasmin.jpg',
    })
  })

  it('updates and deletes presenter profiles through apresentadoras endpoints', async () => {
    vi.mocked(apiPatch).mockResolvedValue({ id: 'ap-1' })
    vi.mocked(apiDelete).mockResolvedValue({})

    await updateApresentadora('ap-1', { ativo: false })
    await deleteApresentadora('ap-1')

    expect(apiPatch).toHaveBeenCalledWith('/apresentadoras/ap-1', { ativo: false })
    expect(apiDelete).toHaveBeenCalledWith('/apresentadoras/ap-1')
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
