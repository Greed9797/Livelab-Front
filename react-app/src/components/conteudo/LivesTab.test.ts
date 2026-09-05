import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { DEFAULT_LIVE_COLUMNS, LIVE_COLUMN_OPTIONS, buildLivesGridTemplate, gmvPorHora, type LiveColumnKey } from './LivesTab'
import { dateRangeToWindow, isValidCustomDateRange } from './live-date-range'

describe('LivesTab custom date range', () => {
  it('accepts an unlimited historical range and sends its exact boundaries', () => {
    expect(isValidCustomDateRange('2019-01-01', '2026-08-26', '2026-08-26')).toBe(true)
    expect(dateRangeToWindow('custom', '2019-01-01', '2026-08-26')).toEqual({
      data_inicio: '2019-01-01',
      data_fim: '2026-08-26',
    })
  })

  it('rejects reversed, future, incomplete, and malformed ranges', () => {
    expect(isValidCustomDateRange('2026-08-20', '2026-08-10', '2026-08-26')).toBe(false)
    expect(isValidCustomDateRange('2026-08-20', '2026-08-27', '2026-08-26')).toBe(false)
    expect(isValidCustomDateRange('', '2026-08-26', '2026-08-26')).toBe(false)
    expect(isValidCustomDateRange('2026-02-30', '2026-08-26', '2026-08-26')).toBe(false)
  })
})

describe('LivesTab pagination affordance', () => {
  const source = readFileSync(new URL('./LivesTab.tsx', import.meta.url), 'utf8')

  it('renders all four page navigation buttons with a persistent bordered surface', () => {
    for (const label of ['Primeira página', 'Página anterior', 'Próxima página', 'Última página']) {
      expect(source).toContain(`variant="secondary" size="icon" aria-label="${label}"`)
    }
  })
})

describe('LivesTab colunas configuráveis', () => {
  // Header e linha renderizam uma célula por faixa do grid: 9 fixas + 1 por coluna ligada
  // (a barra de duração não cria célula, só alarga a de duração).
  const FIXAS = 9
  const comCelula = (cols: ReadonlySet<LiveColumnKey>) => [...cols].filter((k) => k !== 'duracao_barra').length

  it('padrão: só GMV/h ligado, sem cabine, barra e tipo', () => {
    expect([...DEFAULT_LIVE_COLUMNS]).toEqual(['gmv_hora'])
    const padrao = new Set(DEFAULT_LIVE_COLUMNS)
    expect(buildLivesGridTemplate(padrao).split(' ')).toHaveLength(FIXAS + comCelula(padrao))
  })

  it('cada coluna ligada acrescenta exatamente uma faixa ao grid', () => {
    const todas = new Set<LiveColumnKey>(LIVE_COLUMN_OPTIONS.map((o) => o.key))
    expect(buildLivesGridTemplate(todas).split(' ')).toHaveLength(FIXAS + comCelula(todas))
    expect(buildLivesGridTemplate(new Set()).split(' ')).toHaveLength(FIXAS)
  })

  it('GMV/h divide o GMV pelas horas registradas e não inventa valor sem duração', () => {
    expect(gmvPorHora(3847, 142)).toBeCloseTo(1625.49, 2)
    expect(gmvPorHora(0, 90)).toBeNull()
    expect(gmvPorHora(500, 0)).toBeNull()
  })

  it('não ressuscita colunas removidas: template padrão não tem a largura da cabine', () => {
    // Regressão visual medida no print de 2026-09-04: cabine (90px) e barra (110px) por padrão.
    const padrao = buildLivesGridTemplate(new Set(DEFAULT_LIVE_COLUMNS))
    expect(padrao).not.toContain('90px minmax')
    expect(padrao.startsWith('80px minmax(180px,1.4fr) 72px 115px 92px')).toBe(true)
  })
})
