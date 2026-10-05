import { describe, expect, it, vi } from 'vitest'
import { normalizarLancamento } from '../../utils/financeiro'
import { acaoPerdaMenu } from './LancamentosList'

describe('ações da lista com perda parcial', () => {
  it('mantém perda adicional e reversão disponíveis', () => {
    const item = normalizarLancamento({ id: 'x', natureza: 'receita', origem: 'comercial',
      descricao: 'Mensalidade', competencia: '2026-09-01', data_vencimento: '2026-09-01',
      valor_previsto: 100, valor_pago: 0, valor_perdido: 25 }, '2026-10-05')
    const abrir = vi.fn()
    const acoes = acaoPerdaMenu(item, abrir)
    expect(acoes.map((a) => a.label)).toEqual(['Desfazer perda', 'Dar como perdida'])
    acoes[0].onClick()
    acoes[1].onClick()
    expect(abrir.mock.calls.map((call) => call[1])).toEqual(['desfazer', 'perder'])
  })
})
