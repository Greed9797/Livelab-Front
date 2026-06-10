import { describe, expect, it } from 'vitest'
import {
  formatMoneyOrNI,
  gmvPorHoraHint,
  gmvPorHoraTone,
  operacionalStatusLabel,
  operacionalStatusTone,
} from './operacional'

describe('operacionalStatusTone', () => {
  it('mapeia ok → success', () => {
    expect(operacionalStatusTone('ok')).toBe('success')
  })

  it('mapeia atencao → warning', () => {
    expect(operacionalStatusTone('atencao')).toBe('warning')
  })

  it('mapeia critico → danger', () => {
    expect(operacionalStatusTone('critico')).toBe('danger')
  })

  it('mapeia dados_incompletos → info', () => {
    expect(operacionalStatusTone('dados_incompletos')).toBe('info')
  })

  it('mapeia desconhecido → neutral', () => {
    expect(operacionalStatusTone('outro')).toBe('neutral')
    expect(operacionalStatusTone(null)).toBe('neutral')
    expect(operacionalStatusTone(undefined)).toBe('neutral')
  })
})

describe('operacionalStatusLabel', () => {
  it('retorna rótulos em português', () => {
    expect(operacionalStatusLabel('ok')).toBe('OK')
    expect(operacionalStatusLabel('atencao')).toBe('Atenção')
    expect(operacionalStatusLabel('critico')).toBe('Crítico')
    expect(operacionalStatusLabel('dados_incompletos')).toBe('Incompleto')
  })

  it('retorna Desconhecido para valores inválidos', () => {
    expect(operacionalStatusLabel('')).toBe('Desconhecido')
    expect(operacionalStatusLabel(null)).toBe('Desconhecido')
  })
})

describe('formatMoneyOrNI', () => {
  it('retorna não informado para null', () => {
    expect(formatMoneyOrNI(null)).toBe('não informado')
  })

  it('retorna não informado para undefined', () => {
    expect(formatMoneyOrNI(undefined)).toBe('não informado')
  })

  it('formata valor numérico como moeda', () => {
    expect(formatMoneyOrNI(1500)).toBe('R$ 1.500,00')
  })

  it('NUNCA retorna R$ 0,00 para null — retorna não informado', () => {
    expect(formatMoneyOrNI(null)).not.toBe('R$ 0,00')
  })

  it('retorna R$ 0,00 para o número zero (zero é um valor real)', () => {
    expect(formatMoneyOrNI(0)).toBe('R$ 0,00')
  })
})

describe('gmvPorHoraTone', () => {
  it('retorna success quando pct >= 100', () => {
    expect(gmvPorHoraTone(100)).toBe('success')
    expect(gmvPorHoraTone(150)).toBe('success')
  })

  it('retorna warning quando 70 <= pct < 100', () => {
    expect(gmvPorHoraTone(70)).toBe('warning')
    expect(gmvPorHoraTone(99)).toBe('warning')
  })

  it('retorna danger quando pct < 70', () => {
    expect(gmvPorHoraTone(69)).toBe('danger')
    expect(gmvPorHoraTone(0)).toBe('danger')
  })

  it('retorna neutral quando null ou undefined (não informado)', () => {
    expect(gmvPorHoraTone(null)).toBe('neutral')
    expect(gmvPorHoraTone(undefined)).toBe('neutral')
  })
})

describe('gmvPorHoraHint', () => {
  it('retorna não informado quando pctMeta é null', () => {
    expect(gmvPorHoraHint(null, 500)).toBe('não informado')
    expect(gmvPorHoraHint(undefined, 500)).toBe('não informado')
  })

  it('inclui percentual e meta formatada', () => {
    expect(gmvPorHoraHint(73, 500)).toBe('73% da meta (R$ 500,00/h)')
  })

  it('omite meta quando metaGmvHora é null', () => {
    expect(gmvPorHoraHint(85, null)).toBe('85% da meta')
  })
})
