import type { Session, User } from '../types/models'

// LGPD / Segurança — nota sobre armazenamento de JWT em localStorage:
// O access token e refresh token são persistidos em localStorage por compatibilidade
// com o fluxo atual (SPA sem BFF). Isso expõe os tokens a ataques XSS caso um
// script malicioso seja injetado na página.
//
// Tradeoff documentado:
//   - localStorage: simples, funciona em todos os browsers, sem config de servidor.
//     Risco: XSS pode ler os tokens diretamente via document.cookie/localStorage.
//   - httpOnly cookie: imune a XSS (JS não acessa), mas requer configuração de
//     Same-Site + CORS + backend BFF para emitir o cookie — mudança de arquitetura.
//
// Mitigações atuais (não eliminam o risco, apenas reduzem):
//   1. Access token de curta duração (15min via JWT_EXPIRES_IN).
//   2. token_version no banco invalida tokens comprometidos via /redefinir-senha.
//   3. (PENDENTE) O SPA ainda NÃO possui CSP próprio. O helmet protege apenas as
//      respostas da API backend — não o HTML servido pela Vercel. Adicionar CSP
//      via headers no vercel.json está pendente (reduz superfície de XSS).
//
// TODO (melhoria de segurança futura): migrar para httpOnly cookie com refresh
// rotation gerenciado pelo backend, eliminando exposição via localStorage.
const accessKey = 'livelab.react.access_token'
const refreshKey = 'livelab.react.refresh_token'
const userKey = 'livelab.react.user'
const lastEmailKey = 'livelab.react.last_email'
const rememberKey = 'livelab.react.remember'

// "Manter conectado": marcado → localStorage (persiste após fechar aba).
// Desmarcado → sessionStorage (cai ao fechar a aba). A escolha é gravada no
// próprio localStorage para o boot saber qual storage consultar.
function isRemember(): boolean {
  try {
    return window.localStorage.getItem(rememberKey) !== 'false'
  } catch {
    return true
  }
}

export function setRemember(remember: boolean): void {
  try {
    window.localStorage.setItem(rememberKey, remember ? 'true' : 'false')
  } catch {
    // ignore
  }
}

function primaryStorage(): Storage {
  return isRemember() ? window.localStorage : window.sessionStorage
}

// Lê do storage primário; se não achar, tenta o outro (cobre troca de modo).
function read(key: string): string | null {
  try {
    return primaryStorage().getItem(key)
      ?? window.localStorage.getItem(key)
      ?? window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    primaryStorage().setItem(key, value)
  } catch {
    // Storage can be unavailable in restricted browsers.
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function getAccessToken(): string | null {
  return read(accessKey)
}

export function getRefreshToken(): string | null {
  return read(refreshKey)
}

export function getSavedUser(): User | null {
  const raw = read(userKey)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    remove(userKey)
    return null
  }
}

export function saveSession(session: Session): void {
  write(accessKey, session.accessToken)
  write(refreshKey, session.refreshToken)
  write(userKey, JSON.stringify(session.user))
}

export function saveUser(user: User): void {
  write(userKey, JSON.stringify(user))
}

export function updateAccessToken(accessToken: string, refreshToken?: string): void {
  write(accessKey, accessToken)
  if (refreshToken) write(refreshKey, refreshToken)
}

export function clearSession(): void {
  remove(accessKey)
  remove(refreshKey)
  remove(userKey)
}

export function restoreSession(): Session | null {
  const accessToken = getAccessToken()
  const refreshToken = getRefreshToken()
  const user = getSavedUser()
  if (!accessToken || !refreshToken || !user) {
    clearSession()
    return null
  }
  return { accessToken, refreshToken, user }
}

export function saveLastEmail(email: string): void {
  // Email lembrado sempre em localStorage, independente de "manter conectado".
  try {
    window.localStorage.setItem(lastEmailKey, email)
  } catch {
    // ignore
  }
}

export function getLastEmail(): string {
  try {
    return window.localStorage.getItem(lastEmailKey) ?? ''
  } catch {
    return ''
  }
}
