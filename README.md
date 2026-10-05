# Livelab — Frontend

Painel da franquia de live-commerce Livelab: franqueador master, franqueados, operação, apresentadoras e clientes-parceiros.

O app é **`react-app/`** (React 18 + TypeScript + Vite + TanStack Query + Zustand + Tailwind). O app Flutter antigo foi removido em out/2026.

## Rodar local

```bash
cd react-app
npm ci
cp .env.example .env.local   # ajuste VITE_API_URL ou o proxy de dev
npm run dev
```

## Checagens

```bash
cd react-app
npm run typecheck
npm run test
npm run build
```

## Produção

- App: https://app.grupolivelab.com.br (Vercel, projeto `liveshop-saas-frontend-react`).
- Deploy: automático pelo GitHub Actions (`.github/workflows/frontend-deploy.yml`) a cada push em `feat/multi-apresentadora-agenda` ou `migration/react-vercel`. Manual só em exceção: `react-app/DEPLOY-HANDOFF.md`.
- Conferir: `curl -s https://app.grupolivelab.com.br/version.json` (timestamp `v` recente).
- API: repositório `Livelab-back`, no Railway (`https://liveshop-saas-api-production.up.railway.app/v1`).

Mais detalhes: `AGENTS.md` (convenções e armadilhas) e `CLAUDE.md` (estrutura e rotas).
