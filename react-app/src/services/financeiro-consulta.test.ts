import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiGet = vi.fn()
const apiGetBlob = vi.fn()
vi.mock('./api', () => ({ apiGet: (...args: unknown[]) => apiGet(...args), apiGetBlob: (...args: unknown[]) => apiGetBlob(...args) }))

import { consultarFinanceiro, exportarConsultaFinanceiro, formatConsultaMoney, type ConsultaFiltro } from './financeiro-consulta'

const filtro: ConsultaFiltro = {
  eixo: 'vencimento', inicio: '2026-10', fim: '2026-10', competencia_inicio: '2026-08', competencia_fim: '2026-10',
  natureza: 'receita', status: 'pendente', q: 'marca', pagina: 2, limite: 25,
}

beforeEach(() => { apiGet.mockReset(); apiGetBlob.mockReset() })

describe('consulta financeira', () => {
  it('preserva os decimais exatos do servidor e totais do recorte completo', async () => {
    apiGet.mockResolvedValue({
      itens: [{ id: 'x', natureza: 'receita', competencia: '2026-09-01', descricao: 'Título', valor_previsto: '0.10', valor_pago: '0.00', saldo_aberto: '-0.25', inconsistente: true }],
      total_registros: 26, totais: { previsto: '90071992547409.93', pago: '0.10', aberto: '-0.25' }, pagina: 2, limite: 25, total_paginas: 2,
    })
    const result = await consultarFinanceiro(filtro)
    expect(apiGet).toHaveBeenCalledWith('/financeiro/consulta', filtro)
    expect(result.totais.previsto).toBe('90071992547409.93')
    expect(result.itens[0]).toMatchObject({ valor_previsto_exato: '0.10', saldo_aberto: '-0.25', inconsistente: true })
    expect(result.total_registros).toBe(26)
  })

  it('exporta o recorte filtrado sem paginação', async () => {
    const blob = new Blob(['csv'])
    apiGetBlob.mockResolvedValue(blob)
    expect(await exportarConsultaFinanceiro(filtro)).toBe(blob)
    expect(apiGetBlob).toHaveBeenCalledWith('/financeiro/consulta.csv', {
      eixo: 'vencimento', inicio: '2026-10', fim: '2026-10', competencia_inicio: '2026-08', competencia_fim: '2026-10',
      natureza: 'receita', status: 'pendente', q: 'marca',
    })
  })

  it('formata centavos sem converter por Number', () => {
    expect(formatConsultaMoney('90071992547409.93')).toBe('R$ 90.071.992.547.409,93')
    expect(formatConsultaMoney('-0.25')).toBe('−R$ 0,25')
    expect(formatConsultaMoney('0.1')).toBe('R$ 0,10')
  })

  it('não transforma resposta financeira incompleta em zero confirmado', async () => {
    apiGet.mockResolvedValue({ itens: [], total_registros: 0, totais: {}, pagina: 1, limite: 25, total_paginas: 0 })
    await expect(consultarFinanceiro(filtro)).rejects.toThrow('Totais financeiros incompletos')
  })
})
