import { describe, expect, it } from 'vitest'
import { normalizarBusca, statusLabel } from './ComercialPage'

describe('ComercialPage — busca e status', () => {
  it('normaliza busca sem acento e caixa', () => {
    expect(normalizarBusca('São João')).toBe('sao joao')
    expect(normalizarBusca('NEGOCIAÇÃO')).toBe('negociacao')
    expect(normalizarBusca('Ábaco').includes(normalizarBusca('aba'))).toBe(true)
  })

  it('rotula status conhecidos e devolve o valor cru para desconhecidos', () => {
    expect(statusLabel('ativa')).toBe('Ativa')
    expect(statusLabel('em_analise')).toBe('Em análise')
    expect(statusLabel('cancelado_automaticamente')).toBe('Cancelado (auto)')
    expect(statusLabel('qualquer_coisa')).toBe('qualquer_coisa')
    expect(statusLabel('')).toBe('—')
  })

})
