import { describe, expect, it } from 'vitest'
import {
  assignAgendaLanes,
  eventIntersectsSaoPauloDate,
  formatSaoPauloTime,
  getAgendaEventLayout,
  monthGridDays,
  parseConteudoLivesDeepLink,
  publicationStatusLabel,
  publicationStatusTone,
  weekDays,
} from './conteudo-helpers'

describe('deep links da lista de lives', () => {
  it('preserva o recorte vindo da Analytics e aceita marca_id como alias legado', () => {
    const context = parseConteudoLivesDeepLink(new URLSearchParams({
      tab: 'lives',
      data_inicio: '2026-08-01',
      data_fim: '2026-08-31',
      marca_id: 'marca-1',
      origem: 'analytics',
    }))
    expect(context).toMatchObject({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      marcaId: 'marca-1',
      source: 'analytics',
      isContextual: true,
    })
  })

  it('expande data única da Grade e preserva cabine, agenda, live e bucket válido', () => {
    const context = parseConteudoLivesDeepLink(new URLSearchParams({
      data: '2026-09-05',
      cabine: 'cab-1',
      agenda: 'agenda-1',
      live: 'live-1',
      pendencia: 'cadastro',
      origem: 'grade',
    }))
    expect(context).toEqual({
      dateFrom: '2026-09-05',
      dateTo: '2026-09-05',
      marcaId: '',
      cabineId: 'cab-1',
      liveId: 'live-1',
      agendaId: 'agenda-1',
      pending: 'cadastro',
      source: 'grade',
      isContextual: true,
    })
  })

  it('ignora bucket desconhecido sem perder os outros filtros', () => {
    expect(parseConteudoLivesDeepLink(new URLSearchParams('pendencia=confirmada&cabine=cab-1')).pending).toBe('')
  })
})

describe('conteudo helpers', () => {
  it('week starts on Sunday and ends on Saturday', () => {
    // 2026-05-20 é uma quarta-feira
    expect(weekDays('2026-05-20')).toEqual([
      '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22', '2026-05-23',
    ])
    // Domingo é o primeiro dia da própria semana
    expect(weekDays('2026-05-17')[0]).toBe('2026-05-17')
  })

  it('month grid starts on the Sunday on/before day 1 and has 42 days', () => {
    const days = monthGridDays('2026-05-20') // 01/05/2026 é sexta → grid começa dom 26/04
    expect(days).toHaveLength(42)
    expect(days[0]).toBe('2026-04-26')
    expect(new Date(`${days[0]}T00:00:00`).getDay()).toBe(0)
    expect(days).toContain('2026-05-01')
    expect(days).toContain('2026-05-31')
  })

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
