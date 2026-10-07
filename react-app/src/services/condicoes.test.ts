import { beforeEach, describe, expect, it, vi } from 'vitest'
const apiPost = vi.fn()
const apiPatch = vi.fn()
const apiDelete = vi.fn()
vi.mock('./api', () => ({ apiGet: vi.fn(), apiPost: (...args: unknown[]) => apiPost(...args), apiPatch: (...args: unknown[]) => apiPatch(...args), apiDelete: (...args: unknown[]) => apiDelete(...args) }))
import { editarCondicao, excluirCondicao, previewAlteracaoCondicao } from './condicoes'
beforeEach(() => vi.clearAllMocks())
describe('contratos de alteração de condição', () => {
  it('envia revisão e motivo com idempotência no PATCH e body do DELETE', async () => {
    const payload = { expected_revision: 5, motivo: 'Correção' }
    await editarCondicao('marca', 'condicao', { ...payload, fixo_mensal: 20000 }, 'chave-edit')
    expect(apiPatch).toHaveBeenCalledWith('/marcas/marca/condicoes/condicao', { ...payload, fixo_mensal: 20000 }, { headers: { 'Idempotency-Key': 'chave-edit' } })
    await excluirCondicao('marca', 'condicao', payload, 'chave-delete')
    expect(apiDelete).toHaveBeenCalledWith('/marcas/marca/condicoes/condicao', { data: payload, headers: { 'Idempotency-Key': 'chave-delete' } })
  })
  it('prévia revisa a operação sem executar a mutação', async () => {
    await previewAlteracaoCondicao('marca', 'condicao', { operacao: 'excluir', motivo: 'Correção' })
    expect(apiPost).toHaveBeenCalledWith('/marcas/marca/condicoes/condicao/preview', { operacao: 'excluir', motivo: 'Correção' })
    expect(apiDelete).not.toHaveBeenCalled()
    expect(apiPatch).not.toHaveBeenCalled()
  })
})
