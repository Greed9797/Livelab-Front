import * as Sentry from '@sentry/react'

/**
 * Sentry do front — opt-in por env.
 *
 * Sem `VITE_SENTRY_DSN` o SDK NUNCA é inicializado: `initSentry()` sai no
 * primeiro if, `captureError()` vira no-op e `flushSentry()` resolve na hora.
 * Nada de warning em loop no console de dev, nada de request de rede, nada
 * de crash — o app funciona exatamente como antes.
 *
 * Privacidade: nenhum PII sai daqui. `sendDefaultPii: false` já corta IP e
 * cookies; `beforeSend`/`beforeBreadcrumb` removem `event.user`, headers de
 * autenticação e querystrings com token/e-mail/senha.
 */

// Chaves de querystring que nunca podem sair do browser.
const SENSITIVE_QUERY_KEYS = [
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'jwt',
  'auth',
  'authorization',
  'email',
  'senha',
  'password',
  'code',
]

let enabled = false

/** Substitui o valor de qualquer query param sensível por [Filtered]. */
export function scrubUrl(raw: string): string {
  if (!raw.includes('?')) return raw
  const [base, query] = raw.split('?')
  const params = query.split('&').map((pair) => {
    const key = pair.split('=')[0]
    return SENSITIVE_QUERY_KEYS.includes(key.toLowerCase()) ? `${key}=[Filtered]` : pair
  })
  return `${base}?${params.join('&')}`
}

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()
  // Sem DSN → Sentry desligado. Este é o caminho normal em dev e em qualquer
  // ambiente que não configurou a env.
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : undefined,
    // Sem PII: não envia IP, cookies nem dados de usuário.
    sendDefaultPii: false,
    // Só erros. Performance/tracing e session replay ficam desligados —
    // replay captura tela do usuário, o que seria PII por definição.
    tracesSampleRate: 0,

    beforeSend(event) {
      // Nunca identificar o usuário (id/e-mail/ip).
      delete event.user

      if (event.request) {
        delete event.request.cookies
        delete event.request.headers
        delete event.request.data
        if (event.request.url) event.request.url = scrubUrl(event.request.url)
        if (event.request.query_string) event.request.query_string = '[Filtered]'
      }

      return event
    },

    beforeBreadcrumb(breadcrumb) {
      // Breadcrumbs de console podem carregar payload de resposta da API.
      if (breadcrumb.category === 'console') return null

      if (typeof breadcrumb.data?.url === 'string') {
        breadcrumb.data.url = scrubUrl(breadcrumb.data.url)
      }
      if (typeof breadcrumb.data?.from === 'string') {
        breadcrumb.data.from = scrubUrl(breadcrumb.data.from)
      }
      if (typeof breadcrumb.data?.to === 'string') {
        breadcrumb.data.to = scrubUrl(breadcrumb.data.to)
      }

      return breadcrumb
    },
  })

  enabled = true
}

/** Reporta um erro. No-op quando o Sentry está desligado. */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}

/**
 * Espera o envio pendente terminar. Resolve na hora quando desligado.
 *
 * Necessário antes de `location.reload()`: o transporte do Sentry é assíncrono
 * e um reload imediato mataria justamente o evento de chunk error que a gente
 * mais quer ver em produção.
 */
export function flushSentry(timeoutMs = 1500): Promise<boolean> {
  if (!enabled) return Promise.resolve(true)
  return Sentry.flush(timeoutMs).catch(() => false)
}
