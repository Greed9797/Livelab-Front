# STATUS — Frontend LiveShop SaaS (Flutter Web)

**Última atualização**: 2026-05-08
**Tag prod**: `v1.5.0-deadcode-clean`
**Branch ativa**: `feat-ui-ux-architecture-v2`
**App**: https://livelab-3601f.web.app · https://app.grupolivelab.com.br

---

## ⚠️ Nota: Branch ativa é React, não Flutter

O desenvolvimento ativo ocorre no React app em `react-app/`.
Branch: `codex/blumenau-operational-fase1` (Vercel auto-deploy)
CLAUDE.md React: `react-app/CLAUDE.md`

Última sessão (2026-05-22):
- feat(cabines): conic border sheen animation (`.cabine-card-live::before`, `@property --cabine-ang`)
- perf: route-based lazy loading (React.lazy + Suspense) — reduz bundle inicial ~30-40%
- chore: 3 páginas mortas deletadas (LiveManualPage, PlaceholderPage, ComissoesPendentesPage)
- refactor: `src/services/query-keys.ts` criado (QK constants para React Query)
- fix(agenda): eventos `ao_vivo` com `live_id` abrem EditarLiveModal (não AgendarLiveModal)
- fix(sync): sincronização bidirecional lives↔agenda_eventos (backend)

Branch commit: `19a8ce9` (frontend), `f6ee8fc` (backend)

---

## Estado atual

- ✅ `flutter analyze`: 0 errors (287 warnings/info, todos não-críticos)
- ✅ `flutter build web --release`: sucesso
- ✅ Deploy Firebase Hosting funcional
- ✅ CI: `.github/workflows/frontend-ci.yml` (analyze + build em PR)
- ✅ A11y: `WidgetsBinding.instance.ensureSemantics()` ativo por default
- ✅ Error boundary global (release builds)
- ✅ CSP meta tag em `web/index.html`
- ✅ Dead code cleanup: ~750 linhas removidas (32 itens)

---

## Última sprint (2026-05-08 — release `v1.5.0-deadcode-clean`)

### Aplicado

**UX hardening (P3)**:
- `lib/main.dart`:
  - `WidgetsBinding.instance.ensureSemantics()` antes de runApp (a11y on por default)
  - `ErrorWidget.builder` global em release — substitui tela cinza por widget com retry CTA
  - `FlutterError.onError` hook pronto pra Sentry frontend futuro
- `web/index.html`: CSP meta tag espelhando firebase.json (defesa em camadas)
- `lib/screens/financeiro/financeiro_screen.dart`: labels renomeados pra clareza (B3 do QA):
  - `FATURAMENTO BRUTO` → `RECEITA FRANQUEADORA` (sub: fixo + comissão)
  - `FATURAMENTO LÍQUIDO` → `RECEITA LÍQUIDA` (sub: após custos operacionais)
  - `ENTRADAS` → `GMV DAS LIVES`
  - `SAÍDAS` → `CUSTOS`

**Dead code cleanup (32 itens, ~750 linhas)**:
- 7 unused imports
- 12 unused fields (livelab_v2/core/ll_theme + lead_dialog + master_crm_v3 + login + onboarding)
- 7 unused locals (cliente_dashboard 6× + livelab_scaffold _initials)
- `_confirmarRemoverUsuario` + `_mostrarConviteDialog` em configuracoes_screen (substituídos por usuarios_screen v2)
- `_RecomendacaoTile` widget (substituído por AppCardListItem inline)
- `app_scaffold.dart` linhas 115-581 (~466 linhas legacy: `_MenuContent`, `_MenuSectionLabel`, `_MenuItem`, `_logoSuffix`, `_Logo` substituídos por LivelabScaffold internals)

**Docs sênior**:
- `README.md` 250+ linhas (setup, arch, runbook)
- `CONTRIBUTING.md` (Conventional Commits, PR workflow)
- `.github/pull_request_template.md`
- `docs/adr/0001-flutter-web-canvaskit.md` (decisão de stack)

---

## Pendências para 100%

### 🔴 Pendências do backend que afetam frontend

- P0 user: role NOBYPASSRLS Supabase + DATABASE_URL Railway → fecha RLS leak completo
- Quando feito: alguns endpoints podem retornar shape diferente (specs E2E vão mostrar regressions reais vs falsos positivos)

### 🟡 P3 UX polish (sprint, ~6h)

- Empty states proper em todas listas (cabines, custos, leads, lives, vendas, recomendações)
- Loading skeletons (shimmer) em listas async — package shimmer já em pubspec
- Form validation client-side (cadastro cliente, contrato, custos) — bloquear submit inválido

### 🟡 P2.5 Widget tests (sprint, ~4h)

- `test/screens/login_test.dart`
- `test/screens/cabines_test.dart`
- `test/screens/financeiro_test.dart`
- `test/screens/solicitacoes_test.dart`
- `test/screens/usuarios_test.dart`

### 🟡 P2.7 Visual regression goldens (~3h)

- `flutter test --update-goldens` baseline para top-5 widgets design system
- Diff em CI quebra build se mudança não-intencional

### 🔵 Wave 2 — outros

- E2E Playwright UI specs match livelab_v2 sidebar text (atualmente esperam "Financeiro" mas pode estar diferente)
- Mobile responsive QA `resize_page(390, 844)` em 8 rotas críticas via chrome-devtools-mcp
- Lighthouse audit baseline em rota autenticada (manual via Chrome DevTools)

### 🔵 W3 — Roadmap (próximo trimestre)

- Sentry frontend (FlutterError.onError hook já pronto)
- Refatoração `cliente_configuracoes_screen.dart` (atualmente redirect para ConfigScreen v2)
- CDN canvaskit (Cloudflare ou jsdelivr) — acelera ~30% Flutter Web
- PWA offline-first
- Pre-render landing pública (sem canvaskit) pra SEO

---

## Comandos prontos

```bash
# Setup
flutter pub get
flutter run -d chrome --web-browser-flag "--window-size=1200,800"

# E2E auto-login (backend rodando :3001)
flutter run -d chrome \
  --dart-define=E2E_TESTING=true \
  --dart-define=E2E_ROLE=franqueado \
  --dart-define=E2E_EMAIL_FRANQUEADO=franqueado@liveshop.com \
  --dart-define=E2E_PASSWORD_FRANQUEADO=teste123

# Validação
flutter analyze              # 0 errors esperado
flutter test                 # smoke tests

# Build + deploy prod
flutter build web --release \
  --dart-define=API_URL=https://liveshop-saas-api-production.up.railway.app/v1
firebase deploy --only hosting --project livelab-3601f
```

---

## Arquitetura

### Stack

- Flutter 3.41 + Dart SDK 3.0+
- Riverpod 2.6 (Notifier / AsyncNotifier / FamilyAsyncNotifier / StreamProvider.family.autoDispose)
- Dio 5.6 (HTTP, interceptors JWT + 401 auto-refresh)
- flutter_secure_storage 9 (tokens; sem fallback in-memory em web — XSS protection)
- fl_chart 0.68 (charts)
- Phosphor Icons + Google Fonts (Inter + Instrument Serif)
- Renderer: CanvasKit (default em release)

### Estrutura

- `lib/main.dart` — entrypoint (a11y, error boundary, restore session, runApp)
- `lib/routes/app_routes.dart` — named routes + RoleRouteGuard
- `lib/services/api_service.dart` — Dio + token interceptors + SSE stream
- `lib/providers/` — 36 providers Riverpod
- `lib/screens/<modulo>/` — telas por feature
- `lib/livelab/` — design system v2 (`LlTokens`, `LivelabScaffold`)
- `lib/livelab_v2/` — admin screens v2 (master, cliente, agenda, config, crm)
- `lib/widgets/app_scaffold.dart` — wrapper para LivelabScaffold (39 usages, mantida)
- `lib/design_system/` — design system legacy (`AppColors`, `AppTypography`, `AppSpacing`)

### Routing

| Role | Rota inicial |
|---|---|
| franqueador_master | `/master` |
| franqueado / gerente | `/` |
| apresentador | `/cabines` |
| cliente_parceiro | `/cliente` |

---

## Credenciais teste (4 roles, seed_users backend)

| Role | Email | Senha |
|---|---|---|
| franqueador_master | admin@liveshop.com | admin123 |
| franqueado | franqueado@liveshop.com | teste123 |
| cliente_parceiro | cliente@liveshop.com | teste123 |
| apresentador | apresentador@liveshop.com | teste123 |

---

## Referências

- `README.md` — setup + arch detalhada
- `CONTRIBUTING.md` — branch model + PR workflow
- `docs/adr/0001-flutter-web-canvaskit.md` — decisão de stack
- `~/.claude/plans/crystalline-launching-acorn.md` — plano mestre
- `~/qa-e2e-report-2026-05-08.md` — QA E2E último ciclo
- `~/lighthouse-baseline-2026-05-07.md` — perf baseline
- Backend: `~/liveshop_saas_api-backend-/` (Fastify 5 + Supabase)
