/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KnowledgeEditor } from './KnowledgeEditor'

describe('KnowledgeEditor', () => {
  it('does not offer Publicado in the status select for new materials', () => {
    render(
      <KnowledgeEditor
        open
        categories={[]}
        onClose={() => undefined}
        onSave={vi.fn(async () => ({ material: { id: '1', titulo: 'T', slug: 't', material_type: 'study' as const, status: 'draft' as const, revision: 1 } }))}
      />,
    )

    const select = screen.getByRole('combobox', { name: /status/i })
    const options = Array.from(select.querySelectorAll('option')).map((option) => option.value)
    expect(options).toEqual(['draft', 'archived'])
    expect(options).not.toContain('published')
  })
})
