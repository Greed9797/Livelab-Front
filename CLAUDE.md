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

Backend: repositório `Livelab-back` (Fastify + Postgres com RLS), em produção no Railway.

---

## React App (react-app/)

O único app deste repositório é `react-app/` (React 18 + TypeScript + Vite). O app Flutter antigo foi removido em out/2026.

### Branch e deploy (produção)

- **Produção:** https://app.grupolivelab.com.br (Vercel, projeto
  `liveshop-saas-frontend-react`). O scope Vercel validado para o release atual é
  `leonardoames-projects`; o scope de uma sessão local do CLI pode ser diferente.
- **Estado atual:** consulte o [registro de produção de 26/10/2026](docs/production-release-2026-10-26.md)
  para SHA, branch, versão e execução do workflow confirmados. O checkout primário
  `codex/cliente-portal-marca` não representa esse release por padrão.
- **Deploy pelo GitHub Actions:** push em `feat/multi-apresentadora-agenda` ou
  `migration/react-vercel`, ou `workflow_dispatch`, executa `.github/workflows/frontend-deploy.yml`.
  O workflow roda typecheck, testes e build, então publica com build remoto e a URL
  da API de produção injetada no job.
- Gates locais antes de publicar: `npm run typecheck`, `npm run test` e
  `npm run build` em `react-app/`.
- Não use `--prebuilt` para publicar: o build local pode embutir `[SENSITIVE]` no
  lugar de `VITE_API_URL`.
- `react-app/.env.production` define `VITE_CADASTRO_UNIFICADO=true`. A flag é
  embutida no build; criar ou editar cadastro usa `/v1/cadastros`, e o acesso de
  login do novo cliente é criado separadamente.
- O smoke de produção é somente de leitura, exceto pelo POST de login. Com uma
  conta de teste, rode este comando em `react-app/`:

  ```bash
  E2E_BASE_URL=https://app.grupolivelab.com.br E2E_EMAIL=... E2E_PASSWORD=... npm run e2e:production-smoke
  ```

  Este release não validou fluxos autenticados com todos os papéis.
- Depois do deploy, confira `https://app.grupolivelab.com.br/version.json` e abra a
  aplicação. Timestamp novo confirma o build servido, não o funcionamento autenticado
  de todos os papéis. Veja no registro os limites da validação de produção.
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
| `/clientes` | ClientesLayout + Carteira | masterRoles + commercialRoles |
| `/clientes/crm` | ClientesLayout + CrmPage | masterRoles + commercialRoles |
| `/comercial` | Redirect to `/clientes` | masterRoles + commercialRoles |
| `/conteudo` | ConteudoPage | cabineRoles + apresentador |
| `/apresentadoras` | ApresentadorasPage | opsRoles |
| `/metas` | MetasPage | opsRoles |
| `/ranking/apresentadoras` | RankingApresentadorasPage | opsRoles |
| `/financeiro` | FinanceiroPage | financeRoles |
| `/configuracoes` | ConfiguracoesPage | franqueado+ |
| `/cliente` | ClienteDashboardPage | cliente_parceiro |
| `/ranking` | PublicRankingPage | público |

### CRM e treinamentos no release publicado

Confira o SHA do [registro de produção](docs/production-release-2026-10-26.md)
antes de usar estas rotas como evidência do checkout local. No release publicado,
as rotas antigas `/master/crm` e `/leads` também redirecionam para `/clientes/crm`.

O treinamento autenticado fica em `/conhecimento`. A gestão em
`/conhecimento/treinamentos/gerenciar` é restrita a `franqueador_master`; o relatório
em `/conhecimento/treinamentos/relatorio` atende `franqueador_master`, `franqueado`
e `gerente`. O front-end faz o controle de acesso da interface; a API também valida
a autorização e o escopo de tenant.
