import { Navigate } from 'react-router-dom'

// Metas virou aba dentro de Configurações (decisão 2026-05-25). Mantém deeplink
// funcionando e fim do "Not Found" via redirect server-side do React Router.
export function MetasPage() {
  return <Navigate to="/configuracoes?tab=metas" replace />
}
