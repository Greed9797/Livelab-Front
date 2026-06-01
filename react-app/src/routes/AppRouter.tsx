import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { Shell } from '../components/layout/Shell'
import { cabineRoles, clienteRoles, commercialRoles, financeRoles, internalRoles, masterRoles, opsRoles } from '../utils/access'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '../pages/LoginPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { PublicRankingPage } from '../pages/PublicRankingPage'
import { NotFoundPage } from '../pages/NotFoundPage'

const DashboardPage = lazy(() => import('../pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const MasterDashboardPage = lazy(() => import('../pages/MasterDashboardPage').then(m => ({ default: m.MasterDashboardPage })))
const MasterUnitsPage = lazy(() => import('../pages/MasterUnitsPage').then(m => ({ default: m.MasterUnitsPage })))
const MasterConsolidatedPage = lazy(() => import('../pages/MasterConsolidatedPage').then(m => ({ default: m.MasterConsolidatedPage })))
const ComercialPage = lazy(() => import('../pages/ComercialPage').then(m => ({ default: m.ComercialPage })))
const ClienteDashboardPage = lazy(() => import('../pages/ClienteDashboardPage').then(m => ({ default: m.ClienteDashboardPage })))
const ClienteLivesPage = lazy(() => import('../pages/ClienteLivesPage').then(m => ({ default: m.ClienteLivesPage })))
const ConteudoPage = lazy(() => import('../pages/ConteudoPage').then(m => ({ default: m.ConteudoPage })))
const FinanceiroPage = lazy(() => import('../pages/FinanceiroPage').then(m => ({ default: m.FinanceiroPage })))
const ComissoesConfigPage = lazy(() => import('../pages/ComissoesConfigPage').then(m => ({ default: m.ComissoesConfigPage })))
const SolicitacoesPage = lazy(() => import('../pages/SolicitacoesPage').then(m => ({ default: m.SolicitacoesPage })))
const ApresentadorasPage = lazy(() => import('../pages/ApresentadorasPage').then(m => ({ default: m.ApresentadorasPage })))
const MetasPage = lazy(() => import('../pages/MetasPage').then(m => ({ default: m.MetasPage })))
const RankingApresentadorasPage = lazy(() => import('../pages/RankingApresentadorasPage').then(m => ({ default: m.RankingApresentadorasPage })))
const RankingMarcasPage = lazy(() => import('../pages/RankingMarcasPage').then(m => ({ default: m.RankingMarcasPage })))
const ConfiguracoesPage = lazy(() => import('../pages/ConfiguracoesPage').then(m => ({ default: m.ConfiguracoesPage })))
const KnowledgePage = lazy(() => import('../pages/KnowledgePage').then(m => ({ default: m.KnowledgePage })))
const OnboardingPage = lazy(() => import('../pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })))

const PageFallback = () => (
  <div className="flex h-full min-h-[200px] items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
  </div>
)

export function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/ranking" element={<PublicRankingPage />} />

        <Route element={<ProtectedRoute allowedRoles={clienteRoles} />}>
          <Route path="/onboarding" element={<Suspense fallback={<PageFallback />}><OnboardingPage /></Suspense>} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route element={<Suspense fallback={<PageFallback />}><ProtectedRoute allowedRoles={internalRoles} fallback="/master" /></Suspense>}>
              <Route index element={<DashboardPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={masterRoles} />}>
              <Route path="/master" element={<Suspense fallback={<PageFallback />}><MasterDashboardPage /></Suspense>} />
              <Route path="/master/unidades" element={<Suspense fallback={<PageFallback />}><MasterUnitsPage /></Suspense>} />
              <Route path="/master/consolidado" element={<Suspense fallback={<PageFallback />}><MasterConsolidatedPage /></Suspense>} />
              <Route path="/master/franqueados" element={<Suspense fallback={<PageFallback />}><MasterUnitsPage title="Franqueados" mode="franqueados" /></Suspense>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...masterRoles, ...commercialRoles]} />}>
              <Route path="/comercial" element={<Suspense fallback={<PageFallback />}><ComercialPage /></Suspense>} />
              <Route path="/master/crm" element={<Navigate to="/comercial" replace />} />
              <Route path="/leads" element={<Navigate to="/comercial" replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['cliente_parceiro']} />}>
              <Route path="/cliente" element={<Suspense fallback={<PageFallback />}><ClienteDashboardPage /></Suspense>} />
              <Route path="/cliente/dashboard" element={<Navigate to="/cliente" replace />} />
              <Route path="/cliente/lives" element={<Suspense fallback={<PageFallback />}><ClienteLivesPage /></Suspense>} />
              <Route path="/cliente/agenda" element={<Navigate to="/cliente" replace />} />
              <Route path="/cliente/configuracoes" element={<Suspense fallback={<PageFallback />}><ConfiguracoesPage clienteMode /></Suspense>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...cabineRoles, 'apresentador']} />}>
              <Route path="/conteudo" element={<Suspense fallback={<PageFallback />}><ConteudoPage /></Suspense>} />
              <Route path="/cabines" element={<Navigate to="/conteudo" replace />} />
              {/* /agendamentos agora redireciona para /conteudo — solicitações foi depreciada */}
              <Route path="/agendamentos" element={<Navigate to="/conteudo" replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={opsRoles} />}>
              {/* /solicitacoes mantida apenas para acesso histórico — não é mais fluxo principal */}
              <Route path="/solicitacoes" element={<Suspense fallback={<PageFallback />}><SolicitacoesPage /></Suspense>} />
              <Route path="/apresentadoras" element={<Suspense fallback={<PageFallback />}><ApresentadorasPage /></Suspense>} />
              <Route path="/metas" element={<Suspense fallback={<PageFallback />}><MetasPage /></Suspense>} />
              <Route path="/ranking/apresentadoras" element={<Suspense fallback={<PageFallback />}><RankingApresentadorasPage /></Suspense>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...financeRoles, ...commercialRoles]} />}>
              <Route path="/analytics-dashboard" element={<Navigate to="/conteudo?tab=analytics" replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={financeRoles} />}>
              <Route path="/financeiro" element={<Suspense fallback={<PageFallback />}><FinanceiroPage /></Suspense>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={financeRoles} />}>
              <Route path="/boletos" element={<Navigate to="/financeiro?tab=boletos" replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['franqueador_master', 'franqueado']} />}>
              <Route path="/comissoes/pendentes" element={<Navigate to="/financeiro?tab=comissoes" replace />} />
              <Route path="/comissoes/config" element={<Suspense fallback={<PageFallback />}><ComissoesConfigPage /></Suspense>} />
              <Route path="/ranking-apresentadoras" element={<Suspense fallback={<PageFallback />}><RankingApresentadorasPage /></Suspense>} />
              <Route path="/ranking-marcas" element={<Suspense fallback={<PageFallback />}><RankingMarcasPage /></Suspense>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['franqueador_master', 'franqueado']} />}>
              <Route path="/lives/manual" element={<Navigate to="/conteudo?tab=lives" replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['franqueador_master', 'admin_master', 'franqueado', 'gerente']} />}>
              <Route path="/configuracoes" element={<Suspense fallback={<PageFallback />}><ConfiguracoesPage /></Suspense>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...masterRoles, ...internalRoles, 'apresentador', 'apresentadora']} />}>
              <Route path="/conhecimento" element={<Suspense fallback={<PageFallback />}><KnowledgePage /></Suspense>} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
