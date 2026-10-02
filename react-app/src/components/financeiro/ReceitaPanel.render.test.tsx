/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../ui/Toast'
import { ReceitaPanel } from './ReceitaPanel'
import { normalizarReceitaMensal } from '../../utils/receita-mensal'

const raw = {
  mes: '2026-09', hoje: '2026-10-01',
  competencia: { clientes: [{ cliente_id: 'c1', cliente_nome: 'Grupo Ação', marcas: [
    { marca_id: 'm1', marca_nome: 'Haag', tipo_cobranca: 'fixo_ou_comissao', pct: 10, gmv: 20000, comissao_bruta: 2000,
      fixo: { id: 'calc:1', componente: 'fixo', valor_previsto: 1000, valor_pago: 0, data_vencimento: '2026-10-05', competencia: '2026-09-01' }, comissao: null, em_apuracao: true } ] }],
    avulsas: [{ id: 'a1', descricao: 'Consultoria', grupo: 'servico', valor_previsto: 300, data_vencimento: '2026-09-10' }],
    aportes: [{ id: 'p1', descricao: 'Aporte', valor_previsto: 5000, data_vencimento: '2026-09-02' }] },
  vencimento: { itens: [{ id: 'calc:0', componente: 'fixo', valor_previsto: 900, data_vencimento: '2026-09-05', marca_nome: 'Haag', cliente_nome: 'Grupo Ação' }] },
}
vi.mock('../../services/financeiro-receita', () => ({
  RECEITA_QK: { mes: (m: string) => ['fin2', 'receita', m] },
  getReceitaMensal: vi.fn(async () => normalizarReceitaMensal(raw, '2026-09')),
}))

afterEach(cleanup)

const rawPerda = {
  mes: '2026-09', hoje: '2026-10-01',
  competencia: { clientes: [{ cliente_id: 'c1', cliente_nome: 'Grupo Ação', marcas: [
    { marca_id: 'm1', marca_nome: 'Haag', tipo_cobranca: 'fixo_mais_comissao', pct: 10, gmv: 0, comissao_bruta: null,
      fixo: { id: 'calc:1', componente: 'fixo', valor_previsto: 1000, valor_pago: 0, data_vencimento: '2026-09-05', competencia: '2026-09-01', status: 'perdido', perdido_em: '2026-09-20T10:00:00Z', perdido_motivo: 'Cliente encerrou' },
      comissao: { id: 'calc:2', componente: 'comissao', valor_previsto: 500, valor_pago: 0, data_vencimento: '2026-09-15', competencia: '2026-09-01' } } ] }],
    avulsas: [], aportes: [] },
  vencimento: { itens: [] },
}

describe('ReceitaPanel perdidos', () => {
  it('mostra Perdido com motivo, sem Receber, e oferece desfazer/perder', async () => {
    const mod = await import('../../services/financeiro-receita')
    vi.mocked(mod.getReceitaMensal).mockResolvedValueOnce(normalizarReceitaMensal(rawPerda, '2026-09'))
    render(<QueryClientProvider client={new QueryClient()}><ToastProvider><ReceitaPanel mes="2026-09" podeEscrever /></ToastProvider></QueryClientProvider>)
    expect(await screen.findByText('Grupo Ação')).toBeTruthy()
    expect(screen.getAllByText('Perdido').length).toBeGreaterThan(0)
    expect(screen.getByText(/motivo: Cliente encerrou/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Receber: Fixo/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Receber: Comissão/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Desfazer perda: Fixo/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Dar como perdida: Comissão/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Dar como perdida: Fixo/ })).toBeNull()
  })
})

const rawNaoCliente = {
  mes: '2026-09', hoje: '2026-10-01',
  competencia: { clientes: [{ cliente_id: null, cliente_nome: 'Rosa', marcas: [
    { marca_id: 'm9', marca_nome: 'Rosa', marca_tipo: 'propria', tipo_cobranca: 'fixo_mais_comissao', pct: 100, gmv: 80000, comissao_bruta: 0,
      fixo: null, comissao: { id: 'u9', componente: 'comissao', valor_previsto: 80000, valor_pago: 0, data_vencimento: '2026-10-05', competencia: '2026-09-01' } } ] }],
    avulsas: [], aportes: [] },
  vencimento: { itens: [] },
}

describe('ReceitaPanel marca não-cliente', () => {
  it('avisa que o GMV de marca própria não é receita', async () => {
    const mod = await import('../../services/financeiro-receita')
    vi.mocked(mod.getReceitaMensal).mockResolvedValueOnce(normalizarReceitaMensal(rawNaoCliente, '2026-09'))
    render(<QueryClientProvider client={new QueryClient()}><ToastProvider><ReceitaPanel mes="2026-09" podeEscrever /></ToastProvider></QueryClientProvider>)
    expect(await screen.findByText(/Marca própria: o GMV dela não é receita da casa/)).toBeTruthy()
  })
})

describe('ReceitaPanel smoke', () => {
  it('renderiza competência e vencimento', async () => {
    render(<QueryClientProvider client={new QueryClient()}><ToastProvider><ReceitaPanel mes="2026-09" podeEscrever /></ToastProvider></QueryClientProvider>)
    expect(await screen.findByText('Grupo Ação')).toBeTruthy()
    expect(screen.getByText('Em apuração')).toBeTruthy()
    expect(screen.getByText(/cobra-se o maior/)).toBeTruthy()
    // O "A receber" do mês vive só no painel de Lançamentos (caixa), não nesta aba.
    expect(screen.queryByText('A receber em setembro')).toBeNull()
    expect(screen.getByText('Consultoria')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Receber: Fixo · Haag/ }))
    expect(await screen.findByText('Registrar recebimento')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Vencimento' }))
    expect(screen.getByText(/Grupo Ação · Haag · Fixo/)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Competência' }))
    fireEvent.click(screen.getByRole('button', { name: 'Nova receita' }))
    expect(await screen.findByText('Lançar receita')).toBeTruthy()
  })
})
