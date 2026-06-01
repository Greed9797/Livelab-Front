import { describe, expect, it } from 'vitest'
import {
  assignAgendaLanes,
  eventIntersectsSaoPauloDate,
  formatSaoPauloTime,
  getAgendaEventLayout,
  publicationStatusLabel,
  publicationStatusTone,
} from './conteudo-helpers'

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

  it('uses Sao Paulo local time when API returns UTC timestamps', () => {
    expect(getAgendaEventLayout(
      {
        data_inicio: '2026-05-18T18:00:00.000Z',
        data_fim: '2026-05-19T00:00:00.000Z',
      },
      { startHour: 8, endHour: 22, rowHeight: 72 },
    )).toEqual({
      top: 504,
      height: 432,
    })
  })

  it('uses the selected Sao Paulo date to clamp event height', () => {
    expect(getAgendaEventLayout(
      {
        data_inicio: '2026-05-18T18:00:00.000Z',
        data_fim: '2026-05-19T00:00:00.000Z',
      },
      { startHour: 8, endHour: 22, rowHeight: 72, date: '2026-05-18' },
    )).toEqual({
      top: 504,
      height: 432,
    })
    expect(formatSaoPauloTime('2026-05-18T18:00:00.000Z')).toBe('15:00')
  })

  it('splits overlapping agenda events into side-by-side lanes', () => {
    const lanes = assignAgendaLanes([
      { id: 'a', data_inicio: '2026-05-18T15:00:00-03:00', data_fim: '2026-05-18T21:00:00-03:00' },
      { id: 'b', data_inicio: '2026-05-18T16:00:00-03:00', data_fim: '2026-05-18T18:00:00-03:00' },
    ], '2026-05-18')
    expect(lanes.get('a')).toEqual({ index: 0, total: 2 })
    expect(lanes.get('b')).toEqual({ index: 1, total: 2 })
  })

  it('filters events by the Sao Paulo calendar day', () => {
    const event = {
      data_inicio: '2026-05-19T02:30:00.000Z',
      data_fim: '2026-05-19T03:30:00.000Z',
    }
    expect(eventIntersectsSaoPauloDate(event, '2026-05-18')).toBe(true)
    expect(eventIntersectsSaoPauloDate(event, '2026-05-20')).toBe(false)
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
