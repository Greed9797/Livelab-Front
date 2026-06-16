import { describe, expect, it } from 'vitest'
import {
  type PeriodRange,
  comissoesParams,
  custosCompetencia,
  financeiroParams,
  isValidPeriodRange,
  periodKey,
  periodRangeFromParams,
  periodRangeLabel,
  previousPeriodRange,
  writePeriodRangeToParams,
} from './period'

const single = (ym: string): PeriodRange => ({ mode: 'single', inicio: ym, fim: ym })
const range = (inicio: string, fim: string): PeriodRange => ({ mode: 'range', inicio, fim })

describe('period — params para os endpoints', () => {
  it('financeiro sempre envia inicio/fim (single = inicio=fim)', () => {
    expect(financeiroParams(single('2025-06'))).toEqual({ inicio: '2025-06', fim: '2025-06' })
    expect(financeiroParams(range('2025-01', '2025-03'))).toEqual({ inicio: '2025-01', fim: '2025-03' })
  })

  it('comissoes usa mes no single e data_inicio/data_fim (YYYY-MM-DD) no range', () => {
    expect(comissoesParams(single('2025-06'))).toEqual({ mes: '2025-06' })
    expect(comissoesParams(range('2025-01', '2025-03'))).toEqual({ data_inicio: '2025-01-01', data_fim: '2025-03-31' })
  })

  it('comissoes data_fim respeita o último dia do mês (fev em ano bissexto)', () => {
    expect(comissoesParams(range('2024-01', '2024-02')).data_fim).toBe('2024-02-29')
    expect(comissoesParams(range('2025-01', '2025-02')).data_fim).toBe('2025-02-28')
  })

  it('custos sempre por competência = mês final do range', () => {
    expect(custosCompetencia(single('2025-06'))).toBe('2025-06')
    expect(custosCompetencia(range('2025-01', '2025-03'))).toBe('2025-03')
  })
})

describe('period — período anterior de mesma duração', () => {
  it('single → mês anterior', () => {
    expect(previousPeriodRange(single('2025-03'))).toEqual({ mode: 'single', inicio: '2025-02', fim: '2025-02' })
    expect(previousPeriodRange(single('2025-01'))).toEqual({ mode: 'single', inicio: '2024-12', fim: '2024-12' })
  })

  it('range de N meses → bloco contíguo anterior de N meses', () => {
    expect(previousPeriodRange(range('2025-04', '2025-06'))).toEqual({ mode: 'range', inicio: '2025-01', fim: '2025-03' })
    expect(previousPeriodRange(range('2025-01', '2025-02'))).toEqual({ mode: 'range', inicio: '2024-11', fim: '2024-12' })
  })
})

describe('period — validação e rótulos', () => {
  it('valida fim ≥ início', () => {
    expect(isValidPeriodRange(range('2025-01', '2025-03'))).toBe(true)
    expect(isValidPeriodRange(range('2025-03', '2025-01'))).toBe(false)
    expect(isValidPeriodRange({ mode: 'range', inicio: 'xx', fim: '2025-01' })).toBe(false)
  })

  it('periodKey é estável e distingue modo', () => {
    expect(periodKey(single('2025-06'))).toBe('single:2025-06:2025-06')
    expect(periodKey(range('2025-01', '2025-03'))).toBe('range:2025-01:2025-03')
  })

  it('rótulo natural por modo', () => {
    expect(periodRangeLabel(single('2025-06'))).toMatch(/2025/)
    expect(periodRangeLabel(range('2025-01', '2025-03'))).toBe('jan–mar 2025')
    expect(periodRangeLabel(range('2024-11', '2025-01'))).toBe('nov/2024 – jan/2025')
  })
})

describe('period — sync com URL searchParams', () => {
  it('round-trip single preserva outros params', () => {
    const params = new URLSearchParams('tab=comissoes')
    const written = writePeriodRangeToParams(params, single('2025-06'))
    expect(written.get('tab')).toBe('comissoes')
    expect(written.get('pmode')).toBe('single')
    expect(written.get('pini')).toBe('2025-06')
    expect(written.get('pfim')).toBe(null)
    expect(periodRangeFromParams(written)).toEqual(single('2025-06'))
  })

  it('round-trip range', () => {
    const written = writePeriodRangeToParams(new URLSearchParams(), range('2025-01', '2025-03'))
    expect(written.get('pmode')).toBe('range')
    expect(periodRangeFromParams(written)).toEqual(range('2025-01', '2025-03'))
  })

  it('params inválidos/ausentes caem no default (single válido)', () => {
    const pr = periodRangeFromParams(new URLSearchParams('pmode=range&pini=2025-05&pfim=2025-01'))
    expect(pr.mode).toBe('single')
    expect(isValidPeriodRange(pr)).toBe(true)
  })
})
