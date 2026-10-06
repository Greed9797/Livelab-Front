/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation, useSearchParams } from 'react-router-dom'
import { ReceberPagarPanel } from './ReceberPagarPanel'

const consultar = vi.fn()
const exportar = vi.fn()
vi.mock('../../services/financeiro-consulta', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/financeiro-consulta')>()
  return { ...original, consultarFinanceiro: (...args: unknown[]) => consultar(...args), exportarConsultaFinanceiro: (...args: unknown[]) => exportar(...args) }
})

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
})
