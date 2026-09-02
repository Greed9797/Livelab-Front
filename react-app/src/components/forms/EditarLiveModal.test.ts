import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { presenterIdsFromLive, resumoRateioPlanejado } from './EditarLiveModal'

describe('EditarLiveModal presenter id contract', () => {
  const source = readFileSync(new URL('./EditarLiveModal.tsx', import.meta.url), 'utf8')

  it('prefers apresentadoras ids over legacy user ids when hydrating presenter selects', () => {
    expect(source).toContain('apresentador_id: presenterIds.principalId')
    expect(source).toContain('apresentador2_id: presenterIds.supportId')
  })

  it('compares saved presenter fields against apresentadoras ids', () => {
    expect(source).toContain("setIfChanged('apresentador_id', form.apresentador_id, presenterIds.principalId)")
    expect(source).toContain("setIfChanged('apresentador2_id', form.apresentador2_id, presenterIds.supportId)")
  })

  it('hydrates both selects from the authoritative rateio before legacy aliases', () => {
    expect(presenterIdsFromLive({
      apresentadoras: [
        { apresentadora_id: 'sandy', papel: 'principal' },
        { apresentadora_id: 'cliceane', papel: 'apoio' },
      ],
      apresentadora_id: 'legacy-primary',
      apresentadora2_id: 'legacy-support',
    })).toEqual({ principalId: 'sandy', supportId: 'cliceane' })
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

/**
 * O rateio era alcançável só pelo modal de detalhe — o mesmo que mostra o "Relatório para
 * copiar". Quem abria "Editar" lia "altere em Dividir entre apresentadoras" e não tinha
 * como chegar lá, o que fazia ratear parecer função de compartilhar.
 */
describe('acesso ao rateio a partir da edição', () => {
  const modal = readFileSync(new URL('./EditarLiveModal.tsx', import.meta.url), 'utf8')
  const page = readFileSync(new URL('../../pages/ConteudoPage.tsx', import.meta.url), 'utf8')

  it('oferece o botão de dividir dentro do próprio modal de edição', () => {
    expect(modal).toContain('onDividir?: (live: JsonRecord) => void')
    expect(modal).toContain('onClick={() => onDividir(live)}')
    expect(modal).toContain('Dividir entre apresentadoras')
  })

  it('mostra o convite mesmo quando a live ainda tem uma apresentadora só', () => {
    // Sem isto o botão só apareceria em live já dividida — e dividir uma live de uma
    // apresentadora só continuaria escondido no modal de detalhe.
    expect(modal).toContain('Mais de uma apresentadora se revezou nesta live?')
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
