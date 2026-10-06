import { beforeEach, describe, expect, it, vi } from 'vitest'
import { consultarHistorico } from './financeiro-historico'

const apiGet = vi.fn()
vi.mock('./api', () => ({ apiGet: (...args: unknown[]) => apiGet(...args) }))
const ID = '00000000-0000-4000-8000-000000000001'

beforeEach(() => apiGet.mockReset())

describe('histórico do detalhe financeiro', () => {
  it('usa origem e obrigação exatas e preserva liquidações/estornos', async () => {
    const response = {
      origem: 'marca_fixo', origem_id: ID,
      estado_comparacao: 'matching', historico_incompleto: false,
      valor_legado: '8.00', valor_canonico: '8.00', liquidacoes: [{
        id: ID, valor: '10.00', data_liquidacao: '2026-10-01', total_estornado: '2.00',
        total_liquido: '8.00', estornos: [{ id: ID, valor: '2.00', data_estorno: '2026-10-02' }],
      }],
    }
    apiGet.mockResolvedValue(response)
    expect(await consultarHistorico('marca_fixo', ID)).toEqual(response)
    expect(apiGet).toHaveBeenCalledWith(`/financeiro/consulta/marca_fixo/${ID}/historico`)
  })

  it('rejeita identidade virtual e resposta sem sinal de comparação', async () => {
    await expect(consultarHistorico('marca_fixo', 'calc:2026-10')).rejects.toThrow('não materializada')
    expect(apiGet).not.toHaveBeenCalled()
    apiGet.mockResolvedValue({ liquidacoes: [] })
    await expect(consultarHistorico('marca_fixo', ID)).rejects.toThrow('incompleto')
  })
})
