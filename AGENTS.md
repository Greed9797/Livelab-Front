# Livelab — Frontend

Painel de operação de uma franquia de live-commerce em Blumenau/SC. Apresentadoras fazem lives em
cabines para marcas; daí saem GMV, comissão e metas.

## O projeto tem DOIS repositórios

- `~/Livelab-Front` — este. O app ativo é **`react-app/`** (React 18 + TypeScript + Vite).
- `~/Livelab-back` — a API (Fastify + Postgres, multi-tenant com RLS).

Quase toda feature toca os dois. Se a tarefa envolve um número que aparece na tela, o cálculo
quase certamente mora no backend.

A raiz deste repo ainda tem um app **Flutter legado**, que não é mais o produto. Ignore `lib/`,
`pubspec.yaml` e `test/` da raiz salvo pedido explícito.

## Comandos

```bash
cd react-app
npm run dev          # precisa de VITE_DEV_API_PROXY_TARGET no .env.local (CORS)
npm run typecheck    # tsc -b
npm run test         # vitest
npm run build        # lint:hooks + tsc -b + vite build
```

**Gates antes de qualquer entrega:** `npm run typecheck && npm run test`, os dois verdes.

## Deploy — leia antes de publicar

Produção é **https://app.grupolivelab.com.br** (Vercel, projeto `liveshop-saas-frontend-react`,
scope `greed9797s-projects`, token em `$VERCEL_TOKEN`).

```bash
cd react-app && npx vercel@latest --prod --token "$VERCEL_TOKEN"
```

**NUNCA use `--prebuilt`.** Isso já derrubou a produção: `VITE_API_URL` está marcada como
*sensitive* no projeto Vercel, então `vercel pull` devolve o literal `"[SENSITIVE]"` em vez do
valor. Um build local com `--prebuilt` assa esse texto no bundle, `resolveBaseUrl()` (em
`src/services/api.ts`) lança no import e o app morre em tela branca antes de renderizar. Nada
acusa: typecheck passa, testes passam, o build "conclui". O erro só existe no navegador do usuário.

Existe `react-app/.env.production` versionado como rede de segurança, mas ele **não fecha o
buraco**: no Vite, `.env.production.local` (que é o que o `vercel pull` escreve) tem precedência
sobre `.env.production`.

**Sempre confira depois de publicar** — deploy sem smoke test é aposta:

```bash
curl -s https://app.grupolivelab.com.br/version.json     # o timestamp tem que ser novo
curl -s https://app.grupolivelab.com.br/assets/index-*.js | grep -c '\[SENSITIVE\]'   # tem que ser 0
```
E abra a página: ela precisa redirecionar para `/login` e renderizar o formulário.

## Branches

O trabalho recente acontece em **`feat/multi-apresentadora-agenda`**.

`migration/react-vercel` é nominalmente a branch de produção, mas está **defasada do que está no
ar** — os últimos deploys saíram da branch de feature. Se for publicar, confira em qual commit o
build realmente está antes de assumir que essa branch é a verdade.

## Estrutura

```
react-app/src/
  components/ui/          Card, Button, Badge, Modal, States, DataTable
  components/dashboard/   widgets da Home
  components/conteudo/    lives, grade, agenda
  components/forms/       modais de criar/editar
  pages/                  uma por rota
  routes/AppRouter.tsx    rotas + ProtectedRoute
  services/api.ts         axios + interceptors JWT + refresh no 401
  services/domain.ts      ~150 funções de API por domínio
  services/query-keys.ts  QK — chaves do React Query
  stores/auth-store.ts    Zustand
  utils/format.ts         asString/asNumber/asArray, formatMoney
```

Estado remoto é **sempre** React Query. Estilos são Tailwind v4 + tokens CSS
(`var(--primary)`, `var(--bg-elev-1)`, `var(--text-muted)`, `--success/--warning/--danger`).
**Nunca hardcode cor** — o tema escuro depende dos tokens.

## Convenções que não são negociáveis

- **Datas viajam como texto `'YYYY-MM-DD'`**, nunca como `Date` de timestamp. Reparsear com
  `new Date(iso)` interpreta como meia-noite UTC e devolve o dia anterior em qualquer fuso a
  oeste — esse bug já trocou segunda por domingo aqui. Use `Date.UTC(a, m-1, d)`.
- **Dinheiro:** `asNumber(json.campo)` sempre; o backend às vezes manda string.
- **Erro em catch:** `extractErrorMessage(e)` e mostra em toast.
- Testes deste repo são vitest com asserção sobre fonte + funções puras. Não há render de árvore
  completa salvo em `*.render.test.tsx`.

## Onde o produto é sensível

Qualquer coisa que pinte **vermelho** ou afirme **falta**, **duplicata** ou **valor devido** acusa
uma pessoa real. Nessas telas o erro barato é deixar de cobrar; o caro é acusar quem não fez nada.
Quando estiver em dúvida entre um falso positivo e um falso negativo, escolha o falso negativo.
