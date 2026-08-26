import { describe, expect, it } from 'vitest'

import { livePresenterCellModel, livePresenterNames } from './live-helpers'

describe('livePresenterNames', () => {
  it('returns every presenter from the authoritative split in display order', () => {
    expect(livePresenterNames({
      apresentadoras: [
        { apresentadora_id: 'sandy', nome: 'Sandy', papel: 'principal' },
        { apresentadora_id: 'cliceane', nome: 'Cliceane', papel: 'apoio' },
      ],
      apresentadora_nome: 'Nome legado',
    })).toEqual(['Sandy', 'Cliceane'])
  })

  it('falls back to the legacy primary presenter when no split is available', () => {
    expect(livePresenterNames({ apresentadora_nome: 'Sandy' })).toEqual(['Sandy'])
  })

  it('builds the table cell from the full split and blocks destructive inline editing', () => {
    expect(livePresenterCellModel({
      status_publicacao: 'rascunho',
      apresentadoras: [
        { apresentadora_id: 'sandy', nome: 'Sandy', papel: 'principal' },
        { apresentadora_id: 'cliceane', nome: 'Cliceane', papel: 'apoio' },
      ],
    }, true)).toEqual({
      name: 'Sandy + Cliceane',
      editable: false,
    })
  })
})
