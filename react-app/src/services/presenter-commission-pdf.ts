import { buildSettlementPdfInput } from '../components/financeiro/PresenterSettlement'
import { getOwnMonthlyReport, type OwnMonthlyReport } from './presenter-portal'

function cents(value: number | string) {
  return Math.round(Number(value) * 100)
}

// Mesmo documento do fechamento do gestor: mesmos totais, mesma memória e o
// mesmo gerador. Um id que não é o do fechamento não vira PDF.
export function ownCommissionPdfInput(report: OwnMonthlyReport) {
  const row = report.fechamento
  const details = report.detalhes
  if (
    details.mes !== report.mes
    || details.apresentadora_id !== row.apresentadora_id
    || !details.memoria_completa
    || cents(details.total_variavel) !== cents(row.comissao)
  ) {
    throw new Error('O fechamento foi atualizado. Aguarde os dados recarregarem e tente exportar novamente.')
  }
  return buildSettlementPdfInput(row, report.mes, details)
}

export async function downloadOwnCommissionPdf(mes: string) {
  const report = await getOwnMonthlyReport(mes)
  const { buildRelatorioPdf } = await import('../utils/pdfReport')
  buildRelatorioPdf(ownCommissionPdfInput(report))
}
