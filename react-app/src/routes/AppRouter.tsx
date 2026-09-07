import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Route, RouterProvider, Routes } from 'react-router-dom'
import { LoadingState } from '../components/ui/States'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { UnsavedChangesProvider } from '../components/ui/UnsavedChangesProvider'
import { Shell } from '../components/layout/Shell'
import { cabineRoles, clienteRoles, commercialRoles, configuracoesRoles, financeRoles, internalRoles, masterRoles, opsRoles } from '../utils/access'
import { ProtectedRoute } from './ProtectedRoute'
import { LegacyPageRedirect } from './LegacyPageRedirect'
import { LoginPage } from '../pages/LoginPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { AceitarConvitePage } from '../pages/AceitarConvitePage'
import { RedefinirSenhaPage } from '../pages/RedefinirSenhaPage'
import { PublicRankingPage } from '../pages/PublicRankingPage'
import { NotFoundPage } from '../pages/NotFoundPage'

const DashboardPage = lazy(() => import('../pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const MasterDashboardPage = lazy(() => import('../pages/MasterDashboardPage').then(m => ({ default: m.MasterDashboardPage })))
const MasterUnitsPage = lazy(() => import('../pages/MasterUnitsPage').then(m => ({ default: m.MasterUnitsPage })))
const MasterConsolidatedPage = lazy(() => import('../pages/MasterConsolidatedPage').then(m => ({ default: m.MasterConsolidatedPage })))
const ComercialPage = lazy(() => import('../pages/ComercialPage').then(m => ({ default: m.ComercialPage })))
const ClienteDashboardPage = lazy(() => import('../pages/ClienteDashboardPage').then(m => ({ default: m.ClienteDashboardPage })))
const ClienteConteudoPage = lazy(() => import('../pages/ClienteConteudoPage').then(m => ({ default: m.ClienteConteudoPage })))
const ClienteFinanceiroPage = lazy(() => import('../pages/ClienteFinanceiroPage').then(m => ({ default: m.ClienteFinanceiroPage })))
const ConteudoPage = lazy(() => import('../pages/ConteudoPage').then(m => ({ default: m.ConteudoPage })))
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const FinanceiroPage = lazy(() => import('../pages/FinanceiroPage').then(m => ({ default: m.FinanceiroPage })))
const ComissoesConfigPage = lazy(() => import('../pages/ComissoesConfigPage').then(m => ({ default: m.ComissoesConfigPage })))
const ApresentadorasPage = lazy(() => import('../pages/ApresentadorasPage').then(m => ({ default: m.ApresentadorasPage })))
const ApresentadoraDetailPage = lazy(() => import('../pages/ApresentadoraDetailPage').then(m => ({ default: m.ApresentadoraDetailPage })))
const MetasPage = lazy(() => import('../pages/MetasPage').then(m => ({ default: m.MetasPage })))
const RankingApresentadorasPage = lazy(() => import('../pages/RankingApresentadorasPage').then(m => ({ default: m.RankingApresentadorasPage })))
const RankingMarcasPage = lazy(() => import('../pages/RankingMarcasPage').then(m => ({ default: m.RankingMarcasPage })))
const ConfiguracoesPage = lazy(() => import('../pages/ConfiguracoesPage').then(m => ({ default: m.ConfiguracoesPage })))
const KnowledgePage = lazy(() => import('../pages/KnowledgePage').then(m => ({ default: m.KnowledgePage })))
const OnboardingPage = lazy(() => import('../pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })))
const PresenterPortalHomePage = lazy(() => import('../pages/PresenterPortalHomePage'))
const PresenterPortalLivesPage = lazy(() => import('../pages/PresenterPortalLivesPage'))

const PageFallback = () => <LoadingState label="Carregando página" />

function RouterApplication() {
  return (
    <ErrorBoundary>
      <UnsavedChangesProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/aceitar-convite" element={<AceitarConvitePage />} />
        <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/ranking" element={<PublicRankingPage />} />
        </Route>

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
              <Route path="/clientes" element={<Suspense fallback={<PageFallback />}><ComercialPage /></Suspense>} />
              <Route path="/comercial" element={<LegacyPageRedirect to="/clientes" />} />
              <Route path="/master/crm" element={<LegacyPageRedirect to="/clientes" />} />
              <Route path="/leads" element={<LegacyPageRedirect to="/clientes" />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['cliente_parceiro']} />}>
              <Route path="/cliente" element={<Suspense fallback={<PageFallback />}><ClienteDashboardPage /></Suspense>} />
              <Route path="/cliente/dashboard" element={<Navigate to="/cliente" replace />} />
              <Route path="/cliente/conteudo" element={<Suspense fallback={<PageFallback />}><ClienteConteudoPage /></Suspense>} />
              <Route path="/cliente/lives" element={<Navigate to="/cliente/conteudo" replace />} />
              <Route path="/cliente/financeiro" element={<Suspense fallback={<PageFallback />}><ClienteFinanceiroPage /></Suspense>} />
              <Route path="/cliente/agenda" element={<Navigate to="/cliente" replace />} />
              <Route path="/cliente/configuracoes" element={<Suspense fallback={<PageFallback />}><ConfiguracoesPage clienteMode /></Suspense>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={cabineRoles.filter((role) => role !== 'apresentador' && role !== 'apresentadora')} />}>
              <Route path="/agenda" element={<Suspense fallback={<PageFallback />}><ConteudoPage key="agenda" view="agenda" /></Suspense>} />
              <Route path="/lives" element={<Suspense fallback={<PageFallback />}><ConteudoPage key="lives" view="lives" /></Suspense>} />
              <Route path="/conteudo" element={<LegacyPageRedirect to="conteudo" />} />
              <Route path="/cabines" element={<LegacyPageRedirect to="/agenda" />} />
              {/* Compatibilidade dos atalhos antigos de agenda. */}
              <Route path="/agendamentos" element={<LegacyPageRedirect to="/agenda" />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['apresentador', 'apresentadora']} />}>
              <Route path="/minha-home" element={<Suspense fallback={<PageFallback />}><PresenterPortalHomePage /></Suspense>} />
              <Route path="/minhas-lives" element={<Suspense fallback={<PageFallback />}><PresenterPortalLivesPage /></Suspense>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={opsRoles} />}>
              <Route path="/apresentadoras" element={<Suspense fallback={<PageFallback />}><ApresentadorasPage /></Suspense>} />
              <Route path="/metas" element={<Suspense fallback={<PageFallback />}><MetasPage /></Suspense>} />
              <Route path="/ranking/apresentadoras" element={<Suspense fallback={<PageFallback />}><RankingApresentadorasPage /></Suspense>} />
              <Route path="/ranking/marcas" element={<Suspense fallback={<PageFallback />}><RankingMarcasPage /></Suspense>} />
            </Route>

            {/* Analytics standalone (era só redirect) — inclui master, que os grupos
                finance/commercial não cobrem. */}
            <Route element={<ProtectedRoute allowedRoles={[...masterRoles, ...financeRoles, ...commercialRoles]} />}>
              <Route path="/analytics-dashboard" element={<Suspense fallback={<PageFallback />}><AnalyticsPage /></Suspense>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={financeRoles} />}>
              <Route path="/financeiro" element={<Suspense fallback={<PageFallback />}><FinanceiroPage /></Suspense>} />
            </Route>

            {/* Detalhe da apresentadora — alcançado por clique nas tabelas/rankings de
                comissão (Financeiro) e no pulso operacional (ops). */}
            <Route element={<ProtectedRoute allowedRoles={[...internalRoles, ...masterRoles]} />}>
              <Route path="/apresentadoras/:id" element={<Suspense fallback={<PageFallback />}><ApresentadoraDetailPage /></Suspense>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={financeRoles} />}>
              <Route path="/boletos" element={<Navigate to="/financeiro?tab=boletos" replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['franqueador_master', 'franqueado']} />}>
              <Route path="/comissoes/pendentes" element={<Navigate to="/financeiro?tab=comissoes" replace />} />
              <Route path="/financeiro/comissoes/regras" element={<Suspense fallback={<PageFallback />}><ComissoesConfigPage /></Suspense>} />
              <Route path="/comissoes/config" element={<LegacyPageRedirect to="/financeiro/comissoes/regras" />} />
              <Route path="/ranking-apresentadoras" element={<Suspense fallback={<PageFallback />}><RankingApresentadorasPage /></Suspense>} />
              <Route path="/ranking-marcas" element={<Suspense fallback={<PageFallback />}><RankingMarcasPage /></Suspense>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['franqueador_master', 'franqueado']} />}>
              <Route path="/lives/manual" element={<LegacyPageRedirect to="/lives" />} />
            </Route>

            {/* Configurações unificada: admins veem painel completo; demais papéis veem só conta/segurança.
                Gating fino (admin vs não-admin) fica dentro de ConfiguracoesPage. Cliente usa /cliente/configuracoes. */}
            <Route element={<ProtectedRoute allowedRoles={configuracoesRoles} />}>
              <Route path="/configuracoes" element={<Suspense fallback={<PageFallback />}><ConfiguracoesPage /></Suspense>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...masterRoles, ...internalRoles, 'apresentador', 'apresentadora']} />}>
              <Route path="/conhecimento" element={<Suspense fallback={<PageFallback />}><KnowledgePage /></Suspense>} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
      </UnsavedChangesProvider>
    </ErrorBoundary>
  )
}

// Root splat incremental: keeps the declarative route tree intact while enabling
// the data-router blocker used by the single unsaved-changes registry.
const router = createBrowserRouter([{ path: '*', element: <RouterApplication /> }])

export function AppRouter() {
  return <RouterProvider router={router} />
}
