import { describe, expect, it } from 'vitest'
import { trainingLessonPath, trainingLessonToMaterial, type TrainingLesson } from './training'

const baseLesson = (): TrainingLesson => ({
  id: 'lesson-1',
  title: 'Hook dos 30 segundos',
  progress: { state: 'not_started', started_at: null, last_opened_at: null, completed_at: null },
  source: { kind: 'unit_material', id: 'mat-1', slug: 'hook-30s', origin: 'unidade' },
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
