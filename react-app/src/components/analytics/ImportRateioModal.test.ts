import { describe, expect, it } from 'vitest'

import { montarPayloadRateio } from './ImportRateioModal'

/**
 * O que se prova aqui é a diferença entre 0 e ausente no campo `segundos`.
 * Nos rollups, `COALESCE(ap_v2.segundos_rateio / 3600.0, ...)` casa no PRIMEIRO
 * degrau quando o valor gravado é 0 — 0 não é NULL — e a apresentadora fica com
 * zero horas naquela live para sempre (meta de horas, ranking e GMV/h junto).
 * Ausente, o rollup cai no degrau seguinte e usa a duração real da live.
 */
describe('montarPayloadRateio', () => {
  const ana = { apresentadora_id: 'ana', tempoTexto: '', gmv: 1000 }
  const bia = { apresentadora_id: 'bia', tempoTexto: '', gmv: 500 }

  it('NÃO manda segundos quando a live ainda não fechou e ninguém digitou tempo', () => {
    // Live em andamento: o chamador manda duration_seconds = 0 porque não há
    // encerrado_em. Mandar `segundos: 0` aqui zeraria as horas das duas.
    const payload = montarPayloadRateio([ana, bia], 0)
    expect(payload).toEqual([
      { apresentadora_id: 'ana', gmv: 1000 },
      { apresentadora_id: 'bia', gmv: 500 },
    ])
    expect(payload.every((linha) => !('segundos' in linha))).toBe(true)
  })

  it('manda o tempo de quem digitou e omite o de quem deixou em branco', () => {
    const payload = montarPayloadRateio([{ ...ana, tempoTexto: '2h' }, bia], 0)
    expect(payload[0]).toEqual({ apresentadora_id: 'ana', segundos: 7200, gmv: 1000 })
    expect('segundos' in payload[1]).toBe(false)
  })

  it('fecha o total da live no segundo com a sobra na última linha digitada', () => {
    // 4h de live, digitado em minutos cheios: 1h30 + 2h29 = 3h59. A sobra de
    // 60s vai para a última linha COM tempo, nunca para uma linha em branco.
    const payload = montarPayloadRateio([
      { apresentadora_id: 'ana', tempoTexto: '1h30', gmv: 600 },
      { apresentadora_id: 'bia', tempoTexto: '2h29', gmv: 400 },
      { apresentadora_id: 'carla', tempoTexto: '', gmv: 0 },
    ], 4 * 3600)
    expect(payload[0].segundos).toBe(5400)
    expect(payload[1].segundos).toBe(4 * 3600 - 5400)
    expect('segundos' in payload[2]).toBe(false)
  })

  it('não inventa tempo quando a live fechou mas ninguém digitou nada', () => {
    // Sem linha digitada não há onde jogar a sobra: some a chave em vez de
    // gravar a duração inteira numa pessoa qualquer.
    expect(montarPayloadRateio([ana, bia], 4 * 3600)).toEqual([
      { apresentadora_id: 'ana', gmv: 1000 },
      { apresentadora_id: 'bia', gmv: 500 },
    ])
  })

  it('arredonda o GMV em centavos e nunca manda segundos negativo', () => {
    const payload = montarPayloadRateio([{ apresentadora_id: 'ana', tempoTexto: '1h', gmv: 10.005 }], 0)
    expect(payload[0].gmv).toBe(10.01)
    expect(payload[0].segundos).toBe(3600)
  })
})
