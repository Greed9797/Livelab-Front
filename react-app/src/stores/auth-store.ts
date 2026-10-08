import { create } from 'zustand'
import type { User } from '../types/models'
import { routeForRole } from '../utils/access'
import { clearSession, getSavedUser, restoreSession, saveUser } from '../services/auth-storage'
import { authUserUpdatedEventName, extractErrorMessage, unauthorizedEventName } from '../services/api'
import * as authService from '../services/auth'
import { queryClient } from '../services/query-client'

interface AuthState {
  user: User | null
  isBootstrapped: boolean
  isLoading: boolean
  error: string | null
  bootstrap: () => void
  login: (email: string, senha: string) => Promise<string | null>
  updateTenantDisplayName: (tenantId: string, name: string) => void
  markOnboardingCompleted: () => void
  logout: () => Promise<void>
  expire: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isBootstrapped: false,
  isLoading: false,
  error: null,

  bootstrap: () => {
    const session = restoreSession()
    set({ user: session?.user ?? null, isBootstrapped: true })
  },

  login: async (email, senha) => {
    set({ isLoading: true, error: null })
    try {
      const session = await authService.login(email, senha)
      queryClient.clear()
      set({ user: session.user, isLoading: false, error: null })
      return routeForRole(session.user.papel, session.user.onboarding_completed ?? true)
    } catch (error) {
      const responseStatus = error && typeof error === 'object' && 'response' in error
        ? (error.response as { status?: unknown } | undefined)?.status
        : undefined
      const message = responseStatus === 401
        ? 'E-mail ou senha inválidos. Confira os dados e tente novamente.'
        : extractErrorMessage(error)
      set({ isLoading: false, error: message })
      return null
    }
  },

  updateTenantDisplayName: (tenantId, name) => {
    const user = get().user
    const tenantName = name.trim()
    if (!user || user.tenant_id !== tenantId || !tenantName) return
    const updated = { ...user, tenant_nome: tenantName }
    saveUser(updated)
    set({ user: updated })
  },

  markOnboardingCompleted: () => {
    const user = get().user
    if (!user) return
    const updated = { ...user, onboarding_completed: true }
    saveUser(updated)
    set({ user: updated })
  },

  logout: async () => {
    set({ isLoading: true })
    await authService.logout()
    clearSession()
    queryClient.clear()
    set({ user: null, isLoading: false, error: null })
  },

  expire: () => {
    clearSession()
    queryClient.clear()
    set({ user: null, error: 'Sessão expirada. Faça login novamente.' })
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener(unauthorizedEventName, () => {
    useAuthStore.getState().expire()
  })
  window.addEventListener(authUserUpdatedEventName, () => {
    const user = getSavedUser()
    if (user) useAuthStore.setState({ user })
  })
}

export function useCurrentUser(): User | null {
  return useAuthStore((state) => state.user)
}

export function bootstrapAuthOnce(): void {
  const state = useAuthStore.getState()
  if (!state.isBootstrapped) state.bootstrap()
}
