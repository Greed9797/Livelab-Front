import { describe, expect, it } from 'vitest'
import { statusTone } from './Badge'

describe('statusTone', () => {
  it('separates live status from available status', () => {
    expect(statusTone('ao_vivo')).toBe('brand')
    expect(statusTone('em_andamento')).toBe('brand')
    expect(statusTone('disponivel')).toBe('neutral')
    expect(statusTone('livre')).toBe('neutral')
  })

  it('maps scheduled and maintenance statuses to distinct tones', () => {
    expect(statusTone('planejado')).toBe('warning')
    expect(statusTone('reservada')).toBe('warning')
    expect(statusTone('manutencao')).toBe('danger')
  })
})
