// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TrainingReportPage } from './TrainingReportPage'
import { QK } from '../services/query-keys'

const trainingReport = {
  items: [{ user_id: 'learner-1', user_name: 'Aprendiz sem início', user_email: 'aprendiz@example.com', trail_id: 'trail-1', trail_title: 'Primeira live', lesson_id: 'lesson-1', lesson_title: 'Aula de abertura', state: 'not_started' as const, watched_percent: null, completed_at: null, completion_source: null }],
  page: 1, page_size: 25, has_more: false,
  users: [{ id: 'learner-1', nome: 'Aprendiz sem início' }], trails: [{ id: 'trail-1', title: 'Primeira live' }],
}

const mocks = vi.hoisted(() => ({
  currentUser: { id: 'manager-1', nome: 'Gestora', email: 'gestora@example.com', papel: 'franqueado', tenant_id: 'tenant-1', tenant_nome: 'Unidade' },
  getTrainingReport: vi.fn(),
}))

vi.mock('../stores/auth-store', () => ({ useCurrentUser: () => mocks.currentUser }))
vi.mock('../services/training', async (importOriginal) => ({
  ...await importOriginal<typeof import('../services/training')>(),
  getTrainingReport: mocks.getTrainingReport,
}))

function renderPage({ seedCache = true }: { seedCache?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  if (seedCache) client.setQueryData(QK.trainingReport('tenant-1', { user_id: undefined, trail_id: undefined, page: 1, page_size: 25 }), trainingReport)
  return render(<QueryClientProvider client={client}><MemoryRouter><TrainingReportPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getTrainingReport.mockResolvedValue(trainingReport)
})

afterEach(cleanup)

describe('TrainingReportPage', () => {
  it('explains that reporting awaits the backend update after an initial 404', async () => {
    mocks.getTrainingReport.mockRejectedValue(Object.assign(new Error('Not Found'), {
      isAxiosError: true,
      response: { status: 404 },
    }))
    renderPage({ seedCache: false })
    expect(await screen.findByText(/Relatório de treinamento aguardando atualização do backend/)).toBeTruthy()
    expect(screen.queryByText('Not Found')).toBeNull()
  }, 15_000)

  it('shows never-started learner rows and preserves an unknown legacy watch percentage', async () => {
    renderPage()

    expect((await screen.findAllByText('Aprendiz sem início')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Não iniciado').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Não medido').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Aula de abertura').length).toBeGreaterThan(0)
  })

  it('shows the trail manager action only to the network master', async () => {
    renderPage()
    await screen.findAllByText('Aprendiz sem início')
    expect(screen.queryByRole('button', { name: 'Gerenciar trilhas' })).toBeNull()

    cleanup()
    mocks.currentUser = { ...mocks.currentUser, papel: 'franqueador_master' }
    renderPage()
    expect(await screen.findByRole('button', { name: 'Gerenciar trilhas' })).toBeTruthy()
  })
})
