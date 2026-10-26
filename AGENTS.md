# Livelab — Frontend

Painel de operação de uma franquia de live-commerce em Blumenau/SC. Apresentadoras fazem lives em
cabines para marcas; daí saem GMV, comissão e metas.

## O projeto tem DOIS repositórios

- `~/Livelab-Front` — este. O app ativo é **`react-app/`** (React 18 + TypeScript + Vite).
- `~/Livelab-back` — a API (Fastify + Postgres, multi-tenant com RLS).

Quase toda feature toca os dois. Se a tarefa envolve um número que aparece na tela, o cálculo
quase certamente mora no backend.

O app Flutter legado que ficava na raiz foi removido em out/2026; o único app é `react-app/`.

## Comandos

```bash
cd react-app
npm run dev          # precisa de VITE_DEV_API_PROXY_TARGET no .env.local (CORS)
npm run typecheck    # tsc -b
npm run test         # vitest
npm run build        # lint:hooks + tsc -b + vite build
```

**Gates antes de qualquer entrega:** `npm run typecheck && npm run test`, os dois verdes.

## Deploy e estado publicado

Consulte [o registro do release de produção de 26/10/2026](docs/production-release-2026-10-26.md)
antes de tratar uma branch local como o estado publicado. Ele registra o SHA e a branch
confirmados, a versão servida, a execução do workflow e as verificações realizadas.

O deploy é feito pelo GitHub Actions em `.github/workflows/frontend-deploy.yml`. Push em
`feat/multi-apresentadora-agenda` ou `migration/react-vercel`, ou `workflow_dispatch`, inicia
typecheck, testes e build antes da publicação. O workflow usa o build remoto da Vercel e injeta
a URL de produção da API pelo job. Não publique um build local `--prebuilt`: o valor sensível de
`VITE_API_URL` pode virar o literal `[SENSITIVE]` no bundle.

Após um deploy, confira `https://app.grupolivelab.com.br/version.json` e valide a página no
navegador. O timestamp da versão confirma qual build serve o domínio; sozinho, não verifica o
fluxo autenticado de cada papel. As limitações de smoke descritas no registro de release também
se aplicam.

O checkout primário pode conter trabalho local mais recente ou mais antigo que a produção. A
presença de uma rota, branch ou commit nesse checkout não prova que ela está publicada. Use o SHA
do registro e consulte o código desse commit quando precisar conferir comportamento publicado.

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
