# STATUS — Frontend Livelab

**Última atualização:** 2026-10-05

- **App ativo:** `react-app/` (React/Vite). Flutter removido.
- **Produção:** https://app.grupolivelab.com.br — deploy automático a partir de `feat/multi-apresentadora-agenda` (`.github/workflows/frontend-deploy.yml`).
- **Último deploy relevante:** cadastro unificado (lista "Clientes" atrás de `VITE_CADASTRO_UNIFICADO`, desligada) + ajustes do financeiro (caixa no DRE, cancelar apresentadora/imposto, janela de comissão) — PR #57.
- **Gates:** `npm run typecheck`, `npm run test`, `npm run build` em `react-app/`.

## Pendências conhecidas

- `livelab-3601f.web.app` (Firebase, app Flutter antigo) ainda no ar — desativar no console do Firebase Hosting.
- `migration/react-vercel` está defasada de `feat/multi-apresentadora-agenda`; unificar a branch de produção está fora do escopo da limpeza de out/2026.
- Criação/edição de cadastro ainda usa `/clientes` e `/marcas`; `409 USE_CADASTRO_ENDPOINT` só mostra o erro.
