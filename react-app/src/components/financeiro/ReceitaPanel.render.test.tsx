/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../ui/Toast'
import { ReceitaPanel, ResumoReceita } from './ReceitaPanel'
import { normalizarReceitaMensal } from '../../utils/receita-mensal'
import { normalizarPainel } from '../../utils/painel'

vi.mock('../../services/financeiro', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/financeiro')>(),
  getPainel: vi.fn(async (mes: string) => normalizarPainel({ mes, fim_mes: `${mes}-30`, a_receber: { no_mes: 900, atrasado_anterior: 100, total: 1000 } }, mes)),
}))

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
    expect(screen.queryByText(/^Recebido R\$/)).toBeNull()
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

describe('ReceitaPanel perda parcial', () => {
  it('separa o recebido da perda nas visões de competência e vencimento sem ocultar ações', async () => {
    const api = await import('../../services/financeiro-receita')
    const parcial = normalizarReceitaMensal({
      mes: '2026-10', hoje: '2026-10-08',
      competencia: { clientes: [{ cliente_id: 'cofari', cliente_nome: 'COFARI8500', marcas: [{
        marca_id: 'cofari', marca_nome: 'COFARI8500', tipo_cobranca: 'fixo_mais_comissao', pct: 0, gmv: 0,
        fixo: { id: 'cofari-parcial', descricao: 'COFARI8500', componente: 'fixo', valor_previsto: 8500, valor_pago: 7494.17, valor_perdido: 1005.83, status: 'perdido', perdido_em: '2026-10-07', data_vencimento: '2026-10-05', competencia: '2026-10-01' },
        comissao: null,
      }] }], avulsas: [], aportes: [] },
      vencimento: { itens: [{ id: 'cofari-venc', descricao: 'COFARI8500', origem: 'avulsa', valor_previsto: 8500, valor_pago: 7494.17, valor_perdido: 1005.83, status: 'perdido', perdido_em: '2026-10-07', data_vencimento: '2026-10-05' }] },
    }, '2026-10')
    vi.mocked(api.getReceitaMensal).mockResolvedValueOnce(parcial)
    render(<QueryClientProvider client={new QueryClient()}><ToastProvider><ReceitaPanel mes="2026-10" podeEscrever /></ToastProvider></QueryClientProvider>)
    await screen.findByText('COFARI8500')
    expect(screen.getAllByText('Recebido com perda').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Recebido R$ 7.494,17').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Perdido R$ 1.005,83').length).toBeGreaterThan(0)
    expect(screen.getByText('Recebido R$ 7.494,17').className).toContain('text-[var(--success)]')
    expect(screen.getByText('Perdido R$ 1.005,83').className).toContain('text-[var(--warning)]')
    expect(screen.getByText('Recebido R$ 7.494,17').compareDocumentPosition(screen.getByText('Perdido R$ 1.005,83')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(document.querySelector('.line-through')).toBeNull()
    expect(document.querySelector('.opacity-70')).toBeNull()
    expect(screen.queryByText('Recebido R$ 8.500,00')).toBeNull()
    expect(screen.getByText('Recebido R$ 7.494,17').closest('div')?.className).toContain('text-right')
    fireEvent.click(screen.getByRole('tab', { name: 'Vencimento' }))
    expect(screen.getByText('Recebido com perda')).toBeTruthy()
    expect(screen.queryByText(/Em aberto/)).toBeNull()
    expect(screen.getByText('Recebido R$ 7.494,17')).toBeTruthy()
    expect(screen.getByText('Perdido R$ 1.005,83')).toBeTruthy()
    expect(document.querySelector('.line-through')).toBeNull()
    expect(document.querySelector('.opacity-70')).toBeNull()
  })

  it('rotula perda parcial ainda aberta e conserva ação de recebimento', async () => {
    const api = await import('../../services/financeiro-receita')
    vi.mocked(api.getReceitaMensal).mockResolvedValueOnce(normalizarReceitaMensal({
      mes: '2026-10', competencia: { clientes: [{ cliente_id: 'c', cliente_nome: 'Cliente', marcas: [{ marca_id: 'm', marca_nome: 'Marca',
        fixo: { id: 'aberto', componente: 'fixo', valor_previsto: 8500, valor_pago: 0, valor_perdido: 1005.83, status: 'parcial', data_vencimento: '2026-10-05', competencia: '2026-10-01' },
      }] }], avulsas: [], aportes: [] }, vencimento: { itens: [] },
    }, '2026-10'))
    render(<QueryClientProvider client={new QueryClient()}><ToastProvider><ReceitaPanel mes="2026-10" podeEscrever /></ToastProvider></QueryClientProvider>)
    await screen.findByText('Cliente')
    expect(screen.getByText('Perda parcial')).toBeTruthy()
    expect(screen.queryByText('Recebido R$ 0,00')).toBeNull()
    expect(screen.getByText('Perdido R$ 1.005,83')).toBeTruthy()
    expect(screen.getByText('Em aberto R$ 7.494,17')).toBeTruthy()
    expect(screen.queryByText('Recebido R$ 8.500,00')).toBeNull()
  })

  it('usa recebido e perda calculada para título legado sem valor_perdido', async () => {
    const api = await import('../../services/financeiro-receita')
    vi.mocked(api.getReceitaMensal).mockResolvedValueOnce(normalizarReceitaMensal({
      mes: '2026-10', competencia: { clientes: [], avulsas: [{ id: 'legado', descricao: 'Perda legado', grupo: 'servico',
        valor_previsto: 8500, valor_pago: 7494.17, status: 'perdido', data_vencimento: '2026-10-05' }], aportes: [] },
      vencimento: { itens: [] },
    }, '2026-10'))
    render(<QueryClientProvider client={new QueryClient()}><ToastProvider><ReceitaPanel mes="2026-10" podeEscrever={false} /></ToastProvider></QueryClientProvider>)
    await screen.findByText('Perda legado')
    expect(screen.getByText('Recebido R$ 7.494,17')).toBeTruthy()
    expect(screen.getByText('Perdido R$ 1.005,83')).toBeTruthy()
    expect(screen.getByText('Recebido com perda')).toBeTruthy()
    expect(document.querySelector('.line-through')).toBeNull()
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
    expect(await screen.findByText('A receber no painel')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver painel em Lançamentos' }).getAttribute('href')).toBe('/financeiro?tab=lancamentos&mes=2026-09')
    // A comparação identifica o escopo do painel; o resumo da aba mantém a competência.
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

describe('recebimentos pelo mês do pagamento', () => {
  it('outubro mostra 20 mil recebidos mesmo com vencimentos e baixas acumuladas distintos', () => {
    const data = normalizarReceitaMensal({
      mes: '2026-10', vencimento: { total: { previsto: 10000, pago: 3000, aberto: 7000 }, itens: [{ id: 'parcial', descricao: 'Saldo de outubro', valor_previsto: 10000, valor_pago: 3000, data_vencimento: '2026-10-05' }] },
      recebimentos_mes: { operacional: '20000.00', aportes: '5000.00', total: '25000.00', itens: [
        { id: 'p1', tipo: 'liquidacao', data: '2026-10-05', valor: '20500', descricao: 'Título de agosto', grupo: 'comercial' },
        { id: 'e1', tipo: 'estorno', data: '2026-10-06', valor: '-500', descricao: 'Estorno de agosto', grupo: 'comercial' },
        { id: 'a1', tipo: 'liquidacao', data: '2026-10-07', valor: '5000', descricao: 'Capital', grupo: 'aporte' },
      ] },
    }, '2026-10')
    render(<ResumoReceita data={data} visao="vencimento" />)
    expect(screen.getByRole('group', { name: 'Recebido no mês: R$ 20.000,00' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Aportes recebidos no mês: R$ 5.000,00' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Ainda a receber: R$ 7.000,00' })).toBeTruthy()
    fireEvent.click(screen.getByText('Detalhar recebimentos do mês'))
    expect(screen.getByText('Título de agosto')).toBeTruthy()
    expect(screen.getByText('-R$ 500,00')).toBeTruthy()
    expect(screen.queryByText('previsto − recebido')).toBeNull()
    expect(data.vencimento.total.pago).toBe(3000)
  })
  it('não inventa recebido zero quando os eventos do mês estão indisponíveis', () => {
    render(<ResumoReceita data={normalizarReceitaMensal({}, '2026-10')} visao="vencimento" />)
    expect(screen.getByRole('status').textContent).toContain('indisponíveis')
    expect(screen.queryByRole('group', { name: /^Recebido no mês:/ })).toBeNull()
  })
})

it('esconde totais em cache quando a atualização exige reconciliação financeira', async () => {
  const api = await import('../../services/financeiro-receita')
  vi.mocked(api.getReceitaMensal).mockResolvedValueOnce(normalizarReceitaMensal(raw, '2026-09')).mockRejectedValueOnce(new Error('Conciliação financeira necessária.'))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><ToastProvider><ReceitaPanel mes="2026-09" podeEscrever={false} /></ToastProvider></QueryClientProvider>)
  await screen.findByText('Grupo Ação')
  await act(async () => { await client.invalidateQueries({ queryKey: ['fin2', 'receita'] }) })
  expect(await screen.findByText('Conciliação financeira necessária.')).toBeTruthy()
  expect(screen.queryByRole('region', { name: 'Totais da receita' })).toBeNull()
  expect(screen.queryByRole('group', { name: /^Previsto:/ })).toBeNull()
})

it.each([
  { status: 'cancelado', suspensao_comercial: undefined },
  { status: 'parcial', suspensao_comercial: { ativa: true } },
])('não oferece novas baixas/perdas em cobrança suspensa e preserva reversões: $status', async (suspensao) => {
  const api = await import('../../services/financeiro-receita')
  const data = normalizarReceitaMensal({
    mes: '2026-10',
    competencia: { clientes: [{ cliente_id: 'c-susp', cliente_nome: 'Cliente suspenso', marcas: [{
      marca_id: 'm-susp', marca_nome: 'Marca suspensa', fixo: {
        id: 'titulo-suspenso', descricao: 'Fixo suspenso', componente: 'fixo', valor_previsto: 1000,
        valor_pago: 400, valor_perdido: 100, data_vencimento: '2026-10-05', competencia: '2026-10-01', ...suspensao,
      },
    }] }] },
  }, '2026-10')
  vi.mocked(api.getReceitaMensal).mockResolvedValueOnce(data)
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ToastProvider><ReceitaPanel mes="2026-10" podeEscrever /></ToastProvider></QueryClientProvider>)
  await screen.findByRole('button', { name: 'Desfazer recebimento: Fixo suspenso' })
  expect(screen.queryByRole('button', { name: 'Receber: Fixo suspenso' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Dar como perdida: Fixo suspenso' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Desfazer recebimento: Fixo suspenso' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Desfazer perda: Fixo suspenso' })).toBeTruthy()
})


function receitaComSeteSaldos() {
  const saldos = [169.44, 3159.20, 61.24, 28806.69, 3500, 4412.38, 3500]
  return normalizarReceitaMensal({
    mes: '2026-10', hoje: '2026-10-08',
    vencimento: { total: { previsto: 79000, pago: 20000, aberto: 43608.95 }, itens: [
      ...saldos.map((saldo, i) => ({
        id: `aberto-${i}`, descricao: `Cobrança ${i + 1}`, natureza: 'receita',
        valor_previsto: i === 0 ? 1000 : saldo, valor_pago: i === 0 ? 830.56 : 0,
        data_vencimento: `2026-10-${i < 5 ? '05' : '20'}`,
        grupo: i === 6 ? 'aporte' : 'comercial',
      })),
      { id: 'pago', descricao: 'Cobrança recebida', valor_previsto: 600, valor_pago: 600, data_vencimento: '2026-10-05' },
      { id: 'perdido', descricao: 'Cobrança perdida', valor_previsto: 900, valor_pago: 0, status: 'perdido', data_vencimento: '2026-10-05' },
      { id: 'cancelado', descricao: 'Cobrança cancelada', valor_previsto: 800, valor_pago: 0, status: 'cancelado', data_vencimento: '2026-10-05' },
      { id: 'suspenso', descricao: 'Cobrança suspensa', valor_previsto: 700, valor_pago: 100, suspensao_comercial: { ativa: true }, data_vencimento: '2026-10-05' },
      { id: 'cancelamento', descricao: 'Cobrança com cancelamento', valor_previsto: 500, valor_pago: 0, cancelado_em: '2026-10-07', data_vencimento: '2026-10-05' },
    ] },
    recebimentos_mes: { operacional: 20000, aportes: 1500, total: 21500, itens: [] },
  }, '2026-10')
}

it('prioriza recebido e saldo; detalha sete saldos reais, com parcial e aportes separados', () => {
  const data = receitaComSeteSaldos()
  render(<ResumoReceita data={data} visao="vencimento" />)
  const resumo = screen.getByRole('region', { name: 'Totais da receita' })
  const grupos = within(resumo).getAllByRole('group')
  expect(grupos.slice(0, 2).map((grupo) => grupo.getAttribute('aria-label'))).toEqual([
    'Recebido no mês: R$ 20.000,00', 'Ainda a receber: R$ 43.608,95',
  ])
  expect(grupos[0].classList.contains('design-card')).toBe(true)
  expect(grupos[1].classList.contains('design-card')).toBe(true)
  const secundario = screen.getByRole('group', { name: 'Previsto com vencimento no mês: R$ 79.000,00' })
  expect(secundario.closest('dl')?.classList.contains('text-xs')).toBe(true)
  expect(secundario.classList.contains('design-card')).toBe(false)
  const detalhes = screen.getByText('O que falta receber').closest('details')!
  fireEvent.click(screen.getByText('O que falta receber'))
  expect(detalhes.open).toBe(true)
  expect(within(detalhes).getAllByRole('listitem')).toHaveLength(7)
  expect(within(detalhes).getByText('R$ 169,44')).toBeTruthy()
  expect(within(detalhes).queryByText('R$ 1.000,00')).toBeNull()
  expect(within(detalhes).getByLabelText('Total detalhado a receber: R$ 43.608,95')).toBeTruthy()
  const aportes = within(detalhes).getByRole('region', { name: 'Aportes — fora da receita operacional' })
  expect(within(aportes).getByText('Cobrança 7')).toBeTruthy()
  for (const nome of ['Cobrança recebida', 'Cobrança perdida', 'Cobrança cancelada', 'Cobrança suspensa', 'Cobrança com cancelamento']) {
    expect(within(detalhes).queryByText(nome)).toBeNull()
  }
  expect(within(detalhes).queryByRole('status')).toBeNull()
})

it('preserva o total da API e informa divergência entre total e itens sem substituição silenciosa', () => {
  const data = receitaComSeteSaldos()
  data.vencimento.total.aberto = 44000
  render(<ResumoReceita data={data} visao="vencimento" />)
  expect(screen.getByRole('group', { name: 'Ainda a receber: R$ 44.000,00' })).toBeTruthy()
  fireEvent.click(screen.getByText('O que falta receber'))
  expect(screen.getByRole('status').textContent).toContain('R$ 391,05')
})

it('competência mantém recebido e saldo antes do previsto secundário', () => {
  render(<ResumoReceita data={normalizarReceitaMensal(raw, '2026-09')} visao="competencia" />)
  const grupos = screen.getAllByRole('group')
  expect(grupos.map((grupo) => grupo.getAttribute('aria-label')?.split(':')[0])).toEqual(['Recebido', 'Ainda a receber', 'Previsto'])
  expect(grupos[2].classList.contains('text-xs')).toBe(true)
})

it('cabeçalhos diários mostram só saldo restante e comparação vem após as receitas', async () => {
  const api = await import('../../services/financeiro-receita')
  vi.mocked(api.getReceitaMensal).mockResolvedValueOnce(receitaComSeteSaldos())
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ToastProvider><ReceitaPanel mes="2026-10" podeEscrever={false} /></ToastProvider></QueryClientProvider>)
  await screen.findByRole('region', { name: 'Totais da receita' })
  fireEvent.click(screen.getByRole('tab', { name: 'Vencimento' }))
  const vencimentos = screen.getByRole('region', { name: 'Receitas por vencimento' })
  expect(within(vencimentos).getByText('Ainda a receber: R$ 35.696,57')).toBeTruthy()
  expect(within(vencimentos).getByText('Ainda a receber: R$ 7.912,38')).toBeTruthy()
  const comparacao = await screen.findByRole('region', { name: 'Comparação com o painel do mês' })
  expect(vencimentos.compareDocumentPosition(comparacao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})
