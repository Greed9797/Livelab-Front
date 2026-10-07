/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizarPainel } from '../../utils/painel'
import { PainelMes } from './PainelMes'

afterEach(cleanup)

const raw = {
  mes: '2026-10', hoje: '2026-10-12', fim_mes: '2026-10-31', mes_relativo: 'corrente', configurado: true, data_corte: '2026-10-01', saldo_abertura: 1000,
  caixa: { saldo_atual: 1500, ate: '2026-10-12' },
  recebido_mes: { total: 800, receitas: 600, aportes: 200 },
  pago_mes: { total: 300 },
  a_receber: { no_mes: 4000, atrasado_anterior: 500, total: 4500, qtd: 7, atrasados: { qtd: 2, valor: 700 } },
  a_pagar: { no_mes: 2500, atrasado_anterior: 0, total: 2500, qtd: 5, atrasados: { qtd: 0, valor: 0 } },
  projetado_fim_mes: 3500,
  projecao_comissao: { competencia: '2026-10', previsto_atual: 1000, projetado: 2400, ajuste: 1400, dias_decorridos: 12, dias_mes: 31, qtd: 3, vence_em: '2026-11-05', entra_no_painel: false },
  projetado_fim_mes_ritmo: 4900,
  competencia: { receita: { previsto: 5000, realizado: 800 }, custos: { previsto: 3000, realizado: 300 }, resultado: { previsto: 2000, realizado: 500 } },
}

function ui(over: Record<string, unknown> = {}, props: Partial<Parameters<typeof PainelMes>[0]> = {}) {
  return (
    <PainelMes
      painel={normalizarPainel({ ...raw, ...over }, '2026-10')}
      isLoading={false}
      isError={false}
      podeEscrever
      onConfigurar={() => {}}
      onRetry={() => {}}
      {...props}
    />
  )
}

describe('PainelMes', () => {
  it('mantém as quatro métricas principais e os realizados secundários perceptíveis', () => {
    render(ui())
    expect(screen.getByLabelText('Saldo atual R$ 1.500,00')).toBeTruthy()
    expect(screen.getByRole('group', { name: /^A receber: R\$ 4\.500,00/ })).toBeTruthy()
    expect(screen.getByRole('group', { name: /^A pagar: R\$ 2\.500,00/ })).toBeTruthy()
    expect(screen.getByRole('group', { name: /^Projetado no fim do mês: R\$ 3\.500,00/ })).toBeTruthy()
    expect(screen.getByRole('group', { name: /^Recebido em outubro: R\$ 800,00/ })).toBeTruthy()
    expect(screen.getByRole('group', { name: /^Pago em outubro: R\$ 300,00/ })).toBeTruthy()
  })

  it('colapsa detalhamentos acessíveis mantendo alertas e estimativas perceptíveis', () => {
    render(ui())
    const detalhamento = screen.getByRole('button', { name: 'Detalhamento do caixa' })
    expect(detalhamento.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Vence no mês')).toBeNull()
    expect(screen.getByLabelText('2 atrasados, R$ 700,00')).toBeTruthy()
    expect(screen.getByLabelText('Projeção pelo ritmo atual').textContent).toContain('R$ 4.900,00')
    fireEvent.click(detalhamento)
    expect(detalhamento.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByText('Vence no mês')).toHaveLength(2)
  })

  it('mostra caixa, a receber/a pagar em caixa com atrasados, projetado e projeção rotulada', () => {
    const onVer = vi.fn()
    render(ui({}, { onVerAtrasados: onVer }))
    expect(screen.getByText('Caixa hoje')).toBeTruthy()
    expect(screen.getByRole('group', { name: /^A receber: R\$ 4\.500,00/ })).toBeTruthy()
    expect(screen.getByRole('group', { name: /^A pagar: R\$ 2\.500,00/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Detalhamento do caixa' }))
    expect(screen.getAllByText('Vence no mês')).toHaveLength(2)
    expect(screen.getAllByText('Atrasado de meses anteriores')).toHaveLength(2)
    const chip = screen.getByRole('button', { name: /Ver 2 atrasados/ })
    expect(chip.textContent).toContain('2 atrasados · R$ 700,00')
    fireEvent.click(chip)
    expect(onVer).toHaveBeenCalledWith('receita')
    // a pagar sem atrasados: sem chip vermelho
    expect(screen.getAllByRole('button', { name: /atrasados/ })).toHaveLength(1)
    const proj = screen.getByRole('group', { name: /Projetado no fim do mês: R\$ 3\.500,00/ })
    expect(within(proj).getByText(/Inclui R\$ 700,00 atrasados a receber/)).toBeTruthy()
    const ritmo = screen.getByLabelText('Projeção pelo ritmo atual')
    expect(ritmo.textContent).toContain('projeção')
    expect(ritmo.textContent).toContain('Se a comissão de outubro seguir no ritmo atual')
    expect(ritmo.textContent).toContain('R$ 4.900,00')
    expect(ritmo.textContent).toContain('não entra nos totais')
    const memoria = within(ritmo).getByText('Memória da projeção')
    expect(memoria.closest('details')?.open).toBe(false)
    fireEvent.click(memoria)
    expect(within(ritmo).getByText('Comissão acumulada').parentElement?.textContent).toContain('R$ 1.000,00')
    expect(within(ritmo).getByText('Comissão projetada').parentElement?.textContent).toContain('R$ 2.400,00')
    expect(within(ritmo).getByText('Ajuste estimado').parentElement?.textContent).toContain('R$ 1.400,00')
    expect(within(ritmo).getByText('Dias do ritmo').parentElement?.textContent).toContain('12 de 31')
    expect(within(ritmo).getByText('Vencimento estimado').parentElement?.textContent).toContain('05/11/2026')
    expect(within(ritmo).getByText('Entra no caixa deste mês').parentElement?.textContent).toContain('Não')
  })

  it('sem projeção do backend não mostra a linha de ritmo', () => {
    render(ui({ projecao_comissao: null, projetado_fim_mes_ritmo: null }))
    expect(screen.queryByLabelText('Projeção pelo ritmo atual')).toBeNull()
  })

  it('competência fica recolhida e é rotulada como referência', () => {
    render(ui())
    const toggle = screen.getByRole('button', { name: /Competência \(referência\)/ })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(/Não é a fonte do “A receber”/)).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Previsto' })).toBeTruthy()
  })

  it('mês futuro não mostra recebido/pago', () => {
    render(ui({ mes: '2026-12', mes_relativo: 'futuro', fim_mes: '2026-12-31' }))
    expect(screen.queryByText(/^Recebido em/)).toBeNull()
    expect(screen.getByText(/Mês futuro/)).toBeTruthy()
  })

  it('sem corte configurado convida a cadastrar o saldo', () => {
    const onConfigurar = vi.fn()
    render(ui({ configurado: false, data_corte: null }, { onConfigurar }))
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar saldo de hoje' }))
    expect(onConfigurar).toHaveBeenCalled()
    expect(screen.queryByRole('group', { name: /^A receber/ })).toBeNull()
  })

  it('não duplica a configuração de saldo quando o painel já está configurado', () => {
    const onConfigurar = vi.fn()
    render(ui({}, { onConfigurar }))
    expect(screen.queryByRole('button', { name: 'Configurar saldo' })).toBeNull()
    expect(screen.getByLabelText('Saldo atual R$ 1.500,00')).toBeTruthy()
    expect(onConfigurar).not.toHaveBeenCalled()
  })

  it('skeleton enquanto carrega e erro com retry', () => {
    const { rerender } = render(<PainelMes painel={undefined} isLoading isError={false} podeEscrever onConfigurar={() => {}} onRetry={() => {}} />)
    expect(screen.getByLabelText('Carregando painel do mês')).toBeTruthy()
    const onRetry = vi.fn()
    rerender(<PainelMes painel={undefined} isLoading={false} isError podeEscrever onConfigurar={() => {}} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(onRetry).toHaveBeenCalled()
  })
})
