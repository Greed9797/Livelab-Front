import { describe, expect, it } from 'vitest'
import { completedLiveStatusBits, payloadFromForm, presenterFormErrors, presenterLivesAttention, submissionMobileStatusBits } from './PresenterPortalLivesPage'

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

describe('presenter lives mobile status', () => {
  it('keeps the existing phrases and colors them without a new synonym', () => {
    expect(completedLiveStatusBits({ uniao_id: 'u1', pendente_aprovacao: true, em_conciliacao: true })).toEqual([
      { label: 'Transmissão unida · sua participação', tone: 'info' },
      { label: 'Pendente aprovação · conferir vínculo', tone: 'warning' },
    ])
    expect(completedLiveStatusBits({ pendente_aprovacao: true })).toEqual([{ label: 'Pendente aprovação', tone: 'warning' }])
    expect(submissionMobileStatusBits({ status: 'pendente' })).toEqual([{ label: 'Em revisão', tone: 'warning' }])
    expect(submissionMobileStatusBits({ status: 'devolvida', arquivamento_status: 'solicitado' })).toEqual([{ label: 'Aguardando sua resposta', tone: 'warning' }])
    expect(submissionMobileStatusBits({ status: 'devolvida' })).toEqual([{ label: 'Devolvida para ajuste', tone: 'danger' }])
    expect(submissionMobileStatusBits({ status: 'aprovada', live_oficial_excluida_id: 'live-1', live_oficial_excluida_em: '2026-09-01T00:00:00Z' })).toEqual([
      { label: 'Aprovada', tone: 'success' },
      { label: 'Live excluída pelo gestor', tone: 'neutral' },
    ])
    expect(submissionMobileStatusBits({ status: 'aprovada', arquivamento_status: 'confirmado' })).toEqual([{ label: 'Arquivado', tone: 'neutral' }])
    expect(submissionMobileStatusBits({ status: 'cancelada' })).toEqual([{ label: 'Cancelada', tone: 'neutral' }])
  })

  it('opens the top band only when a response or a correction is waiting', () => {
    expect(presenterLivesAttention([{ status: 'pendente' }])).toBeNull()
    expect(presenterLivesAttention([{ status: 'devolvida', arquivamento_status: 'confirmado' }])).toBeNull()
    expect(presenterLivesAttention([{ status: 'devolvida', arquivamento_status: 'solicitado' }])).toEqual({ label: 'Aguardando sua resposta', tone: 'warning' })
    expect(presenterLivesAttention([{ status: 'devolvida' }])).toEqual({ label: 'Devolvida para ajuste', tone: 'danger' })
    expect(presenterLivesAttention([{ status: 'devolvida', arquivamento_status: 'solicitado' }, { status: 'devolvida' }])).toEqual({ label: 'Aguardando sua resposta · Devolvida para ajuste', tone: 'warning' })
  })
})
