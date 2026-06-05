import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface PdfMetric {
  label: string
  value: string
}

export interface PdfDailyRow {
  dia: string
  gmvLives: string
  gmvVideos: string
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
  doc.setFontSize(18)
  doc.setTextColor(20)
  doc.text('LiveLab — Relatório mensal', MARGIN_X, y)

  y += 24
  doc.setFontSize(13)
  doc.text(input.titulo, MARGIN_X, y)

  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(110)
  doc.text(`${input.subtitulo} · ${input.mes}`, MARGIN_X, y)

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
    head: [['Dia', 'GMV lives', 'GMV vídeos', 'Horas', 'Pedidos']],
    body: input.dailyRows.map((r) => [r.dia, r.gmvLives, r.gmvVideos, r.horas, r.pedidos]),
    theme: 'grid',
    headStyles: { fillColor: DARK },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    margin: { left: MARGIN_X, right: MARGIN_X },
  })

  // @ts-expect-error lastAutoTable é adicionado pelo plugin em runtime
  const footY: number = doc.lastAutoTable.finalY + 24
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(140)
  doc.text(`Gerado em ${input.geradoEm}`, MARGIN_X, footY)

  const slug = input.titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  doc.save(`relatorio-${slug || 'livelab'}-${input.mes}.pdf`)
}
