import {
  BookOpen,
  Building2,
  ChartNoAxesCombined,
  ChartSpline,
  CircleDollarSign,
  Home,
  LayoutDashboard,
  Percent,
  Presentation,
  Settings,
  Store,
  Trophy,
  Workflow,
} from 'lucide-react'
import type { OfficialRole, Role, User } from '../types/models'

export interface MenuItem {
  label: string
  path: string
  icon: typeof Home
  roles: Role[]
}

/**
 * Master roles - system-level access
 * Only includes the official franqueador_master
 */
export const masterRoles: Role[] = [
  'franqueador_master',
  // Legacy roles mapped to official: admin_master, gerente_regional
  // Still accepted in JWTs but normalized to franqueador_master
]

/**
 * Internal roles - franchise/operational access
 * Includes official roles: franqueado, operacional
 * Legacy roles are kept for JWT compatibility but should be normalized via normalizeRole()
 */
export const internalRoles: Role[] = [
  'franqueado',
  'operacional',
  // Legacy roles kept for backward compatibility:
  'gerente',
  'gerente_comercial',
  'financeiro',
  'financeiro_readonly',
  'auditor',
  'suporte',
  'produtor_live',
  'marketing',
  'comercial_readonly',
]

export const commercialRoles: Role[] = [
  'franqueado',
  'gerente',
  'gerente_comercial',
  'auditor',
  'suporte',
  'marketing',
  'comercial_readonly',
]

export const financeRoles: Role[] = [
  'franqueado',
  'gerente',
  'financeiro',
  'financeiro_readonly',
  'auditor',
]

export const opsRoles: Role[] = [
  'franqueado',
  'gerente',
  'operacional',
  'auditor',
  'suporte',
  'produtor_live',
  'comercial_readonly',
]

export const cabineRoles: Role[] = [
  'franqueado',
  'gerente',
  'operacional',
  'apresentador',
  'apresentadora',
  'auditor',
  'suporte',
  'produtor_live',
  'marketing',
  'comercial_readonly',
]

export const clienteRoles: Role[] = ['cliente_parceiro']

// Configurações unificada (ex-"Minha conta"): todos os papéis internos/ops/cabine
// + master + apresentador. Admins veem o painel completo; os demais só conta/segurança.
// Cliente parceiro fica de fora — usa o atalho próprio '/cliente/configuracoes'.
export const configuracoesRoles: Role[] = Array.from(new Set<Role>([
  ...masterRoles,
  ...internalRoles,
  ...opsRoles,
  ...cabineRoles,
  'apresentador',
  'apresentadora',
]))

export function normalizeRole(role: Role): OfficialRole {
  switch (role) {
    // Master role mapping
    case 'admin_master':
    case 'gerente_regional':
      return 'franqueador_master'

    // Franqueado mappings
    case 'financeiro':
      return 'franqueado'

    // Operacional mappings
    case 'gerente':
    case 'gerente_comercial':
    case 'financeiro_readonly':
    case 'auditor':
    case 'suporte':
    case 'produtor_live':
    case 'marketing':
    case 'comercial_readonly':
      return 'operacional'

    // Apresentador typo fix
    case 'apresentadora':
      return 'apresentador'

    // Already official
    case 'franqueador_master':
    case 'franqueado':
    case 'operacional':
    case 'apresentador':
    case 'cliente_parceiro':
      return role

    // Default fallback for any unknown role
    default:
      return 'cliente_parceiro'
  }
}

export function routeForRole(role?: Role, onboardingCompleted = true): string {
  if (!role) return '/login'

  const normalized = normalizeRole(role)

  if (normalized === 'franqueador_master') return '/master'
  if (normalized === 'apresentador') return '/conteudo'
  if (normalized === 'cliente_parceiro') return onboardingCompleted ? '/cliente' : '/onboarding'
  if (['franqueado', 'operacional'].includes(normalized)) return '/'

  return '/login'
}

export function hasRole(user: User | null, allowed?: Role[]): boolean {
  if (!allowed || allowed.length === 0) return Boolean(user)
  return Boolean(user && allowed.includes(user.papel))
}

export function needsClientOnboarding(user: User | null): boolean {
  // Onboarding obrigatório só bloqueia quando explicitamente habilitado por flag.
  const enabled = import.meta.env.VITE_ENABLE_CLIENT_ONBOARDING === 'true'
  return enabled && user?.papel === 'cliente_parceiro' && user.onboarding_completed === false
}

// Menu lateral — decisão 2026-05-25 (Lucas):
// Unidade: Home, Comercial, Conteúdo, Financeiro, Base, Ranking e Configurações.
// Ranking virou atalho próprio por decisão do handoff operacional do PDF.
// Master continua com seus próprios atalhos. Cliente tem o painel separado dele.
export const menuItems: MenuItem[] = [
  { label: 'Home', path: '/', icon: Home, roles: internalRoles },
  { label: 'Master', path: '/master', icon: LayoutDashboard, roles: masterRoles },
  { label: 'Unidades', path: '/master/unidades', icon: Building2, roles: masterRoles },
  { label: 'Consolidado', path: '/master/consolidado', icon: ChartNoAxesCombined, roles: masterRoles },
  { label: 'Franqueados', path: '/master/franqueados', icon: Store, roles: ['franqueador_master'] },
  { label: 'Comercial', path: '/comercial', icon: Workflow, roles: [...masterRoles, ...commercialRoles] },
  { label: 'Conteúdo', path: '/conteudo', icon: Presentation, roles: cabineRoles },
  // Analytics standalone — mesmos roles da rota /analytics-dashboard no AppRouter.
  { label: 'Analytics', path: '/analytics-dashboard', icon: ChartSpline, roles: [...masterRoles, ...financeRoles, ...commercialRoles] },
  { label: 'Financeiro', path: '/financeiro', icon: CircleDollarSign, roles: financeRoles },
  // Hub de comissões — mesmos roles da rota /comissoes/config no AppRouter.
  { label: 'Comissões', path: '/comissoes/config', icon: Percent, roles: ['franqueador_master', 'franqueado'] },
  { label: 'Base', path: '/conhecimento', icon: BookOpen, roles: [...masterRoles, ...internalRoles, 'apresentador', 'apresentadora'] },
  { label: 'Ranking', path: '/ranking/apresentadoras', icon: Trophy, roles: opsRoles },
  // Configurações unificada: todos os papéis internos/ops/cabine + apresentador alcançam.
  // Admins (franqueador_master/franqueado) veem o painel completo; os demais só a seção de conta/segurança.
  // Cliente parceiro tem o próprio atalho separado ('/cliente/configuracoes').
  { label: 'Configurações', path: '/configuracoes', icon: Settings, roles: configuracoesRoles },
  // Cliente parceiro: Home, Conteúdo, Financeiro, Configurações.
  { label: 'Home', path: '/cliente', icon: Home, roles: clienteRoles },
  { label: 'Conteúdo', path: '/cliente/conteudo', icon: Presentation, roles: clienteRoles },
  { label: 'Financeiro', path: '/cliente/financeiro', icon: CircleDollarSign, roles: clienteRoles },
  { label: 'Configurações', path: '/cliente/configuracoes', icon: Settings, roles: clienteRoles },
]

export function menuForUser(user: User | null): MenuItem[] {
  if (!user) return []
  return menuItems.filter((item) => item.roles.includes(user.papel))
}

export function roleLabel(role?: Role): string {
  const labels: Record<string, string> = {
    // Official roles
    franqueador_master: 'Franqueador Master',
    franqueado: 'Franqueado',
    operacional: 'Operacional',
    apresentador: 'Apresentador',
    cliente_parceiro: 'Cliente Parceiro',

    // Legacy roles (marked as deprecated)
    admin_master: 'Admin Master (legado)',
    gerente_regional: 'Gerente Regional (legado)',
    gerente: 'Gerente (legado)',
    gerente_comercial: 'Gerente Comercial (legado)',
    financeiro: 'Financeiro (legado)',
    financeiro_readonly: 'Financeiro Leitura (legado)',
    auditor: 'Auditor (legado)',
    suporte: 'Suporte (legado)',
    produtor_live: 'Produtor Live (legado)',
    marketing: 'Marketing (legado)',
    comercial_readonly: 'Comercial Leitura (legado)',
    apresentadora: 'Apresentadora (legado)',
  }
  return role ? labels[role] ?? role : 'Sem papel'
}
