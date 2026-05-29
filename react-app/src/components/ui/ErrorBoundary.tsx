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
  }

  private handleRetry = (): void => {
    // Falha de chunk = assets antigos em cache; reload pega a versão nova.
    if (this.state.isChunkError) {
      window.location.reload()
      return
    }
    this.setState(INITIAL_STATE)
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
