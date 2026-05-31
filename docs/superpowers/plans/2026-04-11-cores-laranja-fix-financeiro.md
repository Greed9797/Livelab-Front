# Cores Laranja + Fix Financeiro RLS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all purple UI elements with brand orange and fix the 500 error when creating costs in financeiro.

**Architecture:** Two independent changes — one frontend color constant swap, one backend RLS fix. No new files, no new dependencies.

**Tech Stack:** Flutter/Dart (frontend), Node.js/Fastify (backend)

---

### Task 1: Replace purple with orange in frontend theme

**Files:**
- Modify: `-liveshop_saas-frontend-/lib/theme/app_colors.dart:16`

- [ ] **Step 1: Change `infoPurple` value to match `primaryOrange`**

In `lib/theme/app_colors.dart`, change line 16 from:

```dart
static const Color infoPurple = Color(0xFF8E44AD);
```

to:

```dart
static const Color infoPurple = Color(0xFFE8673C);
```

This single change propagates to all ~20 references via `infoPurple` and its alias `lilac` (line 65).

- [ ] **Step 2: Run flutter analyze to verify no issues**

Run:
```bash
cd ~/"-liveshop_saas-frontend-" && flutter analyze
```

Expected: No new errors. Same warnings as before (unused imports, const suggestions).

- [ ] **Step 3: Commit**

```bash
cd ~/"-liveshop_saas-frontend-"
git add lib/theme/app_colors.dart
git commit -m "fix(theme): replace purple accent with brand orange across all UI"
```

---

### Task 2: Fix RLS in POST /v1/financeiro/custos

**Files:**
- Modify: `liveshop_saas_api-backend-/src/routes/financeiro.js:116-130`
- Test: `liveshop_saas_api-backend-/test/routes.regressions.test.js`

- [ ] **Step 1: Add a regression test for POST /v1/financeiro/custos**

In `test/routes.regressions.test.js`, add a new test inside the existing `describe` block:

```javascript
it('POST /v1/financeiro/custos deve usar dbTenant (não app.db)', async () => {
  const app = Fastify()
  const mockQuery = vi.fn().mockResolvedValue({
    rows: [{ id: 'uuid-1', descricao: 'Aluguel', valor: 1500, tipo: 'aluguel', competencia: '2026-04' }]
  })
  const mockRelease = vi.fn()

  app.decorate('authenticate', async (req) => {
    req.user = { sub: 'user-1', tenant_id: 'tenant-1', papel: 'franqueado' }
  })
  app.decorate('dbTenant', vi.fn().mockResolvedValue({ query: mockQuery, release: mockRelease }))
  app.decorate('db', { query: vi.fn() })

  const { financeiroRoutes } = await import('../src/routes/financeiro.js')
  await app.register(financeiroRoutes)
  await app.ready()

  const res = await app.inject({
    method: 'POST',
    url: '/v1/financeiro/custos',
    payload: { descricao: 'Aluguel', valor: 1500, tipo: 'aluguel', competencia: '2026-04' }
  })

  expect(res.statusCode).toBe(201)
  expect(app.dbTenant).toHaveBeenCalledWith('tenant-1')
  expect(mockRelease).toHaveBeenCalled()
  expect(app.db.query).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd ~/liveshop_saas_api-backend- && npx vitest run test/routes.regressions.test.js
```

Expected: FAIL — `app.dbTenant` was not called (current code uses `app.db.query` directly).

- [ ] **Step 3: Fix the POST handler to use dbTenant**

In `src/routes/financeiro.js`, replace lines 123-129:

```javascript
    const result = await app.db.query(
      `INSERT INTO custos (tenant_id, descricao, valor, tipo, competencia)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, descricao, valor, tipo, competencia`,
      [tenant_id, descricao, valor, tipo, competencia]
    )
    const row = result.rows[0]
    return reply.code(201).send({ ...row, valor: toNum(row.valor) })
```

with:

```javascript
    const db = await app.dbTenant(tenant_id)
    try {
      const result = await db.query(
        `INSERT INTO custos (tenant_id, descricao, valor, tipo, competencia)
         VALUES ($1,$2,$3,$4,$5) RETURNING id, descricao, valor, tipo, competencia`,
        [tenant_id, descricao, valor, tipo, competencia]
      )
      const row = result.rows[0]
      return reply.code(201).send({ ...row, valor: toNum(row.valor) })
    } finally {
      db.release()
    }
```

- [ ] **Step 4: Run all tests to verify the fix**

Run:
```bash
cd ~/liveshop_saas_api-backend- && npm test
```

Expected: All tests PASS (18 existing + 1 new = 19).

- [ ] **Step 5: Commit**

```bash
cd ~/liveshop_saas_api-backend-
git add src/routes/financeiro.js test/routes.regressions.test.js
git commit -m "fix(financeiro): use dbTenant for POST custos — fixes RLS 500 error"
```
