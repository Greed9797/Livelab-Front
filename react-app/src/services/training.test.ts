import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiDelete, apiGet, apiPatch, apiPost } from './api'
import { createAdminTrainingLesson, createAdminTrainingTrail, deleteAdminTrainingLesson, deleteAdminTrainingTrail, formatWatchedPercent, getTrainingLesson, getTrainingReport, reorderAdminTrainingLessons, reorderAdminTrainingTrails, saveTrainingProgress, startTrainingLesson, trainingLessonPath, trainingLessonToMaterial, updateAdminTrainingLesson, updateAdminTrainingTrail, type TrainingLesson } from './training'

vi.mock('./api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}))

const baseLesson = (): TrainingLesson => ({
  id: 'lesson-1',
  title: 'Hook dos 30 segundos',
  progress: { state: 'not_started', started_at: null, last_opened_at: null, completed_at: null },
  source: { kind: 'unit_material', id: 'mat-1', slug: 'hook-30s', origin: 'unidade' },
})

beforeEach(() => {
  vi.mocked(apiGet).mockReset()
  vi.mocked(apiPost).mockReset()
  vi.mocked(apiPatch).mockReset()
  vi.mocked(apiDelete).mockReset()
})

describe('training administration and reporting', () => {
  it('uses the admin training endpoints and preserves request payloads', async () => {
    vi.mocked(apiPost).mockResolvedValue({ items: [] })
    vi.mocked(apiPatch).mockResolvedValue({})
    vi.mocked(apiDelete).mockResolvedValue(undefined)
    await createAdminTrainingTrail({ title: 'Primeira live', cover_image_url: null })
    await updateAdminTrainingTrail('trail/one', { title: 'Primeira live 2' })
    await deleteAdminTrainingTrail('trail/one')
    await createAdminTrainingLesson('trail-1', { title: 'Aula', video_provider: 'panda', video_input: 'video-uuid', video_library_id: 'library-uuid' })
    await updateAdminTrainingLesson('lesson-1', { trail_id: 'trail-2', title: 'Movida' })
    await deleteAdminTrainingLesson('lesson-1')
    await reorderAdminTrainingTrails(['trail-2', 'trail-1'])
    await reorderAdminTrainingLessons('trail-2', ['lesson-1', 'lesson-2'])
    expect(apiPost).toHaveBeenCalledWith('/training/admin/trails', { title: 'Primeira live', cover_image_url: null })
    expect(apiPatch).toHaveBeenCalledWith('/training/admin/trails/trail%2Fone', { title: 'Primeira live 2' })
    expect(apiPost).toHaveBeenCalledWith('/training/admin/trails/trail-1/lessons', expect.objectContaining({ video_provider: 'panda', video_library_id: 'library-uuid' }))
    expect(apiPatch).toHaveBeenCalledWith('/training/admin/lessons/lesson-1', { trail_id: 'trail-2', title: 'Movida' })
    expect(apiPost).toHaveBeenCalledWith('/training/admin/trails/reorder', { ids: ['trail-2', 'trail-1'] })
    expect(apiPost).toHaveBeenCalledWith('/training/admin/trails/trail-2/lessons/reorder', { ids: ['lesson-1', 'lesson-2'] })
  })

  it('requests paginated report rows with user and trail filters', async () => {
    vi.mocked(apiGet).mockResolvedValue({ items: [], page: 2, page_size: 25, has_more: false, users: [], trails: [] })
    await getTrainingReport({ user_id: 'user-1', trail_id: 'trail-1', page: 2, page_size: 25 })
    expect(apiGet).toHaveBeenCalledWith('/training/reports', { user_id: 'user-1', trail_id: 'trail-1', page: 2, page_size: 25 })
  })

  it('saves observed video progress through the progress endpoint', async () => {
    vi.mocked(apiPost).mockResolvedValue({ lesson_id: 'lesson-1', state: 'in_progress' })
    await saveTrainingProgress('lesson-1', { video_version: 2, duration_seconds: 90, last_position_seconds: 30, position_revision: 1, intervals: [[0, 30]], playback_started: true })
    expect(apiPost).toHaveBeenCalledWith('/training/lessons/lesson-1/progress', expect.objectContaining({ playback_started: true, intervals: [[0, 30]] }))
  })

  it('labels legacy completions with unknown watch percentage as unmeasured', () => {
    expect(formatWatchedPercent(null)).toBe('Não medido')
    expect(formatWatchedPercent(58.6)).toBe('59%')
  })
})

describe('training lesson fetch', () => {
  it('requests GET with start=false by default and uses POST /start separately', async () => {
    vi.mocked(apiPost).mockResolvedValue({ lesson_id: 'lesson-1', started_at: '2026-09-20T12:00:00.000Z', last_opened_at: null, completed_at: null })
    vi.mocked(apiGet).mockResolvedValue({ id: 'lesson-1', title: 'Aula', progress: { state: 'in_progress', started_at: null, last_opened_at: null, completed_at: null }, trail: { slug: 'trail', title: 'Trilha' }, module: { title: 'Módulo' }, resume_path: '/conhecimento', outline: [] })

    await startTrainingLesson('lesson-1')
    await getTrainingLesson('lesson-1')

    expect(apiPost).toHaveBeenCalledWith('/training/lessons/lesson-1/start')
    expect(apiGet).toHaveBeenCalledWith('/training/lessons/lesson-1', { start: 'false' })
  })
})

describe('training resume path', () => {
  it('matches the Back #25 deep link', () => {
    expect(trainingLessonPath('primeira-live-que-converte', 'a1111111-1111-4111-8111-111111111131'))
      .toBe('/conhecimento/trilhas/primeira-live-que-converte/aulas/a1111111-1111-4111-8111-111111111131')
  })
})

describe('trainingLessonToMaterial', () => {
  it('returns null when the lesson has no body or video', () => {
    expect(trainingLessonToMaterial(baseLesson())).toBeNull()
  })

  it('uses lesson markdown and video without a second knowledge fetch payload', () => {
    const material = trainingLessonToMaterial({
      ...baseLesson(),
      content_markdown: '# Hook\n\nOlhe para a câmera.',
      video_provider: 'youtube',
      video_id: 'abc123xyz',
      video_version: 3,
      format: 'video',
    })
    expect(material).toMatchObject({
      id: 'mat-1',
      slug: 'hook-30s',
      titulo: 'Hook dos 30 segundos',
      content_markdown: '# Hook\n\nOlhe para a câmera.',
      video_provider: 'youtube',
      video_id: 'abc123xyz',
      video_version: 3,
      material_type: 'video',
    })
  })

  it('keeps legacy lessons untracked when the API omits video_version', () => {
    const material = trainingLessonToMaterial({
      ...baseLesson(),
      video_provider: 'youtube',
      video_id: 'abc123xyz',
      format: 'video',
    })

    expect(material).not.toHaveProperty('video_version')
  })

  it('accepts body/embed aliases from a richer lesson payload', () => {
    const material = trainingLessonToMaterial({
      ...baseLesson(),
      body: 'Texto da aula',
      embed_url: 'https://www.youtube.com/watch?v=abc123xyz',
    })
    expect(material?.content_markdown).toBe('Texto da aula')
    expect(material?.video_url).toBe('https://www.youtube.com/watch?v=abc123xyz')
  })
})
