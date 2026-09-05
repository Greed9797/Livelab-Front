import { describe, expect, it } from 'vitest'
import { AreaPanel, BarPanel, GmvHoraComboPanel, LinePanel } from './Charts'

describe('chart component identity across updates', () => {
  for (const [name, Panel] of [['area', AreaPanel], ['bar', BarPanel], ['line', LinePanel]] as const) {
    it(`keeps the ${name} chart mounted when its parent renders again`, () => {
      const initial = Panel({ title: 'GMV', data: [{ label: 'Hoje', value: 10 }] })
      const updatedData = [{ label: 'Hoje', value: 20 }]
      const updated = Panel({ title: 'GMV atualizado', data: updatedData })

      expect(updated.props.children.type).toBe(initial.props.children.type)
      expect(updated.props.children.props.data).toBe(updatedData)
      expect(updated.props.children.props.title).toBe('GMV atualizado')
    })
  }

  it('keeps the combined chart mounted while updating metrics', () => {
    const initial = GmvHoraComboPanel({ title: 'Produtividade', data: [{ label: 'Hoje', gmvHora: 10, horas: 2 }] })
    const updatedData = [{ label: 'Hoje', gmvHora: 20, horas: 3 }]
    const updated = GmvHoraComboPanel({ title: 'Produtividade', data: updatedData, accumulatedValue: '60' })

    expect(updated.props.children.type).toBe(initial.props.children.type)
    expect(updated.props.children.props.data).toBe(updatedData)
    expect(updated.props.children.props.accumulatedValue).toBe('60')
  })
})
