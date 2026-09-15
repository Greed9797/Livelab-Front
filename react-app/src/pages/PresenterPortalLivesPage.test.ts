import { describe, expect, it } from 'vitest'
import { payloadFromForm, presenterFormErrors } from './PresenterPortalLivesPage'

describe('payloadFromForm', () => {
  const base = {
    marcaId: 'marca-1', cabineId: '', dia: '2026-09-14', horaInicio: '09:00', horaFim: '10:30',
    observacao: 'Live concluída sem intercorrências.', gmv: '1.234,56', pedidos: '12', liveImpressions: '1.000', manualViews: '500',
  }

  it('accepts Brazilian GMV and keeps one calendar day', () => {
    expect(payloadFromForm(base)).toMatchObject({ marca_id: 'marca-1', gmv_declarado: '1234.56', pedidos_declarados: 12 })
  })
  it('identifies the invalid field and enforces the current Sao Paulo month', () => {
    const now = new Date('2026-09-14T18:00:00Z')
    expect(presenterFormErrors(base, now)).toEqual({})
    expect(presenterFormErrors({ ...base, gmv: '1,2,3' }, now)).toHaveProperty('gmv')
    expect(presenterFormErrors({ ...base, dia: '2026-08-31' }, now)).toHaveProperty('dia')
    expect(presenterFormErrors({ ...base, dia: '2026-10-01' }, now)).toHaveProperty('dia')
    expect(presenterFormErrors({ ...base, horaFim: '23:00' }, now)).toHaveProperty('horaFim')
  })

  it('accepts absent optional observation and rejects end before start', () => {
    expect(payloadFromForm({ ...base, observacao: '   ' })).toMatchObject({ observacao: undefined })
    expect(payloadFromForm({ ...base, horaFim: '08:59' })).toBeNull()
  })
})
