import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '../services/query-client'
import { QK } from '../services/query-keys'
import * as authService from '../services/auth'
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
