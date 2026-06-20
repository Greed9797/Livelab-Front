import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './States'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  message: string
  isChunkError: boolean
}

const INITIAL_STATE: ErrorBoundaryState = { hasError: false, message: '', isChunkError: false }

// Flag de sessão: garante no máximo 1 auto-reload por aba, evitando loop caso o
// erro persista na versão nova (aí cai no fallback manual).
const AUTO_RELOAD_FLAG = '__ll_eb_auto_reloaded'

// Recarrega com cache-bust: a query nova muda a chave de cache do documento,
// forçando o browser a buscar o index.html atual da rede (em vez de servir um
// index velho em cache que aponta para chunks/código antigos).
function hardReloadCacheBust(): void {
  const url = new URL(window.location.href)
  url.searchParams.set('_v', String(Date.now()))
  window.location.replace(url.toString())
}

// Captura erros de render em qualquer rota (incl. falha ao baixar chunk lazy
// após um deploy novo). Sem isto, um throw no render derruba o app inteiro
// para uma tela branca. Reutiliza o ErrorState do design system.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = INITIAL_STATE

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const raw = error instanceof Error ? error.message : ''
    const isChunkError = /chunk|dynamically imported module|failed to fetch|import\(\)/i.test(raw)
    return {
      hasError: true,
      isChunkError,
      message: isChunkError
        ? 'Falha ao carregar parte do app. Uma nova versão pode ter sido publicada.'
        : 'Algo deu errado ao exibir esta tela.',
    }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info)
    }
    // Auto-recuperação: um crash de render quase sempre é bundle/index antigo em
    // cache após um deploy novo. Recarrega uma única vez (cache-busted) para puxar
    // a versão atual — sem o usuário precisar limpar cache. O guard de sessão evita
    // loop: se o erro persistir na versão nova, mostra o fallback manual.
    try {
      if (import.meta.env.DEV) return
      if (!sessionStorage.getItem(AUTO_RELOAD_FLAG)) {
        sessionStorage.setItem(AUTO_RELOAD_FLAG, '1')
        hardReloadCacheBust()
      }
    } catch {
      // sessionStorage indisponível (modo restrito) — mantém o fallback manual.
    }
  }

  private handleRetry = (): void => {
    // Recarrega sempre com cache-bust: crash de render ou falha de chunk quase
    // sempre é versão antiga em cache. setState puro re-renderiza e re-quebra,
    // então força buscar o index/assets atuais da rede.
    hardReloadCacheBust()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <ErrorState message={this.state.message} onRetry={this.handleRetry} />
        </div>
      )
    }
    return this.props.children
  }
}
