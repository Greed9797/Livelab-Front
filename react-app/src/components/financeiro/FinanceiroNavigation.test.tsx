/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FinanceiroNavigation, type FinanceiroTab } from './FinanceiroNavigation'

afterEach(cleanup)

describe('FinanceiroNavigation', () => {
  it.each([
    ['caixa', 'Caixa'],
    ['vencimentos', 'Vencimentos'],
    ['conciliacao', 'Conciliação'],
    ['lancamentos', 'Vencimentos'],
    ['receber', 'Mais'],
    ['pagar', 'Mais'],
    ['fluxo', 'Mais'],
    ['dre', 'Mais'],
    ['receita', 'Mais'],
    ['comissoes', 'Mais'],
  ] as [FinanceiroTab, string][])('marca a área principal de %s', (tab, label) => {
    render(<FinanceiroNavigation tab={tab} podeVerFechamentos onChange={() => {}} />)
    const areas = within(screen.getByRole('group', { name: 'Áreas principais do financeiro' }))
    expect(areas.getAllByRole('button')).toHaveLength(4)
    expect(areas.getAllByRole('button', { current: 'page' })).toHaveLength(1)
    expect(areas.getByRole('button', { name: label }).getAttribute('aria-current')).toBe('page')
  })

  it.each([
    ['Caixa', 'caixa'],
    ['Vencimentos', 'vencimentos'],
    ['Conciliação', 'conciliacao'],
    ['Mais', 'receita'],
  ] as const)('entra deterministicamente em %s', (label, target) => {
    const onChange = vi.fn()
    render(<FinanceiroNavigation tab={target === 'caixa' ? 'dre' : 'caixa'} podeVerFechamentos onChange={onChange} />)
    fireEvent.click(within(screen.getByRole('group', { name: 'Áreas principais do financeiro' })).getByRole('button', { name: label }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(target)
  })

  it('mantém as áreas avançadas em Mais e navega sem estado interno', () => {
    const onChange = vi.fn()
    const { rerender } = render(<FinanceiroNavigation tab="dre" podeVerFechamentos onChange={onChange} />)
    const more = within(screen.getByRole('group', { name: 'Itens de Mais' }))
    expect(more.getByRole('button', { name: 'DRE', current: 'page' })).toBeTruthy()
    expect(more.getByRole('button', { name: 'Fluxo de caixa' })).toBeTruthy()
    expect(more.getByRole('button', { name: 'A receber (detalhado)' })).toBeTruthy()
    expect(more.getByRole('button', { name: 'Custos fixos e recorrências' })).toBeTruthy()
    fireEvent.click(more.getByRole('button', { name: 'Aging' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith('aging')
    expect(more.getByRole('button', { name: 'DRE', current: 'page' })).toBeTruthy()
    rerender(<FinanceiroNavigation tab="aging" podeVerFechamentos onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Aging' }).getAttribute('aria-current')).toBe('page')
  })

  it('remove Fechamentos ao perder permissão e volta a seleção visual para Caixa', () => {
    const onChange = vi.fn()
    const { rerender } = render(<FinanceiroNavigation tab="fechamentos" podeVerFechamentos onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Fechamentos' })).toBeTruthy()
    rerender(<FinanceiroNavigation tab="fechamentos" podeVerFechamentos={false} onChange={onChange} />)
    expect(screen.queryByRole('button', { name: 'Fechamentos' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Itens de Mais' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Caixa', current: 'page' })).toBeTruthy()
    expect(onChange).not.toHaveBeenCalled()
  })
})
