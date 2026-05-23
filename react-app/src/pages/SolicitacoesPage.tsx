import { Navigate } from 'react-router-dom'

// Solicitações foi unificada com a agenda operacional (backend migrou
// live_requests → agenda_eventos). Esta rota redireciona pra Conteúdo → Agenda
// pra manter links antigos funcionais.
export function SolicitacoesPage() {
  return <Navigate to="/conteudo?tab=agenda" replace />
}
