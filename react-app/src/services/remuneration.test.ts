import { describe, expect, it, vi } from 'vitest'
import { apiDelete, apiGet, apiPost } from './api'
import { createPresenterExtra, deletePresenterExtra, getPresenterSettlement } from './remuneration'

vi.mock('./api', () => ({ apiDelete: vi.fn(), apiGet: vi.fn(), apiPost: vi.fn() }))

describe('remuneration service', () => {
  it('uses the monthly settlement endpoints and keeps weekend values server-owned', async () => {
    vi.mocked(apiGet).mockResolvedValue({ mes: '2026-09', apresentadoras: [], totais: {}, pode_editar: true })
    vi.mocked(apiPost).mockResolvedValue({ id: 'extra-1' })
    vi.mocked(apiDelete).mockResolvedValue({})

    await getPresenterSettlement('2026-09')
    await createPresenterExtra({ mes: '2026-09', apresentadora_id: 'ap-1', tipo: 'fim_de_semana', descricao: 'Presença', data_referencia: '2026-09-05' })
    await createPresenterExtra({ mes: '2026-09', apresentadora_id: 'ap-1', tipo: 'bonificacao', descricao: 'Meta', valor: 100, request_id: '6f1b29b4-b0f4-4807-9adc-16873838bc99' })
    await deletePresenterExtra('extra/1')

    expect(apiGet).toHaveBeenCalledWith('/financeiro/fechamento-apresentadoras', { mes: '2026-09' })
    expect(apiPost).toHaveBeenCalledWith('/financeiro/adicionais-apresentadoras', { mes: '2026-09', apresentadora_id: 'ap-1', tipo: 'fim_de_semana', descricao: 'Presença', data_referencia: '2026-09-05' })
    expect(apiPost).toHaveBeenCalledWith('/financeiro/adicionais-apresentadoras', { mes: '2026-09', apresentadora_id: 'ap-1', tipo: 'bonificacao', descricao: 'Meta', valor: 100, request_id: '6f1b29b4-b0f4-4807-9adc-16873838bc99' })
    expect(apiDelete).toHaveBeenCalledWith('/financeiro/adicionais-apresentadoras/extra%2F1')
  })
})
