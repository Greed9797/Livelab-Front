# CLAUDE.md — React App (Livelab Front)

Guia para Claude Code ao trabalhar em `react-app/`.

## Comandos

```bash
# Dev (proxy Vite → Railway, VITE_DEV_API_PROXY_TARGET necessário)
npm run dev

# Build e type-check
npm run build          # tsc -b + vite build
npm run typecheck      # só tsc -b (sem bundle)

# Testes
npm run test           # vitest run (unit)
npm run e2e            # playwright test
npm run e2e:headed     # com browser visível

# Preview do build
npm run preview
```

`.env.local` mínimo:
```
VITE_API_URL=https://liveshop-saas-api-production.up.railway.app/v1
VITE_DEV_API_PROXY_TARGET=https://liveshop-saas-api-production.up.railway.app/v1
```

> ⚠️ `http://127.0.0.1:5173` não está na lista `CORS_ORIGIN` do Railway.
> Em dev local, use o proxy Vite via `VITE_DEV_API_PROXY_TARGET`.

## Stack

- React 18 + TypeScript + Vite 7
- Tailwind CSS v4 (via `@tailwindcss/vite`) — sem `tailwind.config.js`
- React Router v6 (BrowserRouter)
- Zustand — auth session (`src/stores/auth-store.ts`)
- React Query (`@tanstack/react-query`) — todos os dados remotos
- Axios — HTTP com interceptors JWT + 401 auto-refresh
- Recharts — gráficos (chunk separado: `charts`)
- Lucide React — ícones

## Arquitetura

```
react-app/src/
  components/
    ui/          # primitivos: Button, Card, Badge, Modal, PageHeader, States
    layout/      # Shell, Sidebar, ProtectedRoute
    forms/       # AgendarLiveModal, EditarLiveModal, PresenterSelect, …
    charts/      # Charts.tsx (AreaPanel, BarPanel, LinePanel, DonutPanel)
    dashboard/   # widgets de dashboard
    crm/         # componentes CRM
  pages/         # um arquivo por rota (DashboardPage, ConteudoPage, …)
  routes/
    AppRouter.tsx        # rotas com React.lazy + Suspense
    ProtectedRoute.tsx   # guard client-side por papel
  services/
    api.ts               # Axios instance + interceptors
    auth.ts              # login/logout/refresh
    auth-storage.ts      # JWT em sessionStorage/localStorage
    domain.ts            # todas as funções de API por domínio (~150 funções)
    query-keys.ts        # QK — constantes de query keys React Query
  stores/
    auth-store.ts        # Zustand: user, bootstrap, login, logout, expire
  hooks/
    useSelectedLive.ts   # live atual da cabine selecionada (polling 20s)
    useVersionCheck.ts   # detecção de novo deploy via version.json
  types/
    models.ts            # Cabine, Live, Agenda, Cliente, User, JsonRecord, …
  utils/
    access.ts            # grupos de roles + routeForRole()
    format.ts            # formatDate, formatMoney, asString, asNumber, asArray
    favicon.ts           # getBrandImage (logo URL ou favicon da marca)
  styles/
    index.css            # tokens CSS, animações, utilitários globais
```

## Design System

Tokens em `src/styles/index.css` via CSS custom properties. Nunca hardcode cores.

| Token | Uso |
|-------|-----|
| `var(--primary)` | cor de destaque (laranja `#ff5a1f` light, laranja warm dark) |
| `var(--primary-soft)` | fundo suave de accent |
| `var(--bg-base)` / `var(--bg-elev-1/2/3)` | fundo e elevações |
| `var(--text-primary/secondary/muted/faint)` | hierarquia de texto |
| `var(--border)` / `var(--border-strong)` | bordas |
| `var(--success/warning/danger/info)` | semânticos |

Classes utilitárias globais: `.num` (tabular nums), `.serif` (Instrument Serif italic), `.design-input`, `.design-card`, `.design-panel`.

Fontes: Inter (UI), Instrument Serif (display/italic), Geist Mono (mono).

Dark mode: `data-theme="dark"` no `<html>` — todos os tokens se adaptam.

## State Management

### Auth (Zustand)
```ts
const user = useCurrentUser()            // src/hooks ou stores/auth-store
const { login, logout, expire } = useAuthStore()
```

### Dados remotos (React Query)
- `staleTime: 30_000` (global)
- `retry: 1`, `refetchOnWindowFocus: true`
- Use `QK` de `src/services/query-keys.ts` para query keys
- Invalidação pós-mutação: `client.invalidateQueries({ queryKey: QK.cabines })`
- Padrão em modais: `enabled: open` para não buscar enquanto fechado

```ts
// Invalidação operacional completa (cabines, agenda, lives, dashboard)
function invalidateOperational() {
  [QK.cabines, QK.agenda, QK.lives, QK.homeDashboard, ...].forEach(qk =>
    client.invalidateQueries({ queryKey: qk })
  )
}
```

## Roteamento

`AppRouter.tsx` usa `React.lazy` + `Suspense` para todas as páginas exceto Login, ForgotPassword e NotFound.

Role groups (em `src/utils/access.ts`):
- `masterRoles` — franqueador_master
- `internalRoles` — franqueado + operação + readonly roles
- `cabineRoles` — frente live
- `financeRoles`, `commercialRoles`, `opsRoles`, `clienteRoles`

Rota padrão por papel: `routeForRole(papel)` — master→`/master`, apresentador→`/conteudo`, cliente→`/cliente`, outros→`/`.

## Padrões de código

### Nova página
1. Criar `src/pages/NomePage.tsx` com named export `export function NomePage()`
2. Adicionar `lazy(() => import('../pages/NomePage').then(m => ({ default: m.NomePage })))` no AppRouter
3. Envolver com `<Suspense fallback={<PageFallback />}>` na rota

### Nova query
```ts
import { QK } from '../services/query-keys'

// Query
const query = useQuery({ queryKey: QK.cabines, queryFn: getCabines })

// Mutation com invalidação
const mut = useMutation({
  mutationFn: minhaFuncao,
  onSuccess: () => client.invalidateQueries({ queryKey: QK.cabines }),
})
```

### Nova função de API
Adicionar em `src/services/domain.ts`. Todas as funções usam `apiGet/apiPost/apiPatch/apiDelete` de `src/services/api.ts`.

### Tipos
Preferir `src/types/models.ts`. Para campos opcionais desconhecidos usar `JsonRecord` (alias de `Record<string, unknown>`).

Helpers de type-safe: `asString(v, fallback)`, `asNumber(v)`, `asArray<T>(v)` de `src/utils/format.ts`.

## Roles e Permissões

15 papéis ativos. O frontend faz guard client-side via `ProtectedRoute` + `allowedRoles[]`. O backend valida com JWT + `requirePapel`. A proteção client-side é só UX.

`admin_master` era papel fantasma (existia só no front) e foi **removido** — não reintroduzir.

`gerente_regional` é real: migration `070_user_tenant_access.sql` o adiciona ao CHECK de `users.papel`, `src/plugins/auth.js` injeta `allowedTenantIds` e `src/routes/regional_managers.js` gerencia os acessos. No front ele é normalizado para `franqueador_master`, mas **não** entra em `masterRoles` — falta a UI multi-tenant da Fase C.

`/conhecimento` não tem `allowedRoles` — qualquer autenticado acessa.

## Animações específicas de Cabines

Em `src/styles/index.css`:

| Classe | Efeito |
|--------|--------|
| `.cabine-card-live` | glow pulsante + conic border sheen (spinning gradient) |
| `.cabine-card-avail` | opacity 0.75 + saturate(0.6); hover reverte |
| `.cabine-wave-bar` | VU-meter animado (usar em strip de live) |
| `.cabine-live-ping` | ping radial no dot de status |

O conic sheen requer `@property --cabine-ang` (suporte: Chrome 85+, Safari 15.4+, Firefox 128+). Fallback gracioso em browsers antigos.

## CORS / Deploy

- **Prod:** Vercel → Railway (domínio Vercel precisa estar em `CORS_ORIGIN` do Railway)
- **Dev local:** proxy Vite (`VITE_DEV_API_PROXY_TARGET`) contorna o CORS
- **`VITE_API_URL`:** URL completa com `/v1`, ex: `https://liveshop-saas-api-production.up.railway.app/v1`

## Referências

- `ROUTE_CONTRACT.md` — mapeamento rota×endpoint×roles×status
- `MIGRATION_PLAN.md` — histórico da migração Flutter→React
- `docs/audit/frontend-pages.md` — inventário de páginas e roles
- `docs/audit/api-calls.md` — inventário de chamadas de API
- Backend: `/tmp/Livelab-back/CLAUDE.md` (quando existir) ou `README.md`
- Backend STATUS: `/tmp/Livelab-back/STATUS.md`
