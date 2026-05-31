import { describe, expect, it } from 'vitest'
import { menuForUser, needsClientOnboarding, routeForRole } from './access'
import type { User } from '../types/models'

const baseUser: User = {
  id: 'user-1',
  nome: 'Teste',
  email: 'teste@livelab.com',
  papel: 'franqueado',
  tenant_id: 'tenant-1',
  tenant_nome: 'Unidade',
  onboarding_completed: true,
}

describe('routeForRole', () => {
  it('routes master users to the master dashboard', () => {
    expect(routeForRole('franqueador_master')).toBe('/master')
    expect(routeForRole('gerente_regional')).toBe('/master')
  })

  it('routes client users according to onboarding state', () => {
    expect(routeForRole('cliente_parceiro', true)).toBe('/cliente')
    expect(routeForRole('cliente_parceiro', false)).toBe('/onboarding')
  })

  it('routes live presenters directly to cabines', () => {
    expect(routeForRole('apresentadora')).toBe('/conteudo')
  })
})

describe('needsClientOnboarding', () => {
  it('only blocks client users with pending onboarding', () => {
    expect(needsClientOnboarding({ ...baseUser, papel: 'cliente_parceiro', onboarding_completed: false })).toBe(true)
    expect(needsClientOnboarding({ ...baseUser, papel: 'cliente_parceiro', onboarding_completed: true })).toBe(false)
    expect(needsClientOnboarding({ ...baseUser, papel: 'franqueado', onboarding_completed: false })).toBe(false)
  })
})

describe('menuForUser', () => {
  it('keeps role-specific menus separated', () => {
    const masterMenu = menuForUser({ ...baseUser, papel: 'franqueador_master' }).map((item) => item.path)
    const clientMenu = menuForUser({ ...baseUser, papel: 'cliente_parceiro' }).map((item) => item.path)

    expect(masterMenu).toContain('/master')
    expect(masterMenu).toContain('/comercial')
    expect(masterMenu).not.toContain('/cliente')
    expect(clientMenu).toContain('/cliente')
    expect(clientMenu).toContain('/cliente/agenda')
    expect(clientMenu).toContain('/cliente/configuracoes')
    expect(clientMenu).not.toContain('/boletos')
    expect(clientMenu).not.toContain('/cabines')
  })

  it('uses the consolidated Comercial, Conteudo and Financeiro surfaces', () => {
    const franqueadoMenu = menuForUser({ ...baseUser, papel: 'franqueado' }).map((item) => item.path)
    const presenterMenu = menuForUser({ ...baseUser, papel: 'apresentadora' }).map((item) => item.path)

    expect(franqueadoMenu).toContain('/comercial')
    expect(franqueadoMenu).toContain('/conteudo')
    expect(franqueadoMenu).toContain('/financeiro')
    expect(franqueadoMenu).not.toContain('/master/crm')
    expect(franqueadoMenu).not.toContain('/cabines')
    expect(franqueadoMenu).not.toContain('/analytics-dashboard')
    expect(franqueadoMenu).not.toContain('/boletos')

    expect(presenterMenu).toContain('/conteudo')
    expect(presenterMenu).not.toContain('/cabines')
  })
})
