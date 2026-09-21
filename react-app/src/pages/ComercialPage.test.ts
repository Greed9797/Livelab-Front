import { describe, expect, it } from 'vitest'
import { buildAfiliadoCreatePayload, buildAtivoUpdatePayload, normalizarBusca, statusLabel } from './ComercialPage'

const FINANCE_KEYS = ['comissao_franquia_pct', 'comissao_franqueadora_pct', 'valor_fixo_minimo', 'tipo_cobranca'] as const

function expectSemFinanceiro(payload: Record<string, unknown>) {
  for (const key of FINANCE_KEYS) expect(payload).not.toHaveProperty(key)
}

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

  it('não envia colunas financeiras no PATCH de marca', () => {
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
      nome: 'Afiliada',
      status: 'ativa',
      data_inicio: '2026-09-01',
      data_fim: null,
      logo_url: null,
    })
    expectSemFinanceiro(payload)
  })

  it('o create de afiliado não envia comissão nem as outras colunas financeiras', () => {
    const payload = buildAfiliadoCreatePayload({
      nome: 'Loja',
      responsavel: 'Ana',
      whatsapp: '47999999999',
      email: 'ana@loja.test',
      tiktok_username: 'loja',
      logo_url: '',
      cor: '',
      observacoes: 'nota',
      comissao_franquia_pct: '8',
      comissao_franqueadora_pct: '2',
      valor_fixo_minimo: '1.200,00',
      tipo_cobranca: 'fixo_mais_comissao',
    })

    expect(payload).toMatchObject({
      nome: 'Loja',
      tipo: 'afiliada',
      status: 'ativa',
      observacoes: 'Responsável: Ana\nWhatsApp: 47999999999\nE-mail: ana@loja.test\nnota',
    })
    expectSemFinanceiro(payload)
  })

  it('mantém o lápis com ação de edição separada do clique da linha', async () => {
    const source = await import('node:fs').then(({ readFileSync }) => readFileSync(new URL('./ComercialPage.tsx', import.meta.url), 'utf8'))
    expect(source).toContain('aria-label={`Editar ${asString(item.nome, \'cadastro\')}`}')
    expect(source).toContain("event.stopPropagation(); abrirAtivo(item)")
  })

  it('usa o editor temporal e não deixa o modal cadastral gravar condições legadas', async () => {
    const source = await import('node:fs').then(({ readFileSync }) => readFileSync(new URL('./ComercialPage.tsx', import.meta.url), 'utf8'))
    expect(source).toContain("import { CondicoesComerciais } from '../components/comercial/CondicoesComerciais'")
    expect(source).toContain('const payload = kind === \'marca\'')
    expect(source).toContain('<CondicoesComerciais')
    expect(source).not.toContain('Valores aplicados à marca operacional nas lives e vídeos.')
    expect(source).toContain('configuracao_comercial')
    expect(source).toContain('commercialConfigCodes')
  })

})
