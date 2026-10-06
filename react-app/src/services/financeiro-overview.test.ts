import { beforeEach, describe, expect, it, vi } from 'vitest'
import { consultarExceptions, consultarOverview } from './financeiro-overview'

const apiGet = vi.fn()
vi.mock('./api', () => ({ apiGet: (...args: unknown[]) => apiGet(...args) }))

beforeEach(() => apiGet.mockReset())

describe('FIN-05 service', () => {
  it('requests the same month/reference snapshot for overview and queue', async () => {
    apiGet.mockResolvedValueOnce({ mes: '2026-10', data_referencia: '2026-10-10', estado: 'apurado', incompletos: 0,
      total_excecoes: 1, totais: { receber: { quantidade: 1, previsto: '0.30', pago: '0.10', aberto: '0.20' },
        pagar: { quantidade: 0, previsto: '0.00', pago: '0.00', aberto: '0.00' } } })
    apiGet.mockResolvedValueOnce({ estado: 'apurado', itens: [{ tipo: 'vencido', id: 'a', saldo_aberto: '0.20' }],
      total_registros: 1, pagina: 1, limite: 50, total_paginas: 1 })
    expect((await consultarOverview('2026-10', '2026-10-10')).totais?.receber.aberto).toBe('0.20')
    expect((await consultarExceptions('2026-10', '2026-10-10', 1)).itens).toHaveLength(1)
    expect(apiGet.mock.calls.map((call) => call[0])).toEqual([
      '/financeiro/overview?mes=2026-10&data_referencia=2026-10-10',
      '/financeiro/exceptions?mes=2026-10&data_referencia=2026-10-10&pagina=1',
    ])
  })

  it('rejects incomplete totals and invalid periods', async () => {
    apiGet.mockResolvedValue({ estado: 'apurado', incompletos: 0, total_excecoes: 0, totais: null })
    await expect(consultarOverview('2026-10', '2026-10-10')).rejects.toThrow('incompleta')
    await expect(consultarOverview('2026-13', '2026-10-10')).rejects.toThrow('inválido')
    await expect(consultarExceptions('2026-10', '2026-10-10', 0)).rejects.toThrow('inválida')
  })

  it('preserves empty state without inventing a zero balance', async () => {
    apiGet.mockResolvedValue({ mes: '2026-10', data_referencia: '2026-10-10', estado: 'vazio',
      incompletos: 0, total_excecoes: 0, totais: null })
    expect((await consultarOverview('2026-10', '2026-10-10')).totais).toBeNull()
  })
})
