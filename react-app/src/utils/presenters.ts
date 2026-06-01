import type { JsonRecord } from '../types/models'
import { asString } from './format'

export type PresenterOption = {
  value: string
  label: string
}

export function isPresenterRole(papel: unknown): boolean {
  const value = asString(papel, '')
  return value === 'apresentador' || value === 'apresentadora'
}

export function presenterProfileId(item: JsonRecord | null | undefined): string {
  if (!item) return ''
  return (asString(item.apresentadora_id, '') || asString(item.id, '')).replace(/^apresentadora:/, '')
}

export function presenterDisplayName(item: JsonRecord | null | undefined): string {
  if (!item) return 'Apresentadora'
  return asString(item.nome ?? item.email, 'Apresentadora')
}

export function toPresenterOptions(rows: JsonRecord[] = [], { includeInactive = true } = {}): PresenterOption[] {
  const seen = new Set<string>()
  return rows
    .filter((item) => includeInactive || item.ativo !== false)
    .map((item) => {
      const value = presenterProfileId(item)
      const inactive = item.ativo === false
      const label = `${presenterDisplayName(item)}${inactive ? ' (inativa)' : ''}`
      return { value, label }
    })
    .filter((option) => {
      if (!option.value || seen.has(option.value)) return false
      seen.add(option.value)
      return true
    })
}
