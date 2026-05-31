import type { JsonRecord } from '../types/models'

function escapeCsv(value: unknown) {
  const text = String(value ?? '')
  if (/[",\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(rows: JsonRecord[], columns: { key: string; header: string; value?: (row: JsonRecord) => unknown }[]) {
  const header = columns.map((column) => escapeCsv(column.header)).join(';')
  const body = rows.map((row) => columns
    .map((column) => escapeCsv(column.value ? column.value(row) : row[column.key]))
    .join(';'))
  return [header, ...body].join('\n')
}

export function downloadCsv(filename: string, rows: JsonRecord[], columns: { key: string; header: string; value?: (row: JsonRecord) => unknown }[]) {
  const blob = new Blob([toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
