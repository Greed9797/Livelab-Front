import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '../services/query-client'
import { QK } from '../services/query-keys'
import * as authService from '../services/auth'
import { saveUser } from '../services/auth-storage'
import { useAuthStore } from './auth-store'

vi.mock('../services/auth', () => ({ login: vi.fn(), logout: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../services/auth-storage', () => ({ clearSession: vi.fn(), restoreSession: vi.fn(), saveUser: vi.fn() }))

const user = { id: 'presenter-b', nome: 'B', email: 'b@example.test', papel: 'apresentadora' as const, tenant_id: 'unit-a', tenant_nome: 'A' }
const priorKey = QK.presenterPortalHome('unit-a', 'presenter-a', '2026-09')

afterEach(() => {
  queryClient.clear()
  useAuthStore.setState({ user: null, isLoading: false, error: null })
  vi.clearAllMocks()
})

describe('isolamento de sessão do portal', () => {
  it('descarta dados da conta anterior ao autenticar outra apresentadora', async () => {
    queryClient.setQueryData(priorKey, { fixo: 2700 })
    vi.mocked(authService.login).mockResolvedValue({ user, accessToken: 'fixture', refreshToken: 'fixture' })
    await useAuthStore.getState().login(user.email, 'fixture')
    expect(useAuthStore.getState().user?.id).toBe(user.id)
    expect(queryClient.getQueryData(priorKey)).toBeUndefined()
  })

  it('não chama credenciais recusadas de sessão expirada no formulário de login', async () => {
    vi.mocked(authService.login).mockRejectedValue({ isAxiosError: true, response: { status: 401 } })

    await useAuthStore.getState().login('a@example.test', 'incorrect')

    expect(useAuthStore.getState().error).toBe('E-mail ou senha inválidos. Confira os dados e tente novamente.')
  })

  it('atualiza somente o nome de exibição do tenant da sessão', async () => {
    useAuthStore.setState({ user })

    useAuthStore.getState().updateTenantDisplayName('unit-a', 'Unidade Atualizada')

    expect(useAuthStore.getState().user).toEqual({ ...user, tenant_nome: 'Unidade Atualizada' })
    expect(useAuthStore.getState().user?.nome).toBe(user.nome)
    expect(useAuthStore.getState().user?.papel).toBe(user.papel)
    expect(useAuthStore.getState().user?.tenant_id).toBe(user.tenant_id)
    expect(saveUser).toHaveBeenCalledWith({ ...user, tenant_nome: 'Unidade Atualizada' })
  })

  it('ignora atualização para um tenant diferente', () => {
    useAuthStore.setState({ user })

    useAuthStore.getState().updateTenantDisplayName('unit-b', 'Outra unidade')

    expect(useAuthStore.getState().user).toEqual(user)
  })

  it.each(['logout', 'expire'] as const)('remove dados privados ao executar %s', async (action) => {
    useAuthStore.setState({ user })
    queryClient.setQueryData(priorKey, { fixo: 2700 })
    await useAuthStore.getState()[action]()
    expect(useAuthStore.getState().user).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('separa consultas por unidade, pessoa e mês', () => {
    for (const key of [QK.presenterPortalHome('unit-b', 'presenter-a', '2026-09'), QK.presenterPortalHome('unit-a', 'presenter-b', '2026-09'), QK.presenterPortalHome('unit-a', 'presenter-a', '2026-10')]) {
      expect(key).not.toEqual(priorKey)
    }
  })
})
