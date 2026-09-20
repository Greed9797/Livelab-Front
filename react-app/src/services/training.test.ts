import { describe, expect, it } from 'vitest'
import { trainingLessonPath } from './training'

describe('training resume path', () => {
  it('matches the Back #25 deep link', () => {
    expect(trainingLessonPath('primeira-live-que-converte', 'a1111111-1111-4111-8111-111111111131'))
      .toBe('/conhecimento/trilhas/primeira-live-que-converte/aulas/a1111111-1111-4111-8111-111111111131')
  })
})
