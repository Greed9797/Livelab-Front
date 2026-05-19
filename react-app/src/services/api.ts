import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { clearSession, getAccessToken, getRefreshToken, updateAccessToken } from './auth-storage'

export const unauthorizedEventName = 'livelab:unauthorized'

function resolveBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim() || 'http://127.0.0.1:3001/v1'
  if (raw.startsWith('/')) return raw.replace(/\/+$/, '') || '/'

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('VITE_API_URL inválida. Use uma URL absoluta ou um caminho relativo, ex: https://api.exemplo.com/v1 ou /v1')
  }

  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (import.meta.env.PROD && url.protocol !== 'https:' && !isLocal) {
    throw new Error('VITE_API_URL deve usar HTTPS em produção.')
  }

  return raw.replace(/\/+$/, '')
}

export const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

const refreshClient = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

let refreshPromise: Promise<string | null> | null = null

function isAuthPath(path = ''): boolean {
  return path.endsWith('/auth/login') || path.endsWith('/auth/refresh') || path.endsWith('/auth/logout')
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return null
    try {
      const response = await refreshClient.post('/auth/refresh', {
        refresh_token: refreshToken,
      })
      const accessToken = response.data?.access_token as string | undefined
      const rotatedRefreshToken = response.data?.refresh_token as string | undefined
      if (!accessToken) return null
      updateAccessToken(accessToken, rotatedRefreshToken)
      return accessToken
    } catch {
      return null
    }
  })()

  refreshPromise.finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const config = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined
    const path = config?.url ?? ''

    if (status === 401 && config && !config._retried && !isAuthPath(path)) {
      const token = await refreshAccessToken()
      if (token) {
        config._retried = true
        config.headers = { ...(config.headers ?? {}), Authorization: `Bearer ${token}` }
        return api.request(config)
      }

      clearSession()
      window.dispatchEvent(new CustomEvent(unauthorizedEventName))
    }

    return Promise.reject(error)
  },
)

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (data && typeof data === 'object') {
      const maybe = (data as Record<string, unknown>).error ?? (data as Record<string, unknown>).message
      if (typeof maybe === 'string' && maybe.trim()) return maybe
    }
    if (error.response?.status === 401) return 'Sessão expirada. Faça login novamente.'
    if ((error.response?.status ?? 0) >= 500) return 'O servidor está indisponível no momento.'
    if (error.code === 'ECONNABORTED') return 'Tempo limite excedido ao comunicar com o servidor.'
    if (error.message === 'Network Error') return 'Não foi possível conectar ao servidor.'
  }
  if (error instanceof Error && error.message) return error.message
  return 'Não foi possível concluir a operação agora.'
}

export async function apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await api.get<T>(path, { params })
  return response.data
}

export async function apiPost<T>(path: string, data?: unknown): Promise<T> {
  const response = await api.post<T>(path, data)
  return response.data
}

export async function apiPatch<T>(path: string, data?: unknown): Promise<T> {
  const response = await api.patch<T>(path, data)
  return response.data
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await api.delete<T>(path)
  return response.data
}

export async function apiPut<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
  const response = await api.put<T>(path, body, { params })
  return response.data
}

export function apiBaseUrl(): string {
  return api.defaults.baseURL ?? ''
}
