import { describe, expect, it } from 'vitest'
import { dateRangeToWindow, mesAnteriorWindow, periodoLabel } from './ApresentadoraDetailPage'

/**
 * O relatório PDF da apresentadora só cobria o mês corrente ("Mês" = dia 1 até
 * hoje). Fechamento de comissão precisa do mês ANTERIOR inteiro e de intervalo
 * manual. Estes testes fixam as bordas que quebram um fechamento em silêncio:
 * virada de ano, fevereiro bissexto, datas invertidas e o rótulo que também
 * vira nome de arquivo.
 */
const VAZIO = { from: '', to: '' }

describe('mês anterior — fecha o mês inteiro, não "até hoje"', () => {
  it('mês cheio anterior ao de referência', () => {
    expect(mesAnteriorWindow(new Date(2026, 7, 12))).toEqual({
      data_inicio: '2026-07-01',
      data_fim: '2026-07-31',
    })
  })

  it('janeiro volta para dezembro do ano anterior', () => {
    expect(mesAnteriorWindow(new Date(2026, 0, 5))).toEqual({
      data_inicio: '2025-12-01',
      data_fim: '2025-12-31',
    })
  })

  it('fevereiro bissexto termina em 29', () => {
    expect(mesAnteriorWindow(new Date(2024, 2, 3))).toEqual({
      data_inicio: '2024-02-01',
      data_fim: '2024-02-29',
    })
  })
})

describe('período personalizado', () => {
  it('usa as datas informadas', () => {
    expect(dateRangeToWindow('custom', { from: '2026-06-01', to: '2026-06-10' })).toEqual({
      data_inicio: '2026-06-01',
      data_fim: '2026-06-10',
    })
  })

  it('datas invertidas são ordenadas em vez de virar intervalo vazio', () => {
    expect(dateRangeToWindow('custom', { from: '2026-06-10', to: '2026-06-01' })).toEqual({
      data_inicio: '2026-06-01',
      data_fim: '2026-06-10',
    })
  })

  it('intervalo incompleto NUNCA vira data vazia no request', () => {
    // '' iria para o servidor como filtro ausente: devolveria o histórico
    // inteiro rotulado como se fosse o período pedido.
    const w = dateRangeToWindow('custom', VAZIO)
    expect(w.data_inicio).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(w.data_fim).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('presets existentes seguem iguais', () => {
  it('hoje é um único dia', () => {
    const w = dateRangeToWindow('hoje', VAZIO)
    expect(w.data_inicio).toBe(w.data_fim)
  })

  it('mês corrente começa no dia 1', () => {
    expect(dateRangeToWindow('mes', VAZIO).data_inicio).toMatch(/-01$/)
  })
})

describe('rótulo do período (cabeçalho + nome do arquivo do PDF)', () => {
  it('mês fechado vira YYYY-MM', () => {
    expect(periodoLabel('2026-07-01', '2026-07-31')).toBe('2026-07')
    expect(periodoLabel('2024-02-01', '2024-02-29')).toBe('2024-02')
  })

  it('mês parcial mostra as duas pontas', () => {
    expect(periodoLabel('2026-07-01', '2026-07-15')).toBe('2026-07-01_a_2026-07-15')
  })

  it('dia único mostra a data', () => {
    expect(periodoLabel('2026-07-05', '2026-07-05')).toBe('2026-07-05')
  })

  it('nunca contém "/" — o valor também é usado em doc.save()', () => {
    for (const label of [
      periodoLabel('2026-07-01', '2026-07-31'),
      periodoLabel('2026-07-01', '2026-07-15'),
      periodoLabel('2026-07-05', '2026-07-05'),
    ]) {
      expect(label).not.toContain('/')
    }
  })
})
