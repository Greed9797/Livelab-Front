// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TrainingManagementPage } from './TrainingManagementPage'
import { QK } from '../services/query-keys'

const trainingTrails = { items: [{ id: 'trail-1', slug: 'primeira-live', title: 'Primeira live', lessons: [{ id: 'lesson-1', title: 'Aula existente', video_provider: 'youtube' as const, video_id: 'old-video', sort_order: 0 }] }] }

const mocks = vi.hoisted(() => ({
  currentUser: { id: 'master-1', nome: 'Master', email: 'master@example.com', papel: 'franqueador_master', tenant_id: 'tenant-1', tenant_nome: 'Unidade' },
  getAdminTrainingTrails: vi.fn(),
  createAdminTrainingLesson: vi.fn(),
  createAdminTrainingTrail: vi.fn(),
  deleteAdminTrainingLesson: vi.fn(),
  deleteAdminTrainingTrail: vi.fn(),
  reorderAdminTrainingLessons: vi.fn(),
  reorderAdminTrainingTrails: vi.fn(),
  updateAdminTrainingLesson: vi.fn(),
  updateAdminTrainingTrail: vi.fn(),
  uploadImageAsset: vi.fn(),
  toastPush: vi.fn(),
}))

vi.mock('../stores/auth-store', () => ({ useCurrentUser: () => mocks.currentUser }))
vi.mock('../services/domain', () => ({ uploadImageAsset: mocks.uploadImageAsset }))
vi.mock('../services/training', () => ({
  getAdminTrainingTrails: mocks.getAdminTrainingTrails,
  createAdminTrainingLesson: mocks.createAdminTrainingLesson,
  createAdminTrainingTrail: mocks.createAdminTrainingTrail,
  deleteAdminTrainingLesson: mocks.deleteAdminTrainingLesson,
  deleteAdminTrainingTrail: mocks.deleteAdminTrainingTrail,
  reorderAdminTrainingLessons: mocks.reorderAdminTrainingLessons,
  reorderAdminTrainingTrails: mocks.reorderAdminTrainingTrails,
  updateAdminTrainingLesson: mocks.updateAdminTrainingLesson,
  updateAdminTrainingTrail: mocks.updateAdminTrainingTrail,
}))
vi.mock('../components/ui/Toast', () => ({ useToast: () => ({ push: mocks.toastPush }) }))

function renderPage({ seedCache = true }: { seedCache?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })
  if (seedCache) client.setQueryData(QK.trainingAdminTrails('tenant-1'), trainingTrails)
  return render(<QueryClientProvider client={client}><MemoryRouter><TrainingManagementPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAdminTrainingTrails.mockResolvedValue(trainingTrails)
  mocks.createAdminTrainingLesson.mockResolvedValue({ id: 'lesson-new' })
})

afterEach(cleanup)

describe('TrainingManagementPage lesson creation', () => {
  it('explains that management awaits the backend update after an initial 404', async () => {
    mocks.getAdminTrainingTrails.mockRejectedValue(Object.assign(new Error('Not Found'), {
      isAxiosError: true,
      response: { status: 404 },
    }))
    renderPage({ seedCache: false })
    expect(await screen.findByText(/Gestão de treinamentos aguardando atualização do backend/)).toBeTruthy()
    expect(screen.queryByText('Not Found')).toBeNull()
  }, 15_000)

  it('submits a YouTube lesson and appends it after existing lessons', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Nova aula' }))
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Aula de abertura' } })
    fireEvent.change(screen.getByLabelText('URL ou ID do vídeo'), { target: { value: 'https://youtu.be/yt123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar aula' }))

    await waitFor(() => expect(mocks.createAdminTrainingLesson).toHaveBeenCalledWith('trail-1', {
      title: 'Aula de abertura', cover_image_url: null, video_provider: 'youtube',
      video_input: 'https://youtu.be/yt123', video_library_id: null, sort_order: 1,
    }))
  }, 15_000)

  it('accepts a full official Panda embed URL without a separate library ID', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Nova aula' }))
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Demonstração Panda' } })
    fireEvent.change(screen.getByLabelText('Provedor de vídeo'), { target: { value: 'panda' } })
    fireEvent.change(screen.getByLabelText('UUID ou URL de embed do vídeo'), { target: { value: 'https://player-vz-123.tv.pandavideo.com.br/embed/?v=video-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar aula' }))

    await waitFor(() => expect(mocks.createAdminTrainingLesson).toHaveBeenCalledWith('trail-1', {
      title: 'Demonstração Panda', cover_image_url: null, video_provider: 'panda',
      video_input: 'https://player-vz-123.tv.pandavideo.com.br/embed/?v=video-123', video_library_id: null, sort_order: 1,
    }))
  })
})
