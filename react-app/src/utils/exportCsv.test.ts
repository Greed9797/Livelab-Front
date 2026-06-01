import { describe, expect, it } from 'vitest'
import { toCsv } from './exportCsv'

describe('toCsv', () => {
  it('exports rows with semicolon separator and escaped values', () => {
    const csv = toCsv([
      { tipo: 'cliente_ecommerce', nome: 'Marca A', responsavel: 'Ana; Silva' },
    ], [
      { key: 'tipo', header: 'tipo' },
      { key: 'nome', header: 'nome' },
      { key: 'responsavel', header: 'responsavel' },
    ])

    expect(csv).toBe('tipo;nome;responsavel\ncliente_ecommerce;Marca A;"Ana; Silva"')
  })
})
