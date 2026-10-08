import type { JsonRecord } from '../../types/models'
import { asString } from '../../utils/format'
import { isPresenterRole } from '../../utils/presenters'

export type SettingsUserView = 'all' | 'active' | 'inactive' | 'without_access'

export function isProfileWithoutAccess(item: JsonRecord) {
  return asString(item.origem_perfil) === 'apresentadora'
}

export function isActive(item: JsonRecord) {
  return item.ativo === true || item.ativo === 'true'
}

export function matchesSettingsRole(item: JsonRecord, papel: string) {
  if (papel === 'all') return true
  return papel === 'apresentador' ? isPresenterRole(item.papel) : asString(item.papel) === papel
}

export function consolidateSettingsUserRows(users: JsonRecord[], presenters: JsonRecord[]) {
  const linkedPresenterIds = new Set(users.map((item) => asString(item.apresentadora_id, '')).filter(Boolean))
  const presenterOnlyRows = presenters
    .filter((item) => {
      const presenterId = asString(item.id, '')
      const userId = asString(item.user_id, '')
      // /usuarios intentionally omits the current account. A known user_id is still
      // proof of an existing access, even when that account is absent from this response.
      return !linkedPresenterIds.has(presenterId) && !userId
    })
    .map((item) => ({
      ...item,
      id: `apresentadora:${asString(item.id, '')}`,
      user_id: '',
      apresentadora_id: asString(item.id, ''),
      papel: 'apresentador',
      email: asString(item.email, 'sem acesso criado'),
      ativo: item.ativo,
      pode_apresentar_live: true,
      origem_perfil: 'apresentadora',
    }))
  return [...users, ...presenterOnlyRows]
}

export function attachPendingInvites(rows: JsonRecord[], invites: JsonRecord[]) {
  const inviteById = new Map(invites.map((item) => [asString(item.id, ''), item]))
  return rows.map((item) => ({
    ...item,
    ...(inviteById.get(asString(item.id, '')) ?? {}),
  }))
}

export function rowsMatchingSettingsToolbar(rows: JsonRecord[], searchTerm: string, papel: string) {
  const search = searchTerm.trim().toLowerCase()
  return rows.filter((item) => {
    if (!matchesSettingsRole(item, papel)) return false
    if (!search) return true
    return [item.nome, item.email, item.telefone, item.cidade, item.papel, item.origem_perfil]
      .map((value) => asString(value, '').toLowerCase())
      .join(' ')
      .includes(search)
  })
}

export function settingsViewCounts(rows: JsonRecord[]) {
  return {
    all: rows.length,
    active: rows.filter(isActive).length,
    inactive: rows.filter((item) => item.ativo === false || item.ativo === 'false').length,
    without_access: rows.filter(isProfileWithoutAccess).length,
  }
}

export function filterSettingsUserRows(rows: JsonRecord[], view: SettingsUserView) {
  return rows
    .filter((item) => {
      if (view === 'without_access') return isProfileWithoutAccess(item)
      if (view === 'active') return isActive(item)
      if (view === 'inactive') return item.ativo === false || item.ativo === 'false'
      return true
    })
    .sort((a, b) => asString(a.nome, '').localeCompare(asString(b.nome, ''), 'pt-BR'))
}
