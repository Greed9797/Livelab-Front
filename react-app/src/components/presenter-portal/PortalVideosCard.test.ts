import { describe, expect, it } from 'vitest'
import { videoPayloadFromForm } from './PortalVideosCard'

// 2026-10-15 12:00 em Brasília.
const now = new Date('2026-10-15T15:00:00.000Z')
const base = { marca_id: 'marca-1', data: '2026-10-15', quantidade: '3', gmv: '', pedidos: '', observacoes: '' }

describe('videoPayloadFromForm', () => {
  it('monta o payload com GMV e pedidos opcionais zerados', () => {
    expect(videoPayloadFromForm(base, now)).toEqual({
      value: { marca_id: 'marca-1', data: '2026-10-15', quantidade: 3, gmv_atribuido: '0', pedidos_atribuidos: 0, observacoes: null },
    })
  })

  it('aceita GMV no formato brasileiro', () => {
    const result = videoPayloadFromForm({ ...base, gmv: '1.234,56', pedidos: '7', observacoes: ' look ' }, now)
    expect(result).toEqual({ value: expect.objectContaining({ gmv_atribuido: '1234.56', pedidos_atribuidos: 7, observacoes: 'look' }) })
  })

  it('recusa dia futuro, de outro mês e quantidade zero', () => {
    expect(videoPayloadFromForm({ ...base, data: '2026-10-16' }, now)).toHaveProperty('error')
    expect(videoPayloadFromForm({ ...base, data: '2026-09-30' }, now)).toHaveProperty('error')
    expect(videoPayloadFromForm({ ...base, quantidade: '0' }, now)).toEqual({ error: 'Informe ao menos 1 vídeo.' })
    expect(videoPayloadFromForm({ ...base, marca_id: '' }, now)).toEqual({ error: 'Escolha a marca.' })
  })
})
