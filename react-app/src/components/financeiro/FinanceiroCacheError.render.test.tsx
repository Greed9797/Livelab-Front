/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { FinanceiroPage } from '../../pages/FinanceiroPage'
import { baixarLancamento, FQK, getFinanceiroConfig, getLancamentos, getPainel } from '../../services/financeiro'
import { normalizarConfig } from '../../utils/caixa'
import { normalizarLancamentosResponse } from '../../utils/financeiro'
import { normalizarPainel } from '../../utils/painel'
import { ToastProvider } from '../ui/Toast'
import { CustosFixosPanel } from './CustosFixosPanel'
import { CustosVariaveisPanel } from './CustosVariaveisPanel'

vi.mock('../../services/financeiro', async importOriginal => ({
  ...await importOriginal<typeof import('../../services/financeiro')>(),
  getLancamentos: vi.fn(), getPainel: vi.fn(), getFinanceiroConfig: vi.fn(),
  getCustosRecorrentes: vi.fn(async () => []), baixarLancamento: vi.fn(),
}))
vi.mock('../../stores/auth-store', async importOriginal => ({
  ...await importOriginal<typeof import('../../stores/auth-store')>(),
  useCurrentUser: () => ({ id: 'u1', papel: 'franqueado' }),
}))
const clients: QueryClient[] = []
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()) })
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getFinanceiroConfig).mockResolvedValue(normalizarConfig({ data_corte: '2026-10-01' }))
  vi.mocked(getPainel).mockResolvedValue(normalizarPainel({ mes: '2026-10', fim_mes: '2026-10-31', configurado: true,
    data_corte: '2026-10-01', caixa: { saldo_atual: 1500 }, a_pagar: { total: 1234 } }, '2026-10'))
})
const cached = (classe: 'fixo' | 'variavel') => normalizarLancamentosResponse({ hoje: '2026-10-07', itens: [{
  id: 'cost-1', natureza: 'custo', origem: 'manual', classe, descricao: 'Custo confirmado', grupo: 'operacao',
  competencia: '2026-10-01', data_vencimento: '2026-10-20', valor_previsto: 1234, valor_pago: 0, status: 'pendente',
}] }, { inicio: '2026-10', fim: '2026-10' })
const reconciliationError = { isAxiosError: true, response: { status: 409, data: {
  code: 'FINANCIAL_RECONCILIATION_REQUIRED', error: 'Recebimentos e pagamentos precisam de reconciliação.',
} } }

const scenarios = [
  { name: 'custos fixos', classe: 'fixo' as const, element: <CustosFixosPanel mes="2026-10" podeEscrever /> },
  { name: 'custos variáveis', classe: 'variavel' as const, element: <CustosVariaveisPanel mes="2026-10" podeEscrever /> },
  { name: 'página de lançamentos', classe: 'variavel' as const, element: <FinanceiroPage /> },
]

describe('financeiro: sucesso em cache seguido por reconciliação 409', () => {
  for (const scenario of scenarios) {
    it(`${scenario.name}: retira dados e baixa aberta no erro, preservando cache no refetch normal`, async () => {
      const data = cached(scenario.classe)
      vi.mocked(getLancamentos).mockResolvedValue(data)
      const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
      clients.push(client)
      render(<QueryClientProvider client={client}><ToastProvider>
        <MemoryRouter initialEntries={['/financeiro?tab=lancamentos&mes=2026-10']}>{scenario.element}</MemoryRouter>
      </ToastProvider></QueryClientProvider>)
      const pay = await screen.findByRole('button', { name: 'Pagar: Custo confirmado' })
      fireEvent.click(pay)
      expect(screen.getByRole('dialog', { name: /Registrar pagamento/ })).toBeTruthy()

      let rejectRequest!: (error: unknown) => void
      vi.mocked(getLancamentos).mockImplementation(() => new Promise((_resolve, reject) => { rejectRequest = reject }))
      let refreshing!: Promise<void>
      act(() => { refreshing = client.refetchQueries({ queryKey: FQK.lancamentos() }) })
      await waitFor(() => expect(client.isFetching({ queryKey: FQK.lancamentos() })).toBe(1))
      expect(screen.getByRole('button', { name: 'Pagar: Custo confirmado' })).toBeTruthy()
      expect(screen.getByRole('dialog', { name: /Registrar pagamento/ })).toBeTruthy()
      await act(async () => { rejectRequest(reconciliationError); await refreshing })
      expect(await screen.findByText('Recebimentos e pagamentos precisam de reconciliação.')).toBeTruthy()
      // Query's data intentionally remains cached: the render must honor isError.
      expect(client.getQueriesData({ queryKey: FQK.lancamentos() })[0][1]).toEqual(data)
      expect(screen.queryByRole('button', { name: 'Pagar: Custo confirmado' })).toBeNull()
      expect(screen.queryByRole('dialog', { name: /Registrar pagamento/ })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Marcar pago' })).toBeNull()
      expect(baixarLancamento).not.toHaveBeenCalled()

      vi.mocked(getLancamentos).mockResolvedValue(data)
      fireEvent.click(screen.getByRole('button', { name: 'Recarregar' }))
      expect(await screen.findByRole('button', { name: 'Pagar: Custo confirmado' })).toBeTruthy()
    })
  }
})
