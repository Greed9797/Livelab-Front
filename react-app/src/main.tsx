import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { bootstrapAuthOnce } from './stores/auth-store'
import { ToastProvider } from './components/ui/Toast'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { captureError, initSentry } from './utils/sentry'
import { queryClient } from './services/query-client'
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
