import { describe, expect, it } from 'vitest'

import { summarizeAgendaAvailability } from './agendaAvailability'
import type { GradeCelula } from './gradeUtils'

const cell = (hora_inicio: string, hora_fim: string, marca_id: string, apresentadora_id: string): GradeCelula => ({
  cabine_id: 'cab-1', cabine_numero: 1, hora_inicio, hora_fim, marca_id, marca_nome: marca_id,
  marca_logo_url: null, apresentadora_id, apresentadora_nome: apresentadora_id, origem: 'padrao', observacao: null,
})

const marcas = [
  { id: 'm1', nome: 'Marca 1', status: 'ativa' },
  { id: 'm2', nome: 'Marca 2', status: 'ativa' },
  { id: 'm3', nome: 'Marca 3', status: 'ativa' },
  { id: 'm4', nome: 'Inativa', status: 'inativa' },
]

const apresentadoras = [
  { id: 'p1', nome: 'Ana', ativo: true },
  { id: 'p2', nome: 'Bia', ativo: true },
  { id: 'p3', nome: 'Clara', ativo: true },
  { id: 'p4', nome: 'Inativa', ativo: false },
  { id: 'p5', nome: 'Também inativa', status: 'inativa' },
]

describe('summarizeAgendaAvailability', () => {
  it('substitui a escala do slot pelos turnos reais, sem dobrar a reserva', () => {
    const summary = summarizeAgendaAvailability({
      date: '2026-09-10',
      gradeCells: [cell('08:00', '11:00', 'm1', 'p1'), cell('11:00', '14:00', 'm2', 'p2')],
      agendaRows: [{
        id: 'agenda-1', cabine_id: 'cab-1', marca_id: 'm1', status: 'planejado',
        data_inicio: '2026-09-10T08:00:00-03:00', data_fim: '2026-09-10T11:00:00-03:00',
        apresentadoras: [
          { apresentadora_id: 'p1', data_inicio: '2026-09-10T08:00:00-03:00', data_fim: '2026-09-10T09:30:00-03:00' },
          { apresentadora_id: 'p3', data_inicio: '2026-09-10T09:30:00-03:00', data_fim: '2026-09-10T11:00:00-03:00' },
        ],
      }],
      marcaRows: marcas,
      apresentadoraRows: apresentadoras,
    })

    expect(summary.marcasSemHorario.map((row) => row.id)).toEqual(['m3'])
    expect(summary.apresentadorasComVaga).toEqual([
      { id: 'p1', nome: 'Ana', slots: 1 },
      { id: 'p2', nome: 'Bia', slots: 1 },
      { id: 'p3', nome: 'Clara', slots: 1 },
    ])
  })

  it('remove apresentadora só ao chegar a dois slots e não deixa cancelamento apagar a Grade', () => {
    const summary = summarizeAgendaAvailability({
      date: '2026-09-10',
      gradeCells: [cell('08:00', '11:00', 'm1', 'p1'), cell('11:00', '14:00', 'm2', 'p2')],
      agendaRows: [
        {
          id: 'agenda-1', cabine_id: 'cab-1', marca_id: 'm1', apresentadora_id: 'p1', status: 'planejado',
          data_inicio: '2026-09-10T08:00:00-03:00', data_fim: '2026-09-10T14:00:00-03:00', apresentadoras: [],
        },
        {
          id: 'cancelada', cabine_id: 'cab-1', marca_id: 'm3', apresentadora_id: 'p3', status: 'cancelado',
          data_inicio: '2026-09-10T11:00:00-03:00', data_fim: '2026-09-10T14:00:00-03:00', apresentadoras: [],
        },
      ],
      marcaRows: marcas,
      apresentadoraRows: apresentadoras,
    })

    expect(summary.marcasSemHorario.map((row) => row.id)).toEqual(['m2', 'm3'])
    expect(summary.apresentadorasComVaga).toEqual([
      { id: 'p2', nome: 'Bia', slots: 0 },
      { id: 'p3', nome: 'Clara', slots: 0 },
    ])
  })

  it('marca a escala como inconclusiva quando chega uma reserva sem horário utilizável', () => {
    const summary = summarizeAgendaAvailability({
      date: '2026-09-10', gradeCells: [], marcaRows: marcas, apresentadoraRows: apresentadoras,
      agendaRows: [{ id: 'sem-data', status: 'planejado', apresentadora_id: 'p1' }],
    })

    expect(summary.hasUnknownSchedule).toBe(true)
  })

  it('não conta uma reserva que termina exatamente à meia-noite do dia selecionado', () => {
    const summary = summarizeAgendaAvailability({
      date: '2026-09-10', gradeCells: [], marcaRows: marcas, apresentadoraRows: apresentadoras,
      agendaRows: [{
        id: 'dia-anterior', status: 'planejado', apresentadora_id: 'p1',
        data_inicio: '2026-09-09T22:00:00-03:00', data_fim: '2026-09-10T00:00:00-03:00',
      }],
    })

    expect(summary.apresentadorasComVaga.find((row) => row.id === 'p1')).toMatchObject({ slots: 0 })
  })

  it('deduplica a apresentadora no mesmo horário em cabines diferentes', () => {
    const summary = summarizeAgendaAvailability({
      date: '2026-09-10', marcaRows: marcas, apresentadoraRows: apresentadoras, agendaRows: [],
      gradeCells: [cell('08:00', '11:00', 'm1', 'p1'), { ...cell('08:00', '11:00', 'm2', 'p1'), cabine_id: 'cab-2' }],
    })

    expect(summary.apresentadorasComVaga.find((row) => row.id === 'p1')).toMatchObject({ slots: 1 })
  })

  it('projeta reserva avulsa nos slots fixos mesmo sem célula da Grade', () => {
    const summary = summarizeAgendaAvailability({
      date: '2026-09-10', gradeCells: [], marcaRows: marcas, apresentadoraRows: apresentadoras,
      agendaRows: [{
        id: 'avulsa', cabine_id: 'cab-1', marca_id: 'm1', apresentadora_id: 'p1', status: 'planejado',
        data_inicio: '2026-09-10T08:00:00-03:00', data_fim: '2026-09-10T14:00:00-03:00', apresentadoras: [],
      }],
    })

    expect(summary.marcasSemHorario.map((row) => row.id)).not.toContain('m1')
    expect(summary.apresentadorasComVaga.map((row) => row.id)).not.toContain('p1')
  })

  it('ignora turno de outro dia quando a reserva avulsa cruza a meia-noite', () => {
    const summary = summarizeAgendaAvailability({
      date: '2026-09-10', gradeCells: [], marcaRows: marcas, apresentadoraRows: apresentadoras,
      agendaRows: [{
        id: 'noturna', cabine_id: 'cab-1', marca_id: 'm1', status: 'planejado',
        data_inicio: '2026-09-09T23:00:00-03:00', data_fim: '2026-09-10T02:00:00-03:00',
        apresentadoras: [
          { apresentadora_id: 'p2', data_inicio: '2026-09-09T23:00:00-03:00', data_fim: '2026-09-10T00:00:00-03:00' },
          { apresentadora_id: 'p3', data_inicio: '2026-09-10T00:00:00-03:00', data_fim: '2026-09-10T02:00:00-03:00' },
        ],
      }],
    })

    expect(summary.apresentadorasComVaga.find((row) => row.id === 'p2')).toMatchObject({ slots: 0 })
    expect(summary.apresentadorasComVaga.find((row) => row.id === 'p3')).toMatchObject({ slots: 1 })
    expect(summary.hasUnknownSchedule).toBe(false)
  })

  it('mantém o planejamento quando a reserva ocupa apenas parte do slot', () => {
    const summary = summarizeAgendaAvailability({
      date: '2026-09-10', marcaRows: marcas, apresentadoraRows: apresentadoras,
      gradeCells: [cell('08:00', '11:00', 'm1', 'p1')],
      agendaRows: [{
        id: 'parcial', cabine_id: 'cab-1', marca_id: 'm2', apresentadora_id: 'p2', status: 'planejado',
        data_inicio: '2026-09-10T09:00:00-03:00', data_fim: '2026-09-10T10:00:00-03:00', apresentadoras: [],
      }],
    })

    expect(summary.marcasSemHorario.map((row) => row.id)).toEqual(['m3'])
    expect(summary.apresentadorasComVaga).toEqual([
      { id: 'p1', nome: 'Ana', slots: 1 },
      { id: 'p2', nome: 'Bia', slots: 1 },
      { id: 'p3', nome: 'Clara', slots: 0 },
    ])
  })

  it('substitui o planejamento quando a reserva cobre a célula inteira', () => {
    const summary = summarizeAgendaAvailability({
      date: '2026-09-10', marcaRows: marcas, apresentadoraRows: apresentadoras,
      gradeCells: [cell('08:00', '11:00', 'm1', 'p1')],
      agendaRows: [{
        id: 'integral', cabine_id: 'cab-1', marca_id: 'm2', apresentadora_id: 'p2', status: 'planejado',
        data_inicio: '2026-09-10T08:00:00-03:00', data_fim: '2026-09-10T11:00:00-03:00', apresentadoras: [],
      }],
    })

    expect(summary.apresentadorasComVaga).toEqual([
      { id: 'p1', nome: 'Ana', slots: 0 },
      { id: 'p2', nome: 'Bia', slots: 1 },
      { id: 'p3', nome: 'Clara', slots: 0 },
    ])
  })
})
