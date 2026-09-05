import { describe, expect, it } from 'vitest'
import { normalizarBusca, resumirCarteira, statusLabel } from './ComercialPage'

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

  it('resume apenas a carteira já carregada, sem depender de dados do CRM', () => {
    expect(resumirCarteira([
      { tipo_operacional: 'cliente_ecommerce', gmv_mes: '1200.50', lives_mes: 2 },
      { tipo_operacional: 'afiliada', gmv_mes: 300, lives_mes: 1 },
      { tipo_operacional: 'propria', gmv_mes: 100, lives_mes: 0 },
    ])).toEqual({
      total: 3,
      clientes: 1,
      afiliados: 1,
      gmvMes: 1600.5,
      livesMes: 3,
    })
  })

  it('não trata totais históricos como atividade do mês', () => {
    expect(resumirCarteira([
      { tipo_operacional: 'cliente_ecommerce', gmv: 9000, total_lives: 42 },
    ])).toMatchObject({ gmvMes: 0, livesMes: 0 })
  })
})
