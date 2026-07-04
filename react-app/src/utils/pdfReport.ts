import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface PdfMetric {
  label: string
  value: string
}

export interface PdfTable {
  title: string
  head: string[]
  body: string[][]
  /** Índices (0-based) das colunas alinhadas à direita (números/moeda). */
  rightAlign?: number[]
}

export interface RelatorioPdfInput {
  titulo: string
  subtitulo: string
  mes: string
  metrics: PdfMetric[]
  tables: PdfTable[]
  geradoEm: string
}

const BRAND: [number, number, number] = [255, 90, 31]
const DARK: [number, number, number] = [40, 40, 40]
const MARGIN_X = 40

// Gera e baixa o PDF do relatório de uma marca/apresentadora: bloco de métricas
// + N tabelas (detalhamento diário, memória de cálculo, histórico de lives...).
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
  doc.text(`Relatório · ${input.subtitulo} · ${input.mes}`, MARGIN_X, y)

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

  for (const table of input.tables) {
    // @ts-expect-error lastAutoTable é adicionado pelo plugin em runtime
    const titleY: number = doc.lastAutoTable.finalY + 22
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(20)
    doc.text(table.title, MARGIN_X, titleY)

    autoTable(doc, {
      startY: titleY + 8,
      head: [table.head],
      body: table.body,
      theme: 'grid',
      headStyles: { fillColor: DARK },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: Object.fromEntries((table.rightAlign ?? []).map((i) => [i, { halign: 'right' as const }])),
      margin: { left: MARGIN_X, right: MARGIN_X },
    })
  }

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
