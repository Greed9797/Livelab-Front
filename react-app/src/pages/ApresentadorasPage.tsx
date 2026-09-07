import { Navigate } from 'react-router-dom'

// Apresentadoras virou parte de Usuários e equipe (decisão 2026-05-25).
// O painel canônico concentra identidade, login, status e comissão; o detalhe
// individual permanece apenas como histórico operacional e financeiro.
export function ApresentadorasPage() {
  return <Navigate to="/configuracoes?tab=usuarios" replace />
}
