import { describe, expect, it } from 'vitest'
import { formatClienteMeta } from './ConfiguracoesPage'

describe('cliente account monthly goal', () => {
  it('does not invent a zero value when the client goal is unknown', () => {
    expect(formatClienteMeta(null)).toBe('Não informado')
    expect(formatClienteMeta(undefined)).toBe('Não informado')
    expect(formatClienteMeta('0')).toBe('Não informado')
  })

  it('keeps a real zero distinct from unavailable data', () => {
    expect(formatClienteMeta(0)).toMatch(/0,00/)
  })
})
