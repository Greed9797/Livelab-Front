import { describe, expect, it } from 'vitest'
import { normalizarAliasFinanceiro, parseFinanceiroTab } from './FinanceiroPage'

describe('FinanceiroPage navigation contract', () => {
  it.each([
    ['lancamentos', 'vencimentos'],
    ['cliente', 'receita'],
    ['recorrentes', 'custos-fixos'],
  ])('preserva o alias antigo %s no destino canônico %s', (legacy, canonical) => {
    expect(parseFinanceiroTab(legacy)).toBe(canonical)
  })

  it('normaliza alias preservando período, filtros e seleção válida', () => {
    const next = normalizarAliasFinanceiro(new URLSearchParams('tab=lancamentos&mes=2026-11&fin_status=atrasado&fin_eixo=vencimento&fin_id=titulo-1'))
    expect(Object.fromEntries(next ?? [])).toEqual({
      tab: 'vencimentos', mes: '2026-11', fin_status: 'atrasado', fin_eixo: 'vencimento', fin_id: 'titulo-1',
    })
  })

  it('não reescreve abas canônicas ou desconhecidas', () => {
    expect(normalizarAliasFinanceiro(new URLSearchParams('tab=caixa&mes=2026-10'))).toBeNull()
    expect(normalizarAliasFinanceiro(new URLSearchParams('tab=fluxo&mes=2026-10&fin_status=atrasado'))).toBeNull()
    expect(parseFinanceiroTab('fluxo')).toBe('fluxo')
    expect(parseFinanceiroTab('desconhecida')).toBeNull()
  })
})
