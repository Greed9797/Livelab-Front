import type { JsonRecord } from '../../types/models'
import { formatBRLWithoutSymbol, parseBRMoneyToDecimal } from '../../utils/money'

export type UnitSettingsDraft = {
  nome: string
  cnpj: string
  email_contato: string
  telefone_contato: string
  cidade: string
  uf: string
}

export type RankingSettingsDraft = {
  ativo: boolean
  nome_publico: string
  logo_url: string
  cidade: string
  uf: string
  meta_gmv: string
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

export function unitSettingsFrom(data: JsonRecord | undefined): UnitSettingsDraft {
  return {
    nome: stringValue(data?.nome ?? data?.nome_franquia),
    cnpj: stringValue(data?.cnpj),
    email_contato: stringValue(data?.email_contato ?? data?.email),
    telefone_contato: stringValue(data?.telefone_contato ?? data?.telefone),
    cidade: stringValue(data?.cidade),
    uf: stringValue(data?.uf ?? data?.estado).toUpperCase(),
  }
}

export function unitSettingsPatch(draft: UnitSettingsDraft, baseline: UnitSettingsDraft) {
  const patch: JsonRecord = {}
  for (const key of Object.keys(draft) as Array<keyof UnitSettingsDraft>) {
    const value = draft[key].trim()
    if (value === baseline[key].trim()) continue
    patch[key] = key === 'nome' ? value : value || null
  }
  return patch
}

function overridesFrom(data: JsonRecord | undefined) {
  const value = data?.overrides
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : undefined
}

export function rankingSettingsFrom(data: JsonRecord | undefined): RankingSettingsDraft {
  const overrides = overridesFrom(data)
  return {
    ativo: data?.ativo !== false,
    nome_publico: stringValue(overrides?.nome_publico),
    logo_url: stringValue(overrides?.logo_url),
    cidade: stringValue(overrides?.cidade),
    uf: stringValue(overrides?.uf).toUpperCase(),
    meta_gmv: overrides?.meta_gmv == null ? '' : formatBRLWithoutSymbol(overrides.meta_gmv),
  }
}

export function rankingSettingsPatch(draft: RankingSettingsDraft, baseline: RankingSettingsDraft) {
  const patch: JsonRecord = {}
  if (draft.ativo !== baseline.ativo) patch.ativo = draft.ativo
  for (const key of ['nome_publico', 'logo_url', 'cidade', 'uf'] as const) {
    const value = draft[key].trim()
    if (value === baseline[key].trim()) continue
    patch[key] = value || null
  }
  const currentMeta = draft.meta_gmv.trim() ? parseBRMoneyToDecimal(draft.meta_gmv) : null
  const baselineMeta = baseline.meta_gmv.trim() ? parseBRMoneyToDecimal(baseline.meta_gmv) : null
  if (currentMeta !== baselineMeta) patch.meta_gmv = currentMeta
  return patch
}

export function unitSettingsValid(draft: UnitSettingsDraft) {
  return draft.nome.trim().length > 0
}
