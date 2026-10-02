/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** DSN do Sentry. Ausente/vazia = Sentry desligado (app funciona igual). */
  readonly VITE_SENTRY_DSN?: string
  /** Lista de Clientes via /v1/cadastros. Só 'true' liga; ausente/'false'/'0' = junção /clientes + /marcas. */
  readonly VITE_CADASTRO_UNIFICADO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __APP_VERSION__: string
