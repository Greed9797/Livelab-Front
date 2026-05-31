import { describe, expect, it } from 'vitest'
import { getAgendaEventLayout, publicationStatusLabel, publicationStatusTone } from './conteudo-helpers'

describe('conteudo helpers', () => {
  it('expands day agenda event height for the full scheduled interval', () => {
    expect(getAgendaEventLayout(
      {
        data_inicio: '2026-05-18T15:00:00-03:00',
        data_fim: '2026-05-18T21:00:00-03:00',
      },
      { startHour: 8, endHour: 22, rowHeight: 72 },
    )).toEqual({
      top: 504,
      height: 432,
    })
  })

  it('labels live publication status instead of operational closed status', () => {
    expect(publicationStatusLabel('rascunho')).toBe('Rascunho')
    expect(publicationStatusLabel('revisado')).toBe('Revisado')
    expect(publicationStatusLabel('publicado')).toBe('Publicado')
  })

  it('gives publication status a clear visual progression', () => {
    expect(publicationStatusTone('rascunho')).toBe('neutral')
    expect(publicationStatusTone('revisado')).toBe('info')
    expect(publicationStatusTone('publicado')).toBe('success')
  })
})
