import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('AgendarLiveModal source contract', () => {
  const source = readFileSync(new URL('./AgendarLiveModal.tsx', import.meta.url), 'utf8')

  it('offers autocomplete helpers for account, cabine and presenter fields', () => {
    expect(source).toContain('list="agenda-account-options"')
    expect(source).toContain('list="agenda-cabine-options"')
    expect(source).toContain('list="agenda-apresentadora-options"')
  })

  it('checks backend availability and exposes weekday recurrence selection', () => {
    expect(source).toContain('getAgendaConflitos')
    expect(source).toContain('dias_semana')
    expect(source).toContain('recorrencia_dias_semana')
  })
})
