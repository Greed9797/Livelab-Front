import { describe, expect, it } from 'vitest'
import type { KnowledgeMaterial } from './knowledge'
import {
  buildStarterTrail,
  emptyTrainingFilters,
  encodeTrainingTags,
  lessonMatchesFilters,
  recommendLessons,
  roleFromUserPapel,
  toCatalogLesson,
  updateLessons,
} from './knowledge-training'

const sample = (overrides: Partial<KnowledgeMaterial> = {}): KnowledgeMaterial => ({
  id: 'lesson-1',
  titulo: 'Hook dos primeiros 30 segundos',
  slug: 'hook-30',
  excerpt: 'Abrir a live com oferta clara.',
  content_markdown: 'Abertura com prova e CTA.',
  material_type: 'video',
  status: 'published',
  revision: 1,
  tags: ['nivel:iniciante', 'tema:live', 'funcao:apresentadora', 'duracao:6', 'destaque'],
  published_at: '2026-09-10T10:00:00.000Z',
  atualizado_em: '2026-09-18T10:00:00.000Z',
  ...overrides,
})

describe('knowledge training catalog', () => {
  it('maps cover, duration, level and objective without inventing money', () => {
    const lesson = toCatalogLesson(sample({ cover_image_url: 'https://cdn.example.test/hook.jpg' }), 'unit')
    expect(lesson.coverUrl).toBe('https://cdn.example.test/hook.jpg')
    expect(lesson.durationMinutes).toBe(6)
    expect(lesson.level).toBe('iniciante')
    expect(lesson.objective).toBe('Abrir a live com oferta clara.')
    expect(lesson.freshness).toBe('atualizado')
  })

  it('keeps one starter trail and recommends by role', () => {
    const lessons = [
      toCatalogLesson(sample(), 'unit'),
      toCatalogLesson(sample({ id: 'ops-1', titulo: 'Checklist de cabine', tags: ['tema:live', 'funcao:operacao'] }), 'unit'),
      toCatalogLesson(sample({ id: 'shop-1', titulo: 'Pins do Shop', tags: ['tema:shop', 'funcao:apresentadora'] }), 'network'),
    ]
    const trail = buildStarterTrail(lessons)
    expect(trail.title).toBe('Primeira Live que converte')
    expect(trail.lessonIds.length).toBeGreaterThanOrEqual(3)
    expect(recommendLessons(lessons, 'apresentadora')[0]?.role).toBe('apresentadora')
    expect(roleFromUserPapel('apresentadora')).toBe('apresentadora')
  })

  it('uses dated freshness only and filters without Popular', () => {
    const fresh = toCatalogLesson(sample({ id: 'new-1', published_at: new Date().toISOString(), atualizado_em: new Date().toISOString() }), 'unit')
    expect(updateLessons([fresh])[0]?.id).toBe('new-1')
    expect(lessonMatchesFilters(fresh, { ...emptyTrainingFilters, topic: 'live' })).toBe(true)
    expect(lessonMatchesFilters(fresh, { ...emptyTrainingFilters, topic: 'ads' })).toBe(false)
  })

  it('encodes learning metadata into tags for the existing contract', () => {
    expect(encodeTrainingTags({
      duration_minutes: 4,
      difficulty: 'iniciante',
      audience_role: 'apresentadora',
      topic: 'live',
      objectives: ['Fechar a oferta no gancho'],
      tags: ['roteiro'],
    })).toEqual(expect.arrayContaining(['roteiro', 'duracao:4', 'nivel:iniciante', 'funcao:apresentadora', 'tema:live', 'objetivo:Fechar a oferta no gancho']))
  })
})
