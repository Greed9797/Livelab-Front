import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { hasUnsavedLiveChanges, liveAccountOptions, liveAccountSelection, presenterDisplayName, resumoRateioPlanejado } from './EditarLiveModal'

describe('EditarLiveModal account and split contract', () => {
  const source = readFileSync(new URL('./EditarLiveModal.tsx', import.meta.url), 'utf8')

  it('uses one account selector and never submits legacy presenter ids', () => {
    expect(source).toContain('Marca ou cliente')
    expect(source).not.toContain("setIfChanged('apresentador_id'")
    expect(source).not.toContain("setIfChanged('apresentador2_id'")
    expect(source).toContain('Gerenciar divisão')
  })

  it('selecting a brand preserves its client link while client-only remains a legacy fallback', () => {
    const marcas = [{ id: 'marca-a', nome: 'Marca A', cliente_id: 'cliente-a', status: 'ativa' }]
    const clientes = [{ id: 'cliente-a', nome: 'Cliente A', status: 'ativo' }, { id: 'cliente-legado', nome: 'Cliente legado', status: 'inadimplente' }]
    expect(liveAccountOptions(marcas, clientes)).toEqual([
      { value: 'marca:marca-a', label: 'Marca · Marca A' },
      { value: 'cliente:cliente-legado', label: 'Cliente · Cliente legado' },
    ])
    expect(liveAccountSelection('marca:marca-a', marcas)).toEqual({ marca_id: 'marca-a', cliente_id: 'cliente-a' })
    expect(liveAccountSelection('cliente:cliente-legado', marcas)).toEqual({ marca_id: '', cliente_id: 'cliente-legado' })
  })

  it('oculta cadastros inativos em novas escolhas e conserva a conta histórica selecionada', () => {
    const marcas = [{ id: 'ativa', nome: 'Ativa', status: 'ativa' }, { id: 'inativa', nome: 'Histórica', status: 'inativa' }]
    const clientes = [{ id: 'cliente-ativo', nome: 'Atual', status: 'ativo' }, { id: 'cliente-cancelado', nome: 'Legado', status: 'cancelado' }]
    expect(liveAccountOptions(marcas, clientes).map((item) => item.value)).toEqual(['marca:ativa', 'cliente:cliente-ativo'])
    expect(liveAccountOptions(marcas, clientes, { marcaId: 'inativa' })[0]).toEqual({ value: 'marca:inativa', label: 'Marca · Histórica (inativo)' })
    expect(liveAccountOptions([], [], { marcaId: 'ausente', historicalName: 'Marca removida do catálogo' })[0]).toEqual({ value: 'marca:ausente', label: 'Marca · Marca removida do catálogo (inativo)' })
  })

  it('does not turn an unavailable account value into a destructive replacement', () => {
    expect(liveAccountSelection('marca:missing', [])).toBeNull()
  })
})

/**
 * Rateio PLANEJADO (semeado pelos turnos da agenda) tem percentual mas gmv_rateado
 * NULL. Sem distinguir isso da divisão confirmada, o operador acha que o dinheiro
 * já está conferido e nunca abre "Dividir entre apresentadoras".
 */
describe('resumoRateioPlanejado', () => {
  it('reconhece o rateio ainda planejado e resume nome + percentual', () => {
    expect(resumoRateioPlanejado({
      apresentadoras: [
        { apresentadora_id: 'ana', nome: 'Ana', papel: 'apoio', gmv: null, segundos: null, percentual: 25 },
        { apresentadora_id: 'bia', nome: 'Bia', papel: 'principal', gmv: null, segundos: null, percentual: 75 },
      ],
    })).toBe('Ana 25,0% · Bia 75,0%')
  })

  it('lê nome canônico e aliases de respostas antigas', () => {
    expect(presenterDisplayName({ nome: 'Ana' })).toBe('Ana')
    expect(presenterDisplayName({ apresentadora_nome: 'Bia' })).toBe('Bia')
    expect(presenterDisplayName({ apresentador_nome: 'Carol' })).toBe('Carol')
    expect(resumoRateioPlanejado({ apresentadoras: [
      { apresentadora_nome: 'Bia', gmv: null, percentual: 50 },
      { apresentador_nome: 'Carol', gmv: null, percentual: 50 },
    ] })).toBe('Bia 50,0% · Carol 50,0%')
  })

  it('não acusa planejado quando alguém já tem GMV rateado', () => {
    expect(resumoRateioPlanejado({
      apresentadoras: [
        { apresentadora_id: 'ana', nome: 'Ana', gmv: 1000, percentual: 25 },
        { apresentadora_id: 'bia', nome: 'Bia', gmv: null, percentual: 75 },
      ],
    })).toBeNull()
  })

  it('não acusa planejado com uma apresentadora só nem com a lista vazia', () => {
    expect(resumoRateioPlanejado({ apresentadoras: [{ apresentadora_id: 'ana', nome: 'Ana', gmv: null }] })).toBeNull()
    expect(resumoRateioPlanejado({})).toBeNull()
  })
})

describe('alterações pendentes antes da divisão', () => {
  it('bloqueia a troca de tela quando qualquer campo do formulário diverge do prefill', () => {
    expect(hasUnsavedLiveChanges({ gmv: '100', marca: 'a' }, { gmv: '100', marca: 'a' })).toBe(false)
    expect(hasUnsavedLiveChanges({ gmv: '200', marca: 'a' }, { gmv: '100', marca: 'a' })).toBe(true)
  })
})

/**
 * O rateio era alcançável só pelo modal de detalhe — o mesmo que mostra o "Relatório para
 * copiar". Quem abria "Editar" lia "altere em Dividir entre apresentadoras" e não tinha
 * como chegar lá, o que fazia ratear parecer função de compartilhar.
 */
describe('acesso ao rateio a partir da edição', () => {
  const modal = readFileSync(new URL('./EditarLiveModal.tsx', import.meta.url), 'utf8')
  const page = readFileSync(new URL('../../pages/ConteudoPage.tsx', import.meta.url), 'utf8')

  it('oferece o gerenciamento da divisão dentro do próprio modal de edição', () => {
    expect(modal).toContain('onDividir?: (live: JsonRecord) => void')
    expect(modal).toContain('onClick={() => onDividir(live)}')
    expect(modal).toContain('Gerenciar divisão')
  })

  it('mantém o gerenciamento disponível mesmo sem divisão registrada', () => {
    expect(modal).toContain('Nenhuma divisão registrada.')
  })

  it('fecha a edição antes de abrir o rateio, para os dois não salvarem por cima', () => {
    expect(page).toContain('onDividir={(live) => { setEditLiveData(null); abrirRateio(live) }}')
  })

  it('usa o mesmo caminho hidratado nas duas entradas', () => {
    expect(page).toContain('function abrirRateio(live: JsonRecord)')
    expect(page).toContain('onSplitApresentadoras={abrirRateio}')
    // getLivePorId é o que traz o array `apresentadoras`; abrir sem ele apagaria a
    // divisão anterior ao salvar.
    expect(page).toMatch(/function abrirRateio[\s\S]{0,400}getLivePorId/)
  })
})
