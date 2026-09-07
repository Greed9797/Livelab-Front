import { describe, expect, it } from 'vitest'
import { isOperationalBrand, isOperationalClient, isOperationalPresenter } from './operational-status'

describe('regras de escolha operacional', () => {
  it('mantém somente clientes ativos ou inadimplentes para novas operações', () => {
    expect(isOperationalClient({ status: 'ativo' })).toBe(true)
    expect(isOperationalClient({ status: 'inadimplente' })).toBe(true)
    expect(isOperationalClient({ status: 'cancelado' })).toBe(false)
    expect(isOperationalClient({ status: 'arquivado' })).toBe(false)
  })

  it('aceita somente marcas ativas e apresentadoras não inativas ou arquivadas', () => {
    expect(isOperationalBrand({ status: 'ativa' })).toBe(true)
    expect(isOperationalBrand({ status: 'inativa' })).toBe(false)
    expect(isOperationalPresenter({ ativo: true })).toBe(true)
    expect(isOperationalPresenter({ ativo: false })).toBe(false)
    expect(isOperationalPresenter({ ativo: true, arquivada: true })).toBe(false)
  })
})
