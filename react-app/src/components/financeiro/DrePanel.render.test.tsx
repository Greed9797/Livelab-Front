/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizarDreAnualV3, normalizarDreMesDetalhe } from '../../utils/dre-detalhe'
import { DrePanel } from './DrePanel'

const pr = (previsto: number, realizado: number) => ({ previsto, realizado })

const setembro = {
  mes: '2026-09',
  caixa: { saldo_inicio_mes: 8500 },
  receita: { ...pr(1450, 1450), fixo: pr(300, 300), comissao: pr(1150, 1150), avulsas: pr(0, 0) },
  custos_fixos: pr(4200, 4200),
  custos_variaveis: pr(175, 175),
  resultado: pr(-2925, -2925),
  imposto: { ...pr(0, 0), aliquota: 6, base: 0 },
}
const outubro = { ...setembro, mes: '2026-10', caixa: { saldo_inicio_mes: 0 }, receita: { ...pr(900, 100), fixo: pr(0, 0), comissao: pr(900, 100), avulsas: pr(0, 0) } }

function detalhe(mes: string, cliente: string) {
  return {
    mes,
    atual: setembro,
    receita: { total: pr(1450, 1450), por_cliente: [{ cliente_id: 'c1', cliente_nome: cliente, marcas: [{ marca_id: 'm1', marca_nome: `Marca de ${cliente}`, fixo: pr(300, 300), comissao: pr(250, 250), gmv: 10000, pct: 2.5 }] }], avulsas: [] },
    custos_fixos: { total: pr(4200, 4200), por_grupo: [{ grupo: 'estrutural', total: pr(1000, 1000), itens: [{ id: 'i1', descricao: `Aluguel ${mes}`, origem: 'recorrente', previsto: 1000, realizado: 1000, status: 'pago' }] }], apresentadoras_fixo: [{ apresentadora_id: 'a1', nome: 'Ana', previsto: 2700, realizado: 2700 }] },
    custos_variaveis: { total: pr(175, 175), por_grupo: [], apresentadoras_variavel: [], imposto: { ...pr(0, 0), aliquota: 6, base: 0 } },
    aportes: [],
    caixa: { saldo_inicio_mes: 8500, saldo_abertura: 10000, data_corte: '2026-09-01', origem: 'caixa' },
  }
}

const getDreMesDetalhe = vi.fn(async (mes: string, _regime?: string) => normalizarDreMesDetalhe(detalhe(mes, mes === '2026-09' ? 'Cliente Set' : 'Cliente Out'), mes))
vi.mock('../../services/financeiro-dre', () => ({
  DRE_QK: { anual: (i: string, f: string, r: string) => ['fin2', 'dre-v3', i, f, r], mes: (m: string, r: string) => ['fin2', 'dre-mes', m, r] },
  getDreAnualV3: vi.fn(async () => normalizarDreAnualV3({ inicio: '2026-01', fim: '2026-12', meses: [setembro, outubro], totais: setembro }, { inicio: '2026-01', fim: '2026-12' })),
  getDreMesDetalhe: (mes: string, regime: string) => getDreMesDetalhe(mes, regime),
}))

vi.mock('../../hooks/useFinanceiro', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../hooks/useFinanceiro')>()),
  useFinanceiroConfig: () => ({ data: { aliquota_imposto_pct: 6, data_corte: '2026-09-01', saldo_abertura: 10000 } }),
}))

beforeEach(() => {
  getDreMesDetalhe.mockReset()
  getDreMesDetalhe.mockImplementation(async (mes: string) => normalizarDreMesDetalhe(detalhe(mes, mes === '2026-09' ? 'Cliente Set' : 'Cliente Out'), mes))
})
afterEach(cleanup)

function renderPanel() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DrePanel mes="2026-09" />
    </QueryClientProvider>,
  )
}

describe('DrePanel linhas expansíveis', () => {
  it('renderiza a tabela anual sem drawer/diálogo e com todos os meses recolhidos', async () => {
    renderPanel()
    expect(await screen.findByRole('heading', { name: /DRE/ })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    const botoes = screen.getAllByRole('button', { name: /^Detalhe de / })
    expect(botoes).toHaveLength(12)
    expect(botoes.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true)
    expect(getDreMesDetalhe).not.toHaveBeenCalled()
  })

  it('mostra caixa inicial por mês fora do resultado, com zero real e null como Não configurado', async () => {
    renderPanel()
    expect(await screen.findByRole('columnheader', { name: 'Caixa inicial' })).toBeTruthy()
    expect(screen.getByText('R$ 8.500,00')).toBeTruthy()
    expect(screen.getByText('R$ 0,00')).toBeTruthy()
    expect(screen.getAllByText('Não configurado').length).toBeGreaterThan(0)
  })

  it('expande inline sob demanda, mostra o detalhe do mês e recolhe de novo', async () => {
    renderPanel()
    const set = await screen.findByRole('button', { name: 'Detalhe de setembro de 2026' })
    fireEvent.click(set)
    expect(set.getAttribute('aria-expanded')).toBe('true')
    expect(await screen.findByText('Cliente Set')).toBeTruthy()
    expect(screen.getByText('Aluguel 2026-09')).toBeTruthy()
    expect(screen.getByText('Ana')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    // o detalhe vive na própria tabela, logo abaixo da linha do mês
    const linhaDetalhe = document.getElementById('dre-detalhe-2026-09')
    expect(linhaDetalhe?.tagName).toBe('TR')
    expect(linhaDetalhe?.previousElementSibling).toBe(set.closest('tr'))
    fireEvent.click(set)
    expect(set.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Cliente Set')).toBeNull()
  })

  it('permite vários meses abertos e clicar na linha também expande', async () => {
    renderPanel()
    const set = await screen.findByRole('button', { name: 'Detalhe de setembro de 2026' })
    const out = screen.getByRole('button', { name: 'Detalhe de outubro de 2026' })
    fireEvent.click(set)
    fireEvent.click(out.closest('tr') as HTMLElement)
    expect(await screen.findByText('Cliente Set')).toBeTruthy()
    expect(await screen.findByText('Cliente Out')).toBeTruthy()
    expect(set.getAttribute('aria-expanded')).toBe('true')
    expect(out.getAttribute('aria-expanded')).toBe('true')
  })

  it('mostra skeleton enquanto carrega o detalhe', async () => {
    getDreMesDetalhe.mockImplementationOnce(() => new Promise(() => {}))
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Detalhe de setembro de 2026' }))
    expect(await screen.findByText('Carregando detalhe do mês')).toBeTruthy()
  })

  it('faz prefetch do detalhe ao passar o mouse/foco na linha', async () => {
    renderPanel()
    const out = await screen.findByRole('button', { name: 'Detalhe de outubro de 2026' })
    fireEvent.mouseEnter(out.closest('tr') as HTMLElement)
    await waitFor(() => expect(getDreMesDetalhe).toHaveBeenCalledWith('2026-10', 'caixa_vencimento'))
    // já em cache: abrir não refaz a requisição
    const chamadas = getDreMesDetalhe.mock.calls.length
    fireEvent.click(out)
    expect(await screen.findByText('Cliente Out')).toBeTruthy()
    expect(getDreMesDetalhe.mock.calls.length).toBe(chamadas)
  })

  it('mostra o caixa: linha informativa no painel e bloco no detalhe do mês', async () => {
    renderPanel()
    expect(await screen.findByText(/abertura de .*10\.000,00.* em 01\/09\/2026/)).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Detalhe de setembro de 2026' }))
    expect(await screen.findByText('Saldo de caixa no início do mês')).toBeTruthy()
    expect(screen.getByText(/Abertura em 01\/09\/2026/)).toBeTruthy()
  })

  it('mostra Não configurado sem data de corte e preserva zero quando o caixa foi configurado', async () => {
    getDreMesDetalhe
      .mockImplementationOnce(async (mes: string) => normalizarDreMesDetalhe({
        ...detalhe(mes, 'Cliente Set'),
        caixa: { saldo_inicio_mes: 0, saldo_abertura: 0, data_corte: null, origem: 'padrao' },
      }, mes))
      .mockImplementationOnce(async (mes: string) => normalizarDreMesDetalhe({
        ...detalhe(mes, 'Cliente Out'),
        caixa: { saldo_inicio_mes: 0, saldo_abertura: 0, data_corte: '2026-10-01', origem: 'caixa' },
      }, mes))

    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Detalhe de setembro de 2026' }))
    const setembroDetalhe = await screen.findByTestId('dre-detalhe-2026-09')
    await waitFor(() => expect(setembroDetalhe.textContent).toContain('Não configurado'))

    fireEvent.click(screen.getByRole('button', { name: 'Detalhe de outubro de 2026' }))
    const outubroDetalhe = await screen.findByTestId('dre-detalhe-2026-10')
    await waitFor(() => expect(outubroDetalhe.textContent).toContain('R$ 0,00'))
  })
})

describe('DreMesInline cliente com uma marca', () => {
  it('uma marca → uma linha com o detalhe direto; 2 marcas → aninha; marca sem cliente usa a marca como chave', async () => {
    getDreMesDetalhe.mockImplementationOnce(async (mes: string) => normalizarDreMesDetalhe({
      ...detalhe(mes, 'Cliente Set'),
      receita: { total: pr(1450, 1450), avulsas: [], por_cliente: [
        { cliente_id: 'c1', cliente_nome: 'Cliente Set', marcas: [{ marca_id: 'm1', marca_nome: 'Loja Set', fixo: pr(300, 300), comissao: pr(250, 250), gmv: 10000, pct: 2.5 }] },
        { cliente_id: 'c2', cliente_nome: 'Duo', marcas: [
          { marca_id: 'm2', marca_nome: 'Duo Um', fixo: pr(100, 100), comissao: pr(0, 0), gmv: 0, pct: 0 },
          { marca_id: 'm3', marca_nome: 'Duo Dois', fixo: pr(100, 100), comissao: pr(0, 0), gmv: 0, pct: 0 },
        ] },
        { cliente_id: null, cliente_nome: null, marcas: [{ marca_id: 'm8', marca_nome: 'Farol', marca_tipo: 'afiliada', fixo: pr(0, 0), comissao: pr(50, 0), gmv: 1000, pct: 5 }] },
        { cliente_id: null, cliente_nome: null, marcas: [{ marca_id: 'm9', marca_nome: 'Rosa', marca_tipo: 'propria', fixo: pr(0, 0), comissao: pr(50, 0), gmv: 1000, pct: 5 }] },
      ] },
    }, mes))
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Detalhe de setembro de 2026' }))
    const cliente = await screen.findByRole('button', { name: /Cliente Set/ })
    expect(cliente.textContent).toContain('Loja Set ·')
    expect(cliente.textContent).not.toContain('1 marca')
    expect(screen.getByRole('button', { name: /Duo/ }).textContent).toContain('2 marcas')
    expect(screen.getByRole('button', { name: /Farol/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Rosa/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Farol/ }))
    expect(screen.getByText(/Marca afiliada: o GMV dela não é receita da casa/)).toBeTruthy()
  })
})

it('mantém regime no detalhe e no prefetch após alternar a consulta', async () => {
  const api = await import('../../services/financeiro-dre')
  renderPanel()
  await screen.findByRole('heading', { name: /DRE/ })
  expect(api.getDreAnualV3).toHaveBeenCalledWith('2026-01', '2026-12', 'caixa_vencimento')
  fireEvent.mouseEnter(screen.getByRole('button', { name: 'Detalhe de outubro de 2026' }))
  await waitFor(() => expect(getDreMesDetalhe).toHaveBeenCalledWith('2026-10', 'caixa_vencimento'))
  fireEvent.change(screen.getByRole('combobox', { name: 'Regime do DRE' }), { target: { value: 'competencia' } })
  await waitFor(() => expect(api.getDreAnualV3).toHaveBeenCalledWith('2026-01', '2026-12', 'competencia'))
  fireEvent.click(await screen.findByRole('button', { name: 'Detalhe de outubro de 2026' }))
  await waitFor(() => expect(getDreMesDetalhe).toHaveBeenCalledWith('2026-10', 'competencia'))
})
