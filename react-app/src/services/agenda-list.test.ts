import { describe, expect, it } from 'vitest'
import { unwrapAgendaList } from './agenda-list'

describe('unwrapAgendaList', () => {
  it('unwraps eventos and keeps every row when the server says the list stopped', () => {
    const eventos = [
      { id: '1', marca_nome: 'Aurora' },
      { id: '2', marca_nome: 'Boreal' },
    ]
    expect(unwrapAgendaList({ eventos, truncated: true })).toEqual({ eventos, truncated: true })
  })

  it('reports truncated false for a complete object and for the legacy array', () => {
    const eventos = [{ id: '1' }]
    expect(unwrapAgendaList({ eventos, truncated: false })).toEqual({ eventos, truncated: false })
    expect(unwrapAgendaList(eventos)).toEqual({ eventos, truncated: false })
  })

  it('does not invent events when the body has none', () => {
    expect(unwrapAgendaList({ truncated: true })).toEqual({ eventos: [], truncated: true })
    expect(unwrapAgendaList(null)).toEqual({ eventos: [], truncated: false })
  })
})
