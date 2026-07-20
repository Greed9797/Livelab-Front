import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { bootstrapAuthOnce } from './stores/auth-store'
import { ToastProvider } from './components/ui/Toast'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { captureError, initSentry } from './utils/sentry'
import './styles/index.css'

// Primeiro de tudo: instala os handlers globais de erro. Sem VITE_SENTRY_DSN
// isto não faz nada e o app segue normal (ver src/utils/sentry.ts).
initSentry()

// Restaura sessão persistida (token + user) antes do render — evita cair no
// login ao recarregar/reabrir com sessão válida.
try {
  bootstrapAuthOnce()
} catch (error) {
  // Storage corrompido não pode virar tela branca antes do primeiro render:
  // reporta e segue sem sessão (o guard manda pro /login).
  captureError(error, { stage: 'bootstrapAuthOnce' })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Lucas: app lento (10s/page). Cache mais agressivo reduz refetches
      // sem comprometer real-time (queries críticas usam refetchInterval).
      staleTime: 5 * 60_000,        // 30s → 5min
      gcTime: 10 * 60_000,          // cache em memória 10min após unmount
      refetchOnWindowFocus: false,  // trocar tab não dispara N requests
      refetchOnReconnect: 'always', // mantém comportamento em reconexão
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/*
      ErrorBoundary no topo da árvore: pega também os erros de render que
      acontecem FORA do router (providers, ToastProvider, App). O AppRouter tem
      o seu próprio boundary aninhado, que continua sendo o primeiro a pegar
      erro de página. Fallback em pt_BR + retry, nunca tela branca.
    */}
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
