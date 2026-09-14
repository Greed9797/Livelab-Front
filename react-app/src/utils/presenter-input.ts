export type InputResult<T> = { ok: true; value: T } | { ok: false; error: string }

const MONEY_MAX_CENTS = 999_999_999_999_999n

function fail<T>(error: string): InputResult<T> {
  return { ok: false, error }
}

function sourceText(input: string): string {
  return input.trim().replace(/^R\$\s*/i, '').replaceAll('\u00a0', '')
}

function moneyParts(input: string): { integer: string; fraction: string } | null {
  const value = sourceText(input)
  if (!value) return null

  if (/^(?:\d+|[1-9]\d{0,2}(?:\.\d{3})+),\d{1,2}$/.test(value)) {
    const [integer, fraction] = value.split(',')
    return { integer: integer.replaceAll('.', ''), fraction }
  }
  if (/^[1-9]\d{0,2}(?:,\d{3})+\.\d{1,2}$/.test(value)) {
    const [integer, fraction] = value.split('.')
    return { integer: integer.replaceAll(',', ''), fraction }
  }
  if (/^[1-9]\d{0,2}(?:\.\d{3})+$/.test(value)) return { integer: value.replaceAll('.', ''), fraction: '' }
  if (/^\d+,\d{1,2}$/.test(value)) {
    const [integer, fraction] = value.split(',')
    return { integer, fraction }
  }
  if (/^\d+\.\d{1,2}$/.test(value)) {
    const [integer, fraction] = value.split('.')
    return { integer, fraction }
  }
  if (/^\d+$/.test(value)) return { integer: value, fraction: '' }
  return null
}

export function parsePresenterMoney(input: string): InputResult<string> {
  const parts = moneyParts(input)
  if (!parts) return fail('Informe um GMV válido, usando 1.234,56 ou 1234,56.')

  const cents = BigInt(parts.integer) * 100n + BigInt((parts.fraction + '00').slice(0, 2))
  if (cents > MONEY_MAX_CENTS) return fail('GMV acima do limite permitido.')
  return { ok: true, value: `${BigInt(parts.integer).toString()}.${(parts.fraction + '00').slice(0, 2)}` }
}

export function parsePresenterCount(input: string, max: number): InputResult<number> {
  const value = input.trim()
  if (!value) return fail('Informe um número inteiro.')
  const normalized = /^[1-9]\d{0,2}(?:\.\d{3})+$/.test(value)
    ? value.replaceAll('.', '')
    : /^\d+$/.test(value) ? value : null
  if (!normalized) return fail('Use apenas números inteiros; para milhar, use ponto.')
  const parsed = BigInt(normalized)
  if (parsed > BigInt(max)) return fail('Número acima do limite permitido.')
  return { ok: true, value: Number(parsed) }
}
