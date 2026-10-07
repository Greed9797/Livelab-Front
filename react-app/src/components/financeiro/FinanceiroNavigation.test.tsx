/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FinanceiroNavigation, type FinanceiroTab } from './FinanceiroNavigation'

afterEach(cleanup)

const destinations: [FinanceiroTab, string, string][] = [
  ['lancamentos', 'Lançamentos', 'Todos os lançamentos'],
  ['receber', 'Lançamentos', 'Receber'],
  ['pagar', 'Lançamentos', 'Pagar'],
  ['visao-geral', 'Lançamentos', 'Conferir: Visão geral'],
  ['conciliacao', 'Lançamentos', 'Conferir: Conciliação'],
  ['receita', 'Receitas e custos', 'Receita'],
  ['custos-fixos', 'Receitas e custos', 'Custos fixos'],
  ['custos-variaveis', 'Receitas e custos', 'Custos variáveis'],
  ['comissoes', 'Comissões', 'Comissões'],
  ['dre', 'Relatórios', 'DRE'],
  ['fluxo', 'Relatórios', 'Fluxo de caixa'],
  ['aging', 'Relatórios', 'Aging'],
  ['fechamentos', 'Relatórios', 'Fechamentos'],
]

describe('FinanceiroNavigation', () => {
  it.each(destinations)('deriva grupo e seção selecionados de %s', (tab, group, section) => {
    const onChange = vi.fn()
    render(<FinanceiroNavigation tab={tab} podeVerFechamentos onChange={onChange} />)
    const groups = screen.getByRole('group', { name: 'Grupos do financeiro' })
    expect(within(groups).getAllByRole('button')).toHaveLength(4)
    expect(within(groups).getAllByRole('button', { current: 'page' })).toHaveLength(1)
    expect(within(groups).getByRole('button', { name: group }).getAttribute('aria-current')).toBe('page')
    expect(within(groups).getByRole('button', { name: group }).hasAttribute('aria-pressed')).toBe(false)
    const sections = screen.getByRole('group', { name: `Seções de ${group}` })
    expect(within(sections).getByRole('button', { name: section }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(within(groups).getByRole('button', { name: group }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it.each([
    ['Lançamentos', 'lancamentos'],
    ['Receitas e custos', 'receita'],
    ['Comissões', 'comissoes'],
    ['Relatórios', 'dre'],
  ] as const)('entra deterministicamente em %s', (group, target) => {
    const onChange = vi.fn()
    const tab = target === 'lancamentos' ? 'dre' : 'lancamentos'
    render(<FinanceiroNavigation tab={tab} podeVerFechamentos onChange={onChange} />)
    fireEvent.click(within(screen.getByRole('group', { name: 'Grupos do financeiro' })).getByRole('button', { name: group }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(target)
  })

  it.each(destinations)('navega para %s sem guardar seleção interna', (tab, group, section) => {
    const onChange = vi.fn()
    const initialTab = group === 'Lançamentos' ? 'lancamentos' : group === 'Receitas e custos' ? 'receita' : group === 'Comissões' ? 'comissoes' : 'dre'
    render(<FinanceiroNavigation tab={initialTab} podeVerFechamentos onChange={onChange} />)
    const sections = within(screen.getByRole('group', { name: `Seções de ${group}` }))
    fireEvent.click(sections.getByRole('button', { name: section }))
    if (tab === initialTab) expect(onChange).not.toHaveBeenCalled()
    else expect(onChange).toHaveBeenCalledExactlyOnceWith(tab)
    expect(sections.getByRole('button', { current: 'page' }).getAttribute('aria-current')).toBe('page')
    expect(sections.getByRole('button', { name: destinations.find(([value]) => value === initialTab)![2] }).getAttribute('aria-current')).toBe('page')
  })

  it('acompanha mudanças de tab externas sem chamar onChange', () => {
    const onChange = vi.fn()
    const { rerender } = render(<FinanceiroNavigation tab="pagar" podeVerFechamentos onChange={onChange} />)
    expect(screen.queryByRole('button', { name: 'DRE' })).toBeNull()
    rerender(<FinanceiroNavigation tab="fluxo" podeVerFechamentos onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Fluxo de caixa' }).getAttribute('aria-current')).toBe('page')
    expect(screen.queryByRole('button', { name: 'Pagar' })).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('remove Fechamentos ao perder a permissão, inclusive com tab recebido em fechamentos', () => {
    const onChange = vi.fn()
    const { rerender } = render(<FinanceiroNavigation tab="fechamentos" podeVerFechamentos onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Fechamentos' })).toBeTruthy()
    rerender(<FinanceiroNavigation tab="fechamentos" podeVerFechamentos={false} onChange={onChange} />)
    expect(screen.queryByRole('button', { name: 'Fechamentos' })).toBeNull()
    const groups = within(screen.getByRole('group', { name: 'Grupos do financeiro' }))
    expect(groups.getAllByRole('button', { current: 'page' })).toHaveLength(1)
    expect(groups.getByRole('button', { name: 'Lançamentos', current: 'page' })).toBeTruthy()
    const sections = within(screen.getByRole('group', { name: 'Seções de Lançamentos' }))
    expect(sections.getAllByRole('button', { current: 'page' })).toHaveLength(1)
    expect(sections.getByRole('button', { name: 'Todos os lançamentos', current: 'page' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'DRE' })).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })
})
