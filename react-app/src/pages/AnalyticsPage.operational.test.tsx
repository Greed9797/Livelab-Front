// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsPage } from './AnalyticsPage'
import { getOperationalGoals } from '../services/domain'

vi.mock('../services/domain', () => ({
  getOperationalGoals: vi.fn(),
  operationalGoalsRequest: vi.fn((from: string, to: string, marcaId?: string, apresentadoraId?: string) => from === to && !marcaId && !apresentadoraId ? from : ({ from, to, ...(marcaId ? { marca_id: marcaId } : {}), ...(apresentadoraId ? { apresentadora_id: apresentadoraId } : {}) })),
  saveOperationalGoals: vi.fn(),
  consolidateOperationalDay: vi.fn(),
  exportarComissoesCSV: vi.fn(),
  getApresentadoras: vi.fn(),
  getComissoesApresentadoras: vi.fn(),
  getComissoesMarcas: vi.fn(),
  getDailyAnalytics: vi.fn(),
  getMarcas: vi.fn(),
}))
vi.mock('../stores/auth-store', () => ({ useCurrentUser: () => ({ tenant_id: 'tenant-1', papel: 'franqueado' }) }))
vi.mock('../components/ui/Toast', () => ({ useToast: () => ({ push: vi.fn() }) }))
vi.mock('../components/analytics/FunilAnalyticsSection', () => ({ FunilAnalyticsSection: () => null }))
vi.mock('../components/analytics/RelatorioEntidadeSection', () => ({ RelatorioEntidadeSection: () => null }))
vi.mock('../components/analytics/PulsoDiarioSection', () => ({ PulsoDiarioSection: () => null }))
vi.mock('../components/analytics/BrandComparisonSection', () => ({ BrandComparisonSection: () => null }))
vi.mock('../components/analytics/BrandAudienceComparisonSection', () => ({ BrandAudienceComparisonSection: () => null }))
vi.mock('../components/analytics/MonthlyUnitGoals', () => ({ MonthlyUnitGoals: () => null }))
vi.mock('../components/dashboard/AssiduidadeStrip', () => ({ AssiduidadeStrip: () => null }))

const daily = {
  data: '2026-10-07', ano_mes: '2026-10', editavel: true, configurado: true, pode_editar: true, equipe_ativa: 2, dias_uteis: 22,
  estado: 'em_andamento', configuracao: { horas_por_apresentador: 5, cabines_consideradas: 2, turnos: [{ inicio: '08:00', fim: '18:00' }] },
  pendencias: { submissoes: 0, videos: 0, lives_abertas: 0, tempos_incompletos: 0, gmv_incompletos: 0 },
  horas: { realizado: 10, meta: 10, esperado_agora: 6, faltante: 0, status: 'dentro_da_meta' },
  gmv: { realizado: 1000, lives: 900, videos: 100, meta_diaria: 1000, meta_mensal: 22000, esperado_agora: 600, faltante_dia: 0, realizado_mes: 7000, esperado_mes: 7000, faltante_mes: 15000, necessario_dia: 1000, dias_restantes_equivalentes: 15, status: 'dentro_da_meta' },
  produtividade: { realizado: 100, piso: 90, necessario: 100, potencial_mensal_piso: 20000, piso_sustenta_meta: false },
  capacidade: { horas_apresentadores: 10, horas_operacao: 10, horas_cabines: 20, horas_cabines_realizadas: 10, gmv_hora_operacao_necessario: 100, cabines_ativas: 2 },
  serie: [], apresentadoras: [], marcas: [],
}

function range(query: Record<string, string>) {
  return {
    tipo: 'intervalo', from: query.from, to: query.to,
    filtros: { marca_id: query.marca_id ?? null, apresentadora_id: query.apresentadora_id ?? null },
    resumo: { gmv: 4200, gmv_lives: 4000, gmv_videos: 200, horas_apresentadoras: 42, horas_cabines: 60, gmv_hora: 100, lives: 5, status: 'indisponivel', dados_incompletos: { gmv: false, horas: false } },
    pendencias: { submissoes: 0, videos: 0, lives_abertas: 0, tempos_incompletos: 0, gmv_incompletos: 0 }, serie: [], apresentadoras: [], marcas: [], competencias: [],
    contexto_mensal: { ano_mes: query.to.slice(0, 7), corte: query.to, escopo: 'unidade', dados: daily },
    pode_editar: true, editavel: false, consolidavel: false,
  }
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><AnalyticsPage /></QueryClientProvider>)
}

async function expectOperationalQuery(query: Record<string, string>) {
  await waitFor(() => expect(vi.mocked(getOperationalGoals)).toHaveBeenCalledWith(expect.objectContaining(query)))
}

async function waitForOperationalRequest() {
  await waitFor(() => expect(vi.mocked(getOperationalGoals)).toHaveBeenCalled())
}

describe('AnalyticsPage — filtro operacional único', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-07T15:00:00.000Z'))
    vi.mocked(getOperationalGoals).mockImplementation(async (query) => typeof query === 'string' ? daily as never : range(query) as never)
    // Dados mínimos dos outros observers da página; o teste deixa a seção operacional real.
    const domain = await import('../services/domain')
    vi.mocked(domain.getDailyAnalytics).mockResolvedValue([] as never)
    vi.mocked(domain.getMarcas).mockResolvedValue([{ id: 'marca-1', nome: 'Marca A' }] as never)
    vi.mocked(domain.getApresentadoras).mockResolvedValue([{ id: 'ap-1', nome: 'Ana' }] as never)
    vi.mocked(domain.getComissoesMarcas).mockResolvedValue([] as never)
    vi.mocked(domain.getComissoesApresentadoras).mockResolvedValue([] as never)
  })

  afterEach(() => { cleanup(); vi.useRealTimers() })

  it.each([
    ['Hoje', { from: '2026-10-07', to: '2026-10-07' }],
    ['Ontem', { from: '2026-10-06', to: '2026-10-06' }],
    ['7 dias', { from: '2026-10-01', to: '2026-10-07' }],
    ['30 dias', { from: '2026-09-08', to: '2026-10-07' }],
    ['Mês', { from: '2026-10-01', to: '2026-10-07' }],
  ])('consulta o recorte operacional exato para %s', async (label, expected) => {
    mount()
    await waitForOperationalRequest()
    fireEvent.click(screen.getAllByRole('button', { name: label })[0])
    if (expected.from === expected.to) await waitFor(() => expect(vi.mocked(getOperationalGoals)).toHaveBeenLastCalledWith(expected.to))
    else await expectOperationalQuery(expected)
  })

  it('passa o dia personalizado exato como consulta diária legada, sem filtro de entidade', async () => {
    mount()
    await waitForOperationalRequest()
    fireEvent.click(screen.getAllByRole('button', { name: 'Personalizado' })[0])
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-09-29' } })
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-09-29' } })

    await waitFor(() => expect(vi.mocked(getOperationalGoals)).toHaveBeenLastCalledWith('2026-09-29'))
  })

  it('envia intervalo e filtros de marca/apresentadora para a consulta operacional', async () => {
    mount()
    await waitForOperationalRequest()
    await screen.findByRole('option', { name: 'Marca A' })
    await screen.findByRole('option', { name: 'Ana' })
    screen.getAllByLabelText('Filtrar por cliente ou marca').forEach((select) => fireEvent.change(select, { target: { value: 'marca-1' } }))
    screen.getAllByLabelText('Filtrar por apresentadora').forEach((select) => fireEvent.change(select, { target: { value: 'ap-1' } }))

    await expectOperationalQuery({ from: '2026-10-01', to: '2026-10-07', marca_id: 'marca-1', apresentadora_id: 'ap-1' })
  })

  it('mantém a hierarquia com um único cabeçalho e sem calendário operacional próprio', async () => {
    mount()
    await waitForOperationalRequest()

    expect(screen.queryByText('Acompanhamento operacional')).toBeNull()
    expect(document.querySelector('#operational-date')).toBeNull()
    expect(screen.getAllByLabelText('Indicadores operacionais').length).toBeGreaterThan(0)
  })

  it('atualiza a consulta operacional pelo botão Atualizar', async () => {
    mount()
    await screen.findByText('GMV do período')
    const before = vi.mocked(getOperationalGoals).mock.calls.length
    fireEvent.click(screen.getAllByRole('button', { name: 'Atualizar' })[0])

    await waitFor(() => expect(vi.mocked(getOperationalGoals).mock.calls.length).toBeGreaterThan(before))
  })
})
