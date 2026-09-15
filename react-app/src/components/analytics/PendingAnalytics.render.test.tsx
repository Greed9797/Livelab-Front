import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../ui/Toast'
import { QK } from '../../services/query-keys'
import { RelatorioEntidadeSection } from './RelatorioEntidadeSection'
import { FunilAnalyticsSection } from './FunilAnalyticsSection'

describe('pending analytics disclosure', () => {
  it('shows declared impressions/views and no commission in a pending-only report', () => {
    const client = new QueryClient()
    client.setQueryData(QK.analyticsDailyRange('2026-09-01', '2026-09-30', '', 'p1'), { rows: [{ dia: '2026-09-05', gmv_lives: 20, gmv_total: 20, total_lives: 1, total_lives_pendentes_aprovacao: 1, pendente_aprovacao: true, gmv_pendente_aprovacao: 20, impressoes_pendentes_aprovacao: 500, visualizacoes_pendentes_aprovacao: 100, comissao_apresentadora: null }] })
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><MemoryRouter><ToastProvider><RelatorioEntidadeSection from="2026-09-01" to="2026-09-30" marcaId="" apresentadoraId="p1" nomeEntidade="Ana" /></ToastProvider></MemoryRouter></QueryClientProvider>)
    expect(html).toContain('Aguardando validação')
    expect(html).toContain('Impressões pendentes')
    expect(html).toContain('Visualizações pendentes')
    expect(html).toContain('500')
  })
  it('keeps collision disclosure visible even without consolidated audience rows', () => {
    const client = new QueryClient()
    client.setQueryData(['funil-analytics', '2026-09-01', '2026-09-30', undefined, undefined], { pendente_aprovacao: true, em_conciliacao: true, gmv_pendente_aprovacao: 50, resumo: { total_lives: 0 }, etapas: [] })
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><FunilAnalyticsSection from="2026-09-01" to="2026-09-30" /></QueryClientProvider>)
    expect(html).toContain('Em conciliação')
    expect(html).toContain('50,00')
  })
})
