# Plano de Migração Flutter Web -> React/Vite

Branch: `migration/react-vercel`  
Nova aplicação: `react-app/`  
Backend analisado: `../liveshop_saas_api-backend-`

## Auditoria do frontend Flutter

O frontend atual está em Flutter Web com `AppRoutes.onGenerateRoute`, `RoleRouteGuard`, Riverpod e `ApiService` baseado em Dio. O app usa JWT + refresh token, armazenamento via `flutter_secure_storage`, rotas por papel e dois shells visuais principais: `AppScaffold`/`LivelabScaffold`.

Telas e rotas principais identificadas:

| Rota Flutter | Papel principal | Tela atual | Status React |
|---|---|---|---|
| `/login` | público | `LoginScreen` | migrado |
| `/esqueci-senha` | público | `EsqueciSenhaScreen` | migrado |
| `/` | franqueado/gerente/internal | `HomeScreen` | migrado |
| `/master` | master/regional | `AdminMasterScreen` | migrado |
| `/master/unidades` | master/regional | `UnidadesScreen` | migrado |
| `/master/consolidado` | master/regional | `ConsolidadoScreen` | migrado |
| `/master/crm` e `/leads` | master/comercial | `MasterCrmV3Screen` | migrado |
| `/master/franqueados` | master | `FranqueadosScreen` | versão inicial |
| `/cliente` e `/cliente/dashboard` | cliente_parceiro | `ClienteHomeV3Screen` | migrado |
| `/cliente/lives` | cliente_parceiro | `ClienteLivesScreen` | migrado |
| `/cliente/agenda` | cliente_parceiro | `ClienteAgendaScreen` | versão conectada genérica |
| `/cabines` e `/agendamentos` | operação/live | `CabinesScreen` | migrado |
| `/solicitacoes` | operação | `SolicitacoesScreen` | migrado |
| `/apresentadoras` | operação | `ApresentadorasScreen` | migrado |
| `/analytics-dashboard` | financeiro/comercial | `AnalyticsDashboardScreen` | migrado |
| `/financeiro` | financeiro | `FinanceiroScreen` | migrado |
| `/configuracoes` | master/franqueado | `ConfiguracoesScreen` | migrado parcial |
| `/conhecimento` | múltiplos papéis | Knowledge Base | migrado parcial |
| `/boletos`, `/onboarding` | vários | telas específicas | versão conectada genérica |

Componentes reutilizáveis mapeados:

- Layout: `AppScaffold`, `LivelabScaffold`, `LlSidebar`
- UI: cards, badges, empty states, metric cards, period picker, ranking lists
- Charts: `fl_chart` para linhas/barras/heatmaps; substituído por Recharts
- Temas: `LlTokens`, `AppColors`, `AppTypography`; traduzido para Tailwind tokens/CSS
- Estado: Riverpod providers migrados para Zustand (auth) + React Query (dados)

## Auditoria do backend/API

O backend é Fastify e registra rotas em `src/app.js`. Autenticação usa:

- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `PATCH /v1/auth/senha`
- `POST /v1/auth/esqueci-senha`
- `POST /v1/auth/redefinir-senha`
- `POST /v1/auth/aceitar-convite`

Payload de login:

```json
{
  "email": "usuario@empresa.com",
  "senha": "senha"
}
```

Resposta usada pelo React:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "user": {
    "id": "...",
    "nome": "...",
    "email": "...",
    "papel": "franqueado",
    "tenant_id": "...",
    "tenant_nome": "...",
    "onboarding_completed": true
  }
}
```

Endpoints principais integrados na nova versão:

- `/v1/home/dashboard`
- `/v1/master/dashboard`
- `/v1/master/unidades`
- `/v1/master/consolidado`
- `/v1/crm/summary`
- `/v1/leads`
- `/v1/cliente/dashboard`
- `/v1/cliente/lives`
- `/v1/cliente/agenda`
- `/v1/cabines`
- `/v1/lives`
- `/v1/solicitacoes`
- `/v1/apresentadoras`
- `/v1/analytics/dashboard`
- `/v1/financeiro/resumo`
- `/v1/financeiro/fluxo-caixa`
- `/v1/financeiro/faturamento`
- `/v1/configuracoes`
- `/v1/knowledge/categories`
- `/v1/knowledge/articles`
- `/v1/boletos`
- `/v1/onboarding`

Entidades principais:

- `users`, `tenants`, `clientes`, `contratos`, `leads`
- `cabines`, `lives`, `live_requests`, `apresentadoras`
- `boletos`, `custos`, `configuracoes`
- `knowledge_categories`, `knowledge_articles`

## Arquitetura React criada

Stack implementada:

- React + TypeScript + Vite
- Tailwind CSS v4 com `@tailwindcss/vite`
- React Router
- Axios centralizado em `src/services/api.ts`
- Zustand para sessão/autenticação
- React Query para cache, loading, refetch e mutations
- Recharts para dashboards
- Lucide React para ícones

Estrutura:

```txt
react-app/
  src/
    components/
      layout/
      ui/
      charts/
      forms/
    pages/
    routes/
    services/
    stores/
    types/
    utils/
    styles/
```

## O que foi migrado

- Login com validação, restauração de sessão e redirect por papel.
- Refresh token automático no interceptor Axios.
- Shell responsivo com menu por papel.
- Dashboard da unidade.
- Painel Master, unidades, consolidado e CRM.
- Dashboard do cliente parceiro e histórico de lives.
- Cabines/lives, solicitações, apresentadoras, analytics e financeiro.
- Configurações básicas, base de conhecimento e páginas genéricas conectadas para telas ainda incompletas.
- `.env.example` com `VITE_API_URL`.
- Build compatível com Vercel (`dist/`).

## Pendências técnicas

- Completar formulários avançados do CRM, contratos, usuários, auditoria e edição de Knowledge Base.
- Migrar telas detalhadas de cabine/live com SSE (`/v1/lives/:id/stream` e closer notifications).
- Completar agenda do cliente com fluxo multi-step de solicitação de live.
- Implementar perfil/configurações do cliente parceiro com `/v1/cliente/perfil` e `/v1/auth/senha`.
- Recriar telas de convite, redefinição de senha e aceite de convite além do fluxo de esqueci senha.
- Adicionar E2E com Playwright para login e smoke das rotas principais.
- Validar visualmente contra o Flutter em desktop e mobile com dados reais de staging.

## Critério de validação atual

- `npm install`
- `npm run build`
- `npm run test`

O React app não depende de Flutter, Dart, CanvasKit ou Firebase Hosting.

## Validação CORS/API

Validação feita em 2026-05-12 contra Railway:

- `GET https://liveshop-saas-api-production.up.railway.app/health` retornou `200 {"ok": true}`.
- Preflight CORS para `https://app.grupolivelab.com.br` retornou `204`.
- Preflight CORS para `https://livelab-3601f.web.app` retornou `204`.
- Preflight CORS para `http://127.0.0.1:5173` retornou `500 Not allowed by CORS`.
- Preflight CORS para um domínio Vercel não cadastrado retornou `500 Not allowed by CORS`.

Conclusão: o código React está compatível com Vercel, mas o deploy Vercel real precisa ter seu domínio incluído em `CORS_ORIGIN` no backend antes de login/API funcionarem no navegador.
