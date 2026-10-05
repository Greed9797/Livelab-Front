import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cadastroUnificadoHabilitado,
  cadastrosParaCarteira,
  juntarCadastrosLegado,
  normalizarCadastro,
  normalizarListaCadastros,
  normalizarTipoCadastro,
  podePromoverACliente,
  tipoCadastroLabel,
} from './cadastro'

describe('cadastro — flag VITE_CADASTRO_UNIFICADO', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('só liga com "true"; ausente, vazio, "false" e "0" deixam desligada', () => {
    expect(cadastroUnificadoHabilitado('true')).toBe(true)
    expect(cadastroUnificadoHabilitado(' TRUE ')).toBe(true)
    for (const v of [undefined, '', 'false', '0', '1', 'yes', 'on']) expect(cadastroUnificadoHabilitado(v)).toBe(false)
  })

  it('lê o env do build por padrão (desligada sem a variável)', () => {
    vi.stubEnv('VITE_CADASTRO_UNIFICADO', '')
    expect(cadastroUnificadoHabilitado()).toBe(false)
    vi.stubEnv('VITE_CADASTRO_UNIFICADO', 'true')
    expect(cadastroUnificadoHabilitado()).toBe(true)
    vi.stubEnv('VITE_CADASTRO_UNIFICADO', 'false')
    expect(cadastroUnificadoHabilitado()).toBe(false)
  })
})

describe('cadastro — normalizador defensivo', () => {
  it('normaliza o item completo do contrato novo', () => {
    const c = normalizarCadastro({
      id: 'm1', marca_id: 'm1', cliente_id: 'c1', nome: 'Aurora', tipo: 'cliente', sistema: false, gera_receita: true,
      status_operacional: 'ativa', status_comercial: 'ativo',
      ficha: { celular: '47999', email: 'a@x.com', cnpj: '123', razao_social: 'Aurora LTDA', gateway_customer_id: 'cus_1', acesso_email: 'portal@x.com' },
      logo_url: 'https://x/logo.png', cor: '#ff0000', tiktok_username: 'aurora', configuracao_comercial: { pendencias: [] },
      apresentadoras: [{ id: 'p1', nome: 'Ana' }], gmv_mes: '1500.5', lives_mes: 3,
    })
    expect(c).toMatchObject({
      id: 'm1', marca_id: 'm1', cliente_id: 'c1', nome: 'Aurora', tipo: 'cliente', sistema: false, gera_receita: true,
      status_operacional: 'ativa', status_comercial: 'ativo', gmv_mes: 1500.5, lives_mes: 3, cor: '#ff0000',
      ficha: { celular: '47999', email: 'a@x.com', cnpj: '123', razao_social: 'Aurora LTDA', gateway_customer_id: 'cus_1', acesso_email: 'portal@x.com' },
    })
    expect(c?.apresentadoras).toHaveLength(1)
  })

  it('aceita campos faltantes e deriva gera_receita do tipo/sistema', () => {
    const afiliada = normalizarCadastro({ id: 'm2', nome: 'Farol', tipo: 'afiliada' })
    expect(afiliada).toMatchObject({ marca_id: 'm2', cliente_id: null, tipo: 'afiliada', gera_receita: false, status_operacional: 'ativa', status_comercial: null, gmv_mes: 0 })
    expect(afiliada?.ficha).toEqual({ celular: null, email: null, cnpj: null, razao_social: null, gateway_customer_id: null, acesso_email: null })
    expect(normalizarCadastro({ id: 'm3', nome: 'Casa', tipo: 'cliente', sistema: 'true' })?.gera_receita).toBe(false)
    expect(normalizarCadastro({ id: 'm4', nome: 'Sem tipo' })?.tipo).toBe('cliente')
    expect(normalizarCadastro({ nome: 'sem id' })).toBeNull()
    expect(normalizarCadastro(null)).toBeNull()
    expect(normalizarCadastro('x')).toBeNull()
  })

  it('aceita o formato atual de /marcas (campos de contato soltos, status)', () => {
    const c = normalizarCadastro({ id: 'm5', nome: 'Brisa', tipo: 'parceira', status: 'inativa', email: 'b@x.com', gmv_mes: 10 })
    expect(c).toMatchObject({ marca_id: 'm5', tipo: 'parceira', status_operacional: 'inativa', gmv_mes: 10, ficha: { email: 'b@x.com' } })
  })

  it('tipo: sinônimos antigos e rótulos', () => {
    expect(normalizarTipoCadastro('cliente_ecommerce')).toBe('cliente')
    expect(normalizarTipoCadastro('própria')).toBe('propria')
    expect(normalizarTipoCadastro('afiliado')).toBe('afiliada')
    expect(normalizarTipoCadastro('desconhecido', 'afiliada')).toBe('afiliada')
    expect(tipoCadastroLabel('propria')).toBe('Marca própria')
    expect(tipoCadastroLabel('parceira')).toBe('Parceira')
  })

  it('lista: array, envelopes { data } / { cadastros } / { items }; formato desconhecido = null', () => {
    expect(normalizarListaCadastros([{ id: 'a', nome: 'A' }, { foo: 1 }])).toHaveLength(1)
    expect(normalizarListaCadastros({ data: [{ id: 'a', nome: 'A' }] })).toHaveLength(1)
    expect(normalizarListaCadastros({ cadastros: [{ id: 'a', nome: 'A' }] })).toHaveLength(1)
    expect(normalizarListaCadastros({ items: [] })).toEqual([])
    expect(normalizarListaCadastros({ error: 'x' })).toBeNull()
    expect(normalizarListaCadastros('<html>')).toBeNull()
    expect(normalizarListaCadastros(null)).toBeNull()
  })

  it('promover: só afiliada/própria/parceira e nunca sistema', () => {
    expect(podePromoverACliente({ tipo: 'afiliada', sistema: false, marca_id: 'm' })).toBe(true)
    expect(podePromoverACliente({ tipo: 'cliente', sistema: false, marca_id: 'm' })).toBe(false)
    expect(podePromoverACliente({ tipo: 'parceira', sistema: false, marca_id: 'm' })).toBe(true)
    expect(podePromoverACliente({ tipo: 'propria', sistema: true, marca_id: 'm' })).toBe(false)
    expect(podePromoverACliente({ tipo: 'afiliada', sistema: false, marca_id: null })).toBe(false)
  })
})

describe('cadastro — junção legada /clientes + /marcas (igual à carteira atual)', () => {
  const clientes = [
    { id: 'c1', nome: 'Aurora', status: 'ativo', email: 'a@x.com', celular: '47' },
    { id: 'c2', nome: 'Sem marca', status: 'inadimplente' },
  ]
  const marcas = [
    { id: 'm-extra', cliente_id: 'c1', nome: 'Aurora Kids', status: 'ativa', tipo: 'afiliada' },
    { id: 'm1', cliente_id: 'c1', nome: 'Aurora Loja', status: 'ativa', tipo: 'cliente', cor: '#123456', configuracao_comercial: { ok: true } },
    { id: 'm2', nome: 'Farol', status: 'ativa', tipo: 'afiliada' },
  ]

  it('um cadastro por cliente (marca principal = tipo cliente) + marcas sem cliente', () => {
    const cadastros = juntarCadastrosLegado(clientes, marcas)
    expect(cadastros.map((c) => c.id)).toEqual(['m1', 'c2', 'm2'])
    expect(cadastros[0]).toMatchObject({ cliente_id: 'c1', marca_id: 'm1', nome: 'Aurora', marca_nome: 'Aurora Loja', status_comercial: 'ativo', cor: '#123456', gera_receita: true })
    expect(cadastros[0].marcas_vinculadas).toHaveLength(2)
    expect(cadastros[1]).toMatchObject({ marca_id: null, cliente_id: 'c2', tipo: 'cliente' })
    expect(cadastros[2]).toMatchObject({ marca_id: 'm2', tipo: 'afiliada', gera_receita: false })
  })

  it('linhas da carteira mantêm o formato de hoje (cliente_ecommerce com id do cliente)', () => {
    const linhas = cadastrosParaCarteira(juntarCadastrosLegado(clientes, marcas))
    expect(linhas[0]).toMatchObject({ id: 'c1', tipo_operacional: 'cliente_ecommerce', marca_principal: 'Aurora Loja', cor: '#123456', cor_seed_id: 'm1', status: 'ativo', email: 'a@x.com', cadastro_tipo: 'cliente', gera_receita: true })
    expect(linhas[1]).toMatchObject({ id: 'c2', tipo_operacional: 'cliente_ecommerce', cor_seed_id: 'c2', status: 'inadimplente' })
    expect(linhas[2]).toMatchObject({ id: 'm2', tipo_operacional: 'afiliada', tipo_entidade: 'marca', status: 'ativa', gera_receita: false })
  })
})

describe('cadastro — linhas a partir de /v1/cadastros', () => {
  it('cliente abre pela ficha; afiliada/própria pela marca; segunda marca da ficha abre como marca', () => {
    const cadastros = normalizarListaCadastros([
      { id: 'm1', marca_id: 'm1', cliente_id: 'c1', nome: 'Aurora', tipo: 'cliente', status_operacional: 'ativa', status_comercial: 'ativo', ficha: { email: 'a@x.com' } },
      { id: 'm9', marca_id: 'm9', cliente_id: 'c1', nome: 'Aurora Outlet', tipo: 'cliente', status_operacional: 'ativa', status_comercial: 'ativo' },
      { id: 'm2', marca_id: 'm2', cliente_id: null, nome: 'Farol', tipo: 'afiliada', status_operacional: 'ativa', gera_receita: false },
      { id: 'm3', marca_id: 'm3', cliente_id: null, nome: 'Casa', tipo: 'propria', sistema: true, status_operacional: 'ativa' },
    ])!
    const linhas = cadastrosParaCarteira(cadastros)
    expect(linhas.map((l) => [l.id, l.tipo_operacional])).toEqual([
      ['c1', 'cliente_ecommerce'],
      ['m9', 'cliente'],
      ['m2', 'afiliada'],
      ['m3', 'propria'],
    ])
    expect(linhas[0]).toMatchObject({ email: 'a@x.com', status: 'ativo', cor_seed_id: 'm1', cadastro_marca_id: 'm1' })
    expect(linhas[2].gera_receita).toBe(false)
    expect(linhas[3]).toMatchObject({ gera_receita: false, sistema: true })
  })
})

describe('cadastro — formato real do backend (cadastroColsSql)', () => {
  it('ficha solta + cliente_nome + status alias + configuracao_comercial', () => {
    const [c] = normalizarListaCadastros([{
      id: 'm1', marca_id: 'm1', cliente_id: 'c1', tenant_id: 't', nome: 'Haag', tipo: 'cliente', sistema: false, gera_receita: true,
      status_operacional: 'ativa', status: 'ativa', status_comercial: 'inadimplente', tiktok_username: 'haag', logo_url: null, cor: '#111111',
      cliente_nome: 'Haag', celular: '47', email: 'h@x.com', cnpj: '1', razao_social: 'Haag SA', gateway_customer_id: 'cus_9',
      acesso_user_id: 'u1', acesso_email: 'portal@h.com', acesso_ativo: true, apresentadoras: [], gmv_mes: 12.5, lives_mes: 2, videos_mes: 1,
      configuracao_comercial: { status: 'ok' },
    }])!
    expect(c).toMatchObject({ id: 'm1', cliente_id: 'c1', status_comercial: 'inadimplente', gmv_mes: 12.5, videos_mes: 1, configuracao_comercial: { status: 'ok' } })
    expect(c.ficha).toEqual({ celular: '47', email: 'h@x.com', cnpj: '1', razao_social: 'Haag SA', gateway_customer_id: 'cus_9', acesso_email: 'portal@h.com' })
    expect(cadastrosParaCarteira([c])[0]).toMatchObject({ id: 'c1', tipo_operacional: 'cliente_ecommerce', status: 'inadimplente', email: 'h@x.com', celular: '47' })
  })
})
