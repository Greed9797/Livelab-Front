import { afterEach, describe, expect, it, vi } from 'vitest'
import { menuForUser, needsClientOnboarding, roleLabel, routeForRole } from './access'
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

  it('routes both presenter aliases to their private home', () => {
    expect(routeForRole('apresentadora')).toBe('/minha-home')
    expect(routeForRole('apresentador')).toBe('/minha-home')
  })
})

describe('roleLabel', () => {
  it('uses one product label for both persisted presenter aliases', () => {
    expect(roleLabel('apresentador')).toBe('Apresentadora')
    expect(roleLabel('apresentadora')).toBe('Apresentadora')
  })
})

describe('needsClientOnboarding', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('only blocks client users with pending onboarding when the flag is enabled', () => {
    vi.stubEnv('VITE_ENABLE_CLIENT_ONBOARDING', 'true')
    expect(needsClientOnboarding({ ...baseUser, papel: 'cliente_parceiro', onboarding_completed: false })).toBe(true)
    expect(needsClientOnboarding({ ...baseUser, papel: 'cliente_parceiro', onboarding_completed: true })).toBe(false)
    expect(needsClientOnboarding({ ...baseUser, papel: 'franqueado', onboarding_completed: false })).toBe(false)
  })

  it('never blocks onboarding while the flag is disabled', () => {
    vi.stubEnv('VITE_ENABLE_CLIENT_ONBOARDING', 'false')
    expect(needsClientOnboarding({ ...baseUser, papel: 'cliente_parceiro', onboarding_completed: false })).toBe(false)
  })
})

describe('menuForUser', () => {
  it('keeps role-specific menus separated', () => {
    const masterMenu = menuForUser({ ...baseUser, papel: 'franqueador_master' }).map((item) => item.path)
    const clientMenu = menuForUser({ ...baseUser, papel: 'cliente_parceiro' }).map((item) => item.path)

    expect(masterMenu).toContain('/master')
    expect(masterMenu).toContain('/clientes')
    expect(masterMenu).not.toContain('/cliente')
    expect(masterMenu).not.toContain('/financeiro')
    expect(masterMenu).toContain('/financeiro/comissoes/regras')
    expect(clientMenu).toContain('/cliente')
    expect(clientMenu).toContain('/cliente/conteudo')
    expect(clientMenu).toContain('/cliente/configuracoes')
    expect(clientMenu).not.toContain('/cliente/agenda')
    expect(clientMenu).not.toContain('/conhecimento')
    expect(clientMenu).not.toContain('/financeiro?tab=boletos')
    expect(clientMenu).not.toContain('/boletos')
    expect(clientMenu).not.toContain('/cabines')
  })

  it('expõe Clientes, Agenda e Lives com uma entrada financeira por perfil', () => {
    const franqueadoMenu = menuForUser({ ...baseUser, papel: 'franqueado' }).map((item) => item.path)
    const presenterMenu = menuForUser({ ...baseUser, papel: 'apresentadora' }).map((item) => item.path)

    expect(franqueadoMenu).toContain('/clientes')
    expect(franqueadoMenu).toContain('/agenda')
    expect(franqueadoMenu).toContain('/lives')
    expect(franqueadoMenu).not.toContain('/comissoes/config')
    expect(franqueadoMenu).toContain('/financeiro')
    // Analytics conserva seu acesso de gestão; apresentadora usa Agenda e Lives.
    expect(franqueadoMenu).toContain('/analytics-dashboard')
    expect(franqueadoMenu).not.toContain('/master/crm')
    expect(franqueadoMenu).not.toContain('/cabines')
    expect(franqueadoMenu).not.toContain('/boletos')

    expect(presenterMenu).toContain('/minha-home')
    expect(presenterMenu).toContain('/minhas-lives')
    expect(presenterMenu).not.toContain('/agenda')
    expect(presenterMenu).not.toContain('/lives')
    expect(presenterMenu).not.toContain('/analytics-dashboard')
    expect(presenterMenu).not.toContain('/cabines')
  })
})


describe('organização do menu sem ampliar permissões', () => {
  it('mantém configurações no grupo final para os perfis internos e cliente', () => {
    for (const papel of ['franqueado', 'franqueador_master', 'operacional', 'cliente_parceiro', 'apresentadora'] as const) {
      const items = menuForUser({ ...baseUser, papel })
      expect(items.at(-1)?.label).toBe('Configurações')
      expect(items.at(-1)?.placement).toBe('footer')
      expect(items.filter(item => item.label === 'Financeiro').length).toBeLessThanOrEqual(1)
      expect(items.some(item => item.label === 'Comissões')).toBe(false)
    }
  })

  it('não oferece regras financeiras a perfis de consulta ou operação', () => {
    for (const papel of ['financeiro', 'financeiro_readonly', 'auditor', 'operacional', 'apresentadora', 'cliente_parceiro'] as const) {
      expect(menuForUser({ ...baseUser, papel }).map(item => item.path)).not.toContain('/financeiro/comissoes/regras')
    }
  })
})
