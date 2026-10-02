import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiGet = vi.fn()
vi.mock('./api', () => ({ apiGet: (...a: unknown[]) => apiGet(...a) }))

import { getDreAnualV3 } from './financeiro-dre'

const resposta = { inicio: '2026-01', fim: '2026-12', meses: [{ mes: '2026-09', receita: { previsto: 10, realizado: 5 } }], totais: { receita: { previsto: 10, realizado: 5 } } }
const e404 = Object.assign(new Error('Not Found'), { isAxiosError: true, response: { status: 404 } })
const e500 = Object.assign(new Error('boom'), { isAxiosError: true, response: { status: 500 } })

describe('getDreAnualV3', () => {
  beforeEach(() => apiGet.mockReset())

  it('usa /financeiro/dre quando existe', async () => {
    apiGet.mockResolvedValueOnce(resposta)
    const d = await getDreAnualV3('2026-01', '2026-12')
    expect(apiGet).toHaveBeenCalledTimes(1)
    expect(apiGet).toHaveBeenCalledWith('/financeiro/dre', { inicio: '2026-01', fim: '2026-12' })
    expect(d.meses[0].receita.previsto).toBe(10)
  })

  it('cai em /financeiro/resumo no 404 (deploy antigo)', async () => {
    apiGet.mockRejectedValueOnce(e404).mockResolvedValueOnce(resposta)
    const d = await getDreAnualV3('2026-01', '2026-12')
    expect(apiGet.mock.calls.map((c) => c[0])).toEqual(['/financeiro/dre', '/financeiro/resumo'])
    expect(d.meses).toHaveLength(1)
  })

  it('não mascara outros erros', async () => {
    apiGet.mockRejectedValueOnce(e500)
    await expect(getDreAnualV3('2026-01', '2026-12')).rejects.toThrow('boom')
    expect(apiGet).toHaveBeenCalledTimes(1)
  })
})
