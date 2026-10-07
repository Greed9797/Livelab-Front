/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePainel } from '../../hooks/useFinanceiro'
import { normalizarPainel } from '../../utils/painel'
import { ComparacaoPainelMes } from './ComparacaoPainelMes'

vi.mock('../../hooks/useFinanceiro', () => ({ usePainel: vi.fn() }))
afterEach(cleanup)

const painel = normalizarPainel({
  mes: '2026-10', fim_mes: '2026-10-31', data_corte: '2026-09-01',
  a_receber: { no_mes: 47000, atrasado_anterior: 2902.06, total: 49902.06 },
  a_pagar: { no_mes: 74000, atrasado_anterior: 2861.58, total: 76861.58 },
  competencia: { receita: { previsto: 45000 }, custos: { previsto: 68248.09 } },
}, '2026-10')

function consulta(over: Record<string, unknown> = {}) {
  vi.mocked(usePainel).mockReturnValue({
    data: painel, isError: false, isFetching: false, refetch: vi.fn(), ...over,
  } as unknown as ReturnType<typeof usePainel>)
}

describe('ComparacaoPainelMes', () => {
  it('exibe receber canônico, mês e anteriores, preservando o mês no link', () => {
    consulta()
    render(<ComparacaoPainelMes mes="2026-10" natureza="receita" />)
    expect(usePainel).toHaveBeenCalledWith('2026-10')
    expect(screen.getByText('R$ 49.902,06')).toBeTruthy()
    expect(screen.getByText('R$ 47.000,00')).toBeTruthy()
    expect(screen.getByText('R$ 2.902,06')).toBeTruthy()
    expect(screen.queryByText('R$ 45.000,00')).toBeNull()
    expect(screen.getByText(/incluindo anteriores/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver painel em Lançamentos' }).getAttribute('href')).toBe('/financeiro?tab=lancamentos&mes=2026-10')
  })

  it('identifica pagar como todos os custos e não o total da competência', () => {
    consulta()
    render(<ComparacaoPainelMes mes="2026-10" natureza="custo" />)
    expect(screen.getByText('A pagar no painel · todos os custos')).toBeTruthy()
    expect(screen.getByText('R$ 76.861,58')).toBeTruthy()
    expect(screen.queryByText('R$ 68.248,09')).toBeNull()
    expect(screen.getByText(/custos fixos e variáveis pelas datas de vencimento/)).toBeTruthy()
    expect(screen.getByText(/Corte financeiro: 01\/09\/2026/)).toBeTruthy()
  })

  it('não associa o placeholder do mês anterior ao mês selecionado', () => {
    consulta({ isFetching: true })
    render(<ComparacaoPainelMes mes="2026-11" natureza="receita" />)
    expect(screen.getByText('Carregando comparação com o painel')).toBeTruthy()
    expect(screen.queryByText('R$ 49.902,06')).toBeNull()
  })

  it('informa falha e permite repetir, sem substituir saldo por zero', () => {
    const refetch = vi.fn()
    consulta({ data: undefined, isError: true, error: new Error('Consulta indisponível'), refetch })
    render(<ComparacaoPainelMes mes="2026-10" natureza="receita" />)
    expect(screen.queryByText('R$ 0,00')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
