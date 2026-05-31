import type { AuthResponse, Session } from '../types/models'
import { apiPost } from './api'
import { saveLastEmail, saveSession } from './auth-storage'

export async function login(email: string, senha: string): Promise<Session> {
  const response = await apiPost<AuthResponse>('/auth/login', { email, senha })
  const session: Session = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    user: response.user,
  }
  saveSession(session)
  saveLastEmail(email)
  return session
}

export async function logout(): Promise<void> {
  try {
    await apiPost('/auth/logout')
  } catch {
    // Local logout remains valid even when the backend is offline.
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiPost('/auth/esqueci-senha', { email })
}
