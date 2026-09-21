/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KnowledgeLessonPage } from './KnowledgeLessonPage'
import { ToastProvider } from '../ui/Toast'
import type { TrainingLessonDetail } from '../../services/training'

const lesson: TrainingLessonDetail = {
  id: 'lesson-1',
  title: 'Hook',
  progress: { state: 'not_started', started_at: null, last_opened_at: null, completed_at: null },
  trail: { slug: 'primeira-live-que-converte', title: 'Trilha' },
  module: { title: 'Módulo' },
  resume_path: '/conhecimento/trilhas/primeira-live-que-converte/aulas/lesson-1',
  outline: [],
  source: { origin: 'unidade' },
  content_available: true,
}

describe('KnowledgeLessonPage complete flow', () => {
  it('does not navigate on complete and offers resume_path on a follow-up click', async () => {
    const onComplete = vi.fn(async () => ({
      lesson_id: 'lesson-1',
      started_at: null,
      last_opened_at: null,
      completed_at: '2026-09-20T12:05:00.000Z',
      next_lesson_id: 'lesson-2',
      resume_path: '/conhecimento/trilhas/primeira-live-que-converte/aulas/lesson-2',
    }))
    const onFollowResume = vi.fn()

    render(
      <ToastProvider>
        <KnowledgeLessonPage
          lesson={lesson}
          manager={false}
          headingRef={{ current: null }}
          onBack={() => undefined}
          onOpen={() => undefined}
          onComplete={onComplete}
          onFollowResume={onFollowResume}
          onBookmark={() => undefined}
        />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /marcar como concluída/i }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(onFollowResume).not.toHaveBeenCalled()

    const nextButton = await screen.findByRole('button', { name: /ir para a próxima/i })
    fireEvent.click(nextButton)
    expect(onFollowResume).toHaveBeenCalledWith('/conhecimento/trilhas/primeira-live-que-converte/aulas/lesson-2')
  })
})
