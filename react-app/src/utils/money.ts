const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const BRL_NUMBER_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return 0

  const cleaned = trimmed
    .replace(/\s/g, '')
    .replace(/^R\$/i, '')
    .replace(/[^\d,.-]/g, '')

  if (!cleaned || cleaned === '-' || cleaned === ',' || cleaned === '.') return 0

  let normalized = cleaned
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (cleaned.includes('.')) {
    const parts = cleaned.split('.')
    const last = parts.at(-1) ?? ''
    const allThousandsGroups = parts.length > 1 && parts.slice(1).every((part) => /^\d{3}$/.test(part))
    normalized = allThousandsGroups && last.length === 3 ? parts.join('') : cleaned
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeFormatted(value: string): string {
  return value.replace(/\u00a0/g, ' ')
}

export function parseBRMoneyToDecimal(input: unknown): number {
  return toFiniteNumber(input) ?? 0
}

export function formatBRL(value: unknown): string {
  return normalizeFormatted(BRL_FORMATTER.format(parseBRMoneyToDecimal(value)))
}

export function formatBRLWithoutSymbol(value: unknown): string {
  return normalizeFormatted(BRL_NUMBER_FORMATTER.format(parseBRMoneyToDecimal(value)))
}

export function normalizeMoneyInputText(input: string): string {
  if (!input.trim()) return ''
  return formatBRLWithoutSymbol(input)
}
