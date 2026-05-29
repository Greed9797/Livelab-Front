import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  getPresenterLeaderboardName,
  getPresenterLeaderboardProgress,
} from '../components/dashboard/PresenterLeaderboard'
import { normalizeMaster } from './page-helpers'

describe('Dashboard presenter ranking UI helpers', () => {
  it('uses backend presenter name aliases when nome is not present', () => {
    expect(getPresenterLeaderboardName({ apresentadora_nome: 'Edja' })).toBe('Edja')
    expect(getPresenterLeaderboardName({ apresentador_nome: 'Julia Florio' })).toBe('Julia Florio')
  })

  it('calculates progress relative to the top presenter GMV', () => {
    expect(getPresenterLeaderboardProgress(3384, 3384)).toBe(100)
    expect(getPresenterLeaderboardProgress(1692, 3384)).toBe(50)
    expect(getPresenterLeaderboardProgress(0, 3384)).toBe(0)
  })

  it('normalizes master Bio webhook totals for dashboard surfaces', () => {
    const data = normalizeMaster({
      crm_pipeline: [{ stage: 'Lead captado', count: 2 }],
      bio_totals: { total: 7, clientes: 3, franqueados: 2, apresentadores: 2, valor_total: 15000 },
      bio_por_persona: [{ persona: 'cliente', label: 'Clientes Bio', total: 3, valor: 9000 }],
    })

    expect(data.pipeline).toHaveLength(1)
    expect(data.bioTotals.total).toBe(7)
    expect(data.bioPorPersona[0].label).toBe('Clientes Bio')
  })

  it('keeps the initial dashboard load on the home payload only', () => {
    const source = readFileSync(new URL('./DashboardPage.tsx', import.meta.url), 'utf8')

    expect(source).toContain('getHomeDashboard')
    expect(source).toContain('raw.cabines')
    expect(source).toContain('raw.agenda_hoje')
    expect(source).not.toContain('getCabines')
    expect(source).not.toContain('getAgenda')
    expect(source).not.toContain('getComissoesApresentadoras')
  })
})
