import { describe, expect, it } from 'vitest'
import { groupLeadsByStage, moveLeadToStage, normalizeCrmStage } from './CrmPage'

describe('CRM kanban helpers', () => {
  it('normalizes invalid or legacy stages to lead_novo', () => {
    expect(normalizeCrmStage({ crm_etapa: 'em_negociacao' })).toBe('em_negociacao')
    expect(normalizeCrmStage({ status: 'ganho' })).toBe('lead_novo')
    expect(normalizeCrmStage({ etapa: 'perdido' })).toBe('lead_novo')
  })

  it('places each lead in exactly one fixed kanban stage', () => {
    const luso = { id: 'lead-1', nome: 'Luso', crm_etapa: 'lead_novo', status: 'ganho', etapa: 'perdido' }
    const grouped = groupLeadsByStage([
      luso,
      { id: 'lead-2', nome: 'Marca B', crm_etapa: 'ganho' },
      { id: 'lead-3', nome: 'Marca C' },
    ])

    const appearances = grouped.flatMap(({ leads }) => leads).filter((lead) => lead.id === 'lead-1')
    expect(appearances).toHaveLength(1)
    expect(grouped.find(({ stage }) => stage.key === 'lead_novo')?.leads.map((lead) => lead.id)).toEqual(['lead-1', 'lead-3'])
    expect(grouped.find(({ stage }) => stage.key === 'ganho')?.leads.map((lead) => lead.id)).toEqual(['lead-2'])
  })

  it('moves exactly one lead to the dropped stage', () => {
    const moved = moveLeadToStage([
      { id: 'lead-1', nome: 'A', crm_etapa: 'lead_novo' },
      { id: 'lead-2', nome: 'B', crm_etapa: 'ganho' },
    ], 'lead-1', 'em_negociacao')

    expect(moved).toEqual([
      { id: 'lead-1', nome: 'A', crm_etapa: 'em_negociacao' },
      { id: 'lead-2', nome: 'B', crm_etapa: 'ganho' },
    ])
  })
})
