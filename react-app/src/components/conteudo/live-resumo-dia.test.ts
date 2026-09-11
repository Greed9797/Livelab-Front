import { describe, expect, it } from 'vitest'
import {
  buildClientResumoDiaText,
  formatDayLabel,
  formatMinsToHours,
  formatTimestampLabel,
} from './live-resumo-dia'

describe('live-resumo-dia', () => {
  it('formats minutes to hours correctly', () => {
    expect(formatMinsToHours(0)).toBe('0h 00min')
    expect(formatMinsToHours(45)).toBe('0h 45min')
    expect(formatMinsToHours(60)).toBe('1h 00min')
    expect(formatMinsToHours(150)).toBe('2h 30min')
  })

  it('formats day label with capitalized weekday', () => {
    const label = formatDayLabel('2026-09-11')
    expect(label).toContain('11/09/2026')
    expect(label.charAt(0)).toBe(label.charAt(0).toUpperCase())
  })

  it('formats timestamp with "às"', () => {
    const label = formatTimestampLabel(new Date('2026-09-11T16:20:00.000Z'))
    expect(label).toContain('às')
  })

  it('handles empty lives array gracefully', () => {
    const text = buildClientResumoDiaText([], '2026-09-11', new Date('2026-09-11T16:20:00.000Z'))
    expect(text).toContain('📊 *RESUMO DO DIA — LIVES*')
    expect(text).toContain('Nenhuma live registrada neste dia.')
  })

  it('formats summary with Option 2 style, GMV/h, and no left bullet indentation', () => {
    const lives = [
      {
        id: '1',
        iniciado_em: '2026-09-11T13:00:00-03:00',
        encerrado_em: '2026-09-11T15:00:00-03:00', // 2h = 120 mins
        gmv: 4000,
        pedidos: 40,
        marca_nome: 'Marca A',
        apresentadora_nome: 'Ana',
      },
      {
        id: '2',
        iniciado_em: '2026-09-11T16:00:00-03:00',
        encerrado_em: '2026-09-11T18:00:00-03:00', // 2h = 120 mins
        gmv: 6000,
        pedidos: 60,
        marca_nome: 'Marca B',
        apresentadoras: [
          { nome: 'Ana', gmv: 3600, segundos: 4320 }, // 1.2h = 72m
          { nome: 'Bia', gmv: 2400, segundos: 2880 }, // 0.8h = 48m
        ],
      },
    ]

    const text = buildClientResumoDiaText(lives, '2026-09-11', new Date('2026-09-11T19:00:00-03:00'))

    // Headers & Totais
    expect(text).toContain('📊 *RESUMO DO DIA — LIVES*')
    expect(text).toContain('📈 *TOTAIS DO DIA*')
    expect(text).toContain('💰 *GMV Total:* R$ 10.000,00')
    expect(text).toContain('⚡ *GMV/h:* R$ 2.500,00/h')
    expect(text).toContain('🛒 *Vendas:* 100 pedidos')
    expect(text).toContain('⏱️ *Tempo no Ar:* 4h 00min (2 lives)')

    // Marcas (Marca B first due to 6000 vs 4000 GMV)
    expect(text).toContain('🏷️ *POR MARCA*')
    expect(text).toContain('*Marca B*')
    expect(text).toContain('R$ 6.000,00 · 2h 00min · R$ 3.000,00/h · 60 pedidos')
    expect(text).toContain('*Marca A*')
    expect(text).toContain('R$ 4.000,00 · 2h 00min · R$ 2.000,00/h · 40 pedidos')

    // Apresentadoras (Ana first: 4000 + 3600 = 7600 GMV, Bia: 2400 GMV)
    expect(text).toContain('🎤 *POR APRESENTADORA*')
    expect(text).toContain('*Ana*')
    expect(text).toContain('R$ 7.600,00 · 3h 12min')
    expect(text).toContain('*Bia*')
    expect(text).toContain('R$ 2.400,00 · 0h 48min · R$ 3.000,00/h')

    // Verify absence of • bullet that causes WhatsApp indent
    expect(text).not.toContain('• ')
  })
})
