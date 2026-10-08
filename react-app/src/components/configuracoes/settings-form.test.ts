import { describe, expect, it } from 'vitest'
import { rankingSettingsFrom, rankingSettingsPatch, unitSettingsFrom, unitSettingsPatch } from './settings-form'

describe('settings form adapters', () => {
  it('maps canonical settings and legacy response aliases into the unit form', () => {
    expect(unitSettingsFrom({ nome_franquia: 'Unidade A', email: 'a@example.test', telefone: '47999', estado: 'sc', gateway_provider: 'legacy' })).toEqual({
      nome: 'Unidade A', cnpj: '', email_contato: 'a@example.test', telefone_contato: '47999', cidade: '', uf: 'SC',
    })
  })

  it('sends only changed unit fields and uses null only to clear optional values', () => {
    const baseline = unitSettingsFrom({ nome: 'Unidade A', cidade: 'Blumenau', uf: 'SC' })
    expect(unitSettingsPatch({ ...baseline, cidade: '', telefone_contato: '47999' }, baseline)).toEqual({ cidade: null, telefone_contato: '47999' })
  })

  it('loads ranking overrides separately from effective inherited values', () => {
    expect(rankingSettingsFrom({
      ativo: true,
      nome_publico: 'Unidade efetiva',
      cidade: 'Blumenau',
      overrides: { nome_publico: null, cidade: 'Blumenau', uf: null, logo_url: null, meta_gmv: null },
    })).toEqual({ ativo: true, nome_publico: '', logo_url: '', cidade: 'Blumenau', uf: '', meta_gmv: '' })
  })

  it('patches only intentional ranking changes, using null to restore inheritance', () => {
    const baseline = rankingSettingsFrom({
      ativo: true,
      overrides: { nome_publico: 'Nome especial', logo_url: null, cidade: null, uf: null, meta_gmv: 1000 },
    })
    expect(rankingSettingsPatch({ ...baseline, nome_publico: '', ativo: false, meta_gmv: '' }, baseline)).toEqual({ ativo: false, nome_publico: null, meta_gmv: null })
  })
})
