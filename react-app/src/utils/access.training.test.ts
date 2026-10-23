import { describe, expect, it } from 'vitest'
import { hasRole, trainingManagementRoles, trainingReportRoles } from './access'
import type { User } from '../types/models'

function user(papel: User['papel']): User {
  return { id: 'user-1', nome: 'Pessoa', email: 'pessoa@example.com', papel, tenant_id: 'tenant-1', tenant_nome: 'Unidade' }
}

describe('training route roles', () => {
  it('restricts global catalog edits to the network master', () => {
    expect(hasRole(user('franqueador_master'), trainingManagementRoles)).toBe(true)
    expect(hasRole(user('franqueado'), trainingManagementRoles)).toBe(false)
    expect(hasRole(user('gerente'), trainingManagementRoles)).toBe(false)
  })

  it('allows unit managers to view only the tenant report', () => {
    expect(hasRole(user('franqueador_master'), trainingReportRoles)).toBe(true)
    expect(hasRole(user('franqueado'), trainingReportRoles)).toBe(true)
    expect(hasRole(user('gerente'), trainingReportRoles)).toBe(true)
    expect(hasRole(user('apresentadora'), trainingReportRoles)).toBe(false)
  })
})
