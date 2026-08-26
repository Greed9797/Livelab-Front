import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { dateRangeToWindow, isValidCustomDateRange } from './LivesTab'

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
      expect(source).toContain(`variant="secondary" className="h-7 w-7 p-0" aria-label="${label}"`)
    }
  })
})
