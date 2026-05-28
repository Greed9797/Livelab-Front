import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { bootstrapAuthOnce } from './stores/auth-store'
import { ToastProvider } from './components/ui/Toast'
import './styles/index.css'

// Restaura sessão persistida (token + user) antes do render — evita cair no
// login ao recarregar/reabrir com sessão válida.
bootstrapAuthOnce()

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
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
