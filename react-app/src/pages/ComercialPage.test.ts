import { describe, expect, it } from 'vitest'
import { buildAtivoUpdatePayload, normalizarBusca, statusLabel } from './ComercialPage'

describe('ComercialPage — busca e status', () => {
  it('normaliza busca sem acento e caixa', () => {
    expect(normalizarBusca('São João')).toBe('sao joao')
    expect(normalizarBusca('NEGOCIAÇÃO')).toBe('negociacao')
    expect(normalizarBusca('Ábaco').includes(normalizarBusca('aba'))).toBe(true)
  })

  it('rotula status conhecidos e devolve o valor cru para desconhecidos', () => {
    expect(statusLabel('ativa')).toBe('Ativa')
    expect(statusLabel('em_analise')).toBe('Em análise')
    expect(statusLabel('cancelado_automaticamente')).toBe('Cancelado (auto)')
    expect(statusLabel('qualquer_coisa')).toBe('qualquer_coisa')
    expect(statusLabel('')).toBe('—')
  })

  it('separa o PATCH cadastral do cliente das condições financeiras', () => {
    const payload = buildAtivoUpdatePayload('cliente', {
      nome: 'Haag',
      status: 'ativo',
      email: 'contato@haag.com',
      celular: '47999999999',
      logo_url: 'https://example.com/haag.png',
      comissao_franquia_pct: '8',
      comissao_franqueadora_pct: '2',
      valor_fixo_minimo: '1.200,00',
      tipo_cobranca: 'fixo_mais_comissao',
      data_inicio: '2026-09-01',
      data_fim: '',
    })

    expect(payload).toEqual({
      nome: 'Haag',
      status: 'ativo',
      email: 'contato@haag.com',
      celular: '47999999999',
      logo_url: 'https://example.com/haag.png',
    })
    expect(payload).not.toHaveProperty('comissao_franquia_pct')
    expect(payload).not.toHaveProperty('valor_fixo_minimo')
    expect(payload).not.toHaveProperty('tipo_cobranca')
  })

  it('mantém condições no PATCH de marca, que é o editor financeiro legado', () => {
    const payload = buildAtivoUpdatePayload('marca', {
      nome: 'Afiliada',
      status: 'ativa',
      comissao_franquia_pct: '8',
      comissao_franqueadora_pct: '2',
      valor_fixo_minimo: '1.200,00',
      tipo_cobranca: 'fixo_mais_comissao',
      data_inicio: '2026-09-01',
      data_fim: '',
      logo_url: '',
    })

    expect(payload).toMatchObject({
      comissao_franquia_pct: 8,
      comissao_franqueadora_pct: 2,
      valor_fixo_minimo: 1200,
      tipo_cobranca: 'fixo_mais_comissao',
    })
  })

  it('mantém o lápis com ação de edição separada do clique da linha', async () => {
    const source = await import('node:fs').then(({ readFileSync }) => readFileSync(new URL('./ComercialPage.tsx', import.meta.url), 'utf8'))
    expect(source).toContain('aria-label={`Editar ${asString(item.nome, \'cadastro\')}`}')
    expect(source).toContain("event.stopPropagation(); abrirAtivo(item)")
  })

})
