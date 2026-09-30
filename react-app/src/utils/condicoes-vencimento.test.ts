import { describe, expect, it } from 'vitest'
import {
  calcularDataVencimento,
  condicaoVigente,
  isDiaValido,
  parseVencimentoForm,
  resumoVencimento,
  revisaoAtual,
  vencimentoDaCondicao,
} from './condicoes-vencimento'

describe('condicoes-vencimento', () => {
  it('valida dia 1-31', () => {
    expect(isDiaValido('1')).toBe(true)
    expect(isDiaValido(31)).toBe(true)
    expect(isDiaValido('0')).toBe(false)
    expect(isDiaValido('32')).toBe(false)
    expect(isDiaValido('')).toBe(false)
    expect(isDiaValido('5.5')).toBe(false)
  })

  it('lê vencimento com fallback no padrão e prefixo comercial_', () => {
    expect(vencimentoDaCondicao(null)).toEqual({
      fixo_vencimento_dia: 5, fixo_vencimento_mes_offset: 1, comissao_vencimento_dia: 5, comissao_vencimento_mes_offset: 1,
    })
    expect(vencimentoDaCondicao({ comercial_fixo_vencimento_dia: 10, comercial_fixo_vencimento_mes_offset: 0, comissao_vencimento_dia: '15', comissao_vencimento_mes_offset: 1 })).toEqual({
      fixo_vencimento_dia: 10, fixo_vencimento_mes_offset: 0, comissao_vencimento_dia: 15, comissao_vencimento_mes_offset: 1,
    })
  })

  it('parseia o formulário e recusa dia inválido', () => {
    const ok = parseVencimentoForm({ fixo_vencimento_dia: '10', fixo_vencimento_mes_offset: '0', comissao_vencimento_dia: '20', comissao_vencimento_mes_offset: '1' })
    expect(ok).toEqual({ ok: true, value: { fixo_vencimento_dia: 10, fixo_vencimento_mes_offset: 0, comissao_vencimento_dia: 20, comissao_vencimento_mes_offset: 1 } })
    const bad = parseVencimentoForm({ fixo_vencimento_dia: '40', fixo_vencimento_mes_offset: '0', comissao_vencimento_dia: '20', comissao_vencimento_mes_offset: '1' })
    expect(bad.ok).toBe(false)
  })

  it('calcula data de vencimento com clamp no último dia e virada de ano', () => {
    expect(calcularDataVencimento('2026-01', 5, 1)).toBe('2026-02-05')
    expect(calcularDataVencimento('2026-01', 31, 1)).toBe('2026-02-28')
    expect(calcularDataVencimento('2024-01', 31, 1)).toBe('2024-02-29')
    expect(calcularDataVencimento('2026-12', 10, 1)).toBe('2027-01-10')
    expect(calcularDataVencimento('2026-04', 31, 0)).toBe('2026-04-30')
    expect(calcularDataVencimento('x', 5, 0)).toBeNull()
  })

  it('resume o vencimento', () => {
    expect(resumoVencimento(5, 1)).toBe('dia 5 no mês seguinte')
    expect(resumoVencimento(10, 0)).toBe('dia 10 no próprio mês')
  })

  it('escolhe a condição vigente e a revisão atual', () => {
    const lista = [
      { id: 'c', inicio_vigencia: '2026-12-01', revision: 3 },
      { id: 'b', inicio_vigencia: '2026-06-01', revision: 2 },
      { id: 'a', inicio_vigencia: '1900-01-01', revision: 1 },
      { id: 'x', inicio_vigencia: '2026-07-01', revision: 9, cancelled_at: '2026-07-02' },
    ]
    expect(condicaoVigente(lista, '2026-09-30')?.id).toBe('b')
    expect(condicaoVigente([], '2026-09-30')).toBeNull()
    expect(revisaoAtual(lista.filter((c) => !c.cancelled_at))).toBe(3)
    expect(revisaoAtual([])).toBe(1)
  })
})
