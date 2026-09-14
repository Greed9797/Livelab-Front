import { describe, expect, it } from 'vitest'
import { payloadFromForm } from './PresenterPortalLivesPage'

describe('payloadFromForm', () => {
  const base = {
    marcaId: 'marca-1', cabineId: '', dia: '2026-09-14', horaInicio: '09:00', horaFim: '10:30',
    observacao: 'Live concluída sem intercorrências.', gmv: '1.234,56', pedidos: '12', liveImpressions: '1.000', manualViews: '500',
  }

  it('accepts Brazilian GMV and keeps one calendar day', () => {
    expect(payloadFromForm(base)).toMatchObject({ marca_id: 'marca-1', gmv_declarado: '1234.56', pedidos_declarados: 12 })
  })

  it('rejects missing required observation and end time before start time', () => {
    expect(payloadFromForm({ ...base, observacao: '   ' })).toBeNull()
    expect(payloadFromForm({ ...base, horaFim: '08:59' })).toBeNull()
  })
})
