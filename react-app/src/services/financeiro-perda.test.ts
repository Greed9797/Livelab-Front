import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Lancamento } from '../types/financeiro'

const apiPatch = vi.fn()
vi.mock('./api', () => ({ apiDelete: vi.fn(), apiGet: vi.fn(), apiPatch: (...args: unknown[]) => apiPatch(...args), apiPost: vi.fn() }))

import { perdaLancamento } from './financeiro'

const titulo = { id: 'titulo-1', natureza: 'receita', origem: 'comercial' } as Lancamento

describe('perdaLancamento', () => {
  beforeEach(() => apiPatch.mockReset())

  it('envia o motivo também ao desfazer a perda', () => {
    perdaLancamento(titulo, 'desfazer', '  acordo retomado  ', '100.50')
    expect(apiPatch).toHaveBeenCalledWith('/financeiro/receitas/titulo-1/desperder', { motivo: 'acordo retomado', valor_reversao: '100.50' })
  })

  it('envia o valor parcial da perda sem convertê-lo em Number', () => {
    perdaLancamento(titulo, 'perder', 'acordo rompido', '25.01')
    expect(apiPatch).toHaveBeenCalledWith('/financeiro/receitas/titulo-1/perder', { motivo: 'acordo rompido', valor_perda: '25.01' })
  })
})
