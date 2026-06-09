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

// Aceitar convite: define a senha via token e já autentica (backend retorna sessão).
export async function acceptInvite(token: string, nova_senha: string): Promise<Session> {
  const response = await apiPost<AuthResponse>('/auth/aceitar-convite', { token, nova_senha })
  const session: Session = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    user: response.user,
  }
  saveSession(session)
  return session
}

// Redefinir senha via token de recuperação (não autentica; usuário faz login depois).
export async function resetPassword(token: string, nova_senha: string): Promise<void> {
  await apiPost('/auth/redefinir-senha', { token, nova_senha })
}
