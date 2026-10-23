/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KnowledgeLessonPage } from './KnowledgeLessonPage'
import { ToastProvider } from '../ui/Toast'
import type { TrainingLessonDetail, TrainingProgressSaveResponse } from '../../services/training'
import type { KnowledgeMaterial } from '../../services/knowledge'

vi.mock('./TrainingVideoPlayer', () => ({
  TrainingVideoPlayer: ({ onProgressSaved }: { onProgressSaved?: (progress: TrainingProgressSaveResponse) => void }) => (
    <button type="button" onClick={() => onProgressSaved?.({
      lesson_id: 'lesson-video', state: 'completed', started_at: '2026-10-01T00:00:00.000Z', last_opened_at: null,
      completed_at: '2026-10-01T00:05:00.000Z', watched_percent: 91, last_position_seconds: 91,
      duration_seconds: 100, position_revision: 1, video_version: 3, completion_source: 'watched',
    })}>Emit saved progress</button>
  ),
}))

afterEach(cleanup)

const lesson: TrainingLessonDetail = {
  id: 'lesson-video',
  title: 'Aula em vídeo',
  format: 'video',
  video_provider: 'youtube',
  video_id: 'abcdef12345',
  video_version: 3,
  progress: { state: 'not_started', started_at: null, last_opened_at: null, completed_at: null },
  trail: { slug: 'trilha', title: 'Trilha' },
  module: { title: 'Módulo' },
  resume_path: '/trilha/aulas/lesson-video',
  outline: [],
  source: { origin: 'unidade' },
  content_available: true,
}

describe('KnowledgeLessonPage video completion', () => {
  it('hides manual completion for video lessons and reflects only server-saved completion', () => {
    const onProgressSaved = vi.fn()
    render(
      <ToastProvider>
        <KnowledgeLessonPage
          lesson={lesson}
          manager={false}
          headingRef={{ current: null }}
          onBack={() => undefined}
          onOpen={() => undefined}
          onComplete={vi.fn()}
          onProgressSaved={onProgressSaved}
          onBookmark={() => undefined}
        />
      </ToastProvider>,
    )

    expect(screen.queryByRole('button', { name: /marcar como concluída/i })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /emit saved progress/i }))
    expect(onProgressSaved).toHaveBeenCalledWith(expect.objectContaining({ state: 'completed', watched_percent: 91 }))
    expect(screen.getByText(/Aula concluída · 91% assistido/)).toBeTruthy()
  })

  it('keeps the legacy embed and manual completion when the API omits video_version', () => {
    const legacyMaterial: KnowledgeMaterial = {
      id: 'lesson-video',
      titulo: 'Aula em vídeo',
      slug: 'aula-em-video',
      material_type: 'video',
      video_provider: 'youtube',
      video_id: 'abcdef12345',
      status: 'published',
      revision: 1,
    }
    const { container } = render(
      <ToastProvider>
        <KnowledgeLessonPage
          lesson={{ ...lesson, video_version: undefined }}
          material={legacyMaterial}
          manager={false}
          headingRef={{ current: null }}
          onBack={() => undefined}
          onOpen={() => undefined}
          onComplete={vi.fn()}
          onProgressSaved={vi.fn()}
          onBookmark={() => undefined}
        />
      </ToastProvider>,
    )

    expect(screen.queryByRole('button', { name: /emit saved progress/i })).toBeNull()
    expect(screen.getByRole('button', { name: /marcar como concluída/i })).toBeTruthy()
    expect(container.querySelector('iframe[title="Vídeo: Aula em vídeo"]')?.getAttribute('src')).toContain('youtube-nocookie.com/embed/abcdef12345')
  })

  it('renders the backend ordered lesson sequence when available', () => {
    const orderedLesson: TrainingLessonDetail = {
      ...lesson,
      format: 'article',
      video_provider: 'none',
      ordered_lessons: [
        { id: 'second', title: 'Aula 2', required: false, progress: { state: 'completed', started_at: null, last_opened_at: null, completed_at: '2026-10-01T00:05:00.000Z' } },
        { id: 'first', title: 'Aula 1', progress: { state: 'not_started', started_at: null, last_opened_at: null, completed_at: null } },
      ],
      outline: [{ id: 'old-module', title: 'Módulo antigo', lessons: [
        { id: 'first', title: 'Aula 1', progress: { state: 'not_started', started_at: null, last_opened_at: null, completed_at: null } },
        { id: 'second', title: 'Aula 2', progress: { state: 'not_started', started_at: null, last_opened_at: null, completed_at: null } },
      ] }],
    }
    render(
      <ToastProvider>
        <KnowledgeLessonPage
          lesson={orderedLesson} manager={false} headingRef={{ current: null }} onBack={() => undefined}
          onOpen={() => undefined} onComplete={vi.fn()} onBookmark={() => undefined}
        />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByText('Sumário da trilha'))
    const outlineButtons = screen.getAllByRole('button').filter((button) => button.textContent?.startsWith('Aula '))
    expect(outlineButtons.map((button) => button.textContent?.slice(0, 6))).toEqual(['Aula 2', 'Aula 1'])
    expect(screen.getByText(/Trilha 1\/2/)).toBeTruthy()
  })

  it('keeps standalone video previews on the static embed without progress recording', () => {
    const adminMaterial: KnowledgeMaterial = {
      id: 'admin-video-material',
      titulo: 'Vídeo avulso',
      slug: 'video-avulso',
      material_type: 'video',
      video_provider: 'youtube',
      video_id: 'abcdef12345',
      status: 'published',
      revision: 1,
    }
    const { container } = render(
      <ToastProvider>
        <KnowledgeLessonPage
          lesson={{ ...lesson, id: adminMaterial.id, format: 'video', video_provider: 'none', video_id: null }}
          material={adminMaterial}
          manager
          headingRef={{ current: null }}
          onBack={() => undefined}
          onOpen={() => undefined}
          onComplete={vi.fn()}
          onBookmark={() => undefined}
        />
      </ToastProvider>,
    )

    expect(within(container).queryByRole('button', { name: /emit saved progress/i })).toBeNull()
    const iframe = container.querySelector('iframe[title="Vídeo: Vídeo avulso"]')
    expect(iframe).not.toBeNull()
    if (!iframe) throw new Error('Standalone video preview iframe was not rendered.')
    expect(iframe.getAttribute('src')).toContain('youtube-nocookie.com/embed/abcdef12345')
  })
})
