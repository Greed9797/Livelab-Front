import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  avisosPorLinha,
  backSemRevezamento,
  dividirJanela,
  idDoEventoCriado,
  liveJaFoiAberta,
  modoRecorrenciaSeguro,
  montarPayloadTurnos,
  principalDosTurnos,
  turnosParaChecagem,
  validarTurnos,
} from './AgendarLiveModal'

/**
 * Revezamento (multi-apresentadora) no agendamento. O que se prova aqui é o que o
 * backend cobra: turno dentro da janela do evento, fim depois do início, par
 * (apresentadora, início) único, e ISO com o offset de São Paulo no payload.
 */
const janela = { hora_inicio: '14:00', hora_fim: '18:00' }

describe('validarTurnos', () => {
  it('aceita lista vazia — evento sem revezamento é o caminho padrão', () => {
    expect(validarTurnos([], janela)).toBeNull()
  })

  it('aceita um revezamento bem formado', () => {
    expect(validarTurnos([
      { apresentadora_id: 'ana', hora_inicio: '14:00', hora_fim: '16:00' },
      { apresentadora_id: 'bia', hora_inicio: '16:00', hora_fim: '18:00' },
    ], janela)).toBeNull()
  })

  it('recusa turno fora da janela do evento', () => {
    expect(validarTurnos([
      { apresentadora_id: 'ana', hora_inicio: '13:00', hora_fim: '16:00' },
    ], janela)).toBe('Turno fora da janela do evento (14:00–18:00).')
    expect(validarTurnos([
      { apresentadora_id: 'ana', hora_inicio: '16:00', hora_fim: '19:00' },
    ], janela)).toBe('Turno fora da janela do evento (14:00–18:00).')
  })

  it('recusa turno que termina antes ou junto de começar', () => {
    expect(validarTurnos([
      { apresentadora_id: 'ana', hora_inicio: '16:00', hora_fim: '16:00' },
    ], janela)).toBe('Cada turno precisa terminar depois de começar.')
    expect(validarTurnos([
      { apresentadora_id: 'ana', hora_inicio: '17:00', hora_fim: '15:00' },
    ], janela)).toBe('Cada turno precisa terminar depois de começar.')
  })

  it('recusa o par (apresentadora, início) repetido — é o UNIQUE da tabela', () => {
    expect(validarTurnos([
      { apresentadora_id: 'ana', hora_inicio: '14:00', hora_fim: '16:00' },
      { apresentadora_id: 'ana', hora_inicio: '14:00', hora_fim: '18:00' },
    ], janela)).toBe('Turno repetido para a mesma apresentadora.')
  })

  it('aceita a mesma apresentadora em dois turnos diferentes (manhã e tarde)', () => {
    expect(validarTurnos([
      { apresentadora_id: 'ana', hora_inicio: '14:00', hora_fim: '15:00' },
      { apresentadora_id: 'bia', hora_inicio: '15:00', hora_fim: '16:00' },
      { apresentadora_id: 'ana', hora_inicio: '16:00', hora_fim: '18:00' },
    ], janela)).toBeNull()
  })

  it('cobra a apresentadora de cada linha antes de qualquer coisa', () => {
    expect(validarTurnos([
      { apresentadora_id: '', hora_inicio: '14:00', hora_fim: '16:00' },
    ], janela)).toBe('Escolha a apresentadora de cada turno do revezamento.')
  })
})

describe('montarPayloadTurnos', () => {
  it('gera ISO com offset de São Paulo e ordena por início', () => {
    expect(montarPayloadTurnos({
      data: '2026-09-10',
      turnos: [
        { apresentadora_id: 'bia', hora_inicio: '16:00', hora_fim: '18:00' },
        { apresentadora_id: 'ana', hora_inicio: '14:00', hora_fim: '16:00' },
      ],
    })).toEqual([
      { apresentadora_id: 'ana', data_inicio: '2026-09-10T14:00:00-03:00', data_fim: '2026-09-10T16:00:00-03:00' },
      { apresentadora_id: 'bia', data_inicio: '2026-09-10T16:00:00-03:00', data_fim: '2026-09-10T18:00:00-03:00' },
    ])
  })

  it('descarta linha sem apresentadora em vez de mandar id vazio ao backend', () => {
    expect(montarPayloadTurnos({
      data: '2026-09-10',
      turnos: [
        { apresentadora_id: '', hora_inicio: '14:00', hora_fim: '16:00' },
        { apresentadora_id: 'ana', hora_inicio: '16:00', hora_fim: '18:00' },
      ],
    })).toHaveLength(1)
  })

  it('sem turnos devolve lista vazia — nada de campo novo no evento', () => {
    expect(montarPayloadTurnos({ data: '2026-09-10', turnos: [] })).toEqual([])
  })
})

describe('principalDosTurnos', () => {
  it('escolhe quem somou mais tempo', () => {
    expect(principalDosTurnos([
      { apresentadora_id: 'ana', data_inicio: '2026-09-10T14:00:00-03:00', data_fim: '2026-09-10T16:00:00-03:00' },
      { apresentadora_id: 'bia', data_inicio: '2026-09-10T16:00:00-03:00', data_fim: '2026-09-10T22:00:00-03:00' },
    ])).toBe('bia')
  })

  it('empate de tempo vai para quem começa antes', () => {
    expect(principalDosTurnos([
      { apresentadora_id: 'bia', data_inicio: '2026-09-10T16:00:00-03:00', data_fim: '2026-09-10T18:00:00-03:00' },
      { apresentadora_id: 'ana', data_inicio: '2026-09-10T14:00:00-03:00', data_fim: '2026-09-10T16:00:00-03:00' },
    ])).toBe('ana')
  })

  it('soma os turnos da mesma pessoa antes de comparar', () => {
    expect(principalDosTurnos([
      { apresentadora_id: 'ana', data_inicio: '2026-09-10T14:00:00-03:00', data_fim: '2026-09-10T15:00:00-03:00' },
      { apresentadora_id: 'bia', data_inicio: '2026-09-10T15:00:00-03:00', data_fim: '2026-09-10T16:30:00-03:00' },
      { apresentadora_id: 'ana', data_inicio: '2026-09-10T16:30:00-03:00', data_fim: '2026-09-10T18:00:00-03:00' },
    ])).toBe('ana')
  })

  it('ignora turno inválido e devolve string vazia quando não sobra ninguém', () => {
    expect(principalDosTurnos([
      { apresentadora_id: 'ana', data_inicio: 'nao-e-data', data_fim: '2026-09-10T16:00:00-03:00' },
    ])).toBe('')
  })
})

describe('dividirJanela', () => {
  it('parte a janela ao meio para o revezamento nascer preenchido', () => {
    expect(dividirJanela('14:00', '18:00')).toEqual(['14:00', '16:00', '18:00'])
    expect(dividirJanela('08:00', '11:00')).toEqual(['08:00', '09:30', '11:00'])
  })

  it('não inventa horário quando a janela é curta demais', () => {
    expect(dividirJanela('14:00', '14:00')).toEqual(['14:00', '14:00', '14:00'])
  })
})

describe('backSemRevezamento', () => {
  it('reconhece o 404 de ROTA do Fastify (back antigo, sem a sub-rota)', () => {
    expect(backSemRevezamento({
      response: { status: 404, data: { message: 'Route PUT:/v1/agenda/abc/apresentadoras not found', error: 'Not Found' } },
    })).toBe(true)
  })

  it('não confunde com o 404 do handler ("Evento não encontrado")', () => {
    expect(backSemRevezamento({ response: { status: 404, data: { error: 'Evento não encontrado' } } })).toBe(false)
  })

  it('não confunde com conflito, validação ou erro de rede', () => {
    expect(backSemRevezamento({ response: { status: 409, data: { conflitos: [] } } })).toBe(false)
    expect(backSemRevezamento(new Error('Network Error'))).toBe(false)
    expect(backSemRevezamento(null)).toBe(false)
  })
})

describe('idDoEventoCriado', () => {
  it('aceita a resposta do POST /v1/agenda ({ evento, recorrentes })', () => {
    expect(idDoEventoCriado({ evento: { id: 'evt-1' }, recorrentes: 0 })).toBe('evt-1')
  })

  it('aceita também o evento cru e devolve vazio quando não há id', () => {
    expect(idDoEventoCriado({ id: 'evt-2' })).toBe('evt-2')
    expect(idDoEventoCriado(null)).toBe('')
    expect(idDoEventoCriado({})).toBe('')
  })
})

describe('AgendarLiveModal — contrato do payload de agenda', () => {
  const source = readFileSync(new URL('./AgendarLiveModal.tsx', import.meta.url), 'utf8')

  it('mantém apresentadora_id escalar no evento e não inventa campo novo no POST/PATCH', () => {
    expect(source).toContain('apresentadora_id: (turnos.length > 0 ? principalDosTurnos(turnos) : form.apresentadora_id) || null')
    // O corpo do evento NÃO carrega os turnos: eles vão na sub-rota, senão o Zod
    // não-strict do backend antigo aceitaria e descartaria em silêncio.
    expect(source).not.toContain('apresentadoras: turnos')
  })

  it('grava os turnos pela sub-rota própria, em segundo passo', () => {
    expect(source).toContain('putAgendaTurnos')
    expect(source).toContain('Revezamento só em evento único — edite cada ocorrência da série.')
  })

  // Os quatro contratos abaixo vivem dentro do corpo do componente (efeito de
  // inicialização e onSubmit). O projeto não tem DOM nos testes de unidade
  // (vitest em ambiente node, componentes checados via renderToStaticMarkup),
  // então o que dá para travar aqui é o código-fonte — e ele quebra se a linha
  // sumir. Cobertura de interação real fica para o e2e (playwright).

  it('reaproveita o evento já criado no reenvio, em vez de criar um segundo', () => {
    expect(source).toContain('const jaCriado = eventoCriadoRef.current')
    expect(source).toContain('eventoCriadoRef.current = novoId')
    // Zera ao fechar: modal reaberto é um evento novo de novo.
    expect(source).toContain("eventoCriadoRef.current = ''")
    // O onCreate só pode ser alcançado DEPOIS do desvio de reaproveitamento.
    expect(source.indexOf('const jaCriado = eventoCriadoRef.current'))
      .toBeLessThan(source.indexOf('const resultado = onCreate?.(payload)'))
  })

  it('reseta o banner de disponibilidade ao reabrir o modal', () => {
    const inicializacao = source.slice(source.indexOf('initializedRef.current = true'))
    expect(inicializacao.slice(0, 600)).toContain("setAvailability({ status: 'idle', message: '' })")
  })

  it('exige Promise de onCreate/onUpdate e falha alto quando não vem', () => {
    expect(source).toContain('onCreate?: (payload: JsonRecord) => Promise<')
    expect(source).toContain('onUpdate?: (id: string, payload: JsonRecord) => Promise<unknown>')
    expect(source).toContain('toast.push(ERRO_CHAMADOR_SEM_PROMISE')
  })

  it('avisa quando a live já abriu e não deixa o modo de série levar turno', () => {
    expect(source).toContain('modoRecorrenciaSeguro(form.modo_recorrencia, precisaGravarTurnos)')
    expect(source).toContain('{AVISO_LIVE_ABERTA}')
    expect(source).toContain('describedBy={turnoAvisos[index] ? `turno-aviso-${index}` : undefined}')
    expect(source).toContain('id={`turno-aviso-${index}`}')
  })
})

describe('turnosParaChecagem + avisosPorLinha', () => {
  it('ancora o aviso na LINHA do form, não na posição do payload', () => {
    // A linha 0 está em branco (é o estado que `ativarRevezamento` cria) e por
    // isso não vira payload. Casando por posição, o aviso da Ana (linha 1)
    // apareceria embaixo da linha em branco e o operador mexeria no turno errado.
    const form = {
      data: '2026-09-10',
      turnos: [
        { apresentadora_id: '', hora_inicio: '14:00', hora_fim: '16:00' },
        { apresentadora_id: 'ana', hora_inicio: '16:00', hora_fim: '18:00' },
      ],
    }
    const checagens = turnosParaChecagem(form)
    expect(checagens.map((item) => item.index)).toEqual([1])
    expect(avisosPorLinha(form.turnos.length, checagens.map((item) => ({
      index: item.index,
      mensagem: 'Apresentadora já ocupada (16:00-18:00).',
    })))).toEqual(['', 'Apresentadora já ocupada (16:00-18:00).'])
  })

  it('sobrevive à reordenação: o payload sai por horário, o índice fica na linha', () => {
    // Linha 0 = turno da tarde, linha 1 = turno da manhã. montarPayloadTurnos
    // ordena por início; o índice da checagem não pode acompanhar a ordenação.
    const form = {
      data: '2026-09-10',
      turnos: [
        { apresentadora_id: 'bia', hora_inicio: '16:00', hora_fim: '18:00' },
        { apresentadora_id: 'ana', hora_inicio: '14:00', hora_fim: '16:00' },
      ],
    }
    expect(montarPayloadTurnos(form).map((t) => t.apresentadora_id)).toEqual(['ana', 'bia'])
    expect(turnosParaChecagem(form).map((item) => [item.index, item.turno.apresentadora_id]))
      .toEqual([[0, 'bia'], [1, 'ana']])
  })

  it('descarta índice fora da lista em vez de estourar', () => {
    expect(avisosPorLinha(2, [{ index: 5, mensagem: 'x' }, { index: -1, mensagem: 'y' }])).toEqual(['', ''])
    expect(avisosPorLinha(0, [{ index: 0, mensagem: 'x' }])).toEqual([])
  })
})

describe('liveJaFoiAberta', () => {
  it('reconhece o evento cuja live já abriu — o rateio dela já está gravado', () => {
    expect(liveJaFoiAberta({ status: 'ao_vivo' })).toBe(true)
    expect(liveJaFoiAberta({ status: 'concluido', live_id: 'live-1' })).toBe(true)
  })

  it('não acusa evento que ainda não virou live', () => {
    expect(liveJaFoiAberta({ status: 'planejado' })).toBe(false)
    expect(liveJaFoiAberta({ status: 'confirmado', live_id: null })).toBe(false)
    expect(liveJaFoiAberta(null)).toBe(false)
    expect(liveJaFoiAberta(undefined)).toBe(false)
  })
})

describe('modoRecorrenciaSeguro', () => {
  it('prende a alteração nesta ocorrência quando há turno em jogo', () => {
    // O PATCH espalharia o espelho escalar pela série inteira, mas o PUT dos
    // turnos só atinge o id editado: as outras ocorrências abririam a live com
    // 100% para a principal.
    expect(modoRecorrenciaSeguro('todos', true)).toBe('apenas_este')
    expect(modoRecorrenciaSeguro('este_e_proximos', true)).toBe('apenas_este')
  })

  it('não mexe no modo escolhido quando não há revezamento', () => {
    expect(modoRecorrenciaSeguro('todos', false)).toBe('todos')
    expect(modoRecorrenciaSeguro('este_e_proximos', false)).toBe('este_e_proximos')
    expect(modoRecorrenciaSeguro('apenas_este', false)).toBe('apenas_este')
  })
})
