# Livelab SaaS React

Nova versão React/Vite do frontend LiveShop SaaS, criada para substituir a camada Flutter Web/CanvasKit em deploys Vercel.

## Rodar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure a API em `.env.local`:

```bash
VITE_API_URL=https://liveshop-saas-api-production.up.railway.app/v1
```

Para backend local:

```bash
VITE_API_URL=http://127.0.0.1:3001/v1
```

Para QA local contra Railway sem depender do CORS do navegador:

```bash
VITE_API_URL=/v1
VITE_DEV_API_PROXY_TARGET=https://liveshop-saas-api-production.up.railway.app
VITE_DEV_API_PROXY_ORIGIN=https://livelab-3601f.web.app
```

## Build

```bash
npm run build
npm run preview
```

O build gera `dist/`, compatível com Vercel como static site.

## Deploy na Vercel

O deploy de produção usa o GitHub Actions em
`../.github/workflows/frontend-deploy.yml`. Push nas branches
`feat/multi-apresentadora-agenda` ou `migration/react-vercel`, e `workflow_dispatch`,
executa typecheck, testes, build e deploy remoto pela Vercel. O job injeta a URL da API
de produção; não use um build local com `--prebuilt`, que pode assar `[SENSITIVE]` no
bundle no lugar de `VITE_API_URL`.

O [registro do release publicado de 26/10/2026](../docs/production-release-2026-10-26.md)
é a referência para branch, commit, versão e verificações atuais. O código do checkout
local pode divergir do código que serve produção.

Para validar um build local, rode `npm run build`; isso não publica o bundle.

O backend Fastify usa allowlist CORS. Antes de publicar em Vercel, inclua o domínio final da Vercel em `CORS_ORIGIN` no backend, por exemplo:

```bash
CORS_ORIGIN=https://app.grupolivelab.com.br,https://seu-projeto.vercel.app
```

Validação feita em 2026-05-12: Railway responde `/health`, aceita preflight de `https://app.grupolivelab.com.br` e `https://livelab-3601f.web.app`, mas rejeita `http://127.0.0.1:5173` e domínios Vercel não cadastrados.

### CRM e carteira no release publicado

No release registrado, Clientes/Carteira fica em `/clientes` e o CRM em
`/clientes/crm`. As rotas legadas `/master/crm` e `/leads` redirecionam para
`/clientes/crm`. Essas rotas descrevem o SHA publicado; confira o registro antes de
compará-las com um checkout local diferente.

### Treinamentos no release publicado

- `/conhecimento` oferece trilhas e aulas para usuários autenticados.
- `/conhecimento/treinamentos/gerenciar` permite ao papel `franqueador_master`
  gerenciar trilhas e aulas.
- `/conhecimento/treinamentos/relatorio` oferece relatório a
  `franqueador_master`, `franqueado` e `gerente`, dentro do escopo permitido pela API.

Vídeos permanecem nos provedores de origem; excluir uma aula ou trilha não remove o
vídeo remoto. A validação em produção deste release não revalidou o domínio de conta
Panda próprio.

### Flag `VITE_CADASTRO_UNIFICADO` (cadastro unificado)

A tela **Clientes** (`/clientes`) pode ler a lista do endpoint novo `GET /v1/cadastros`
(clientes, afiliadas, marcas próprias e parceiras na mesma lista, com coluna "Tipo",
indicação "não gera receita" e o botão "Promover a cliente").

- **Ativa no build de produção de 26/10/2026:** `.env.production` define
  `VITE_CADASTRO_UNIFICADO=true`. No código, somente o valor exato `true` liga;
  ausente, `false` ou `0` mantêm a junção `/clientes` + `/marcas`.
- Mesmo ligada, se o backend responder 404/405/501 em `/v1/cadastros` (backend antigo),
  a tela cai sozinha na junção atual — nada quebra. "Promover a cliente" só aparece quando
  a lista veio do endpoint novo.
- Para ligar na Vercel (projeto `liveshop-saas-frontend-react`): Settings → Environment
  Variables → adicionar `VITE_CADASTRO_UNIFICADO` = `true` (Production; opcionalmente
  Preview) → **novo deploy** (variáveis `VITE_*` são embutidas no build). Para desligar,
  troque para `false` e publique de novo.
- Local: `VITE_CADASTRO_UNIFICADO=true npm run dev` ou a linha correspondente no `.env.local`.

## Migrado nesta etapa

- Login/autenticação com JWT + refresh.
- Layout responsivo com sidebar por papel.
- Dashboard de unidade.
- Dashboard Master, unidades, consolidado e CRM.
- Dashboard cliente parceiro, histórico de lives, agenda e configurações.
- CRM com criação/edição de leads, mudança de etapa, contato, tarefa e exclusão.
- Cabines com criação/edição, status, reserva por contrato, histórico, live atual e encerramento.
- Solicitações com aprovar/recusar e criação de agendamento por papel permitido.
- Apresentadoras/equipe com criação, edição, ativação/inativação e exclusão lógica.
- Financeiro com custos, faturamento, fluxo de caixa, boletos e tela detalhada de cobranças.
- Analytics e base de conhecimento em modo leitura.
- API client centralizado em `src/services/api.ts`.
- Matriz de contrato em `../docs/legado/ROUTE_CONTRACT.md`.

## Ainda falta

- Upload multipart de logo no onboarding quando o backend expuser endpoint próprio.
- Completar a validação autenticada de treinamentos em produção com os papéis de
  franqueado e master; consulte as limitações do
  [registro de release](../docs/production-release-2026-10-26.md).
- Expandir E2E real para CRUDs destrutivos quando houver massa de teste dedicada.
- Completar smoke autenticado de leitura com contas de teste master e franqueado
  em `app.grupolivelab.com.br`; este release não cobriu esses papéis.

## QA ponta a ponta

O roteiro completo está em `../docs/legado/QA_E2E_ROTEIRO.md`.

Gates técnicos:

```bash
npm run typecheck
npm run test
npm run build
npm audit --audit-level=moderate
```

E2E com Playwright:

```bash
npx playwright install chromium
npm run e2e
```

Antes de rodar o E2E, exporte localmente as variáveis dos três perfis de teste (`E2E_MASTER_*`, `E2E_FRANQUEADO_*`, `E2E_CLIENTE_*`). Não grave senhas em arquivos versionados.
