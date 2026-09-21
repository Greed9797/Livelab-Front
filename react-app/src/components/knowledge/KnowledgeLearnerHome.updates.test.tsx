/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KnowledgeLearnerHome } from './KnowledgeLearnerHome'
import type { TrainingHome } from '../../services/training'

const home: TrainingHome = {
  title: 'Base',
  audience: 'apresentadora',
  resume: { has_started: false, lesson_id: null, trail_slug: null, path: null },
  continue_learning: null,
  start_here: null,
  recommended: [],
  featured: [],
  starter_trail: null,
  updates: [{
    kind: 'atualizacao',
    id: 'upd-1',
    title: 'Política de frete',
    what_changed: 'Novo prazo',
    what_to_do_today: 'Revisar tabela',
    published_at: '2026-09-10T10:00:00.000Z',
  }],
}

describe('KnowledgeLearnerHome updates', () => {
  it('renders informational update cards without a button', () => {
    const onOpen = vi.fn()
    render(
      <KnowledgeLearnerHome
        tab="updates"
        onTab={() => undefined}
        home={home}
        trails={[]}
        bookmarks={[]}
        manager={false}
        search=""
        onSearch={() => undefined}
        filters={{ q: '', role: '', level: '', topic: '', platform: '', format: '', origin: '' }}
        onFilters={() => undefined}
        onOpen={onOpen}
        onOpenPath={() => undefined}
        onBookmark={() => undefined}
      />,
    )

    expect(screen.getByText(/card informativo/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /política de frete/i })).toBeNull()
    fireEvent.click(screen.getByText('Política de frete'))
    expect(onOpen).not.toHaveBeenCalled()
  })
})
