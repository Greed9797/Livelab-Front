import { describe, expect, it } from 'vitest'
import {
  attachPendingInvites,
  consolidateSettingsUserRows,
  filterSettingsUserRows,
  rowsMatchingSettingsToolbar,
  settingsViewCounts,
} from './settings-user-rows'

describe('settings user rows', () => {
  it('attaches the server-computed expired-invitation state to the matching account only', () => {
    const rows = attachPendingInvites([
      { id: 'amanda', nome: 'Amanda', ativo: true },
      { id: 'other', nome: 'Outra', ativo: true },
    ], [{ id: 'amanda', primeiro_acesso: false, expirou: true, invite_expira_em: '2026-10-07T12:00:00Z' }])

    expect(rows[0]).toMatchObject({ primeiro_acesso: false, expirou: true })
    expect(rows[1]).not.toHaveProperty('expirou')
  })

  it('does not classify a presenter with a known linked account as without access when that account is omitted', () => {
    const rows = consolidateSettingsUserRows([], [
      { id: 'profile-linked', user_id: 'current-user', nome: 'Conta atual', ativo: true },
      { id: 'profile-without-login', user_id: null, nome: 'Sem login', ativo: true },
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: 'apresentadora:profile-without-login', origem_perfil: 'apresentadora' })
    expect(settingsViewCounts(rows).without_access).toBe(1)
  })

  it('keeps inactive accounts in the matching data set and applies views after toolbar filters', () => {
    const rows = consolidateSettingsUserRows([
      { id: 'active', nome: 'Ana', email: 'ana@example.test', papel: 'gerente', ativo: true },
      { id: 'inactive', nome: 'Bia', email: 'bia@example.test', papel: 'financeiro', ativo: false },
    ], [])

    const matching = rowsMatchingSettingsToolbar(rows, '', 'all')
    expect(settingsViewCounts(matching)).toMatchObject({ all: 2, active: 1, inactive: 1 })
    expect(filterSettingsUserRows(matching, 'inactive').map((item) => item.id)).toEqual(['inactive'])
    expect(rowsMatchingSettingsToolbar(rows, 'bia', 'financeiro')).toHaveLength(1)
  })

  it('groups the presenter aliases under the canonical presenter filter without mutating their role', () => {
    const rows = [{ id: 'presenter', nome: 'Cris', papel: 'apresentadora', ativo: true }]
    expect(rowsMatchingSettingsToolbar(rows, '', 'apresentador')).toEqual(rows)
    expect(rows[0].papel).toBe('apresentadora')
  })
})
