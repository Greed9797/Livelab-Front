# Páginas Frontend

> Auditoria gerada em: 2026-05-22
> Branch: `codex/blumenau-operational-fase1`
> Fontes: `src/routes/AppRouter.tsx`, `src/routes/ProtectedRoute.tsx`, `src/utils/access.ts`
> ⚠️ Componentes agora usam React.lazy + Suspense (AppRouter.tsx, commit 19a8ce9)

---

## Grupos de Roles

Definidos em `src/utils/access.ts`:

| Grupo | Roles incluídas |
|---|---|
| `masterRoles` | `franqueador_master`, `admin_master`, `gerente_regional` |
| `internalRoles` | `franqueado`, `gerente`, `gerente_comercial`, `financeiro`, `financeiro_readonly`, `operacional`, `auditor`, `suporte`, `produtor_live`, `marketing`, `comercial_readonly` |
| `commercialRoles` | `franqueado`, `gerente`, `gerente_comercial`, `auditor`, `suporte`, `marketing`, `comercial_readonly` |
| `financeRoles` | `franqueado`, `gerente`, `financeiro`, `financeiro_readonly`, `auditor` |
| `opsRoles` | `franqueado`, `gerente`, `operacional`, `auditor`, `suporte`, `produtor_live`, `comercial_readonly` |
| `cabineRoles` | `franqueado`, `gerente`, `operacional`, `apresentador`, `apresentadora`, `auditor`, `suporte`, `produtor_live`, `marketing`, `comercial_readonly` |
| `clienteRoles` | `cliente_parceiro` |

---

## Inventário de Páginas

| Página | Rota | Roles que podem acessar | Componente | Arquivo fonte |
|--------|------|------------------------|------------|---------------|
| Login | `/login` | Público (sem auth) | `LoginPage` | AppRouter.tsx:29 |
| Esqueci a Senha | `/esqueci-senha` | Público (sem auth) | `ForgotPasswordPage` | AppRouter.tsx:30 |
| Ranking Público | `/ranking` | Público (sem auth) | `PublicRankingPage` | AppRouter.tsx:31 |
| Onboarding | `/onboarding` | `cliente_parceiro` | `OnboardingPage` | AppRouter.tsx:34–35 |
| Dashboard Interno | `/` (index) | `internalRoles` (fallback `/master` se não autorizado) | `DashboardPage` | AppRouter.tsx:39–41 |
| Master Dashboard | `/master` | `masterRoles` | `MasterDashboardPage` | AppRouter.tsx:43–44 |
| Master Unidades | `/master/unidades` | `masterRoles` | `MasterUnitsPage` | AppRouter.tsx:45 |
| Master Consolidado | `/master/consolidado` | `masterRoles` | `MasterConsolidatedPage` | AppRouter.tsx:46 |
| Master Franqueados | `/master/franqueados` | `masterRoles` | `MasterUnitsPage` (modo franqueados) | AppRouter.tsx:47 |
| Comercial / CRM | `/comercial` | `masterRoles` + `commercialRoles` | `ComercialPage` | AppRouter.tsx:51 |
| (Redirect) CRM Master | `/master/crm` | `masterRoles` + `commercialRoles` | Redirect → `/comercial` | AppRouter.tsx:52 |
| (Redirect) Leads | `/leads` | `masterRoles` + `commercialRoles` | Redirect → `/comercial` | AppRouter.tsx:53 |
| Portal Cliente — Dashboard | `/cliente` | `cliente_parceiro` | `ClienteDashboardPage` | AppRouter.tsx:57 |
| (Redirect) Cliente Dashboard | `/cliente/dashboard` | `cliente_parceiro` | Redirect → `/cliente` | AppRouter.tsx:58 |
| Portal Cliente — Lives | `/cliente/lives` | `cliente_parceiro` | `ClienteLivesPage` | AppRouter.tsx:59 |
| Portal Cliente — Agenda | `/cliente/agenda` | `cliente_parceiro` | `ClienteAgendaPage` | AppRouter.tsx:60 |
| Portal Cliente — Configurações | `/cliente/configuracoes` | `cliente_parceiro` | `ConfiguracoesPage` (clienteMode) | AppRouter.tsx:61 |
| Conteúdo (Cabines/Lives/Agenda) | `/conteudo` | `cabineRoles` | `ConteudoPage` | AppRouter.tsx:65 |
| (Redirect) Cabines | `/cabines` | `cabineRoles` | Redirect → `/conteudo` | AppRouter.tsx:66 |
| (Redirect) Agendamentos | `/agendamentos` | `cabineRoles` | Redirect → `/solicitacoes` | AppRouter.tsx:67 |
| Solicitações | `/solicitacoes` | `opsRoles` | `SolicitacoesPage` | AppRouter.tsx:71 |
| Apresentadoras | `/apresentadoras` | `opsRoles` | `ApresentadorasPage` | AppRouter.tsx:72 |
| (Redirect) Analytics | `/analytics-dashboard` | `financeRoles` + `commercialRoles` | Redirect → `/conteudo?tab=analytics` | AppRouter.tsx:76 |
| Financeiro | `/financeiro` | `financeRoles` + `cliente_parceiro` | `FinanceiroPage` | AppRouter.tsx:80 |
| (Redirect) Boletos | `/boletos` | `financeRoles` + `cliente_parceiro` | Redirect → `/financeiro?tab=boletos` | AppRouter.tsx:84 |
| Configurações | `/configuracoes` | `franqueador_master`, `admin_master`, `franqueado` | `ConfiguracoesPage` | AppRouter.tsx:88 |
| Base de Conhecimento | `/conhecimento` | Qualquer autenticado (sem `allowedRoles`) | `KnowledgePage` | AppRouter.tsx:91 |
| Não Encontrado | `*` | Qualquer autenticado | `NotFoundPage` | AppRouter.tsx:92 |

---

## Lógica de Redirecionamento por Role

Definida em `src/utils/access.ts` — função `routeForRole()`:

| Role | Rota padrão de entrada |
|---|---|
| `franqueador_master`, `admin_master`, `gerente_regional` | `/master` |
| `apresentador`, `apresentadora` | `/conteudo` |
| `cliente_parceiro` (onboarding completo) | `/cliente` |
| `cliente_parceiro` (onboarding pendente) | `/onboarding` |
| Qualquer `internalRole` | `/` (Dashboard interno) |
| Não autenticado / role desconhecida | `/login` |

---

## Observações de Segurança do Frontend

1. **`admin_master`** aparece em `masterRoles` e no guard de `/configuracoes`, mas **não existe no backend** — role fantasma. Qualquer usuário com esse papel no token teria acesso às páginas master sem validação de papel no servidor.

2. **`/conhecimento`** não tem `allowedRoles` definido no `ProtectedRoute` (linha 91) — qualquer usuário autenticado pode acessar, independente de papel.

3. **`ProtectedRoute`** (src/routes/ProtectedRoute.tsx) faz verificação client-side apenas — o controle real é via JWT + `requirePapel` no backend. A proteção de rota no frontend é apenas UX, não segurança.

4. **`onboarding`** redireciona automaticamente clientes com `onboarding_completed = false` antes de acessar qualquer outra rota (ProtectedRoute.tsx linha 14–16).

5. **Roles específicas ausentes do AppRouter**: `gerente`, `gerente_comercial`, `financeiro`, `financeiro_readonly`, `operacional`, `auditor`, `suporte`, `produtor_live`, `marketing`, `comercial_readonly` — todas acessam páginas via grupos (`internalRoles`, `opsRoles` etc.), nunca listadas individualmente nas rotas.

6. **Lazy loading ativo:** todos os componentes exceto `LoginPage`, `ForgotPasswordPage`, `NotFoundPage` usam `React.lazy()`. O `Suspense` fallback é um spinner inline (`PageFallback`).
