import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('AgendarLiveModal source contract', () => {
  const source = readFileSync(new URL('./AgendarLiveModal.tsx', import.meta.url), 'utf8')

  it('offers lookup helpers for account and cabine and uses the shared presenter selector', () => {
    expect(source).toContain('function AccountCombobox')
    expect(source).toContain('onAccountOptionSelect')
    expect(source).toContain('accountInvalid')
    expect(source).toContain('list="agenda-cabine-options"')
    expect(source).toContain('<PresenterSelect')
  })

  it('checks backend availability and exposes weekday recurrence selection', () => {
    expect(source).toContain('getAgendaConflitos')
    expect(source).toContain('dias_semana')
    expect(source).toContain('recorrencia_dias_semana')
  })

  it('builds agenda timestamps in Sao Paulo time instead of browser local time', () => {
    expect(source).toContain('getSaoPauloDateInput')
    expect(source).toContain("return `${date}T${time}:00-03:00`")
  })
})
