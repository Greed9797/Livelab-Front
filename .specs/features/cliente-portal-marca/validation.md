# Cliente portal por marca: PASS

**Date**: 2026-10-21
**Verifier**: independent final verifier
**Frontend range**: `ff3df3347d5db81c226f52d5b163b3c02de3e7e7..14bafb0bf65aee1b756a31c23e70fdc8238b88b7`
**Backend range cross-checked**: `b987be35afb4bacd8f8160970b7ec3ba8c7e5506..4e3d690158c7501cc8d2a9f67810dbe83d1907e2`

The client UI is an isolated, read-only portal for the authenticated brand. All acceptance criteria have exact source-and-assertion evidence across the frontend and API boundary. No production, deployment, network-write, migration, credential, or real-database action was performed.

## Task completion

| Task | Status | Evidence |
| --- | --- | --- |
| T1 | Done | Temporal test remains deterministic; `npm run typecheck` and full test gate pass. |
| T2 | Done | Client routes, account-scoped queries, null/zero display, error/empty states, routing guard, and synthetic browser flows pass. |
| T3 | Done | Build, test, typecheck, Playwright, independent API review, and mutation sensor are complete. |

## Spec-anchored acceptance criteria

| ID | Spec-defined outcome | Evidence and exact assertion | Result |
| --- | --- | --- | --- |
| PORTAL-1 | One JWT-bound client and brand, otherwise 403. | API resolver enforces unique rows at `/Users/lucas/Livelab-back/src/lib/cliente_resolver.js:38-65`; API test asserts missing/ambiguous variants are `403` at `/Users/lucas/Livelab-back/test/cliente_portal_perfil.test.js:40-53`. | PASS |
| PORTAL-2 | Results are limited to tenant, client, and brand and ignore browser IDs. | Shared API predicate has all three exact IDs at `/Users/lucas/Livelab-back/src/routes/cliente_insights.js:90-95`; PGlite exact-brand result assertion is `/Users/lucas/Livelab-back/test/cliente_portal_revisado.pglite.test.js:63-71`. Browser switches A to B and asserts Aurora data disappears at `react-app/tests/cliente-portal/cliente-portal.e2e.ts:139-145`. | PASS |
| PORTAL-3 | Only ended reviewed/published eligible lives appear. | API predicate limits status to reviewed/published at `/Users/lucas/Livelab-back/src/routes/cliente_insights.js:90-95`; PGlite exact aggregate assertion is `/Users/lucas/Livelab-back/test/cliente_portal_revisado.pglite.test.js:63-71`. UI labels the history as reviewed at `react-app/src/pages/ClienteConteudoPage.tsx:34-46`. | PASS |
| PORTAL-4 | Permitted DTO only, with no presenter/internal/financial view. | Exact API DTO-key assertion is `/Users/lucas/Livelab-back/test/cliente_portal_revisado.pglite.test.js:74-86`. Browser asserts no finance, ranking, presenter, or agenda UI exists at `react-app/tests/cliente-portal/cliente-portal.e2e.ts:127-137`. | PASS |
| PORTAL-5 | Central route restriction occurs before restricted UI/outlets; auth recovery flows remain supported by API. | Frontend guard redirects before `Outlet` at `react-app/src/routes/ProtectedRoute.tsx:16-30`; its test asserts a client cannot render ranking at `react-app/src/routes/ProtectedRoute.test.tsx:26-30`. API allowlist/invalid-session assertions are `/Users/lucas/Livelab-back/test/cliente_portal_access.test.js:56-149`. | PASS |
| PORTAL-6 | 50-item history, full totals, stable offset pagination and SP period behavior. | Page uses `PAGE_SIZE = 50`, offset reset, and next/previous bounds at `react-app/src/pages/ClienteConteudoPage.tsx:16-48`. Browser asserts full 51-live total and final page at `react-app/tests/cliente-portal/cliente-portal.e2e.ts:152-166`. API PGlite asserts whole-period summary at `/Users/lucas/Livelab-back/test/cliente_portal_revisado.pglite.test.js:89-105`. | PASS |
| PORTAL-7 | Unknown is visible as unavailable, real zero stays zero, ratios with missing denominator are unavailable. | Dashboard uses explicit null-only placeholder at `react-app/src/pages/ClienteDashboardPage.tsx:17-18,36-45`; account target formatter preserves numeric zero at `react-app/src/pages/ConfiguracoesPage.tsx:28-30`. Assertions are `react-app/src/pages/ConfiguracoesPage.cliente.test.ts:5-12` and browser null/zero assertions at `react-app/tests/cliente-portal/cliente-portal.e2e.ts:143-149,168-177`. | PASS |
| PORTAL-8 | Queries are account-scoped and stale prior-account output is cleared; private API responses are no-store. | Query keys include `scope` at `react-app/src/services/query-keys.ts:40-52`; key distinction assertions are `react-app/src/services/query-keys.test.ts:50-56`; stale-account UI assertion is `react-app/src/pages/ClienteConteudoPage.test.tsx:21-32`. API no-store assertions are `/Users/lucas/Livelab-back/test/cliente_portal_access.test.js:65-67,83-86`. | PASS |
| PORTAL-9 | Exactly Results, Lives, My Account; mobile, empty/error, and own password work. | Client menu is `react-app/src/utils/access.ts:264-267`; client routes are `react-app/src/routes/AppRouter.tsx:77-84`; loading/error/empty are distinct at `react-app/src/pages/ClienteConteudoPage.tsx:34-50`. Desktop and mobile browser assertions cover navigation, forbidden paths, width, pagination, null target, and password at `react-app/tests/cliente-portal/cliente-portal.e2e.ts:119-198`. | PASS |
| PORTAL-10 | SQL-real isolation, mocks, gates, and independent review all pass. | API PGlite/mocks are `/Users/lucas/Livelab-back/test/cliente_portal_revisado.pglite.test.js:62-150` and `/Users/lucas/Livelab-back/test/cliente_portal_access.test.js:56-149`; frontend full gate and browser result are below. | PASS |

## Gate check

- **Frontend gate**: `npm run typecheck`, `npm run test -- --maxWorkers=4`, and `npm run build` on exact `14bafb0` passed: typecheck exit 0; 132 test files, 971 tests passed, 0 skipped; production build exit 0 in 52.70s.
- **Browser gate**: `npx playwright test --config=playwright.cliente-portal.config.ts` passed 4 synthetic desktop/mobile tests, 0 skipped, 26.3s. The config blocks external traffic at `react-app/tests/cliente-portal/cliente-portal.e2e.ts:68-96`.
- **Backend gate**: `npm test -- --maxWorkers=4` passed after permitting its loopback test server: 225 files, 2,169 passed, 74 pre-existing skips, 0 failures. The original sandbox-only `EPERM` loopback denial is distinct from the earlier PGlite-startup timeout. No test was deleted; the new legacy-PDF assertion increased the baseline count from 2,168 to 2,169.

## Discrimination sensor

| # | Mutation | Focused check | Result |
| --- | --- | --- | --- |
| 1 | Remove API tenant predicate | backend PGlite portal test | Killed |
| 2 | Allow `rascunho` results | backend PGlite portal test | Killed |
| 3 | Remove API brand predicate | backend PGlite portal test | Killed |
| 4 | Bypass `cliente_parceiro` path guard | `ProtectedRoute.test.tsx` | Killed |
| 5 | Remove account scope from home query key | `query-keys.test.ts` | Killed |
| 6 | Render unknown target as zero | `ConfiguracoesPage.cliente.test.ts` | Killed |

All six behavior-level mutations were made only in disposable `git archive HEAD` copies. All six were killed by the stated test. The copies were deleted. Both real worktrees had empty porcelain output after cleanup and before adding these reports.

## Scope and quality review

The changed UI files directly provide the authorized client surface. The protected route blocks the existing public-ranking route before its outlet can mount, while internal roles retain access, as asserted by `react-app/src/routes/ProtectedRoute.test.tsx:26-40`. No financial, presenter, ranking, export, onboarding, dependency, deployment, or migration feature was introduced. `git diff --check` was clean. The review followed `/Users/lucas/.agents/skills/tlc-spec-driven/references/coding-principles.md`.

## Validation: PASS

**PASS.** PORTAL-1 through PORTAL-10 are verified. No acceptance gap, precision gap, security finding, or surviving mutation requires a fix task.


## Production integration validation — 2026-10-26

The release combines the approved portal commit `2cbf087c469b9cf541b623b179210963a711c78f` with the frontend currently published from `3102003f2ec5214e2bf68422f18b80a4d3ca2080` (`codex/training-production`). Existing training screens and route guards are preserved. The only merge conflict was in `AppRouter.tsx`: keep the training page imports and the portal redirect from onboarding; remove the unused onboarding page import.

DOMPurify was updated in the lockfile from 3.4.16 to 3.4.17 after the current audit detected newly published advisories. No dependency ranges or other installed package versions changed in this fix.

Validation on the combined tree: TypeScript PASS; hooks lint and production build PASS; 138 test files and 1,001 unit tests PASS; all four synthetic desktop/mobile portal browser scenarios PASS; production dependency audit reports zero vulnerabilities. Browser scenarios use synthetic fixtures only. No real customer access or password was changed. The backend must be published and healthy before this frontend release.
