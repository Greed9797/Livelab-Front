import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../ui/Toast'
import { QK } from '../../services/query-keys'
import { settlementKey } from '../financeiro/PresenterSettlement'
import type { PresenterSettlementRow } from '../../services/remuneration'
import { RelatorioEntidadeSection } from './RelatorioEntidadeSection'

const dailyRow = { dia: '2026-09-05', gmv_lives: 20, gmv_total: 20, total_lives: 1, comissao_apresentadora: 2 }

const settlementRow = {
  apresentadora_id: 'p1',
  nome: 'Ana',
  fixo: 2700,
  comissao: 150,
  bonus_fim_de_semana: 80,
  adicionais: 0,
  total: 2930,
  horas: { dias_uteis: 20, meta: 120, realizadas_dias_uteis: 121, dias_especiais: 1, bateu_meta: true },
  dias_especiais: [{ data: '2026-09-05', tipo: 'sabado', feriado: null, horas: 4, blocos_4h: 1, bonus: 80, gmv: 20, comissao: 2 }],
} as unknown as PresenterSettlementRow

function render(from: string, to: string, withSettlement: boolean) {
  const client = new QueryClient()
  client.setQueryData(QK.analyticsDailyRange(from, to, '', 'p1'), { rows: [dailyRow] })
  if (withSettlement) client.setQueryData(settlementKey('anonymous', from.slice(0, 7)), { mes: from.slice(0, 7), apresentadoras: [settlementRow], totais: {}, pode_editar: false })
  return renderToStaticMarkup(<QueryClientProvider client={client}><MemoryRouter><ToastProvider><RelatorioEntidadeSection from={from} to={to} marcaId="" apresentadoraId="p1" nomeEntidade="Ana" /></ToastProvider></MemoryRouter></QueryClientProvider>)
}

describe('relatorio da apresentadora: fechamento mensal', () => {
  it('mostra o card de fechamento com total a pagar e a meta de horas num único mês', () => {
    const html = render('2026-09-01', '2026-09-30', true)
    expect(html).toContain('Fechamento do mês')
    expect(html).toContain('Total a pagar')
    expect(html).toContain('Bateu a meta de horas')
  })

  it('marca sábado na coluna Dia pela própria data', () => {
    const html = render('2026-09-01', '2026-09-30', true)
    expect(html).toContain('Sáb')
  })

  it('avisa que o fechamento é do mês inteiro quando o filtro pega só parte do mês', () => {
    const parcial = render('2026-09-01', '2026-09-10', true)
    expect(parcial).toContain('Fechamento do mês')
    expect(parcial).toContain('Valores do mês inteiro, não só de')
    expect(render('2026-09-01', '2026-09-30', true)).not.toContain('Valores do mês inteiro')
  })

  it('mostra a nota de fechamento mensal quando o período cruza meses', () => {
    const html = render('2026-09-01', '2026-10-31', true)
    expect(html).toContain('O fechamento é mensal: selecione um único mês para ver o valor a pagar.')
    expect(html).not.toContain('Fechamento do mês')
  })
})
