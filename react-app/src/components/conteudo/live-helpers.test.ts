import { describe, expect, it } from 'vitest'

import {
  classifyLivePendings,
  filterLivesByPending,
  hasRecordedLiveGmv,
  hasRecordedMetricValue,
  livePresenterCellModel,
  livePresenterNames,
  summarizeLivePendings,
  fmtTime,
} from './live-helpers'

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

describe('pendências operacionais de lives', () => {
  it('separa rascunho, cadastro e métricas sem acusar cadastro publicado apenas vazio', () => {
    const draft = {
      id: 'draft',
      status_publicacao: 'rascunho',
      marca_id: null,
      cabine_id: 'cab-1',
      apresentadora_nome: '',
      manual_gmv: null,
      manual_orders: null,
    }
    const published = { id: 'published', status_publicacao: 'publicado', marca_id: null, apresentador_id: null }

    expect(classifyLivePendings(draft, new Set()).map((issue) => issue.kind)).toEqual([
      'rascunho',
      'cadastro',
      'metricas',
    ])
    expect(classifyLivePendings(published, new Set())).toEqual([])
  })

  it('aceita cliente legado como marca, dispensa marca em teste e prioriza o split real da apresentadora', () => {
    const common = { status_publicacao: 'rascunho', cabine_id: 'cab', manual_gmv: 0, manual_orders: 0 }
    expect(classifyLivePendings({ ...common, id: 'legacy', cliente_id: 'cliente', apresentador_id: 'ap' }, new Set()).map((issue) => issue.kind)).toEqual(['rascunho'])
    expect(classifyLivePendings({ ...common, id: 'test', tipo: 'teste', apresentador_id: 'ap' }, new Set()).map((issue) => issue.kind)).toEqual(['rascunho'])
    expect(classifyLivePendings({
      ...common,
      id: 'split',
      cliente_id: 'cliente',
      apresentadora_nome: 'À DEFINIR',
      apresentadoras: [{ apresentadora_id: 'ap', nome: 'Ana' }],
    }, new Set()).map((issue) => issue.kind)).toEqual(['rascunho'])
  })

  it('trata zero como métrica registrada e não como ausência', () => {
    expect(hasRecordedMetricValue(0)).toBe(true)
    expect(hasRecordedMetricValue('0')).toBe(true)
    expect(hasRecordedMetricValue(null)).toBe(false)
    expect(hasRecordedLiveGmv({ manual_gmv: 0, ads_gmv: null, fat_gerado: null, gmv: 0 })).toBe(true)
    expect(hasRecordedLiveGmv({ manual_gmv: null, ads_gmv: null, fat_gerado: null, gmv: 0 })).toBe(false)
    expect(hasRecordedLiveGmv({ gmv: 0 })).toBe(true)
    expect(classifyLivePendings({
      id: 'zero',
      status_publicacao: 'rascunho',
      marca_id: 'marca-1',
      cabine_id: 'cab-1',
      apresentador_id: 'ap-1',
      manual_gmv: 0,
      manual_orders: 0,
    }, new Set()).map((issue) => issue.kind)).toEqual(['rascunho'])
  })

  it('mantém À DEFINIR como cadastro pendente e duplicata como possibilidade', () => {
    const live = {
      id: 'placeholder',
      status_publicacao: 'publicado',
      marca_id: 'marca-1',
      marca_nome: 'À DEFINIR',
      cabine_id: 'cab-1',
      apresentador_id: 'ap-1',
    }
    const issues = classifyLivePendings(live, new Set(['placeholder']))
    expect(issues.map((issue) => issue.kind)).toEqual(['cadastro', 'duplicata'])
    expect(issues.find((issue) => issue.kind === 'duplicata')?.reason).toContain('Possível')
  })

  it('filtra e resume os buckets no conjunto carregado', () => {
    const lives = [
      { id: 'a', status_publicacao: 'rascunho', marca_id: 'm', cabine_id: 'c', apresentador_id: 'p', manual_gmv: 0, manual_orders: 0 },
      { id: 'b', status_publicacao: 'publicado', marca_id: 'm', cabine_id: 'c', apresentador_id: 'p' },
    ]
    const duplicateIds = new Set(['b'])
    expect(summarizeLivePendings(lives, duplicateIds)).toEqual({ rascunho: 1, cadastro: 0, metricas: 0, duplicata: 1 })
    expect(filterLivesByPending(lives, 'duplicata', duplicateIds).map((live) => live.id)).toEqual(['b'])
  })


  it('formata horário da live no fuso operacional de São Paulo', () => {
    expect(fmtTime('2026-09-04T01:00:00.000Z')).toBe('22:00')
  })
})
