// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
afterEach(() => cleanup())
import { OperationalGoalsSection } from './OperationalGoalsSection'
import { getOperationalGoals, saveOperationalGoals } from '../../services/domain'

vi.mock('../../services/domain', () => ({
  getOperationalGoals: vi.fn(), operationalGoalsRequest: vi.fn((from: string, to: string, marcaId?: string, apresentadoraId?: string) => from === to && !marcaId && !apresentadoraId ? from : ({ from, to, ...(marcaId ? { marca_id: marcaId } : {}), ...(apresentadoraId ? { apresentadora_id: apresentadoraId } : {}) })), saveOperationalGoals: vi.fn(), consolidateOperationalDay: vi.fn(),
}))
vi.mock('../../stores/auth-store', () => ({ useCurrentUser: () => ({ tenant_id: 'tenant-1', papel: 'franqueado' }) }))
vi.mock('../ui/Toast', () => ({ useToast: () => ({ push: vi.fn() }) }))

const payload = {
  data: '2026-10-07', ano_mes: '2026-10', editavel: true, configurado: true, pode_editar: true, equipe_ativa: 10, dias_uteis: 22,
  configuracao: { horas_por_apresentador: 5.5, cabines_consideradas: 6, turnos: [{ inicio: '08:00', fim: '13:30' }, { inicio: '14:00', fim: '19:30' }] },
  estado: 'em_andamento', pendencias: { submissoes: 0, lives_abertas: 0, tempos_incompletos: 0 },
  horas: { realizado: 32, meta: 55, esperado_agora: 20, faltante: 23, status: 'dentro_da_meta' },
  gmv: { realizado: 18000, lives: 16000, videos: 2000, meta_diaria: 27272.73, meta_mensal: 600000, esperado_agora: 9917.36, faltante_dia: 9272.73, realizado_mes: 100000, esperado_mes: 19090.91, faltante_mes: 500000, necessario_dia: 25000, dias_restantes_equivalentes: 20, status: 'abaixo_do_ritmo' },
  produtividade: { realizado: 500, piso: 300, necessario: 495.87, potencial_mensal_piso: 363000, piso_sustenta_meta: false },
  capacidade: { horas_apresentadores: 55, horas_operacao: 11, horas_cabines: 66, horas_cabines_realizadas: 34, gmv_hora_operacao_necessario: 2479.34, cabines_ativas: 7 },
  serie: [],
  apresentadoras: [{ id: 'presenter-1', nome: 'Ana', horas: 5, gmv: 2500, gmv_hora: 500, meta_horas: 5.5, piso: 300, piso_origem: 'unidade', desvio: 200, status: 'dentro_da_meta', status_horas: 'abaixo_do_ritmo', lives: [{ id: 'live-1', dia: '2026-10-07', marca_nome: 'Marca A', cabine_nome: '3', status: 'encerrada', gmv: 2500, horas: 5 }] }],
  marcas: [{ id: 'brand-1', nome: 'Marca A', horas: 5, gmv: 2500, gmv_hora: 500, meta_horas: null, piso: 300, piso_origem: 'unidade', desvio: 200, status: 'dentro_da_meta', status_horas: null, lives: [{ id: 'live-1', dia: '2026-10-07', marca_nome: 'Marca A', cabine_nome: '3', status: 'encerrada', gmv: 2500, horas: 5 }] }],
}

function mount(props: { from?: string; to?: string; marcaId?: string; apresentadoraId?: string; editing?: boolean; onEditingChange?: (editing: boolean) => void } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return { client, ...render(<QueryClientProvider client={client}><OperationalGoalsSection from={props.from ?? '2026-10-07'} to={props.to ?? '2026-10-07'} marcaId={props.marcaId ?? ''} apresentadoraId={props.apresentadoraId ?? ''} editing={props.editing} onEditingChange={props.onEditingChange} /></QueryClientProvider>) }
}

describe('OperationalGoalsSection', () => {
  it('shows the daily operating targets and drills into presenter lives without a second page header or calendar', async () => {
    vi.mocked(getOperationalGoals).mockResolvedValue(payload as never)
    mount()

    expect(await screen.findByText('Horas das apresentadoras')).toBeTruthy()
    expect(screen.queryByText('Acompanhamento operacional')).toBeNull()
    expect(document.querySelector('#operational-date')).toBeNull()
    expect(screen.getByText(/55 h\/dia · 10 ativas · esperado agora/)).toBeTruthy()
    expect(screen.getByText(/Meta R\$ 27\.272,73 · esperado agora/)).toBeTruthy()
    expect(screen.getByText(/o piso não sustenta a meta mensal/i)).toBeTruthy()
    const presenterSummary = screen.getByText('Ana', { exact: true })
    fireEvent.click(presenterSummary)
    expect(presenterSummary.closest('details')?.open).toBe(true)
    expect(screen.getAllByText(/Cabine 3/)).toHaveLength(2)
  })

  it('uses the editing state supplied by the page and saves the shared monthly goal and operating configuration', async () => {
    vi.mocked(getOperationalGoals).mockResolvedValue(payload as never)
    vi.mocked(saveOperationalGoals).mockResolvedValue({} as never)
    const onEditingChange = vi.fn()
    mount({ editing: true, onEditingChange })
    expect(await screen.findByRole('dialog', { name: /metas e capacidade operacional/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Configurar metas' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Meta GMV do mês'), { target: { value: '650.000,00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar metas operacionais' }))

    await waitFor(() => expect(vi.mocked(saveOperationalGoals).mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      ano_mes: '2026-10', meta_gmv: 650000, meta_gmv_hora: 300,
      configuracao: { horas_por_apresentador: 5.5, cabines_consideradas: 6, turnos: [{ inicio: '08:00', fim: '13:30' }, { inicio: '14:00', fim: '19:30' }] },
      pisos_apresentadoras: [{ id: 'presenter-1', meta_gmv_hora: null }], pisos_marcas: [{ id: 'brand-1', meta_gmv_hora: null }],
    })))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onEditingChange).toHaveBeenCalledWith(false)
  })

  it('uses the exact legacy daily request only for a single unfiltered day and leaves consolidation explicit', async () => {
    vi.mocked(getOperationalGoals).mockResolvedValue(payload as never)
    mount()

    await waitFor(() => expect(vi.mocked(getOperationalGoals)).toHaveBeenCalledWith('2026-10-07'))
    expect(vi.mocked(getOperationalGoals)).toHaveBeenCalledWith('2026-10-07')
  })

  it('uses the interval contract for a range or entity filter and never offers consolidation for either', async () => {
    const interval = {
      tipo: 'intervalo', from: '2026-10-01', to: '2026-10-07', filtros: { marca_id: 'brand-1', apresentadora_id: null },
      resumo: { gmv: 18000, gmv_lives: 16000, gmv_videos: 2000, horas_apresentadoras: 32, horas_cabines: 34, gmv_hora: 500, lives: 1, status: 'indisponivel', dados_incompletos: { gmv: false, horas: false } },
      pendencias: { submissoes: 0, videos: 0, lives_abertas: 0, tempos_incompletos: 0, gmv_incompletos: 0 }, serie: [], apresentadoras: [], marcas: [], competencias: [],
      contexto_mensal: { ano_mes: '2026-10', corte: '2026-10-07', escopo: 'unidade', dados: payload }, pode_editar: true, editavel: false, consolidavel: false,
    }
    vi.mocked(getOperationalGoals).mockResolvedValue(interval as never)
    mount({ from: '2026-10-01', to: '2026-10-07', marcaId: 'brand-1' })

    expect(await screen.findByText('GMV do período')).toBeTruthy()
    expect(vi.mocked(getOperationalGoals)).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-10-07', marca_id: 'brand-1' })
    expect(screen.queryAllByRole('button', { name: 'Consolidar dia' })).toHaveLength(0)
  })
})
