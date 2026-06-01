# ADR 0001 — Flutter Web (CanvasKit) para o frontend SaaS

**Status**: Aceito
**Data**: 2026-05-08
**Decisor**: Tech lead (Vitor / Leonardo)

## Contexto

LiveShop SaaS é uma plataforma B2B multi-tenant com 4 painéis distintos (franqueador master, franqueado, cliente_parceiro, apresentador). Cada role tem ~10 telas com KPIs, charts (fl_chart), real-time SSE de lives ao vivo, formulários ricos e tabelas densas.

Equipe: 1 dev primário + colaboradores eventuais. Critérios:
- Velocidade de iteração — design system único entre roles
- Mobile + desktop responsivo no mesmo bundle
- Charts complexos (heatmap, line, bar) sem bibliotecas extras
- SSE/streaming nativo
- Sem necessidade de SEO (app autenticado B2B)

## Decisão

Adotar **Flutter Web com renderer CanvasKit** como única plataforma frontend.

## Alternativas consideradas

### React + Next.js + Tailwind/shadcn

**Prós**:
- Ecossistema maior, mais devs disponíveis no mercado
- SSR nativo (não precisamos pra B2B autenticado, mas existe)
- Bundle inicial menor (~200KB-1MB vs Flutter 13MB main.dart.js + 31MB canvaskit)
- Lighthouse scores nativos (HTML semântico)

**Contras**:
- Charts ricos requerem Recharts/Visx + custom code; Flutter `fl_chart` cobre tudo out-of-the-box
- App mobile separado (React Native) duplica código vs Flutter mesma codebase
- Design system com 4 roles diferentes exige mais boilerplate em React (compound components vs Flutter widget composition)
- SSE com fetch/EventSource em React é OK mas não tem o `StreamProvider.family.autoDispose` do Riverpod

### Vue 3 + Vite

Mesma análise do React — ecossistema menor, mesma constraint de chart libs.

### SvelteKit

Promissor mas time pequeno priorizou stack já dominado.

## Consequências

### Positivas

- **Codebase única** para web + (futuro) mobile via Flutter mesmo (`flutter run -d ios`)
- **Hot reload < 1s** em desenvolvimento
- **Riverpod** state management cobre síncrono, async, families e streams (SSE) com mesma API
- **Design system** via tokens (`AppColors`, `AppSpacing`, `AppRadius`, `LlTokens`) é trivial — Theme extensions Flutter
- **Charts sem deps externos** — `fl_chart` cobre line/bar/heatmap
- **Real-time live updates** — `StreamProvider.family.autoDispose` + SSE via Dio = elegante
- **PWA** out-of-the-box (`flutter build web --pwa-strategy offline-first`)

### Negativas (aceitas)

- **Bundle size 48MB total** (main.dart.js 13MB + canvaskit.wasm 31MB). Mitigação: assets `immutable` cache 1 ano em Firebase Hosting + brotli compression. Primeiro load lento; subsequentes cached.
- **Lighthouse score Performance baixo** (~50-65 em mobile). Mitigação: aceitar para B2B autenticado; landing pages externas usam Vite + HTML estático separado.
- **Lighthouse Accessibility = 0** com canvaskit (canvas único, sem HTML semântico). Mitigação: `WidgetsBinding.instance.ensureSemantics()` ativo por default em `main.dart` — Flutter constroi árvore `flt-semantics` que screen readers conseguem ler. Não é nativo HTML mas funciona.
- **SEO inexistente** — canvaskit é 100% client-side render. Aceito porque app é autenticado; landing externa em Webflow/Vercel separada.
- **Pool de devs menor** que React — risco de hire. Mitigação: documentação extensa (READMEs sênior, CONTRIBUTING, ADRs); Dart/Flutter tem learning curve acessível para JS devs.
- **Login form com a11y bridge é flaky** em E2E (testes Playwright dropam primeiro caractere). Mitigação: helper `loginViaAPI` em `e2e/helpers/auth.js` com retry 3× + polling.

## Implementação

- **Renderer**: CanvasKit (default em release builds Flutter Web)
- **Build prod**: `flutter build web --release --dart-define=API_URL=https://liveshop-saas-api-production.up.railway.app/v1`
- **Deploy**: Firebase Hosting com cache aggressive em assets/canvaskit
- **State**: Riverpod 2.6 (4 patterns: Notifier, AsyncNotifier, FamilyAsyncNotifier, StreamProvider.family.autoDispose)
- **Routing**: named routes + `RoleRouteGuard` wrapper para RBAC
- **Theme**: 2 sistemas coexistindo (legacy `AppColors` + livelab v2 `LlTokens`) — migração progressiva

## Revisão

Re-avaliar se:
- Bundle size virar bloqueador (>20MB main.dart.js)
- Time crescer >5 devs (talvez vale split em Next + Flutter mobile)
- Necessidade de SEO em alguma área (mover para sub-domínio Vue/Next)

## Referências

- `lib/main.dart` — entrypoint com `ensureSemantics`, error boundary
- `firebase.json` — CSP + cache headers
- `~/lighthouse-baseline-2026-05-07.md` — scores baseline + análise
