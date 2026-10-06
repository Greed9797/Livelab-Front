/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation, useSearchParams } from 'react-router-dom'
import { ReceberPagarPanel } from './ReceberPagarPanel'

const consultar = vi.fn()
const exportar = vi.fn()
const historico = vi.fn()
vi.mock('../../services/financeiro-consulta', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/financeiro-consulta')>()
  return { ...original, consultarFinanceiro: (...args: unknown[]) => consultar(...args), exportarConsultaFinanceiro: (...args: unknown[]) => exportar(...args) }
})
vi.mock('../../services/financeiro-historico', () => ({ consultarHistorico: (...args: unknown[]) => historico(...args) }))

const MATERIALIZED_ID = '00000000-0000-4000-8000-000000000001'

function Harness() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const mes = params.get('mes') ?? '2026-09'
  return <><button onClick={() => { const next = new URLSearchParams(params); next.set('mes', '2026-10'); setParams(next) }}>Mês seguinte</button><output data-testid="url">{location.search}</output><ReceberPagarPanel mes={mes} natureza="receita" /></>
}

function mount(url = '/financeiro?mes=2026-09&tab=receber') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[url]}><Harness /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => {
  consultar.mockReset().mockResolvedValue({ itens: [], total_registros: 0, totais: { previsto: '0.00', pago: '0.00', aberto: '0.00' }, pagina: 1, limite: 25, total_paginas: 0 })
  exportar.mockReset().mockResolvedValue(new Blob(['csv']))
  historico.mockReset().mockResolvedValue({
    estado_comparacao: 'matching', historico_incompleto: false, valor_legado: '0.00', valor_canonico: '0.00', liquidacoes: [],
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('ReceberPagarPanel', () => {
  it('persiste filtros na URL e envia competência explícita para vencimento', async () => {
    mount()
    fireEvent.change(screen.getByRole('combobox', { name: 'Eixo de data' }), { target: { value: 'vencimento' } })
    fireEvent.change(screen.getByLabelText('Competências desde'), { target: { value: '2026-08' } })
    await waitFor(() => expect(consultar).toHaveBeenLastCalledWith(expect.objectContaining({
      eixo: 'vencimento', inicio: '2026-09', fim: '2026-09', competencia_inicio: '2026-08', competencia_fim: '2026-09', natureza: 'receita',
    })), { timeout: 15_000 })
    expect(screen.getByTestId('url').textContent).toContain('fin_comp_inicio=2026-08')
    expect(screen.getByText(/competências 2026-08 a 2026-09/)).toBeTruthy()
  })

  it('não mostra dados do mês anterior enquanto carrega o seguinte', async () => {
    consultar.mockImplementation((filtro: { inicio: string }) => filtro.inicio === '2026-09'
      ? Promise.resolve({ itens: [], total_registros: 0, totais: { previsto: '123.45', pago: '0.00', aberto: '123.45' }, pagina: 1, limite: 25, total_paginas: 0 })
      : new Promise(() => {}))
    mount('/financeiro?mes=2026-09&tab=receber&fin_eixo=vencimento&fin_comp_mes=2026-09&fin_comp_inicio=2026-08')
    expect(await screen.findAllByText('R$ 123,45')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Mês seguinte' }))
    expect(screen.getByText('Carregando lançamentos…')).toBeTruthy()
    expect(screen.queryByText('R$ 123,45')).toBeNull()
    await waitFor(() => expect(consultar).toHaveBeenLastCalledWith(expect.objectContaining({
      inicio: '2026-10', fim: '2026-10', competencia_inicio: '2026-10', competencia_fim: '2026-10',
    })))
  })

  it('bloqueia intervalo inválido antes de consultar ou exportar', async () => {
    mount('/financeiro?mes=2026-09&fin_eixo=pagamento&fin_comp_mes=2026-09&fin_comp_inicio=2026-10&fin_comp_fim=2026-09')
    expect(screen.getByRole('alert').textContent).toContain('Escolha competências em ordem')
    expect((screen.getByRole('button', { name: 'Exportar CSV' }) as HTMLButtonElement).disabled).toBe(true)
    expect(consultar).not.toHaveBeenCalled()
  })

  it('usa os mesmos filtros de contraparte, componente, origem, valor e ordem na lista e exportação', async () => {
    mount()
    fireEvent.change(screen.getByRole('textbox', { name: 'Contraparte' }), { target: { value: 'Árvore' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Componente' }), { target: { value: 'fixo' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Origem' }), { target: { value: 'marca_fixo' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Valor mínimo' }), { target: { value: '1.20' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Valor máximo' }), { target: { value: '2.30' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Ordenar' }), { target: { value: 'valor' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Direção' }), { target: { value: 'desc' } })
    await waitFor(() => expect(consultar).toHaveBeenLastCalledWith(expect.objectContaining({
      contraparte: 'Árvore', componente: 'fixo', origem: 'marca_fixo',
      valor_min: '1.20', valor_max: '2.30', ordenar: 'valor', direcao: 'desc',
    })))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Exportar CSV' }) as HTMLButtonElement).disabled).toBe(false))
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }))
    await waitFor(() => expect(exportar).toHaveBeenCalledWith(expect.objectContaining({
      contraparte: 'Árvore', componente: 'fixo', origem: 'marca_fixo',
      valor_min: '1.20', valor_max: '2.30', ordenar: 'valor', direcao: 'desc',
    })))
    expect(screen.getByTestId('url').textContent).toContain('fin_contraparte=')
  })

  it('sinaliza histórico legado incompleto antes de listar eventos canônicos', async () => {
    consultar.mockResolvedValue({
      itens: [{ id: MATERIALIZED_ID, natureza: 'receita', origem: 'avulsa', descricao: 'Título',
        cliente_nome: 'Cliente', componente: null, competencia: '2026-09-01', data_vencimento: '2026-09-10',
        valor_previsto_exato: '10.00', valor_pago_exato: '8.00', saldo_aberto: '2.00',
        status: 'parcial', virtual: false, inconsistente: false }],
      total_registros: 1, totais: { previsto: '10.00', pago: '8.00', aberto: '2.00' },
      pagina: 1, limite: 25, total_paginas: 1,
    })
    historico.mockResolvedValue({
      estado_comparacao: 'legacy-only', historico_incompleto: true,
      valor_legado: '8.00', valor_canonico: null,
      liquidacoes: [{ id: MATERIALIZED_ID, valor: '2.00', data_liquidacao: '2026-09-01',
        total_estornado: '1.00', total_liquido: '1.00', estornos: [{ id: MATERIALIZED_ID,
          data_estorno: '2026-09-02', valor: '1.00' }] }],
    })
    mount(`/financeiro?mes=2026-09&tab=receber&fin_id=${MATERIALIZED_ID}`)
    expect(await screen.findByText(/Histórico parcial/)).toBeTruthy()
    expect(screen.getByText(/Estorno em/)).toBeTruthy()
    expect(historico).toHaveBeenCalledWith('avulsa', MATERIALIZED_ID)
  })
})
