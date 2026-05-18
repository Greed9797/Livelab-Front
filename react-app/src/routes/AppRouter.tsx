import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from '../components/layout/Shell'
import { cabineRoles, clienteRoles, commercialRoles, financeRoles, internalRoles, masterRoles, opsRoles } from '../utils/access'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '../pages/LoginPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { PublicRankingPage } from '../pages/PublicRankingPage'
import { DashboardPage } from '../pages/DashboardPage'
import { MasterDashboardPage } from '../pages/MasterDashboardPage'
import { MasterUnitsPage } from '../pages/MasterUnitsPage'
import { MasterConsolidatedPage } from '../pages/MasterConsolidatedPage'
import { ComercialPage } from '../pages/ComercialPage'
import { ClienteDashboardPage } from '../pages/ClienteDashboardPage'
import { ClienteLivesPage } from '../pages/ClienteLivesPage'
import { ClienteAgendaPage } from '../pages/ClienteAgendaPage'
import { ConteudoPage } from '../pages/ConteudoPage'
import { SolicitacoesPage } from '../pages/SolicitacoesPage'
import { ApresentadorasPage } from '../pages/ApresentadorasPage'
import { FinanceiroPage } from '../pages/FinanceiroPage'
import { ConfiguracoesPage } from '../pages/ConfiguracoesPage'
import { KnowledgePage } from '../pages/KnowledgePage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ComissoesPendentesPage } from '../pages/ComissoesPendentesPage'
import { LiveManualPage } from '../pages/LiveManualPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/ranking" element={<PublicRankingPage />} />

        <Route element={<ProtectedRoute allowedRoles={clienteRoles} />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route element={<ProtectedRoute allowedRoles={internalRoles} fallback="/master" />}>
              <Route index element={<DashboardPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={masterRoles} />}>
              <Route path="/master" element={<MasterDashboardPage />} />
              <Route path="/master/unidades" element={<MasterUnitsPage />} />
              <Route path="/master/consolidado" element={<MasterConsolidatedPage />} />
              <Route path="/master/franqueados" element={<MasterUnitsPage title="Franqueados" mode="franqueados" />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...masterRoles, ...commercialRoles]} />}>
              <Route path="/comercial" element={<ComercialPage />} />
              <Route path="/master/crm" element={<Navigate to="/comercial" replace />} />
              <Route path="/leads" element={<Navigate to="/comercial" replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['cliente_parceiro']} />}>
              <Route path="/cliente" element={<ClienteDashboardPage />} />
              <Route path="/cliente/dashboard" element={<Navigate to="/cliente" replace />} />
              <Route path="/cliente/lives" element={<ClienteLivesPage />} />
              <Route path="/cliente/agenda" element={<ClienteAgendaPage />} />
              <Route path="/cliente/configuracoes" element={<ConfiguracoesPage clienteMode />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...cabineRoles, 'apresentador']} />}>
              <Route path="/conteudo" element={<ConteudoPage />} />
              <Route path="/cabines" element={<Navigate to="/conteudo" replace />} />
              {/* /agendamentos agora redireciona para /conteudo — solicitações foi depreciada */}
              <Route path="/agendamentos" element={<Navigate to="/conteudo" replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={opsRoles} />}>
              {/* /solicitacoes mantida apenas para acesso histórico — não é mais fluxo principal */}
              <Route path="/solicitacoes" element={<SolicitacoesPage />} />
              <Route path="/apresentadoras" element={<ApresentadorasPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...financeRoles, ...commercialRoles]} />}>
              <Route path="/analytics-dashboard" element={<Navigate to="/conteudo?tab=analytics" replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...financeRoles, 'cliente_parceiro']} />}>
              <Route path="/financeiro" element={<FinanceiroPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...financeRoles, 'cliente_parceiro']} />}>
              <Route path="/boletos" element={<Navigate to="/financeiro?tab=boletos" replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['franqueador_master', 'franqueado']} />}>
              <Route path="/comissoes/pendentes" element={<ComissoesPendentesPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['franqueador_master', 'franqueado']} />}>
              <Route path="/lives/manual" element={<LiveManualPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['franqueador_master', 'admin_master', 'franqueado', 'gerente']} />}>
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            </Route>

            <Route path="/conhecimento" element={<KnowledgePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
