// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OperationalGoalsSection } from './OperationalGoalsSection'
import { getOperationalGoals, saveOperationalGoals } from '../../services/domain'

vi.mock('../../services/domain', () => ({
  getOperationalGoals: vi.fn(), saveOperationalGoals: vi.fn(), consolidateOperationalDay: vi.fn(),
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

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return { client, ...render(<QueryClientProvider client={client}><OperationalGoalsSection /></QueryClientProvider>) }
}

describe('OperationalGoalsSection', () => {
  it('shows the daily and monthly operating targets and drills into presenter lives', async () => {
    vi.mocked(getOperationalGoals).mockResolvedValue(payload as never)
    mount()

    expect(await screen.findByText('Acompanhamento operacional')).toBeTruthy()
    expect(screen.getByText(/55 h\/dia · 10 ativas · esperado agora 20 h/)).toBeTruthy()
    expect(screen.getByText(/Meta R\$ 27\.272,73 · esperado agora/)).toBeTruthy()
    expect(screen.getByText(/o piso não sustenta a meta mensal/i)).toBeTruthy()
    const presenterSummary = screen.getByText('Ana', { exact: true })
    fireEvent.click(presenterSummary)
    expect(presenterSummary.closest('details')?.open).toBe(true)
    expect(screen.getAllByText(/Cabine 3/)).toHaveLength(2)
  })

  it('saves edits to the shared monthly goal and operating configuration', async () => {
    vi.mocked(getOperationalGoals).mockResolvedValue(payload as never)
    vi.mocked(saveOperationalGoals).mockResolvedValue({} as never)
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Configurar metas' }))
    fireEvent.change(screen.getByLabelText('Meta GMV do mês'), { target: { value: '650.000,00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar metas operacionais' }))

    await waitFor(() => expect(vi.mocked(saveOperationalGoals).mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      ano_mes: '2026-10', meta_gmv: 650000, meta_gmv_hora: 300,
      configuracao: { horas_por_apresentador: 5.5, cabines_consideradas: 6, turnos: [{ inicio: '08:00', fim: '13:30' }, { inicio: '14:00', fim: '19:30' }] },
      pisos_apresentadoras: [{ id: 'presenter-1', meta_gmv_hora: null }], pisos_marcas: [{ id: 'brand-1', meta_gmv_hora: null }],
    })))
  })
})
