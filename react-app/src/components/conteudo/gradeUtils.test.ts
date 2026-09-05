import { describe, expect, it } from 'vitest'

import { gradeOperationalLink, statusAcompanhamento } from './gradeUtils'

describe('links operacionais da grade', () => {
  it('abre a execução confirmada preservando o contexto do dia e da cabine', () => {
    const link = new URL(gradeOperationalLink({
      data: '2026-07-17', cabineId: 'cab-1', liveId: 'live-1',
    }), 'https://livelab.local')
    expect(Object.fromEntries(link.searchParams)).toMatchObject({
      tab: 'lives', periodo: 'custom', data_inicio: '2026-07-17', data_fim: '2026-07-17',
      cabine: 'cab-1', live: 'live-1', origem: 'grade',
    })
  })

  it('leva o cadastro pendente para o evento exato', () => {
    const cadastro = new URL(gradeOperationalLink({ data: '2026-07-17', cabineId: 'cab-1', agendaId: 'agenda-1', pendencia: 'cadastro' }), 'https://livelab.local')
    expect(cadastro.searchParams.get('agenda')).toBe('agenda-1')
    expect(cadastro.searchParams.get('pendencia')).toBe('cadastro')
  })
})

describe('texto conservador do acompanhamento', () => {
  it('não transforma registro ausente em no-show', () => {
    expect(statusAcompanhamento('registro_pendente').label).toBe('Registro pendente')
    expect(statusAcompanhamento('sem_reserva').label).toBe('Sem reserva')
    expect(statusAcompanhamento('vinculacao_pendente').label).toBe('Vinculação pendente')
    expect(statusAcompanhamento('planejada').label).toBe('Planejada')
    expect(statusAcompanhamento('sem_execucao_vinculada').label).toBe('Sem execução vinculada')
    expect(JSON.stringify([
      statusAcompanhamento('registro_pendente'),
      statusAcompanhamento('sem_reserva'),
      statusAcompanhamento('vinculacao_pendente'),
    ])).not.toMatch(/falta|no.?show|ocios/i)
  })
})
