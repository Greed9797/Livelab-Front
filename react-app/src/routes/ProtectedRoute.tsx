import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Role } from '../types/models'
import { hasRole, needsClientOnboarding, routeForRole } from '../utils/access'
import { useAuthStore } from '../stores/auth-store'
import { LoadingState } from '../components/ui/States'

const clientPortalPaths = new Set(['/cliente', '/cliente/dashboard', '/cliente/conteudo', '/cliente/lives', '/cliente/configuracoes'])

export function ProtectedRoute({ allowedRoles, fallback }: { allowedRoles?: Role[]; fallback?: string }) {
  const user = useAuthStore((state) => state.user)
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped)
  const location = useLocation()

  if (!isBootstrapped) return <LoadingState label="Restaurando sessão" />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  // Cliente parceiro é uma superfície isolada: bloquear aqui impede que uma
  // rota autenticada futura monte consultas internas antes do guard específico.
  if (user.papel === 'cliente_parceiro' && !clientPortalPaths.has(location.pathname)) {
    return <Navigate to="/cliente" replace />
  }
  // O portal cliente desta versão não tem onboarding obrigatório; a flag antiga
  // continua disponível para o fluxo administrativo, sem interceptar /cliente.
  if (needsClientOnboarding(user) && user.papel !== 'cliente_parceiro' && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  if (!hasRole(user, allowedRoles)) {
    return <Navigate to={fallback ?? routeForRole(user.papel, user.onboarding_completed ?? true)} replace />
  }

  return <Outlet />
}
