import { Navigate } from 'react-router-dom'

// Apresentadoras virou aba dentro de Configurações (decisão 2026-05-25).
// O conteúdo de edição/listagem de apresentadoras + escada de comissão fica
// em /configuracoes?tab=apresentadoras (single source via SettingsUsuariosPanel).
export function ApresentadorasPage() {
  return <Navigate to="/configuracoes?tab=apresentadoras" replace />
}
