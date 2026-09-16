# Financeiro com DRE confiável - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow.

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

**Design**: `.specs/features/financeiro-dre-confiavel/design.md`
**Status**: Approved

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `/Users/lucas/Livelab-Front/AGENTS.md`, frontend `README.md`, `package.json`, `playwright.config.ts`; backend behavior baseline in `/Users/lucas/Livelab-back/AGENTS.md` and `test/financeiro_operacional.test.js`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Financial normalization | unit | All branches; reconciliation, `fixo_ou_comissao`, zero revenue, missing payload and spec edge cases | `src/components/financeiro/*.test.ts` | `npx vitest run src/components/financeiro/operational-dre.test.ts` |
| Financial UI component | render unit | All DRE sections, totals, negative result, collapsed summary and unavailable state | `src/components/financeiro/*.render.test.tsx` | `npx vitest run src/components/financeiro/OperationalDre.render.test.tsx` |
| Finance page integration | e2e | Read-only happy path, expansion, negative margin, no partial margin labels and no writes | `tests/e2e/*.e2e.ts` | `npx playwright test tests/e2e/financeiro-dre.e2e.ts --project=chromium` |
| Administrative presentation | unit/source contract | Obsolete flat base label absent; active tier badge remains | `src/pages/*.test.ts` | `npx vitest run src/pages/commissions-unification.test.ts` |
| Orphan file deletion | none | Build and repository search prove no remaining import | - | build gate only |

## Gate Check Commands

> Generated from codebase and approved with the implementation request.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After normalization, component or admin presentation tasks | `npm run typecheck && npm run test` |
| Full | After Finance page integration | `npm run typecheck && npm run test && npx playwright test tests/e2e/financeiro-dre.e2e.ts --project=chromium` |
| Build | After phase completion and cleanup | `npm run typecheck && npm run test && npm run build` |
| Backend regression | Final feature gate | `npm test` in `/private/tmp/livelab-presenter-lives-back` |

## Execution Plan

### Phase 1: Financial model

```
T1
```

### Phase 2: DRE experience

```
T1 → T2 → T3 → T4
```

### Phase 3: Cleanup

```
T4 → T5
```

## Task Breakdown

### T1: Normalize and reconcile operational finance

**What**: Create the pure operational DRE model from the existing API payload.
**Where**: `src/components/financeiro/operational-dre.ts`
**Depends on**: None
**Reuses**: `src/utils/format.ts`, current `entradas`, `saidas`, `totais` payload
**Requirement**: FIN-02, FIN-03, FIN-04, FIN-06, FIN-07, FIN-08, FIN-10, FIN-11, FIN-19, FIN-20, FIN-21, FIN-22

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Groups revenue by brand with fixed, commission, recognized revenue and winner criterion.
- [x] Groups fixed, commission and additions by presenter.
- [x] Groups manual costs by type and preserves individual entries.
- [x] Reconciles all values in integer cents and rejects incomplete or divergent payloads.
- [x] Returns `null` margin when revenue is zero and preserves negative results.
- [x] Gate passes with at least 7 focused tests.

**Status:** Done. Focused tests: 7 passed; quick gate: 523 tests passed.

**Tests**: unit
**Gate**: quick
**Commit**: `feat(financeiro): add reconciled operational DRE model`

### T2: Render the collapsible DRE

**What**: Create the visual DRE component with summary metrics and expandable sections.
**Where**: `src/components/financeiro/OperationalDre.tsx`
**Depends on**: T1
**Reuses**: `MetricCard`, `Card`, `Badge`, `EmptyState`, formatters and native `details`
**Requirement**: FIN-01, FIN-03, FIN-04, FIN-05, FIN-06, FIN-07, FIN-08, FIN-09, FIN-10, FIN-19, FIN-22

**Tools**:

- MCP: NONE
- Skill: `redesign-existing-projects`, `tlc-spec-driven`

**Done when**:

- [x] Displays revenue, total expenses, operational result and margin from one reconciled model.
- [x] Shows ordered collapsible sections for brands, presenters and operating costs.
- [x] Shows totals and counts while sections are collapsed.
- [x] Shows compared values and winning rule for `fixo_ou_comissao`.
- [x] Uses existing theme tokens, keyboard focus and semantic HTML.
- [x] Displays no invented zero when the model is unavailable.
- [x] Gate passes with at least 5 render tests.

**Status:** Done. Render tests: 6 passed; quick gate: 529 tests passed.

**Tests**: unit
**Gate**: quick
**Commit**: `feat(financeiro): render collapsible operational DRE`

### T3: Make DRE the primary Finance view

**What**: Replace the partial commercial margin and misleading flow with the reconciled DRE while preserving period, costs, tabs and permissions.
**Where**: `src/pages/FinanceiroPage.tsx`
**Depends on**: T2
**Reuses**: Existing operational query, cost CRUD, commission alerts and page layout
**Requirement**: FIN-01, FIN-12, FIN-13, FIN-15, FIN-16, FIN-17, FIN-20, FIN-23

**Tools**:

- MCP: NONE
- Skill: `redesign-existing-projects`, `tlc-spec-driven`

**Done when**:

- [x] Operational tab has one highlighted result basis and no “margem após custos manuais”.
- [x] Previous-period and cash-flow queries used only by the removed presentation are gone.
- [x] Cost CRUD and read-only permissions remain unchanged.
- [x] Commission, client and franchisor tabs remain available with current behavior.
- [x] Browser test expands DRE details, observes negative result and performs no writes.
- [x] Full gate passes with at least 1 end-to-end scenario containing multiple brands, presenters and costs.

**Status:** Done. Chromium E2E: 1 passed; full frontend gate: 72 files/529 tests passed.

**Tests**: e2e
**Gate**: full
**Commit**: `feat(financeiro): make operational DRE the primary view`

### T4: Remove obsolete flat commission label

**What**: Stop presenting the legacy presenter `comissao_pct` as an active base in the users list.
**Where**: `src/components/configuracoes/UsuariosList.tsx`
**Depends on**: T3
**Reuses**: Active `FaixaBadge` and fixed compensation display
**Requirement**: FIN-13, FIN-14, FIN-17, FIN-18

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Presenter remuneration still shows fixed compensation and active tier badge.
- [ ] The flat “base X%” line is absent.
- [ ] No API payload, PDF field or database column is changed.
- [ ] Gate passes with a source contract assertion.

**Tests**: unit
**Gate**: quick
**Commit**: `fix(usuarios): hide obsolete flat presenter commission`

### T5: Remove orphaned commercial margin components

**What**: Delete the two components that only rendered the removed partial margin and prove no imports remain.
**Where**: `src/components/dashboard/FinanceiroHeroPanel.tsx`
**Depends on**: T4
**Reuses**: NONE
**Requirement**: FIN-16, FIN-17, FIN-18

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `FinanceiroHeroPanel.tsx` and `ReceitaWaterfall.tsx` are deleted.
- [ ] Repository search finds no import or render reference to either component.
- [ ] Frontend typecheck, complete unit suite and build pass.
- [ ] Backend complete test suite passes unchanged.

**Tests**: none
**Gate**: build
**Commit**: `refactor(financeiro): remove partial margin components`

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1: T1
Phase 2: T1 → T2 → T3 → T4
Phase 3: T4 → T5
```

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | One pure model module plus co-located tests | ✅ Granular |
| T2 | One UI component plus co-located tests | ✅ Granular |
| T3 | One page integration plus co-located e2e | ✅ Granular |
| T4 | One administrative component plus co-located source assertion | ✅ Granular |
| T5 | One cohesive orphan cleanup | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Start | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Financial normalization | unit | unit | ✅ OK |
| T2 | Financial UI component | render unit | unit | ✅ OK |
| T3 | Finance page integration | e2e | e2e | ✅ OK |
| T4 | Administrative presentation | unit/source contract | unit | ✅ OK |
| T5 | Orphan file deletion | none | none | ✅ OK |
