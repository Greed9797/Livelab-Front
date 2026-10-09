/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCaixaOperacional } from '../../hooks/useFinanceiro'
import { normalizarCaixaOperacional } from '../../services/financeiro'
import { CaixaOperacionalPanel } from './CaixaOperacionalPanel'

vi.mock('../../hooks/useFinanceiro', () => ({ useCaixaOperacional: vi.fn() }))
vi.mock('../charts/Charts', () => ({ LinePanel: ({ title }: { title: string }) => <div data-testid="cash-chart">{title}</div> }))

afterEach(() => { cleanup(); vi.clearAllMocks() })

const raw = {
  data_base: '2026-10-09',
  horizonte: { inicio: '2026-10-09', fim: '2027-03-31', meses: 6 },
  caixa: { configurado: true, data_corte: '2026-10-01', saldo_abertura: '1000.00', saldo_atual: '1300.00', reserva_pagaveis_vencidos: '200.00', saldo_disponivel: '1100.00', origem: 'registrado_no_sistema', escopo: 'agregado' },
  serie_diaria: [
    { dia: '2026-10-09', saldo_inicial: '1000.00', entradas_realizadas: '300.00', saidas_realizadas: '0.00', entradas_projetadas: '0.00', saidas_projetadas: '0.00', reserva_vencida: '200.00', saldo_final_projetado: '1300.00', saldo_disponivel_projetado: '1100.00' },
    { dia: '2026-10-20', saldo_inicial: '1300.00', entradas_realizadas: '0.00', saidas_realizadas: '0.00', entradas_projetadas: '500.00', saidas_projetadas: '0.00', reserva_vencida: '200.00', saldo_final_projetado: '1800.00', saldo_disponivel_projetado: '1600.00' },
    { dia: '2026-11-05', saldo_inicial: '1800.00', entradas_realizadas: '0.00', saidas_realizadas: '0.00', entradas_projetadas: '600.00', saidas_projetadas: '0.00', reserva_vencida: '200.00', saldo_final_projetado: '2400.00', saldo_disponivel_projetado: '2200.00' },
  ],
  meses: [
    { mes: '2026-10', saldo_inicial: '1000.00', entradas_realizadas: '300.00', saidas_realizadas: '0.00', entradas_projetadas: '500.00', saidas_projetadas: '0.00', reserva_vencida: '200.00', saldo_final_projetado: '1800.00', saldo_disponivel_final: '1600.00', menor_saldo_diario: '1100.00', primeiro_dia_negativo: null },
    { mes: '2026-11', saldo_inicial: '1800.00', entradas_realizadas: '0.00', saidas_realizadas: '0.00', entradas_projetadas: '600.00', saidas_projetadas: '200.00', reserva_vencida: '200.00', saldo_final_projetado: '2200.00', saldo_disponivel_final: '2000.00', menor_saldo_diario: '1600.00', primeiro_dia_negativo: null },
    { mes: '2026-12', saldo_inicial: '2200.00', entradas_realizadas: '0.00', saidas_realizadas: '0.00', entradas_projetadas: '0.00', saidas_projetadas: '100.00', reserva_vencida: '200.00', saldo_final_projetado: '2100.00', saldo_disponivel_final: '1900.00', menor_saldo_diario: '1900.00', primeiro_dia_negativo: null },
    { mes: '2027-01', saldo_inicial: '2100.00', entradas_realizadas: '0.00', saidas_realizadas: '0.00', entradas_projetadas: '0.00', saidas_projetadas: '0.00', reserva_vencida: '200.00', saldo_final_projetado: '2100.00', saldo_disponivel_final: '1900.00', menor_saldo_diario: '1900.00', primeiro_dia_negativo: null },
    { mes: '2027-02', saldo_inicial: '2100.00', entradas_realizadas: '0.00', saidas_realizadas: '0.00', entradas_projetadas: '0.00', saidas_projetadas: '0.00', reserva_vencida: '200.00', saldo_final_projetado: '2100.00', saldo_disponivel_final: '1900.00', menor_saldo_diario: '1900.00', primeiro_dia_negativo: null },
    { mes: '2027-03', saldo_inicial: '2100.00', entradas_realizadas: '0.00', saidas_realizadas: '0.00', entradas_projetadas: '0.00', saidas_projetadas: '0.00', reserva_vencida: '200.00', saldo_final_projetado: '2100.00', saldo_disponivel_final: '1900.00', menor_saldo_diario: '1900.00', primeiro_dia_negativo: null },
  ],
  indicadores: { menor_saldo_diario: '1100.00', primeiro_dia_negativo: null },
  obrigacoes: [
    { id: 'receita-out', natureza: 'receita', origem: 'marca_fixo', descricao: 'Fixo outubro', data_vencimento: '2026-10-20', valor_previsto: '500.00', valor_pago: '0.00', valor_original: '500.00', liquidado_acumulado: '0.00', saldo_aberto: '500.00', valor_projetado: '500.00', virtual: true, inconsistente: false },
    { id: 'custo-nov', natureza: 'custo', origem: 'recorrente', descricao: 'Aluguel novembro', data_vencimento: '2026-11-10', valor_previsto: '200.00', valor_pago: '0.00', valor_original: '200.00', liquidado_acumulado: '0.00', saldo_aberto: '200.00', valor_projetado: '200.00', virtual: true, inconsistente: false },
  ],
  movimentos: [],
  pendencias: {
    recebiveis_vencidos: [], pagaveis_vencidos: [], sem_data: [], comissao_futura: 'nao_estimada', comissoes_nao_estimadas: [], historico: [],
    movimentos_futuros: [{ id: 'pix-nov', natureza: 'receita', origem: 'avulsa', descricao: 'Pix agendado', data: '2026-11-05', valor: '600.00', tipo: 'liquidacao', fonte: 'canonico' }],
  },
  reconciliacao: { eventos_canonicos: 1, movimentos_legados: 0 },
  completude: { saldo_configurado: true, obrigacoes_com_data: true, obrigacoes_consistentes: true, comissoes_futuras_estimadas: false, historico_obrigacoes_completo: true, repasses_pendentes_incluidos_no_saldo: false, escopo: 'obrigacoes_e_movimentos_registrados' },
}

function consulta(over: Record<string, unknown> = {}) {
  vi.mocked(useCaixaOperacional).mockReturnValue({ data: normalizarCaixaOperacional(raw), isPending: false, isError: false, refetch: vi.fn(), ...over } as unknown as ReturnType<typeof useCaixaOperacional>)
}

function ui(over: Partial<Parameters<typeof CaixaOperacionalPanel>[0]> = {}) {
  return <CaixaOperacionalPanel mes="2026-10" detalhe={null} podeEscrever onConfigurar={() => {}} onMesChange={() => {}} onDetalheChange={() => {}} {...over} />
}

describe('CaixaOperacionalPanel', () => {
  it('rejeita dinheiro obrigatório ausente em vez de normalizar como zero', () => {
    const incompleto = structuredClone(raw)
    incompleto.meses[0].entradas_projetadas = null as unknown as string
    expect(() => normalizarCaixaOperacional(incompleto)).toThrow('meses.entradas_projetadas')
  })

  it('mostra origem e data do saldo, horizonte de seis meses e valores sem fallback de DRE', () => {
    consulta()
    render(ui())
    expect(screen.getByRole('group', { name: 'Saldo registrado em 09/10: R$ 1.300,00' }).textContent).toContain('movimentos registrados no LiveLab')
    expect(screen.getByRole('group', { name: 'Entradas previstas até 31/03: R$ 1.100,00' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Saídas previstas até 31/03: R$ 300,00' })).toBeTruthy()
    expect(screen.getByRole('table', { name: 'Projeção mensal contínua do caixa' }).querySelectorAll('tbody tr')).toHaveLength(6)
    expect(screen.getByText('Janeiro de 2027')).toBeTruthy()
    expect(screen.getByTestId('cash-chart').textContent).toContain('Outubro de 2026')
  })

  it('preserva o mês e abre drill-down exato de obrigações e movimentos', () => {
    consulta()
    const onMesChange = vi.fn()
    const onDetalheChange = vi.fn()
    const { rerender } = render(ui({ onMesChange, onDetalheChange }))
    fireEvent.click(screen.getByRole('button', { name: 'R$ 600,00' }))
    expect(onMesChange).not.toHaveBeenCalled()
    expect(onDetalheChange).toHaveBeenCalledWith('entradas', '2026-11')
    rerender(ui({ mes: '2026-11', detalhe: 'entradas', onMesChange, onDetalheChange }))
    const details = screen.getByRole('region', { name: 'Detalhes de entradas de Novembro de 2026' })
    expect(within(details).getByText('Pix agendado')).toBeTruthy()
    expect(within(details).getByText('Itens usados no total de R$ 600,00.')).toBeTruthy()
    expect(within(details).queryByText(/Outros movimentos/)).toBeNull()
  })

  it('distingue cenário parcial e explica a completude sem apresentar comissão futura como zero confirmado', () => {
    consulta()
    render(ui())
    expect(screen.getAllByText('Cenário parcial').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Completude da projeção').textContent).toContain('comissões futuras ainda não estão estimadas')
    expect(screen.getByLabelText('Completude da projeção').textContent).toContain('repasses pendentes não compõem o saldo')
  })

  it('separa loading, erro e não configurado sem mostrar falso zero', () => {
    vi.mocked(useCaixaOperacional).mockReturnValue({ data: undefined, isPending: true, isError: false } as unknown as ReturnType<typeof useCaixaOperacional>)
    const { rerender } = render(ui())
    expect(screen.getByRole('status').textContent).toContain('Carregando caixa')
    const refetch = vi.fn()
    vi.mocked(useCaixaOperacional).mockReturnValue({ data: normalizarCaixaOperacional(raw), isPending: false, isError: true, error: new Error('Caixa indisponível'), refetch } as unknown as ReturnType<typeof useCaixaOperacional>)
    rerender(ui())
    expect(screen.getByRole('alert').textContent).toContain('Caixa indisponível')
    expect(screen.queryByText('R$ 1.300,00')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar' }))
    expect(refetch).toHaveBeenCalledOnce()

    const semConfig = structuredClone(raw)
    semConfig.caixa.configurado = false
    semConfig.caixa.saldo_atual = null as unknown as string
    semConfig.completude.saldo_configurado = false
    vi.mocked(useCaixaOperacional).mockReturnValue({ data: normalizarCaixaOperacional(semConfig), isPending: false, isError: false } as unknown as ReturnType<typeof useCaixaOperacional>)
    const onConfigurar = vi.fn()
    rerender(ui({ onConfigurar }))
    expect(screen.getByRole('region', { name: 'Caixa não configurado' }).textContent).toContain('não assume saldo zero')
    expect(screen.queryByText('R$ 0,00')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Configurar abertura do caixa' }))
    expect(onConfigurar).toHaveBeenCalledOnce()
  })
})
