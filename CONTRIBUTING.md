# Contribuindo — Frontend Livelab

## Branch e PR

1. Parta de `feat/multi-apresentadora-agenda` (é dela que sai a produção hoje).
2. Commits em Conventional Commits, em português: `feat(financeiro): …`, `fix(agenda): …`, `chore: …`.
3. Abra PR contra `feat/multi-apresentadora-agenda`. O merge publica em produção pelo GitHub Actions — só mergeie com as checagens verdes.

## Antes de abrir PR

```bash
cd react-app
npm run typecheck
npm run test
npm run build
```

Mudança de tela: rode `npm run dev` e confira com os papéis afetados (master, franqueado, cliente_parceiro) e em largura de celular (390px).

## Regras de código

- Nova página: `react-app/src/pages/NomePage.tsx`, rota em `src/routes/AppRouter.tsx`, menu em `src/utils/access.ts`.
- Estado remoto sempre via React Query (chaves em `src/services/query-keys.ts`); chamadas de API em `src/services/`.
- Nunca hardcode cor: use os tokens CSS (`var(--primary)`, `var(--text-muted)`, …).
- Datas como texto `YYYY-MM-DD`; dinheiro com `asNumber`; erros com `extractErrorMessage(e)` em toast.

## Nunca commitar

- `.env*` com valores reais, tokens, chaves.
- `dist/`, `node_modules/`, saídas de ferramentas locais (`.agent/`, `graphify-out/`, `.superpowers/`).

## Depois do deploy

`curl -s https://app.grupolivelab.com.br/version.json` — o timestamp `v` precisa ser novo. Rollback: reverter o merge (novo deploy publica a versão anterior).
