import { describe, it, expect } from 'vitest'
import { formatDiferenca, formatDuracao, parseDuracao } from './duracao'

describe('parseDuracao', () => {
  it('aceita as formas que a pessoa digita de verdade', () => {
    expect(parseDuracao('4')).toBe(4 * 3600)
    expect(parseDuracao('4h')).toBe(4 * 3600)
    expect(parseDuracao('4h30')).toBe(4 * 3600 + 30 * 60)
    expect(parseDuracao('4h30m')).toBe(4 * 3600 + 30 * 60)
    expect(parseDuracao('4:30')).toBe(4 * 3600 + 30 * 60)
    expect(parseDuracao('4:30:15')).toBe(4 * 3600 + 30 * 60 + 15)
    expect(parseDuracao('90m')).toBe(90 * 60)
    expect(parseDuracao('4,5')).toBe(4 * 3600 + 30 * 60)
    expect(parseDuracao('4.5h')).toBe(4 * 3600 + 30 * 60)
  })

  it('ignora espaços e maiúsculas', () => {
    expect(parseDuracao('  4H 30M ')).toBe(4 * 3600 + 30 * 60)
  })

  it('devolve null no que não dá para interpretar', () => {
    expect(parseDuracao('')).toBeNull()
    expect(parseDuracao('abc')).toBeNull()
    expect(parseDuracao('4h30x')).toBeNull()
    // Sem isso um "4h99" viraria 5h39 sem ninguém perceber.
    expect(parseDuracao('4:99')).toBeNull()
  })

  it('faz ida e volta com formatDuracao', () => {
    for (const segundos of [0, 3600, 9420, 4 * 3600 + 7 * 60]) {
      expect(parseDuracao(formatDuracao(segundos))).toBe(segundos)
    }
  })
})

describe('formatDuracao', () => {
  it('formata em h e minutos com dois dígitos', () => {
    expect(formatDuracao(0)).toBe('0h00')
    expect(formatDuracao(9420)).toBe('2h37')
    expect(formatDuracao(4 * 3600 + 5 * 60)).toBe('4h05')
  })

  it('não produz "4h60" quando o arredondamento fecha a hora', () => {
    expect(formatDuracao(4 * 3600 + 59 * 60 + 45)).toBe('5h00')
  })

  it('não devolve tempo negativo', () => {
    expect(formatDuracao(-500)).toBe('0h00')
  })
})

describe('formatDiferenca', () => {
  it('escolhe a unidade pela ordem de grandeza', () => {
    expect(formatDiferenca(-45)).toBe('45s')
    expect(formatDiferenca(1800)).toBe('30min')
    expect(formatDiferenca(-3900)).toBe('1h05')
  })
})
