# Roteiro QA ponta a ponta - React/Vercel + API Railway

Este roteiro valida a nova aplicação React sem Flutter/CanvasKit, cobrindo autenticação, RBAC, navegação, telas principais, API, responsividade e deploy.

## 1. Ambientes

- Frontend local: `react-app`, Vite em `http://127.0.0.1:5173`.
- API produção/staging: `https://liveshop-saas-api-production.up.railway.app/v1`.
- Health backend: `https://liveshop-saas-api-production.up.railway.app/health`.
- Deploy Vercel: domínio final ainda precisa estar liberado no `CORS_ORIGIN` do Railway.

Para QA local contra Railway sem depender de CORS do navegador, use o proxy do Vite:

```bash
VITE_API_URL=/v1
VITE_DEV_API_PROXY_TARGET=https://liveshop-saas-api-production.up.railway.app
VITE_DEV_API_PROXY_ORIGIN=https://livelab-3601f.web.app
```

## 2. Perfis de teste

Use os três perfis fornecidos por canal seguro:

- `franqueador_master`
- `franqueado`
- `cliente_parceiro`

Nunca grave as senhas em arquivo versionado. Para o Playwright, exporte apenas variáveis locais de sessão:

```bash
export E2E_MASTER_EMAIL="preencher"
export E2E_MASTER_PASSWORD="preencher"
export E2E_FRANQUEADO_EMAIL="preencher"
export E2E_FRANQUEADO_PASSWORD="preencher"
export E2E_CLIENTE_EMAIL="preencher"
export E2E_CLIENTE_PASSWORD="preencher"
```

## 3. Gates técnicos

Rodar em `/react-app`:

```bash
npm install
npm run typecheck
npm run test
npm run build
npm audit --audit-level=moderate
```

Critério de aceite:

- TypeScript sem erro.
- Testes unitários passando.
- Build Vite gerando `dist/`.
- Audit sem vulnerabilidade moderada/alta/crítica.

## 4. QA automatizado

Rodar em `/react-app`:

```bash
npx playwright install chromium
npm run e2e
```

O teste automatizado cobre:

- Login real dos três papéis.
- Token e refresh token salvos no storage.
- Redirecionamento inicial por papel.
- Rotas permitidas por papel.
- Rotas bloqueadas por papel.
- Logout.
- Tela de login em mobile sem scroll horizontal.

Por segurança, o suite desliga screenshot, vídeo e trace por padrão, porque os cenários de login usam credenciais reais.

Relatório visual:

```bash
npm run e2e:report
```

## 5. QA manual por papel

### Franqueador master

Validar:

- Login redireciona para `/master`.
- Menus visíveis: Master, Unidades, Consolidado, CRM, Franqueados, Base, Configurações.
- `/master`: métricas carregam ou exibem empty/error state controlado.
- `/master/unidades`: lista/tabela de unidades carrega.
- `/master/consolidado`: métricas consolidadas e gráficos renderizam.
- `/master/crm`: lista de leads, filtros, criação/edição quando autorizado.
- `/configuracoes`: dados da unidade/master não quebram layout.
- Rotas operacionais como `/cabines` e `/financeiro` não devem ficar acessíveis para esse papel.

### Franqueado

Validar:

- Login redireciona para `/`.
- Menus visíveis: Home, CRM, Cabines, Solicitações, Apresentadoras, Analytics, Financeiro, Boletos, Base, Configurações.
- `/`: dashboard da unidade renderiza métricas.
- `/cabines`: lista, status e ações principais aparecem.
- `/solicitacoes`: aprovar/recusar quando houver solicitação.
- `/apresentadoras`: lista e ações de equipe.
- `/analytics-dashboard`: gráficos e métricas.
- `/financeiro` e `/boletos`: tabelas/valores sem erro visual.
- `/master` e `/cliente` devem redirecionar/bloquear.

### Cliente parceiro

Validar:

- Login redireciona para `/cliente` ou `/onboarding`, conforme status real do usuário.
- Menus visíveis quando onboarding estiver concluído: Cliente, Lives, Agenda, Configurações, Boletos, Base.
- `/cliente`: métricas e resumo do cliente.
- `/cliente/lives`: histórico/lista de lives.
- `/cliente/agenda`: solicitações/agendamentos.
- `/cliente/configuracoes`: perfil/configuração em modo cliente.
- `/boletos`: cobranças do cliente.
- `/master`, `/cabines` e `/financeiro` devem redirecionar/bloquear.

## 6. Checklist visual

- Desktop 1440px: sidebar fixa, cabeçalho sem sobreposição, cards/tabelas legíveis.
- Mobile 393px: sem scroll horizontal, menu hamburguer funcional, textos não cortados.
- Loading states aparecem durante chamadas.
- Empty states aparecem quando não há dados.
- Erros de API aparecem em mensagem controlada, sem white screen.
- Gráficos renderizam sem quebrar layout.

## 7. Checklist API

- `GET /health` retorna 200.
- `POST /v1/auth/login` retorna 200 para os três papéis.
- Rotas protegidas sem token retornam 401.
- Rotas de papel incorreto não expõem dados indevidos.
- Refresh token funciona quando o access token expira.
- Logout limpa sessão local mesmo se API falhar.

## 8. Deploy Vercel

Configuração:

- Root Directory: `react-app`
- Build Command: `npm run build`
- Output Directory: `dist`
- Env: `VITE_API_URL=https://liveshop-saas-api-production.up.railway.app/v1`

Antes do smoke em Vercel, atualizar Railway:

```bash
CORS_ORIGIN=https://app.grupolivelab.com.br,https://livelab-3601f.web.app,https://SEU-DOMINIO-VERCEL.vercel.app
```

Smoke pós-deploy:

- Abrir `/login`.
- Login com os três papéis.
- Repetir as rotas críticas.
- Validar DevTools sem erro CORS.
- Rodar Lighthouse básico em desktop/mobile.

## 9. Pendências técnicas conhecidas

- Validar convite/redefinição de senha ponta a ponta.
- Validar refresh token com expiração real.
- Completar telas parciais: detalhes de live/cabine com SSE, contratos, usuários, auditoria e upload multipart de logo.
- Automatizar CRUDs críticos somente quando houver massa de teste segura para criação/edição/exclusão.
