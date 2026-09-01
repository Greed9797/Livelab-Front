import { describe, expect, it } from 'vitest'

import { apresentadorasDoEvento, eventosNoSlot, horaSP } from './GradeCellPopover'

/**
 * A célula da Grade é o lugar onde o operador clica; o agendamento real vive em
 * agenda_eventos. O filtro abaixo é o que decide se uma live agendada aparece no
 * slot — errar aqui esconde o evento e o operador agenda em cima.
 */
const slot = { data: '2026-09-10', horaInicio: '14:00', horaFim: '17:00' }

const evento = (data_inicio: string, data_fim: string, extra: Record<string, unknown> = {}) =>
  ({ id: `${data_inicio}|${data_fim}`, data_inicio, data_fim, ...extra })

describe('eventosNoSlot', () => {
  it('inclui evento que cruza o slot mesmo sem coincidir com ele', () => {
    const lista = eventosNoSlot([
      evento('2026-09-10T13:00:00-03:00', '2026-09-10T15:00:00-03:00'),
      evento('2026-09-10T16:00:00-03:00', '2026-09-10T19:00:00-03:00'),
    ], slot)
    expect(lista).toHaveLength(2)
  })

  it('exclui evento que só encosta na borda — overlap é half-open', () => {
    expect(eventosNoSlot([
      evento('2026-09-10T11:00:00-03:00', '2026-09-10T14:00:00-03:00'),
      evento('2026-09-10T17:00:00-03:00', '2026-09-10T20:00:00-03:00'),
    ], slot)).toEqual([])
  })

  it('inclui evento que começou na véspera e ainda está rolando no slot', () => {
    expect(eventosNoSlot([
      evento('2026-09-09T22:00:00-03:00', '2026-09-10T15:00:00-03:00'),
    ], slot)).toHaveLength(1)
  })

  it('descarta linha sem data em vez de estourar', () => {
    expect(eventosNoSlot([{ id: 'x' }, evento('nao-e-data', 'nem-isso')], slot)).toEqual([])
  })
})

describe('apresentadorasDoEvento', () => {
  it('lista os turnos do revezamento com o horário de cada uma', () => {
    expect(apresentadorasDoEvento({
      apresentadora_nome: 'Ana',
      apresentadoras: [
        { apresentadora_id: 'ana', apresentadora_nome: 'Ana', data_inicio: '2026-09-10T14:00:00-03:00', data_fim: '2026-09-10T16:00:00-03:00' },
        { apresentadora_id: 'bia', apresentadora_nome: 'Bia', data_inicio: '2026-09-10T16:00:00-03:00', data_fim: '2026-09-10T18:00:00-03:00' },
      ],
    })).toBe('Ana 14:00–16:00 · Bia 16:00–18:00')
  })

  it('cai no campo escalar quando o evento não tem revezamento', () => {
    expect(apresentadorasDoEvento({ apresentadora_nome: 'Ana', apresentadoras: [] })).toBe('Ana')
    expect(apresentadorasDoEvento({})).toBe('Sem apresentadora')
  })
})

describe('horaSP', () => {
  it('formata o instante em horário de São Paulo, não no fuso do navegador', () => {
    expect(horaSP('2026-09-10T17:00:00Z')).toBe('14:00')
    expect(horaSP('')).toBe('')
    expect(horaSP(null)).toBe('')
  })
})
