/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CondicoesComerciais } from './CondicoesComerciais'
import { getMarcaCondicoes, confirmMarcaCondicao, previewMarcaCondicao } from '../../services/domain'
import { editarCondicao, excluirCondicao, previewAlteracaoCondicao } from '../../services/condicoes'
import { condicaoVigente } from '../../utils/condicoes-vencimento'

vi.mock('../../services/domain', () => ({ getMarcaCondicoes: vi.fn(), confirmMarcaCondicao: vi.fn(), previewMarcaCondicao: vi.fn() }))
vi.mock('../../services/condicoes', () => ({ editarCondicao: vi.fn(), excluirCondicao: vi.fn(), previewAlteracaoCondicao: vi.fn(), patchVencimentoCondicao: vi.fn() }))
const condition = { id: 'c1', inicio_vigencia: '2026-09-01', fixo_mensal: '1000', comissao_franquia_pct: '8', comissao_franqueadora_pct: '2', tipo_cobranca: 'fixo_mais_comissao', fixo_confirmado: true, comissao_confirmada: true, revision: 2 }
const cancelled = { ...condition, id: 'c2', inicio_vigencia: '2026-10-01', revision: 5, cancelled_at: '2026-10-07' }
const preview = { expected_revision: 5, condicao_anterior: condition, proposta: condition, impacto: {}, financeiro: { titulos: 1, valor_previsto_antes: '1000', valor_previsto_depois: '1500', saldo_aberto_antes: '0', saldo_aberto_depois: '500', valor_pago_preservado: '1000', excesso_recebido: '0', titulos_suspensos: 0 }, bloqueada: false }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getMarcaCondicoes).mockResolvedValue([condition, cancelled])
  vi.mocked(previewAlteracaoCondicao).mockResolvedValue(preview)
  vi.mocked(previewMarcaCondicao).mockResolvedValue(preview)
  vi.mocked(confirmMarcaCondicao).mockResolvedValue({ condition })
  vi.mocked(editarCondicao).mockResolvedValue({ condition })
  vi.mocked(excluirCondicao).mockResolvedValue({ condition: { ...condition, cancelled_at: '2026-10-07' } })
})
afterEach(cleanup)
function mount(canEdit = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(<QueryClientProvider client={client}><CondicoesComerciais marcaId="m1" canEdit={canEdit} configuracaoComercial={{ status: 'configurado', codigos: [] }} /></QueryClientProvider>)
  return { client, invalidate }
}
async function open(op: 'Editar' | 'Excluir') {
  await screen.findByText('Excluída')
  const button = screen.getByText(`${op} competência`)
  button.closest('details')!.open = true
  fireEvent.click(button)
}

describe('alterar competência histórica com confirmação', () => {
  it('mantém competência imutável e usa revisão da prévia incluindo canceladas; invalida financeiro/cadastro', async () => {
    const { invalidate } = mount()
    await open('Editar')
    expect((screen.getByLabelText('Competência da condição') as HTMLInputElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Revisar impacto' }))
    expect(screen.getByRole('alert').textContent).toContain('motivo')
    expect(previewAlteracaoCondicao).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Fixo mensal'), { target: { value: '1.500,00' } })
    fireEvent.change(screen.getByLabelText('Motivo da alteração'), { target: { value: 'Correção contratual aprovada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar impacto' }))
    const confirm = await screen.findByRole('button', { name: 'Confirmar edição' })
    expect((confirm as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/Recebido preservado: R\$ 1.000,00/)).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Conferi os valores e confirmo o impacto histórico.' }))
    fireEvent.click(confirm)
    await waitFor(() => expect(editarCondicao).toHaveBeenCalledWith('m1', 'c1', expect.objectContaining({ inicio_vigencia: '2026-09', fixo_mensal: 1500, expected_revision: 5, motivo: 'Correção contratual aprovada' }), expect.any(String)))
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['fin2'] }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['marca-condicoes', 'm1'] })
    expect(confirmMarcaCondicao).not.toHaveBeenCalled()
  })
  it('exclui com motivo e confirmação, sem chamar o endpoint de edição ou devolução', async () => {
    mount()
    await open('Excluir')
    fireEvent.change(screen.getByLabelText('Motivo da alteração'), { target: { value: 'Competência incorreta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar impacto' }))
    await screen.findByRole('button', { name: 'Confirmar exclusão' })
    expect(previewAlteracaoCondicao).toHaveBeenCalledWith('m1', 'c1', { operacao: 'excluir', motivo: 'Competência incorreta' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Conferi os valores e confirmo o impacto histórico.' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))
    await waitFor(() => expect(excluirCondicao).toHaveBeenCalledWith('m1', 'c1', { motivo: 'Competência incorreta', expected_revision: 5 }, expect.any(String)))
    expect(editarCondicao).not.toHaveBeenCalled()
  })
  it('descarta prévia quando proposta muda e mostra histórico excluído sem torná-lo vigente', async () => {
    mount()
    await open('Editar')
    expect(condicaoVigente([condition, cancelled], '2026-10-07')).toBeNull()
    fireEvent.change(screen.getByLabelText('Motivo da alteração'), { target: { value: 'Correção' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar impacto' }))
    await screen.findByRole('button', { name: 'Confirmar edição' })
    fireEvent.change(screen.getByLabelText('Fixo mensal'), { target: { value: '2.000,00' } })
    expect(screen.queryByRole('button', { name: 'Confirmar edição' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Revisar impacto' })).toBeTruthy()
    expect(editarCondicao).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Nova competência' }))
    expect((screen.getByLabelText('Competência da condição') as HTMLInputElement).disabled).toBe(false)
  })
  it('consulta não oferece ações de escrita', async () => {
    mount(false)
    await screen.findByText('Excluída')
    expect(screen.queryByText('Editar competência')).toBeNull()
    expect(screen.queryByText('Excluir competência')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Nova competência' })).toBeNull()
  })
  it('permite recriar mês excluído usando revisão do histórico cancelado', async () => {
    vi.mocked(getMarcaCondicoes).mockResolvedValue([cancelled])
    mount()
    await screen.findByText('Excluída')
    fireEvent.click(screen.getByRole('button', { name: 'Nova competência' }))
    fireEvent.change(screen.getByLabelText('Competência da condição'), { target: { value: '2026-10' } })
    fireEvent.change(screen.getByLabelText('Fixo mensal'), { target: { value: '20.000,00' } })
    fireEvent.change(screen.getByLabelText('Comissão da franquia'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Comissão da franqueadora'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Motivo da alteração'), { target: { value: 'Recriação correta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar impacto' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar condição' }))
    await waitFor(() => expect(confirmMarcaCondicao).toHaveBeenCalledWith('m1', expect.objectContaining({ inicio_vigencia: '2026-10', fixo_mensal: 20000, expected_revision: 5 }), expect.any(String)))
  })

})
