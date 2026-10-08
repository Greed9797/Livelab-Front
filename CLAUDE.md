# CLAUDE.md

Guia para o Claude Code neste repositório. Leia também `AGENTS.md` (convenções, armadilhas de deploy e regras de produto).

## Comandos

```bash
cd react-app
npm ci
npm run dev          # precisa de VITE_DEV_API_PROXY_TARGET no .env.local (CORS) — ver .env.example
npm run typecheck    # tsc -b
npm run test         # vitest
npm run build        # lint:hooks + tsc -b + vite build
npm run e2e          # Playwright
npm run e2e:production-smoke  # leitura em produção com E2E_BASE_URL/E2E_EMAIL/E2E_PASSWORD
```

Backend: repositório `Livelab-back` (Fastify + Postgres com RLS), em produção no Railway a partir da branch `codex/blumenau-operational-fase1`. Quase toda feature toca os dois repositórios: número que aparece na tela quase sempre é calculado no backend.

### Variáveis de ambiente (`react-app/.env.example`)
- `VITE_API_URL` — URL da API (`…/v1`). Entra no bundle em tempo de build.
- `VITE_DEV_API_PROXY_TARGET` / `VITE_DEV_API_PROXY_ORIGIN` — proxy do `npm run dev` para fugir do CORS.
- `VITE_CADASTRO_UNIFICADO` — `true` liga a lista única "Clientes" via `GET /v1/cadastros` (padrão desligado; se o backend der 404, a tela volta à junção `/clientes` + `/marcas`).
- `VITE_ENABLE_CLIENT_ONBOARDING`, `VITE_SENTRY_DSN` — opcionais.

Mudou uma `VITE_*` na Vercel? Precisa de novo deploy.

---

## React App (react-app/)

O único app deste repositório é `react-app/` (React 18 + TypeScript + Vite). O app Flutter antigo foi removido em out/2026.

### Branch e deploy (produção)

- **Produção:** https://app.grupolivelab.com.br (Vercel, projeto `liveshop-saas-frontend-react`, scope `greed9797s-projects`).
- **Deploy automático:** push em `feat/multi-apresentadora-agenda` ou `migration/react-vercel` dispara `.github/workflows/frontend-deploy.yml` (typecheck + testes + build antes; qualquer falha aborta sem publicar). Na prática os deploys recentes saem de `feat/multi-apresentadora-agenda` — parta dela para mudanças.
- **Deploy manual (exceção):** seguir `react-app/DEPLOY-HANDOFF.md`; token em `$VERCEL_TOKEN`. **Nunca** usar `--prebuilt` (ver `AGENTS.md`).
- Gates antes de publicar: `npm run typecheck`, `npm run test` e `npm run build` em `react-app/`.
- `react-app/.env.production` define `VITE_CADASTRO_UNIFICADO=true`; o workflow de produção embute a URL da API no build. Criar/editar cadastro usa `/v1/cadastros`; o acesso de login do novo cliente é criado separadamente. A flag é de build: trocar o valor exige novo deploy.
- Smoke autenticado somente de leitura: `E2E_BASE_URL=https://app.grupolivelab.com.br E2E_EMAIL=... E2E_PASSWORD=... npm run e2e:production-smoke` em `react-app/`, com conta de teste. O teste bloqueia escritas exceto o POST de login.
- Conferir que foi ao ar: `curl -s https://app.grupolivelab.com.br/version.json` — o timestamp `v` deve ser recente (é o ts do build).
- Receita tem o botão **Gerar títulos**; a operação reconcilia os títulos do mês via `POST /v1/financeiro/receitas/gerar` após confirmação. O DRE anual mostra o caixa inicial por mês; sem data de corte, exibe **Não configurado**.
- `livelab-3601f.web.app` é o app antigo (Flutter/Firebase), a desativar; produção real = `app.grupolivelab.com.br`.

### Stack React
- **Framework:** React 18 + TypeScript + Vite
- **Roteamento:** react-router-dom v6
- **Estado global:** Zustand (auth em `stores/auth-store.ts`)
- **Server state:** TanStack React Query
- **Estilos:** Tailwind CSS + tokens CSS custom (`design-input`, `bg-canvas`, `text-ink`, etc.)
- **Ícones:** lucide-react

### Estrutura
```
react-app/src/
├── components/
│   ├── layout/Shell.tsx     # Layout com sidebar
│   └── ui/                  # Card, Button, Badge, DataTable, PageHeader...
├── pages/                   # Uma page por rota
├── routes/AppRouter.tsx     # Router principal + ProtectedRoute
├── services/
│   ├── api.ts               # Funções base (apiGet, apiPost, apiPatch, apiDelete, apiPut)
│   └── domain.ts            # Funções de domínio por entidade
├── stores/auth-store.ts     # Auth (Zustand)
├── types/models.ts          # Tipos TypeScript
└── utils/
    ├── access.ts            # Roles, menu, guards
    └── format.ts            # formatMoney, formatPercent, asNumber, asString
```

### Adicionar uma nova página
1. Criar `src/pages/NomePage.tsx` com `export function NomePage()`
2. Importar e adicionar rota em `src/routes/AppRouter.tsx`
3. Adicionar item ao `menuItems` em `src/utils/access.ts`
4. Adicionar funções de serviço em `src/services/domain.ts`

### Rotas existentes
| Path | Componente | Roles |
|---|---|---|
| `/` | DashboardPage | internalRoles |
| `/master` | MasterDashboardPage | masterRoles |
| `/master/consolidado` | MasterConsolidatedPage | masterRoles |
| `/comercial` | ComercialPage | masterRoles + commercialRoles |
| `/conteudo` | ConteudoPage | cabineRoles + apresentador |
| `/apresentadoras` | ApresentadorasPage | opsRoles |
| `/metas` | MetasPage | opsRoles |
| `/ranking/apresentadoras` | RankingApresentadorasPage | opsRoles |
| `/financeiro` | FinanceiroPage | financeRoles |
| `/configuracoes` | ConfiguracoesPage | franqueado+ |
| `/cliente` | ClienteDashboardPage | cliente_parceiro |
| `/ranking` | PublicRankingPage | público |
