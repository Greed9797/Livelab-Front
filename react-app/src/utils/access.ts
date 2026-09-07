import {
  BookOpen,
  Building2,
  ChartNoAxesCombined,
  ChartSpline,
  CircleDollarSign,
  Home,
  LayoutDashboard,
  Presentation,
  Settings,
  Store,
  Trophy,
  UsersRound,
  CalendarDays,
  MonitorPlay,
} from 'lucide-react'
import type { OfficialRole, Role, User } from '../types/models'

export interface MenuItem {
  label: string
  path: string
  icon: typeof Home
  roles: Role[]
  placement?: 'footer'
}

/**
 * Master roles - system-level access
 * Only includes the official franqueador_master
 */
export const masterRoles: Role[] = [
  'franqueador_master',
  // gerente_regional (Tier 4, migration 070 do backend) também é aceito em JWT e
  // normalizado para franqueador_master, mas fica FORA desta lista: ele enxerga
  // só um subset de tenants (auth.js injeta allowedTenantIds), então liberar as
  // rotas /master inteiras seria escopo demais até a Fase C multi-tenant.
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

/**
 * Papéis que podem ESCREVER (criar/editar/excluir) na UI operacional e financeira.
 * Espelha o que o backend aceita — os demais papéis veem a página em leitura e não
 * devem renderizar botões de escrita.
 *
 * IMPORTANTE: não derivar de normalizeRole(). Ela colapsa gerente_comercial,
 * financeiro_readonly, auditor, suporte, marketing e comercial_readonly em
 * 'operacional', ou seja, daria escrita exatamente aos 6 papéis read-only.
 * Por isso a checagem é feita no papel cru, igual ao writeRoles de BoletosPage.
 */
// gerente_regional fica FORA daqui de propósito. O papel é real no banco
// (migration 070, regional_managers.js), mas em src/config/role_groups.js do
// backend ele não entra em nenhum grupo WRITE_* — está marcado como Tier 4 /
// Fase C. Incluí-lo renderizaria botões de escrita que o backend responde 403,
// que é exatamente o problema que este writeRoles existe para resolver.
export const writeRoles: Role[] = [
  'franqueador_master',
  'franqueado',
  'gerente',
  'operacional',
  'financeiro',
  'produtor_live',
  'apresentador',
  'apresentadora',
]

export function canWrite(user: User | null): boolean {
  return Boolean(user && writeRoles.includes(user.papel))
}

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
  if (normalized === 'apresentador') return '/minha-home'
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

// Menu lateral — simplificação operacional 2026-09-05 (Lucas):
// Clientes, Agenda e Lives têm acesso direto; regras ficam dentro de Financeiro.
// Ranking virou atalho próprio por decisão do handoff operacional do PDF.
// Master continua com seus próprios atalhos. Cliente tem o painel separado dele.
export const menuItems: MenuItem[] = [
  { label: 'Home', path: '/', icon: Home, roles: internalRoles },
  { label: 'Master', path: '/master', icon: LayoutDashboard, roles: masterRoles },
  { label: 'Unidades', path: '/master/unidades', icon: Building2, roles: masterRoles },
  { label: 'Consolidado', path: '/master/consolidado', icon: ChartNoAxesCombined, roles: masterRoles },
  { label: 'Franqueados', path: '/master/franqueados', icon: Store, roles: ['franqueador_master'] },
  { label: 'Clientes', path: '/clientes', icon: UsersRound, roles: [...masterRoles, ...commercialRoles] },
  { label: 'Agenda', path: '/agenda', icon: CalendarDays, roles: cabineRoles.filter((role) => role !== 'apresentador' && role !== 'apresentadora') },
  { label: 'Lives', path: '/lives', icon: MonitorPlay, roles: cabineRoles.filter((role) => role !== 'apresentador' && role !== 'apresentadora') },
  { label: 'Meu desempenho', path: '/minha-home', icon: Home, roles: ['apresentador', 'apresentadora'] },
  { label: 'Minhas lives', path: '/minhas-lives', icon: MonitorPlay, roles: ['apresentador', 'apresentadora'] },
  // Analytics standalone — mesmos roles da rota /analytics-dashboard no AppRouter.
  { label: 'Analytics', path: '/analytics-dashboard', icon: ChartSpline, roles: [...masterRoles, ...financeRoles, ...commercialRoles] },
  { label: 'Financeiro', path: '/financeiro', icon: CircleDollarSign, roles: financeRoles },
  // Master mantém apenas o acesso já existente às regras, sem ganhar consultas financeiras.
  { label: 'Financeiro', path: '/financeiro/comissoes/regras', icon: CircleDollarSign, roles: ['franqueador_master'] },
  { label: 'Base', path: '/conhecimento', icon: BookOpen, roles: [...masterRoles, ...internalRoles, 'apresentador', 'apresentadora'] },
  { label: 'Ranking', path: '/ranking/apresentadoras', icon: Trophy, roles: opsRoles },
  // Configurações unificada: todos os papéis internos/ops/cabine + apresentador alcançam.
  // Admins (franqueador_master/franqueado) veem o painel completo; os demais só a seção de conta/segurança.
  // Cliente parceiro tem o próprio atalho separado ('/cliente/configuracoes').
  { label: 'Configurações', path: '/configuracoes', icon: Settings, roles: configuracoesRoles, placement: 'footer' },
  // Cliente parceiro: Home, Conteúdo, Financeiro, Configurações.
  { label: 'Home', path: '/cliente', icon: Home, roles: clienteRoles },
  { label: 'Conteúdo', path: '/cliente/conteudo', icon: Presentation, roles: clienteRoles },
  { label: 'Financeiro', path: '/cliente/financeiro', icon: CircleDollarSign, roles: clienteRoles },
  { label: 'Configurações', path: '/cliente/configuracoes', icon: Settings, roles: clienteRoles, placement: 'footer' },
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

    // Papel real do backend (migration 070), ainda sem UI multi-tenant própria.
    gerente_regional: 'Gerente Regional',

    // Legacy roles (marked as deprecated)
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
