import { create } from 'zustand'
import type { User } from '../types/models'
import { routeForRole } from '../utils/access'
import { clearSession, restoreSession, saveUser } from '../services/auth-storage'
import { extractErrorMessage, unauthorizedEventName } from '../services/api'
import * as authService from '../services/auth'

interface AuthState {
  user: User | null
  isBootstrapped: boolean
  isLoading: boolean
  error: string | null
  bootstrap: () => void
  login: (email: string, senha: string) => Promise<string | null>
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
      set({ user: session.user, isLoading: false, error: null })
      return routeForRole(session.user.papel, session.user.onboarding_completed ?? true)
    } catch (error) {
      const message = extractErrorMessage(error)
      set({ isLoading: false, error: message })
      return null
    }
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
    set({ user: null, isLoading: false, error: null })
  },

  expire: () => {
    clearSession()
    set({ user: null, error: 'Sessão expirada. Faça login novamente.' })
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener(unauthorizedEventName, () => {
    useAuthStore.getState().expire()
  })
}

export function useCurrentUser(): User | null {
  return useAuthStore((state) => state.user)
}

export function useLogout(): () => Promise<void> {
  return useAuthStore((state) => state.logout)
}

export function bootstrapAuthOnce(): void {
  const state = useAuthStore.getState()
  if (!state.isBootstrapped) state.bootstrap()
}
