import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface PdfMetric {
  label: string
  value: string
}

export interface PdfDailyRow {
  dia: string
  marca: string
  gmvLives: string
  comissao: string
  comissaoPct: string
  horas: string
  pedidos: string
}

export interface RelatorioPdfInput {
  titulo: string
  subtitulo: string
  mes: string
  metrics: PdfMetric[]
  dailyRows: PdfDailyRow[]
  geradoEm: string
}

const BRAND: [number, number, number] = [255, 90, 31]
const DARK: [number, number, number] = [40, 40, 40]
const MARGIN_X = 40

// Gera e baixa o PDF do relatório mensal de uma marca/apresentadora.
// Programático (sem html2canvas) — números e tabelas nítidos.
export function buildRelatorioPdf(input: RelatorioPdfInput): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  let y = 48
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(20)
  doc.text(input.titulo || 'Relatório', MARGIN_X, y)

  y += 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(110)
  doc.text(`Relatório mensal · ${input.subtitulo} · ${input.mes}`, MARGIN_X, y)

  autoTable(doc, {
    startY: y + 14,
    head: [['Métrica', 'Valor']],
    body: input.metrics.map((m) => [m.label, m.value]),
    theme: 'striped',
    headStyles: { fillColor: BRAND, halign: 'left' },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: MARGIN_X, right: MARGIN_X },
  })

  // @ts-expect-error lastAutoTable é adicionado pelo plugin em runtime
  const afterMetrics: number = doc.lastAutoTable.finalY + 22
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(20)
  doc.text('Detalhamento diário', MARGIN_X, afterMetrics)

  autoTable(doc, {
    startY: afterMetrics + 8,
    head: [['Dia', 'Marca', 'GMV lives', 'R$ comissão', '% comissão', 'Horas', 'Pedidos']],
    body: input.dailyRows.map((r) => [r.dia, r.marca, r.gmvLives, r.comissao, r.comissaoPct, r.horas, r.pedidos]),
    theme: 'grid',
    headStyles: { fillColor: DARK },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
    margin: { left: MARGIN_X, right: MARGIN_X },
  })

  // @ts-expect-error lastAutoTable é adicionado pelo plugin em runtime
  const footY: number = doc.lastAutoTable.finalY + 24
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(140)
  doc.text(`Gerado em ${input.geradoEm}`, MARGIN_X, footY)

  const slug = (input.titulo || 'Relatorio')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  doc.save(`${slug || 'Relatorio'}_Relatorio_${input.mes}.pdf`)
}
