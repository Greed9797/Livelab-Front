import { beforeEach, describe, expect, it, vi } from 'vitest'
import { agingFilterError, consultarAging } from './financeiro-aging'

const apiGet = vi.fn()
vi.mock('./api', () => ({ apiGet: (...args: unknown[]) => apiGet(...args) }))

const filtro = { data_referencia: '2026-10-06', competencia_inicio: '2026-07', competencia_fim: '2026-10', faixas: '7,30' }
const response = {
  data_referencia: '2026-10-06', competencia_inicio: '2026-07', competencia_fim: '2026-10', limites_dias: [7, 30],
  atrasado: { quantidade: 2, saldo_aberto: '90071992547409.91' },
  vence_hoje: { quantidade: 1, saldo_aberto: '1.05' }, futuro: { quantidade: 0, saldo_aberto: '0.00' },
  faixas: [
    { de_dias: 1, ate_dias: 7, quantidade: 1, saldo_aberto: '0.01' },
    { de_dias: 8, ate_dias: 30, quantidade: 0, saldo_aberto: '0.00' },
    { de_dias: 31, ate_dias: null, quantidade: 1, saldo_aberto: '90071992547409.90' },
  ],
}

beforeEach(() => apiGet.mockReset().mockResolvedValue(response))

describe('financeiro aging contract', () => {
  it('sends only explicit filters and preserves exact decimal strings', async () => {
    expect(await consultarAging(filtro)).toMatchObject({ atrasado: { saldo_aberto: '90071992547409.91' }, faixas: response.faixas })
    expect(apiGet).toHaveBeenCalledWith('/financeiro/aging', filtro)
  })

  it('rejects invalid bounds before a request', async () => {
    expect(agingFilterError({ ...filtro, faixas: '30,7' })).toContain('crescentes')
    expect(agingFilterError({ ...filtro, data_referencia: '2026-02-30' })).toContain('válida')
    await expect(consultarAging({ ...filtro, competencia_inicio: '2026-11' })).rejects.toThrow('competências')
    expect(apiGet).not.toHaveBeenCalled()
  })

  it('rejects missing money or buckets rather than displaying zero', async () => {
    apiGet.mockResolvedValueOnce({ ...response, vence_hoje: undefined })
    await expect(consultarAging(filtro)).rejects.toThrow('incompleta')
    apiGet.mockResolvedValueOnce({ ...response, atrasado: { quantidade: 2 } })
    await expect(consultarAging(filtro)).rejects.toThrow('incompleta')
  })
})
