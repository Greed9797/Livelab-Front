import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PortalRanking } from './PortalRanking'
import type { PresenterPortalRankingRow } from '../../services/presenter-portal'

describe('pending ranking disclosure', () => {
  it('labels collisions and keeps pending amounts separate from commissions', () => {
    const row = { posicao: 1, apresentadora_id: 'p1', nome: 'Ana', gmv_total: 100, total_lives: 1, fixo: 200, comissao_variavel: 5, total_recebido: 205, pendente_aprovacao: true, em_conciliacao: true, gmv_pendente_aprovacao: 50 } as unknown as PresenterPortalRankingRow
    const html = renderToStaticMarkup(<PortalRanking rows={[row]} />)
    expect(html).toContain('Em conciliação')
    expect(html).toContain('Pendente aprovação')
    expect(html).toContain('50,00')
    expect(html).toContain('205,00')
  })
})
