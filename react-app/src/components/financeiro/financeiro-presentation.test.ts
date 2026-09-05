import { describe, expect, it } from 'vitest'
import { financeiroClienteRef, hasReportedNumbers } from './financeiro-presentation'

describe('financeiro presentation guards', () => {
  it('keeps reported zero distinct from a missing financial total', () => {
    expect(hasReportedNumbers({ entradas: 0, resultado: '0.00' }, ['entradas', 'resultado'])).toBe(true)
    expect(hasReportedNumbers({ entradas: 0 }, ['entradas', 'resultado'])).toBe(false)
    expect(hasReportedNumbers({ entradas: 'não informado', resultado: 10 }, ['entradas', 'resultado'])).toBe(false)
  })

  it('opens the canonical entity instead of guessing from a commercial label', () => {
    expect(financeiroClienteRef({ id: 'm1', tipo_entidade: 'marca', tipo_operacional: 'cliente', marca_id: 'm1' })).toEqual({ kind: 'marca', id: 'm1' })
    expect(financeiroClienteRef({ id: 'c1', tipo_entidade: 'cliente', tipo_operacional: 'afiliada', cliente_id: 'c1' })).toEqual({ kind: 'cliente', id: 'c1' })
    expect(financeiroClienteRef({ id: 'm2', tipo_operacional: 'afiliada' })).toEqual({ kind: 'marca', id: 'm2' })
    expect(financeiroClienteRef({ id: 'c2', tipo_operacional: 'cliente_ecommerce' })).toEqual({ kind: 'cliente', id: 'c2' })
    expect(financeiroClienteRef({ id: null, tipo_entidade: 'sem_marca' })).toEqual({ kind: 'cliente', id: '' })
  })
})
