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
    expect(source).not.toContain('getCabines')
    expect(source).not.toContain('getAgenda')
    expect(source).not.toContain('getComissoesApresentadoras')
  })

  it('uses total GMV in home KPI surfaces, never falling back to live-only GMV', () => {
    const kpiSource = readFileSync(new URL('../components/dashboard/KpiStrip.tsx', import.meta.url), 'utf8')
    const heroSource = readFileSync(new URL('../components/dashboard/GmvHeroPanel.tsx', import.meta.url), 'utf8')

    // gmv_total_mes/gmv_mes = lives + vídeos; gmv_lives_mes = só lives.
    // O KPI de total tem que ficar no balde de total: cair para gmv_lives_mes
    // subestima o valor silenciosamente pelo GMV de vídeos.
    expect(kpiSource).toContain('raw.gmv_total_mes ?? raw.gmv_mes')
    expect(kpiSource).not.toContain('raw.gmv_total_mes ?? raw.gmv_mes ?? raw.gmv_lives_mes')
    // ...e o balde de lives não pode cair para o total (inflaria GMV/hora e GMV/live).
    expect(kpiSource).toContain('const gmvLivesMes = asNumber(raw.gmv_lives_mes)')

    expect(heroSource).toContain('raw.gmv_total_mes ?? raw.gmv_mes')
    expect(heroSource).toContain('raw.meta_mes ?? raw.meta_gmv')
  })

  it('consolidates analytics per-entity view on the commission source (no duplicate rankings)', () => {
    const source = readFileSync(new URL('./AnalyticsPage.tsx', import.meta.url), 'utf8')

    // Per-entity tables come from the commission endpoints (single source of truth)
    expect(source).toContain('getComissoesApresentadoras')
    expect(source).toContain('getComissoesMarcas')
    // The duplicated top "ranking" cards/aliases were removed (D+G refactor)
    expect(source).not.toContain('const rankingApresentadoras = apresentadorasRows')
    expect(source).not.toContain('const rankingMarcas = marcasRows')
    // The redundant per-day aggregate table was removed from Analytics
    expect(source).not.toContain('DailyAnalyticsSection')
    // KPIs are not derived from the dashboard ranking arrays here
    expect(source).not.toContain('raw.ranking_apresentadoras')
    expect(source).not.toContain('raw.ranking_marcas')
  })
})
