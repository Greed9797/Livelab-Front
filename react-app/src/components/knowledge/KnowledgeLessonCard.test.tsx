/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KnowledgeLessonCard } from './KnowledgeLessonCard'
import type { TrainingLesson } from '../../services/training'

const baseLesson = (): TrainingLesson => ({
  id: 'lesson-1',
  title: 'Hook',
  progress: { state: 'in_progress', started_at: '2026-09-20T12:00:00.000Z', last_opened_at: null, completed_at: null },
  source: { origin: 'unidade' },
  content_available: true,
})

describe('KnowledgeLessonCard', () => {
  it('uses progress_pct for the bar width, including zero', () => {
    const { container, rerender } = render(
      <KnowledgeLessonCard lesson={{ ...baseLesson(), progress_pct: 0 }} onOpen={vi.fn()} />,
    )
    const bar = container.querySelector('.bg-brand') as HTMLElement | null
    expect(bar?.style.width).toBe('0%')

    rerender(<KnowledgeLessonCard lesson={{ ...baseLesson(), progress_pct: 40 }} onOpen={vi.fn()} />)
    const bar40 = container.querySelector('.bg-brand') as HTMLElement | null
    expect(bar40?.style.width).toBe('40%')
  })

  it('hides the progress bar when progress_pct is absent', () => {
    const { container } = render(<KnowledgeLessonCard lesson={baseLesson()} onOpen={vi.fn()} />)
    expect(container.querySelector('.bg-brand')).toBeNull()
  })

  it('shows Conteúdo pendente when content is unavailable', () => {
    render(
      <KnowledgeLessonCard
        lesson={{ ...baseLesson(), content_available: false, source: { origin: 'rede' } }}
        onOpen={vi.fn()}
      />,
    )
    expect(screen.getByText('Conteúdo pendente')).toBeTruthy()
    expect(screen.queryByText('Rede')).toBeNull()
  })
})
