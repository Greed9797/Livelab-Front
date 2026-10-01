/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

describe('ReceitaPanel smoke', () => {
  it('renderiza competência e vencimento', async () => {
    render(<QueryClientProvider client={new QueryClient()}><ToastProvider><ReceitaPanel mes="2026-09" podeEscrever /></ToastProvider></QueryClientProvider>)
    expect(await screen.findByText('Grupo Ação')).toBeTruthy()
    expect(screen.getByText('Em apuração')).toBeTruthy()
    expect(screen.getByText(/cobra-se o maior/)).toBeTruthy()
    expect(screen.getByText('A receber em setembro')).toBeTruthy()
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
