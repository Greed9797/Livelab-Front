import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiGet = vi.fn()
vi.mock('./api', () => ({ apiGet: (...a: unknown[]) => apiGet(...a) }))

import { DRE_QK, getDreAnualV3, getDreMesDetalhe } from './financeiro-dre'

const resposta = { regime: 'caixa_vencimento', inicio: '2026-01', fim: '2026-12', meses: [{ mes: '2026-09', receita: { previsto: 10, realizado: 5 } }], totais: { receita: { previsto: 10, realizado: 5 } } }
const e404 = Object.assign(new Error('Not Found'), { isAxiosError: true, response: { status: 404 } })
const e500 = Object.assign(new Error('boom'), { isAxiosError: true, response: { status: 500 } })

describe('getDreAnualV3', () => {
  beforeEach(() => apiGet.mockReset())

  it('usa /financeiro/dre quando existe', async () => {
    apiGet.mockResolvedValueOnce(resposta)
    const d = await getDreAnualV3('2026-01', '2026-12')
    expect(apiGet).toHaveBeenCalledTimes(1)
    expect(apiGet).toHaveBeenCalledWith('/financeiro/dre', { inicio: '2026-01', fim: '2026-12', regime: 'caixa_vencimento' })
    expect(d.meses[0].receita.previsto).toBe(10)
  })

  it('cai em /financeiro/resumo no 404 (deploy antigo)', async () => {
    apiGet.mockRejectedValueOnce(e404).mockResolvedValueOnce({ ...resposta, regime: undefined })
    const d = await getDreAnualV3('2026-01', '2026-12', 'competencia')
    expect(apiGet.mock.calls.map((c) => c[0])).toEqual(['/financeiro/dre', '/financeiro/resumo'])
    expect(d.meses).toHaveLength(1)
  })

  it('não mascara outros erros', async () => {
    apiGet.mockRejectedValueOnce(e500)
    await expect(getDreAnualV3('2026-01', '2026-12')).rejects.toThrow('boom')
    expect(apiGet).toHaveBeenCalledTimes(1)
  })
})

describe('regimes do DRE', () => {
  beforeEach(() => apiGet.mockReset())
  it('não substitui caixa por resumo de competência no 404', async () => {
    apiGet.mockRejectedValueOnce(e404)
    await expect(getDreAnualV3('2026-01', '2026-12')).rejects.toThrow('Not Found')
    expect(apiGet).toHaveBeenCalledTimes(1)
  })
  it('recusa payload sem confirmação do regime de caixa', async () => {
    apiGet.mockResolvedValue({ ...resposta, regime: undefined })
    await expect(getDreAnualV3('2026-01', '2026-12')).rejects.toThrow('regime solicitado')
  })
  it('isola chaves anuais e mensais por regime e preserva estorno negativo', async () => {
    expect(DRE_QK.anual('2026-01', '2026-12')).not.toEqual(DRE_QK.anual('2026-01', '2026-12', 'competencia'))
    expect(DRE_QK.mes('2026-10')).not.toEqual(DRE_QK.mes('2026-10', 'competencia'))
    apiGet.mockResolvedValue({ regime: 'caixa_vencimento', mes: '2026-10', receita: { avulsas: [{ id: 'titulo', competencia_original: '2026-08', previsto: 0, realizado: -100, movimentos: [{ id: 'estorno', tipo: 'estorno', data: '2026-10-05', valor: '-100.00' }] }] } })
    const data = await getDreMesDetalhe('2026-10')
    expect(apiGet).toHaveBeenCalledWith('/financeiro/dre/mes', { mes: '2026-10', regime: 'caixa_vencimento' })
    expect(data.receita.avulsas[0]).toMatchObject({ realizado: -100, competencia_original: '2026-08', movimentos: [{ valor: -100, tipo: 'estorno' }] })
  })
})
