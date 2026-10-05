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
    fireEvent.click(screen.getByRole('button', { name: /Dar como perdida: Comissão/ }))
    const confirmar = screen.getByRole('button', { name: 'Dar como perdida' }) as HTMLButtonElement
    const motivo = screen.getByPlaceholderText('Ex.: cliente encerrou o contrato sem pagar')
    expect(confirmar.disabled).toBe(true)
    fireEvent.change(motivo, { target: { value: '   ' } })
    expect(confirmar.disabled).toBe(true)
    fireEvent.change(motivo, { target: { value: 'Cliente não pagará' } })
    expect(confirmar.disabled).toBe(false)
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

const rawUmaOuVarias = {
  mes: '2026-09', hoje: '2026-10-01',
  competencia: { clientes: [
    { cliente_id: 'c1', cliente_nome: 'Grupo Ação', marcas: [
      { marca_id: 'm1', marca_nome: 'Haag', marca_tipo: 'cliente', tipo_cobranca: 'fixo_mais_comissao', pct: 10, gmv: 1000,
        fixo: { id: 'calc:1', componente: 'fixo', valor_previsto: 1000, valor_pago: 0, data_vencimento: '2026-10-05', competencia: '2026-09-01' }, comissao: null } ] },
    { cliente_id: 'c2', cliente_nome: 'Duo', marcas: [
      { marca_id: 'm2', marca_nome: 'Duo Um', tipo_cobranca: 'fixo_mais_comissao', pct: 10, gmv: 0, fixo: null, comissao: null },
      { marca_id: 'm3', marca_nome: 'Duo Dois', tipo_cobranca: 'fixo_mais_comissao', pct: 10, gmv: 0, fixo: null, comissao: null } ] },
    { cliente_id: null, cliente_nome: 'Sem cliente', marcas: [{ marca_id: 'm8', marca_nome: 'Farol', marca_tipo: 'afiliada', tipo_cobranca: 'fixo_mais_comissao', pct: 5, gmv: 0, fixo: null, comissao: null }] },
    { cliente_id: null, cliente_nome: 'Sem cliente', marcas: [{ marca_id: 'm9', marca_nome: 'Rosa', marca_tipo: 'propria', tipo_cobranca: 'fixo_mais_comissao', pct: 100, gmv: 0, fixo: null, comissao: null }] },
  ], avulsas: [], aportes: [] },
  vencimento: { itens: [] },
}

describe('ReceitaPanel cliente com uma marca', () => {
  it('mostra 1 linha (sem marca aninhada) e mantém o aninhamento só com 2+ marcas', async () => {
    const mod = await import('../../services/financeiro-receita')
    vi.mocked(mod.getReceitaMensal).mockResolvedValueOnce(normalizarReceitaMensal(rawUmaOuVarias, '2026-09'))
    render(<QueryClientProvider client={new QueryClient()}><ToastProvider><ReceitaPanel mes="2026-09" podeEscrever /></ToastProvider></QueryClientProvider>)
    expect(await screen.findByText('Grupo Ação')).toBeTruthy()
    // Haag é a única marca de Grupo Ação: aparece como complemento, não como cabeçalho aninhado.
    expect(screen.queryByRole('heading', { level: 4, name: 'Haag' })).toBeNull()
    expect(screen.getByText(/^Haag · \d+% recebido$/)).toBeTruthy()
    expect(screen.getByText('2 marcas · 0% recebido')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 4, name: 'Duo Um' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 4, name: 'Duo Dois' })).toBeTruthy()
    // Duas marcas sem cliente não colidem e mantêm o aviso de tipo.
    expect(screen.getByText('Farol')).toBeTruthy()
    expect(screen.getByText('Rosa')).toBeTruthy()
    expect(screen.getByText(/Marca afiliada: o GMV dela não é receita da casa/)).toBeTruthy()
    expect(screen.getByText(/Marca própria: o GMV dela não é receita da casa/)).toBeTruthy()
  })
})

describe('ReceitaPanel janela', () => {
  it('mostra o hint da janela só na marca com janela diferente de 1', async () => {
    const mod = await import('../../services/financeiro-receita')
    const comJanela = {
      ...raw,
      competencia: {
        ...raw.competencia,
        clientes: [{ cliente_id: 'c1', cliente_nome: 'Grupo Ação', marcas: [
          { marca_id: 'm1', marca_nome: 'Pure Up', tipo_cobranca: 'fixo_mais_comissao', pct: 10, gmv: 0, comissao_bruta: null, janela_inicio_dia: 16,
            fixo: { id: 'calc:9', componente: 'fixo', valor_previsto: 1000, valor_pago: 0, data_vencimento: '2026-10-05', competencia: '2026-09-01' }, comissao: null },
        ] }],
      },
    }
    vi.mocked(mod.getReceitaMensal).mockResolvedValueOnce(normalizarReceitaMensal(comJanela, '2026-09'))
    render(<QueryClientProvider client={new QueryClient()}><ToastProvider><ReceitaPanel mes="2026-09" podeEscrever /></ToastProvider></QueryClientProvider>)
    // Cliente com uma marca só vira linha única: a marca aparece como complemento.
    expect(await screen.findByText('Grupo Ação')).toBeTruthy()
    expect(screen.getByText(/^Pure Up · \d+% recebido$/)).toBeTruthy()
    expect(screen.getByText(/Janela 16→15/)).toBeTruthy()
  })

  it('sem janela (mês civil) não mostra o hint', async () => {
    render(<QueryClientProvider client={new QueryClient()}><ToastProvider><ReceitaPanel mes="2026-09" podeEscrever /></ToastProvider></QueryClientProvider>)
    expect(await screen.findByText('Grupo Ação')).toBeTruthy()
    expect(screen.queryByText(/Janela \d+→/)).toBeNull()
  })
})
