import { describe, expect, it, vi } from 'vitest'
import type { PresenterSettlementDetails } from './remuneration'
import type { OwnMonthlyReport } from './presenter-portal'

const details: PresenterSettlementDetails = {
  mes: '2026-09', apresentadora_id: 'ap-1', total_variavel: 125.5, memoria_completa: true,
  performance: { total_lives: 1, horas_live: 1.5, gmv_lives: 1500, gmv_por_hora: 1000 },
  lives: [],
  memoria: [],
}

const report: OwnMonthlyReport = {
  mes: '2026-09',
  fechamento: { apresentadora_id: 'ap-1', nome: 'Ana', fixo: 2700, comissao: 125.5, adicionais: 0, total: 2825.5, extras: [] },
  detalhes: details,
}

vi.mock('../utils/pdfReport', () => ({ buildRelatorioPdf: vi.fn() }))
vi.mock('./presenter-portal', () => ({ getOwnMonthlyReport: vi.fn() }))

describe('PDF de comissão da apresentadora', () => {
  it('baixa o mesmo relatório mensal do gestor', async () => {
    const { buildRelatorioPdf } = await import('../utils/pdfReport')
    const { getOwnMonthlyReport } = await import('./presenter-portal')
    vi.mocked(getOwnMonthlyReport).mockResolvedValue(report)
    const { downloadOwnCommissionPdf, ownCommissionPdfInput } = await import('./presenter-commission-pdf')
    await downloadOwnCommissionPdf('2026-09')
    expect(getOwnMonthlyReport).toHaveBeenCalledWith('2026-09')
    expect(buildRelatorioPdf).toHaveBeenCalledWith(ownCommissionPdfInput(report))
    const input = vi.mocked(buildRelatorioPdf).mock.calls[0][0]
    expect(input.titulo).toBe('Relatório mensal — Ana')
    expect(input.metrics.map((metric) => metric.label)).toEqual(['GMV de lives', 'GMV por hora', 'Lives encerradas', 'Fixo', 'Comissão', 'Extras', 'Total a pagar'])
  })

  it('não monta o PDF quando o fechamento é de outra apresentadora', async () => {
    const { ownCommissionPdfInput } = await import('./presenter-commission-pdf')
    expect(() => ownCommissionPdfInput({
      ...report,
      detalhes: { ...details, apresentadora_id: 'ap-2' },
    })).toThrow(/atualizado/)
  })
})
