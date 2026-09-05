import { describe, expect, it } from 'vitest'
import { chaveAgrupamentoCarteira, isCarteiraAtiva, resolverLinkCarteira, selecionarCarteiraPorVisibilidade } from './carteira'

describe('carteira — visibilidade operacional', () => {
  const registros = [
    { id: 'cliente-cancelado', status: 'cancelado' },
    { id: 'marca-ativa', status: 'ativa' },
    { id: 'cliente-ativo', status: 'ativo' },
    { id: 'marca-inativa', status: 'inativa' },
    { id: 'cliente-arquivado', status: 'arquivado' },
  ]

  it('mantém pendência financeira na carteira ativa sem tratá-la como desativação', () => {
    expect(isCarteiraAtiva('ativo')).toBe(true)
    expect(isCarteiraAtiva('ativa')).toBe(true)
    expect(isCarteiraAtiva('inadimplente')).toBe(true)
    expect(isCarteiraAtiva('pausada')).toBe(false)
    expect(isCarteiraAtiva('cancelado')).toBe(false)
  })

  it('não agrupa registros de mesmo nome quando seus status divergem', () => {
    const base = { tipo_operacional: 'cliente_ecommerce', nome: 'Marca Exemplo' }
    expect(chaveAgrupamentoCarteira({ ...base, status: 'ativo' }))
      .not.toBe(chaveAgrupamentoCarteira({ ...base, status: 'cancelado' }))
  })

  it('consulta o catálogo completo antes de resolver um nome, inclusive ativo com possível homônimo arquivado', () => {
    expect(resolverLinkCarteira([{ status: 'cancelado' }], false)).toBe('todos')
    expect(resolverLinkCarteira([], false)).toBe('todos')
    expect(resolverLinkCarteira([], true)).toBe('ausente')
    expect(resolverLinkCarteira([{ status: 'ativa' }], false)).toBe('todos')
    expect(resolverLinkCarteira([{ status: 'ativa' }, { status: 'arquivado' }], true)).toBe('abrir')
  })

  it('filtra ativos e inativos sem trocar a ordem de cada grupo', () => {
    expect(selecionarCarteiraPorVisibilidade(registros, 'ativos').map((item) => item.id))
      .toEqual(['marca-ativa', 'cliente-ativo'])
    expect(selecionarCarteiraPorVisibilidade(registros, 'inativos').map((item) => item.id))
      .toEqual(['cliente-cancelado', 'marca-inativa', 'cliente-arquivado'])
  })

  it('mantém todos os registros carregados, deixando os inativos ao final', () => {
    expect(selecionarCarteiraPorVisibilidade(registros, 'todos').map((item) => item.id))
      .toEqual(['marca-ativa', 'cliente-ativo', 'cliente-cancelado', 'marca-inativa', 'cliente-arquivado'])
  })
})
