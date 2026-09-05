import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { GradeAcompanhamento } from './GradeAcompanhamento'
import type { GradeAcompanhamentoResponse } from '../../services/grade'

const data: GradeAcompanhamentoResponse = {
  data: '2026-07-17',
  timezone: 'America/Sao_Paulo',
  cabines: [{
    id: 'cab-1', numero: 1, nome: null, ativo: true, status_fisico: 'disponivel',
    sem_reserva: false, programacao_grade: [{ cabine_id: 'cab-1', hora_inicio: '08:00', hora_fim: '11:00', marca_nome: 'Marca A' }], minutos_reais: 175,
    planejamentos: [{
      id: 'agenda-1', tipo: 'live', status_agenda: 'confirmado', situacao: 'registro_pendente',
      cancelamento_origem: null, marca_id: 'marca-1', marca_nome: 'Marca A',
      apresentadora_id: null, apresentadora_nome: null,
      data_inicio: '2026-07-17T11:00:00.000Z', data_fim: '2026-07-17T14:00:00.000Z',
      observacoes: null, live_ids: [], live_candidata_ids: [], minutos_reais: 0,
    }, {
      id: 'agenda-2', tipo: 'live', status_agenda: 'cancelado', situacao: 'cancelada',
      cancelamento_origem: 'agenda', marca_id: 'marca-2', marca_nome: 'Marca B',
      apresentadora_id: null, apresentadora_nome: null,
      data_inicio: '2026-07-17T15:00:00.000Z', data_fim: '2026-07-17T18:00:00.000Z',
      observacoes: null, live_ids: [], live_candidata_ids: [], minutos_reais: 0,
    }],
    execucoes_sem_reserva: [{
      id: 'live-1', situacao: 'sem_reserva', status_live: 'encerrada', marca_id: 'marca-3', marca_nome: 'Marca C',
      iniciado_em: '2026-07-17T18:00:00.000Z', encerrado_em: '2026-07-17T19:00:00.000Z',
      agenda_candidata_ids: [], minutos_reais: 60,
    }],
  }],
  cabine_desconhecida: {
    id: null, numero: null, nome: null, ativo: null, status_fisico: 'desconhecida', sem_reserva: true,
    programacao_grade: [], minutos_reais: 0, planejamentos: [], execucoes_sem_reserva: [],
  },
}

describe('GradeAcompanhamento', () => {
  it('renderiza planejado, cancelamento, execução sem reserva e ações contextualizadas', () => {
    const html = renderToStaticMarkup(<MemoryRouter><GradeAcompanhamento value={data} /></MemoryRouter>)
    expect(html).toContain('Acompanhamento operacional')
    expect(html).toContain('Registro pendente')
    expect(html).toContain('Cancelada')
    expect(html).toContain('Sem reserva')
    expect(html).toContain('agenda=agenda-1')
    expect(html).toContain('live=live-1')
    expect(html).toContain('origem=grade')
    expect(html).not.toMatch(/no.?show|ocios/i)
  })

  it('explica uma cabine sem reserva planejada sem alegar capacidade vendável', () => {
    const empty = structuredClone(data)
    empty.cabines[0].planejamentos = []
    empty.cabines[0].execucoes_sem_reserva = []
    empty.cabines[0].sem_reserva = true
    const html = renderToStaticMarkup(<MemoryRouter><GradeAcompanhamento value={empty} /></MemoryRouter>)
    expect(html).toContain('Sem reservas ou execuções registradas')
    expect(html).toContain('A grade padrão tem programação')
    expect(html).not.toMatch(/capacidade|disponível para venda/i)
  })

  it('esconde cadastro para papel somente leitura', () => {
    const html = renderToStaticMarkup(<MemoryRouter><GradeAcompanhamento value={data} canWrite={false} /></MemoryRouter>)
    expect(html).not.toContain('Registrar execução')
    expect(html).toContain('Registro pendente')
  })

  it('live já vinculada com status pendente abre a execução e não cria outra', () => {
    const linked = structuredClone(data)
    linked.cabines[0].planejamentos[0].live_ids = ['live-linked']
    const html = renderToStaticMarkup(<MemoryRouter><GradeAcompanhamento value={linked} /></MemoryRouter>)
    expect(html).toContain('live=live-linked')
    expect(html).toContain('status ainda precisa de revisão')
    expect(html).not.toContain('Registrar execução')
  })
})
