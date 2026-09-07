import { describe, expect, it } from 'vitest'
import { toPresenterOptions } from './presenters'

describe('toPresenterOptions', () => {
  it('oculta inativas em novas escolhas e conserva uma opção histórica marcada', () => {
    const rows = [
      { id: 'ativa', nome: 'Ana', ativo: true },
      { id: 'inativa', nome: 'Bia', ativo: false },
      { id: 'historica', nome: 'Carol', ativo: true, historico_inativo: true },
    ]
    expect(toPresenterOptions(rows, { includeInactive: false })).toEqual([
      { value: 'ativa', label: 'Ana' },
      { value: 'historica', label: 'Carol (inativa)' },
    ])
  })
})
