import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGet, apiPost } from './api'
import { getTrainingLesson, startTrainingLesson, trainingLessonPath, trainingLessonToMaterial, type TrainingLesson } from './training'

vi.mock('./api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
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
      format: 'video',
    })
    expect(material).toMatchObject({
      id: 'mat-1',
      slug: 'hook-30s',
      titulo: 'Hook dos 30 segundos',
      content_markdown: '# Hook\n\nOlhe para a câmera.',
      video_provider: 'youtube',
      video_id: 'abc123xyz',
      material_type: 'video',
    })
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
