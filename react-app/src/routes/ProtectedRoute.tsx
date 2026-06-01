import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Role } from '../types/models'
import { hasRole, needsClientOnboarding, routeForRole } from '../utils/access'
import { useAuthStore } from '../stores/auth-store'
import { LoadingState } from '../components/ui/States'

export function ProtectedRoute({ allowedRoles, fallback }: { allowedRoles?: Role[]; fallback?: string }) {
  const user = useAuthStore((state) => state.user)
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped)
  const location = useLocation()

  if (!isBootstrapped) return <LoadingState label="Restaurando sessão" />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (needsClientOnboarding(user) && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  if (!hasRole(user, allowedRoles)) {
    return <Navigate to={fallback ?? routeForRole(user.papel, user.onboarding_completed ?? true)} replace />
  }

  return <Outlet />
}
