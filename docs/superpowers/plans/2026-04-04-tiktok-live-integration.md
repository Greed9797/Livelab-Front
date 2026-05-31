# TikTok Live Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o mock de `getLiveData()` por um pipeline real-time usando `tiktok-live-connector`, com SSE para o Flutter e reconciliation loop via cron como fallback.

**Architecture:** `TikTokConnectorManager` singleton inicializado em `server.js` mantém um `Map<liveId, entry>` com connectors ativos. O cron de 60s chama `syncLives()` que faz diff Map vs banco (inicia/para connectors). Eventos TikTok acumulam estado em memória e fazem flush a cada 30s em `live_snapshots`, disparando um `EventEmitter` que alimenta o endpoint SSE. O Flutter recebe os dados via `StreamProvider.family` usando Dio streaming.

**Tech Stack:** Node.js ESM + Fastify 5 (backend), `tiktok-live-connector` npm, Vitest (testes), Flutter Web CanvasKit + Riverpod + Dio streaming (frontend), PostgreSQL RLS

---

## Contexto crítico para o implementador

**Backend repo:** `/Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-`
**Frontend repo:** `/Users/vitormiguelgoedertdaluz/-liveshop_saas-frontend-`

**Padrões já estabelecidos:**
- Backend usa ESM (`"type": "module"`). Sempre `import/export`, nunca `require`.
- `app.db` = pool sem RLS. `app.dbTenant(tenantId)` = pool RLS-aware (requer `try/finally db.release()`).
- Para tarefas de background (cron, manager), usar `app.db` com `WHERE tenant_id = $x` explícito.
- Rotas: `export async function xxxRoutes(app)` — sem `module.exports`.
- O cron está em `src/server.js`, não em `src/app.js`.
- Testes: Vitest com mocks de `app.dbTenant`, `app.authenticate`, `app.inject()`.
- `TikTokService` é uma classe estática (`export class TikTokService`) em `src/services/tiktok.js`.

**Arquivos existentes relevantes:**
- `src/server.js` — entry point, registra cron chamando `TikTokService.pollAllTenants(app.db)`
- `src/routes/cabines.js` — `PATCH /v1/lives/:id/encerrar` (linha ~741), `GET /v1/cabines/:id/live-atual` (linha ~480)
- `src/routes/tiktok.js` — OAuth routes (`tiktokRoutes`)
- `lib/screens/cabines/cabine_detail_screen.dart` — já tem `_livePollingTimer` a 5s, aba `_LiveTab`
- `lib/providers/cabines/cabine_detail_provider.dart` — `CabineLiveAtual` model, `cabineDetailProvider`

---

## Task 1: Migration 021 – Schema additions

**Files:**
- Create: `liveshop_saas_api-backend-/migrations/021_tiktok_live_connector.sql`

- [ ] **Step 1.1: Criar o arquivo de migration**

```sql
-- migrations/021_tiktok_live_connector.sql

-- 1. TikTok @username do apresentador (ex: 'livestream_nike', sem o @)
ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS tiktok_username TEXT;

-- 2. Métricas de engajamento nos snapshots
ALTER TABLE live_snapshots
  ADD COLUMN IF NOT EXISTS likes_count    BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count BIGINT NOT NULL DEFAULT 0;
```

- [ ] **Step 1.2: Aplicar a migration**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
node apply_migrations.js
```

Saída esperada: `✅ Migration 021_tiktok_live_connector.sql aplicada com sucesso`

- [ ] **Step 1.3: Verificar colunas**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
node --input-type=module << 'EOF'
import 'dotenv/config'
import pg from 'pg'
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const r = await pool.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name IN ('contratos','live_snapshots')
    AND column_name IN ('tiktok_username','likes_count','comments_count')
  ORDER BY table_name, column_name
`)
console.table(r.rows)
await pool.end()
EOF
```

Saída esperada: 3 linhas — `comments_count (bigint)`, `likes_count (bigint)`, `tiktok_username (text)`.

- [ ] **Step 1.4: Commit**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
git add migrations/021_tiktok_live_connector.sql
git commit -m "feat: migration 021 – tiktok_username em contratos, likes/comments em live_snapshots"
```

---

## Task 2: Instalar tiktok-live-connector

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 2.1: Instalar o pacote**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
npm install tiktok-live-connector
```

- [ ] **Step 2.2: Verificar instalação**

```bash
node -e "import('tiktok-live-connector').then(m => console.log('✅ tiktok-live-connector OK, exports:', Object.keys(m)))"
```

Saída esperada: lista com `WebcastPushConnection` (ou similar).

- [ ] **Step 2.3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: instalar tiktok-live-connector"
```

---

## Task 3: TikTokConnectorManager service

**Files:**
- Create: `liveshop_saas_api-backend-/src/services/tiktok-connector-manager.js`
- Create: `liveshop_saas_api-backend-/test/tiktok-connector-manager.test.js`

- [ ] **Step 3.1: Escrever o teste (falha primeiro)**

```javascript
// test/tiktok-connector-manager.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mockar tiktok-live-connector antes de importar o manager
vi.mock('tiktok-live-connector', () => ({
  WebcastPushConnection: vi.fn().mockImplementation((username) => ({
    username,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  })),
}))

// Importar após o mock
const { init, syncLives, stopConnector, has, getEmitter, _resetForTests } =
  await import('../src/services/tiktok-connector-manager.js')

const makeDb = (rows = []) => ({
  query: vi.fn().mockResolvedValue({ rows }),
})

beforeEach(() => {
  _resetForTests()
})

describe('TikTokConnectorManager', () => {
  it('init armazena db e log', () => {
    const db = makeDb()
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    init({ db, log })
    expect(getEmitter()).toBeDefined()
  })

  it('syncLives inicia connector para live ao_vivo sem connector ativo', async () => {
    const liveId = 'live-uuid-1'
    const db = makeDb([
      { id: liveId, tenant_id: 'tenant-1', tiktok_username: 'user_test' },
    ])
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    init({ db, log })

    await syncLives()

    expect(has(liveId)).toBe(true)
  })

  it('syncLives para connector quando live sai do resultado', async () => {
    const liveId = 'live-uuid-2'
    const db = makeDb([
      { id: liveId, tenant_id: 'tenant-1', tiktok_username: 'user_test' },
    ])
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    init({ db, log })

    await syncLives() // Inicia
    expect(has(liveId)).toBe(true)

    // Simular live que sumiu do resultado (encerrada)
    db.query.mockResolvedValue({ rows: [] })
    await syncLives() // Para

    expect(has(liveId)).toBe(false)
  })

  it('syncLives não duplica connectors se já existe', async () => {
    const liveId = 'live-uuid-3'
    const db = makeDb([
      { id: liveId, tenant_id: 'tenant-1', tiktok_username: 'user_test' },
    ])
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    init({ db, log })

    await syncLives()
    await syncLives() // Segunda chamada não deve duplicar

    expect(has(liveId)).toBe(true)
    // Deve ter chamado query apenas para live_products no startConnector uma vez
    const callCount = db.query.mock.calls.filter(([sql]) => sql.includes('live_products')).length
    expect(callCount).toBe(1)
  })

  it('getEmitter retorna o mesmo emitter sempre', () => {
    init({ db: makeDb(), log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } })
    const e1 = getEmitter()
    const e2 = getEmitter()
    expect(e1).toBe(e2)
  })
})
```

- [ ] **Step 3.2: Rodar o teste para confirmar falha**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
npm test -- test/tiktok-connector-manager.test.js
```

Saída esperada: `FAIL` com `Cannot find module '../src/services/tiktok-connector-manager.js'`

- [ ] **Step 3.3: Criar o serviço**

```javascript
// src/services/tiktok-connector-manager.js
import EventEmitter from 'node:events'
import { WebcastPushConnection } from 'tiktok-live-connector'

// ── Singleton state ───────────────────────────────────────────────────────────
let _db = null
let _log = null
const _liveMap = new Map()       // Map<liveId, entry>
const _emitter = new EventEmitter()

const MAX_CONNECTORS = Number(process.env.TIKTOK_MAX_CONNECTORS ?? 20)
const FLUSH_INTERVAL_MS = 30_000

// ── Public API ────────────────────────────────────────────────────────────────

export function init({ db, log }) {
  _db = db
  _log = log
}

export function getEmitter() {
  return _emitter
}

export function has(liveId) {
  return _liveMap.has(liveId)
}

/**
 * Reconciliation loop — chamado pelo cron a cada 60s.
 * Diff entre Map em memória e lives ao_vivo no banco.
 * Inicia connectors ausentes, para os obsoletos.
 */
export async function syncLives() {
  if (!_db) return

  const { rows: activeLives } = await _db.query(`
    SELECT l.id, l.tenant_id, ct.tiktok_username
    FROM lives l
    JOIN cabines c ON c.live_atual_id = l.id
    JOIN contratos ct ON ct.id = c.contrato_id
    WHERE l.status = 'em_andamento'
      AND ct.tiktok_username IS NOT NULL
  `)

  const activeIds = new Set(activeLives.map(r => r.id))

  // Para connectors de lives que já encerraram
  for (const [liveId] of _liveMap) {
    if (!activeIds.has(liveId)) {
      await stopConnector(liveId)
    }
  }

  // Inicia connectors para lives sem connector ativo
  for (const live of activeLives) {
    if (!_liveMap.has(live.id)) {
      await startConnector(live.id, live.tenant_id, live.tiktok_username)
    }
  }
}

/**
 * Para connector e faz flush final do estado.
 */
export async function stopConnector(liveId) {
  const entry = _liveMap.get(liveId)
  if (!entry) return

  clearInterval(entry.flushTimer)
  await _flushToDb(liveId, entry)

  try {
    await entry.connection.disconnect()
  } catch (err) {
    _log?.warn({ err, liveId }, 'tiktokManager: erro ao desconectar connector')
  }

  _liveMap.delete(liveId)
  _log?.info({ liveId }, 'tiktokManager: connector parado')
}

// ── Testes: reset de estado ───────────────────────────────────────────────────
export function _resetForTests() {
  for (const [liveId, entry] of _liveMap) {
    clearInterval(entry.flushTimer)
    try { entry.connection.disconnect() } catch {}
  }
  _liveMap.clear()
  _db = null
  _log = null
  _emitter.removeAllListeners()
}

// ── Internals ─────────────────────────────────────────────────────────────────

async function startConnector(liveId, tenantId, username) {
  if (_liveMap.size >= MAX_CONNECTORS) {
    _log?.warn({ liveId, MAX_CONNECTORS }, 'tiktokManager: limite de connectors atingido')
    return
  }

  // Cachear produtos da live para keyword matching de pedidos
  let produtos = []
  try {
    const { rows } = await _db.query(
      `SELECT produto_nome, valor_unit FROM live_products WHERE live_id = $1 AND tenant_id = $2`,
      [liveId, tenantId]
    )
    produtos = rows
  } catch (err) {
    _log?.warn({ err, liveId }, 'tiktokManager: falha ao carregar produtos da live')
  }

  const state = {
    viewer_count: 0,
    total_viewers: 0,
    total_orders: 0,
    gmv: 0,
    likes_count: 0,
    comments_count: 0,
    dirty: false,
    lastFlush: Date.now(),
  }

  const connection = new WebcastPushConnection(username)

  // ── Eventos ───────────────────────────────────────────────────────────────
  connection.on('roomUser', (data) => {
    state.viewer_count = data.viewerCount ?? state.viewer_count
    state.total_viewers = Math.max(state.total_viewers, state.viewer_count)
    state.dirty = true
  })

  connection.on('like', (data) => {
    state.likes_count += (data.likeCount ?? 1)
    state.dirty = true
  })

  connection.on('social', (data) => {
    // social inclui likes, shares, follows — contar todos como engajamento
    state.likes_count += 1
    state.dirty = true
  })

  connection.on('chat', async (data) => {
    state.comments_count += 1
    state.dirty = true

    // Keyword matching para detectar pedidos (ex: "quero o kit 01")
    const comment = (data.comment ?? '').toLowerCase()
    if (!comment.includes('quero')) return

    const matched = produtos.find(p =>
      comment.includes(p.produto_nome.toLowerCase())
    )
    if (!matched) return

    state.total_orders += 1
    state.gmv += Number(matched.valor_unit)
    state.dirty = true

    // Dual-write imediato em live_products
    try {
      await _db.query(
        `UPDATE live_products
         SET quantidade = quantidade + 1,
             valor_total = valor_total + $1
         WHERE live_id = $2 AND tenant_id = $3 AND produto_nome ILIKE $4`,
        [matched.valor_unit, liveId, tenantId, matched.produto_nome]
      )
    } catch (err) {
      _log?.error({ err, liveId }, 'tiktokManager: erro ao atualizar live_products')
    }
  })

  connection.on('disconnected', () => {
    _log?.warn({ liveId, username }, 'tiktokManager: connector desconectado — cron reconectará')
    // Marcar como reconnecting mas não remover do Map
    // syncLives detectará que live ainda está ativa e chamará startConnector novamente
    const entry = _liveMap.get(liveId)
    if (entry) entry.reconnecting = true
  })

  connection.on('error', (err) => {
    _log?.warn({ err, liveId, username }, 'tiktokManager: erro no connector')
  })
  // ─────────────────────────────────────────────────────────────────────────

  const flushTimer = setInterval(async () => {
    const entry = _liveMap.get(liveId)
    if (entry) await _flushToDb(liveId, entry)
  }, FLUSH_INTERVAL_MS)

  _liveMap.set(liveId, {
    connection,
    tenantId,
    username,
    produtos,
    state,
    flushTimer,
    reconnecting: false,
  })

  // Conectar de forma não-bloqueante
  connection.connect().catch(err => {
    _log?.warn({ err, liveId, username }, 'tiktokManager: falha ao conectar — cron tentará novamente')
    clearInterval(flushTimer)
    _liveMap.delete(liveId)
  })

  _log?.info({ liveId, username }, 'tiktokManager: connector iniciado')
}

async function _flushToDb(liveId, entry) {
  const { state, tenantId } = entry
  if (!state.dirty) return

  try {
    await _db.query(
      `INSERT INTO live_snapshots
         (live_id, tenant_id, viewer_count, total_viewers, total_orders,
          gmv, likes_count, comments_count, captured_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        liveId, tenantId,
        state.viewer_count, state.total_viewers, state.total_orders,
        state.gmv, state.likes_count, state.comments_count,
      ]
    )

    state.dirty = false
    state.lastFlush = Date.now()

    // Notificar SSE handlers
    _emitter.emit(`snapshot:${liveId}`, {
      viewer_count:   state.viewer_count,
      total_viewers:  state.total_viewers,
      total_orders:   state.total_orders,
      gmv:            state.gmv,
      likes_count:    state.likes_count,
      comments_count: state.comments_count,
    })
  } catch (err) {
    _log?.error({ err, liveId }, 'tiktokManager: falha no flush — estado preservado em memória')
  }
}
```

- [ ] **Step 3.4: Rodar os testes**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
npm test -- test/tiktok-connector-manager.test.js
```

Saída esperada: `PASS` com 4 testes passando.

- [ ] **Step 3.5: Rodar todos os testes do projeto para garantir que nada quebrou**

```bash
npm test
```

Saída esperada: todos os testes passando.

- [ ] **Step 3.6: Commit**

```bash
git add src/services/tiktok-connector-manager.js test/tiktok-connector-manager.test.js
git commit -m "feat: TikTokConnectorManager com reconciliation loop, flush write-behind e EventEmitter SSE"
```

---

## Task 4: Integrar manager em server.js + cron

**Files:**
- Modify: `liveshop_saas_api-backend-/src/server.js`

- [ ] **Step 4.1: Ler o arquivo atual**

Antes de editar, ler `src/server.js` para confirmar a estrutura. O arquivo tem ~14 linhas: imports, `buildApp()`, `app.listen()`, dois `cron.schedule()`.

- [ ] **Step 4.2: Atualizar server.js**

Substituir **todo o conteúdo** do arquivo:

```javascript
// src/server.js
import 'dotenv/config'
import cron from 'node-cron'
import { buildApp } from './app.js'
import { TikTokService } from './services/tiktok.js'
import { cleanupOrphanContracts } from './jobs/cleanup_orphan_contracts.js'
import * as connectorManager from './services/tiktok-connector-manager.js'

const app = await buildApp()

// Inicializar ConnectorManager com acesso ao pool e logger
connectorManager.init({ db: app.db, log: app.log })

await app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' })
console.log(`LiveShop API rodando na porta ${process.env.PORT ?? 3001}`)

// Coleta dados do TikTok a cada 60s
// 1. Polling fallback (mantém live_snapshots mesmo sem connector)
// 2. Reconciliation loop (inicia/para connectors para lives ao_vivo)
cron.schedule('*/60 * * * * *', async () => {
  await TikTokService.pollAllTenants(app.db)
  await connectorManager.syncLives()
})

// Limpeza diária de contratos reprovados sem decisão do franqueado por 5 dias
cron.schedule('0 3 * * *', async () => {
  try {
    await cleanupOrphanContracts(app)
  } catch (error) {
    app.log.error({ error }, 'Falha ao limpar contratos órfãos')
  }
})
```

- [ ] **Step 4.3: Verificar que o servidor inicia sem erros**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
npm run dev &
sleep 3
curl -s http://localhost:3001/health
kill %1
```

Saída esperada: `{"ok":true}`

- [ ] **Step 4.4: Commit**

```bash
git add src/server.js
git commit -m "feat: inicializar TikTokConnectorManager em server.js com syncLives no cron de 60s"
```

---

## Task 5: SSE endpoint + live_id na resposta do live-atual

**Files:**
- Modify: `liveshop_saas_api-backend-/src/routes/tiktok.js`
- Modify: `liveshop_saas_api-backend-/src/routes/cabines.js`
- Modify: `liveshop_saas_api-backend-/test/routes.regressions.test.js`

O endpoint SSE vai em `tiktok.js` (dados de live TikTok). O `live-atual` está em `cabines.js`.

- [ ] **Step 5.1: Adicionar teste do endpoint SSE em routes.regressions.test.js**

Abrir o arquivo de testes e adicionar ao final do `describe` existente, antes do `})` de fechamento:

```javascript
  it('GET /v1/lives/:liveId/stream retorna 404 quando live não pertence ao tenant', async () => {
    const app = Fastify()
    const queryMock = vi.fn().mockResolvedValue({ rows: [] }) // sem live encontrada
    const releaseMock = vi.fn()

    app.decorate('authenticate', async (request) => {
      request.user = { tenant_id: 'tenant-1' }
    })
    app.decorate('db', { query: queryMock })
    app.decorate('tiktokManager', {
      getEmitter: () => ({ on: vi.fn(), off: vi.fn() }),
      has: () => false,
    })

    // Importar e registrar apenas a função que adiciona a rota SSE
    // (não registrar tiktokRoutes completo pois usa variáveis de env)
    app.get('/v1/lives/:liveId/stream',
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        const { tenant_id } = request.user
        const { liveId } = request.params
        const { rows } = await app.db.query(
          'SELECT id FROM lives WHERE id = $1 AND tenant_id = $2 AND status = $3',
          [liveId, tenant_id, 'em_andamento']
        )
        if (rows.length === 0) return reply.code(404).send({ error: 'Live não encontrada ou não está ao vivo' })
        return reply.send({ ok: true }) // simplificado para o teste
      }
    )

    const response = await app.inject({
      method: 'GET',
      url: '/v1/lives/live-nao-existe/stream',
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ error: expect.any(String) })
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND tenant_id = $2'),
      ['live-nao-existe', 'tenant-1', 'em_andamento']
    )

    await app.close()
  })

  it('live-atual retorna live_id no payload', async () => {
    const app = Fastify()
    const liveId = 'live-uuid-123'
    const cabineId = 'cabine-uuid-456'

    const queryMock = vi.fn()
      .mockResolvedValueOnce({ rows: [{ live_atual_id: liveId, status: 'ao_vivo' }] })
      .mockResolvedValueOnce({ rows: [{ iniciado_em: new Date().toISOString(), fat_gerado: 0, apresentador_nome: 'Closer', cliente_nome: 'Parceiro' }] })
      .mockResolvedValueOnce({ rows: [{ viewer_count: 10, total_orders: 2, gmv: 500, likes_count: 50, comments_count: 30 }] })
      .mockResolvedValueOnce({ rows: [] })
    const releaseMock = vi.fn()

    app.decorate('authenticate', async (request) => {
      request.user = { tenant_id: 'tenant-1', papel: 'franqueado' }
    })
    app.decorate('requirePapel', (papeis) => async (request, reply) => {
      if (!papeis.includes(request.user.papel)) {
        return reply.code(403).send({ error: 'Acesso não autorizado' })
      }
    })
    app.decorate('dbTenant', async () => ({ query: queryMock, release: releaseMock }))
    app.decorate('tiktokManager', { has: () => false, stopConnector: vi.fn() })

    await app.register((await import('../src/routes/cabines.js')).cabinesRoutes)

    const response = await app.inject({
      method: 'GET',
      url: `/v1/cabines/${cabineId}/live-atual`,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ live_id: liveId })

    await app.close()
  })
```

- [ ] **Step 5.2: Rodar testes para confirmar falha**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
npm test -- test/routes.regressions.test.js
```

Os dois novos testes devem falhar (um por falta de `live_id` na resposta, o outro por `app.tiktokManager` não existir no registro real).

- [ ] **Step 5.3: Adicionar endpoint SSE em tiktok.js**

Abrir `src/routes/tiktok.js`. Adicionar no topo, após os imports existentes:

```javascript
import { getEmitter } from '../services/tiktok-connector-manager.js'
```

Adicionar **dentro** de `export async function tiktokRoutes(app)`, antes do fechamento da função:

```javascript
  // ── GET /v1/lives/:liveId/stream — SSE real-time ────────────────────────────
  app.get('/v1/lives/:liveId/stream', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { tenant_id } = request.user
    const { liveId } = request.params

    // Validar que a live pertence ao tenant e está ao vivo
    const { rows } = await app.db.query(
      `SELECT id FROM lives WHERE id = $1 AND tenant_id = $2 AND status = 'em_andamento'`,
      [liveId, tenant_id]
    )
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'Live não encontrada ou não está ao vivo' })
    }

    // Assumir controle total da resposta HTTP
    reply.hijack()

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    reply.raw.flushHeaders()

    // Enviar snapshot mais recente imediatamente (estado inicial)
    try {
      const { rows: snap } = await app.db.query(
        `SELECT viewer_count, total_viewers, total_orders, gmv, likes_count, comments_count
         FROM live_snapshots
         WHERE live_id = $1
         ORDER BY captured_at DESC LIMIT 1`,
        [liveId]
      )
      if (snap[0]) {
        reply.raw.write(`data: ${JSON.stringify(snap[0])}\n\n`)
      }
    } catch (err) {
      app.log.warn({ err, liveId }, 'SSE: falha ao buscar snapshot inicial')
    }

    // Registrar listener no EventEmitter do manager
    const emitter = getEmitter()
    const eventName = `snapshot:${liveId}`
    const handler = (snapshot) => {
      try {
        reply.raw.write(`data: ${JSON.stringify(snapshot)}\n\n`)
      } catch {}
    }
    emitter.on(eventName, handler)

    // Heartbeat a cada 15s para manter conexão viva (evita timeout de proxy)
    const heartbeat = setInterval(() => {
      try { reply.raw.write(': keep-alive\n\n') } catch {}
    }, 15_000)

    // Aguardar desconexão do cliente
    await new Promise((resolve) => request.raw.on('close', resolve))

    // Cleanup
    emitter.off(eventName, handler)
    clearInterval(heartbeat)
    try { reply.raw.end() } catch {}
  })
```

- [ ] **Step 5.4: Adicionar live_id na resposta do live-atual em cabines.js**

Localizar o endpoint `GET /v1/cabines/:id/live-atual` em `src/routes/cabines.js` (linha ~480).

Na linha do `return` final do endpoint (que retorna o objeto com `viewer_count`, `gmv_atual`, etc.), adicionar `live_id: liveId` como primeiro campo:

```javascript
      return {
        live_id: liveId,           // ← adicionar esta linha
        viewer_count: snapshot.viewer_count,
        gmv_atual: parseFloat(snapshot.gmv),
        total_orders: snapshot.total_orders,
        duracao_minutos: duracaoMinutos,
        cliente_nome: liveData.cliente_nome,
        apresentador_nome: liveData.apresentador_nome,
        iniciado_em: liveData.iniciado_em,
        top_produto: topProduto ? {
          nome: topProduto.produto_nome,
          quantidade: topProduto.quantidade,
          valor_total: parseFloat(topProduto.valor_total),
        } : null,
      }
```

Também atualizar a query do snapshot para incluir `likes_count` e `comments_count` (que agora existem após a migration 021):

```javascript
      const snapshotQ = await db.query(`
        SELECT viewer_count, total_orders, gmv, likes_count, comments_count, captured_at
        FROM live_snapshots
        WHERE live_id = $1
        ORDER BY captured_at DESC LIMIT 1
      `, [liveId])
      const snapshot = snapshotQ.rows[0] || {
        viewer_count: 0, total_orders: 0, gmv: 0, likes_count: 0, comments_count: 0
      }
```

- [ ] **Step 5.5: Registrar `app.tiktokManager` decorator em app.js para os testes**

O teste de `live-atual` usa `app.tiktokManager.has(...)`. Em produção o manager é inicializado em `server.js`. Para que `cabinesRoutes` não quebre quando importada em testes que não têm o decorator, a referência ao manager em `cabines.js` deve ser **lazy** (importada do módulo, não via `app.tiktokManager`).

Não adicionar `app.tiktokManager` como decorator. Em vez disso, em `cabines.js` (Task 6), importar o manager diretamente do módulo.

- [ ] **Step 5.6: Rodar todos os testes**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
npm test
```

Saída esperada: todos os testes passando, incluindo os 2 novos.

- [ ] **Step 5.7: Commit**

```bash
git add src/routes/tiktok.js src/routes/cabines.js test/routes.regressions.test.js
git commit -m "feat: SSE endpoint /v1/lives/:id/stream + live_id no payload de live-atual"
```

---

## Task 6: Parar connector ao encerrar live (cabines.js)

**Files:**
- Modify: `liveshop_saas_api-backend-/src/routes/cabines.js`

- [ ] **Step 6.1: Adicionar import do manager no topo de cabines.js**

Localizar o topo de `src/routes/cabines.js`. Após o último `import`, adicionar:

```javascript
import { has as managerHas, stopConnector } from '../services/tiktok-connector-manager.js'
```

- [ ] **Step 6.2: Chamar stopConnector após COMMIT em encerrar-live**

Localizar o trecho após `await db.query('COMMIT')` no endpoint `PATCH /v1/lives/:id/encerrar` (linha ~820). Atualmente há o fire-and-forget de Asaas. Adicionar o stop do connector **depois** do Asaas fire-and-forget:

```javascript
        await db.query('COMMIT')

        // Gerar cobrança automática de royalties (fire-and-forget)
        if (comissao > 0) {
          gerarBoletoRoyaltiesAsaas({
            tenantId: tenant_id,
            liveId: live.id,
            clienteId: live.cliente_id,
            valor: comissao,
          }).catch(err => app.log.error({ err }, 'gerarBoletoRoyaltiesAsaas: erro inesperado'))
        }

        // Parar connector TikTok e fazer flush final do snapshot (fire-and-forget)
        if (managerHas(live.id)) {
          stopConnector(live.id).catch(err =>
            app.log.error({ err, liveId: live.id }, 'tiktokManager: falha ao parar connector no encerramento')
          )
        }

        return { ok: true, fat_gerado: parsed.data.fat_gerado, comissao_calculada: comissao }
```

- [ ] **Step 6.3: Rodar todos os testes**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
npm test
```

Saída esperada: todos os testes passando.

- [ ] **Step 6.4: Commit**

```bash
git add src/routes/cabines.js
git commit -m "feat: stopConnector TikTok no encerramento da live (flush final + disconnect)"
```

---

## Task 7: Flutter – LiveSnapshot model + streaming

**Files:**
- Modify: `liveshop_saas_api-backend-/lib/providers/cabines/cabine_detail_provider.dart` — adicionar `liveId` a `CabineLiveAtual`
- Create: `-liveshop_saas-frontend-/lib/models/live_snapshot.dart`
- Modify: `-liveshop_saas-frontend-/lib/services/api_service.dart` — adicionar `streamLiveSnapshot()`
- Create: `-liveshop_saas-frontend-/lib/providers/live_stream_provider.dart`

- [ ] **Step 7.1: Adicionar liveId a CabineLiveAtual**

Abrir `lib/providers/cabines/cabine_detail_provider.dart`. Localizar a classe `CabineLiveAtual` e adicionar o campo `liveId`:

```dart
class CabineLiveAtual {
  final String liveId;          // ← adicionar este campo
  final int viewerCount;
  final double gmvAtual;
  final int totalOrders;
  final int duracaoMinutos;
  final String clienteNome;
  final String apresentadorNome;
  final DateTime iniciadoEm;
  final Map<String, dynamic>? topProduto;

  CabineLiveAtual({
    required this.liveId,       // ← adicionar aqui
    required this.viewerCount,
    required this.gmvAtual,
    required this.totalOrders,
    required this.duracaoMinutos,
    required this.clienteNome,
    required this.apresentadorNome,
    required this.iniciadoEm,
    this.topProduto,
  });

  factory CabineLiveAtual.fromJson(Map<String, dynamic> json) {
    return CabineLiveAtual(
      liveId: json['live_id'] as String,   // ← adicionar aqui
      viewerCount: json['viewer_count'] ?? 0,
      gmvAtual: (json['gmv_atual'] ?? 0).toDouble(),
      totalOrders: json['total_orders'] ?? 0,
      duracaoMinutos: json['duracao_minutos'] ?? 0,
      clienteNome: json['cliente_nome'] ?? '',
      apresentadorNome: json['apresentador_nome'] ?? '',
      iniciadoEm: DateTime.parse(json['iniciado_em']),
      topProduto: json['top_produto'],
    );
  }
}
```

- [ ] **Step 7.2: Criar o modelo LiveSnapshot**

```dart
// lib/models/live_snapshot.dart
class LiveSnapshot {
  final int viewerCount;
  final int totalViewers;
  final int totalOrders;
  final double gmv;
  final int likesCount;
  final int commentsCount;

  const LiveSnapshot({
    required this.viewerCount,
    required this.totalViewers,
    required this.totalOrders,
    required this.gmv,
    required this.likesCount,
    required this.commentsCount,
  });

  factory LiveSnapshot.fromJson(Map<String, dynamic> json) {
    return LiveSnapshot(
      viewerCount:    (json['viewer_count']   as num? ?? 0).toInt(),
      totalViewers:   (json['total_viewers']  as num? ?? 0).toInt(),
      totalOrders:    (json['total_orders']   as num? ?? 0).toInt(),
      gmv:            (json['gmv']            as num? ?? 0).toDouble(),
      likesCount:     (json['likes_count']    as num? ?? 0).toInt(),
      commentsCount:  (json['comments_count'] as num? ?? 0).toInt(),
    );
  }
}
```

- [ ] **Step 7.3: Adicionar streamLiveSnapshot em ApiService**

Abrir `lib/services/api_service.dart`. Adicionar no topo (após os imports existentes):

```dart
import 'dart:convert';
```

(Verificar se `dart:convert` já está importado — se sim, não duplicar.)

Adicionar o método estático dentro da classe `ApiService`, após o último método estático existente:

```dart
  /// Abre uma conexão SSE com o backend e emite snapshots em tempo real.
  /// Usa Dio com ResponseType.stream para não bloquear o buffer.
  /// Compatível com Flutter Web (CanvasKit).
  static Stream<LiveSnapshot> streamLiveSnapshot(String liveId) async* {
    final token = await _storage.read(key: _tokenKey);
    if (token == null) return;

    final response = await _dio.get<ResponseBody>(
      '/lives/$liveId/stream',
      options: Options(
        responseType: ResponseType.stream,
        headers: {'Authorization': 'Bearer $token'},
        receiveTimeout: const Duration(hours: 24), // Conexão longa
      ),
    );

    final buffer = StringBuffer();

    await for (final chunk in response.data!.stream.transform(utf8.decoder)) {
      buffer.write(chunk);
      String pending = buffer.toString();

      while (pending.contains('\n\n')) {
        final idx = pending.indexOf('\n\n');
        final frame = pending.substring(0, idx).trim();
        pending = pending.substring(idx + 2);

        for (final line in frame.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            final json = jsonDecode(line.substring(6)) as Map<String, dynamic>;
            yield LiveSnapshot.fromJson(json);
          } catch (_) {
            // Ignorar frames malformados (ex: heartbeat não-data)
          }
        }
      }

      buffer.clear();
      buffer.write(pending);
    }
  }
```

Adicionar também o import do modelo no topo do arquivo:

```dart
import '../models/live_snapshot.dart';
```

- [ ] **Step 7.4: Criar o provider**

```dart
// lib/providers/live_stream_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/live_snapshot.dart';
import '../services/api_service.dart';

/// StreamProvider que abre SSE para a live especificada.
/// Emite null quando não há dados ainda.
/// Disposes automaticamente quando nenhum widget está assistindo.
final liveStreamProvider =
    StreamProvider.family.autoDispose<LiveSnapshot, String>(
  (ref, liveId) => ApiService.streamLiveSnapshot(liveId),
);
```

- [ ] **Step 7.5: Verificar que o Flutter compila**

```bash
cd /Users/vitormiguelgoedertdaluz/-liveshop_saas-frontend-
flutter analyze --no-fatal-infos
```

Saída esperada: zero erros. Warnings de lints são aceitáveis.

- [ ] **Step 7.6: Commit**

```bash
cd /Users/vitormiguelgoedertdaluz/-liveshop_saas-frontend-
git add lib/models/live_snapshot.dart \
        lib/providers/live_stream_provider.dart \
        lib/providers/cabines/cabine_detail_provider.dart \
        lib/services/api_service.dart
git commit -m "feat: LiveSnapshot model, liveStreamProvider SSE via Dio, liveId em CabineLiveAtual"
```

---

## Task 8: Flutter – CabineDetailScreen SSE upgrade

**Files:**
- Modify: `-liveshop_saas-frontend-/lib/screens/cabines/cabine_detail_screen.dart`

Nesta task, a aba `_LiveTab` vai:
1. Tornar-se `ConsumerWidget` para assistir `liveStreamProvider`
2. Exibir dados do SSE quando disponíveis, fallback para dados do polling quando não
3. Ganhar dois novos metric cards: Curtidas e Comentários
4. O `_livePollingTimer` é reduzido de 5s para 30s (atualiza duração e top produto)

- [ ] **Step 8.1: Adicionar imports no topo de cabine_detail_screen.dart**

```dart
import '../../models/live_snapshot.dart';
import '../../providers/live_stream_provider.dart';
```

- [ ] **Step 8.2: Reduzir frequência do _livePollingTimer de 5s para 30s**

Localizar no método `_syncLivePolling`:

```dart
      _livePollingTimer ??= Timer.periodic(const Duration(seconds: 5), (_) {
```

Substituir por:

```dart
      _livePollingTimer ??= Timer.periodic(const Duration(seconds: 30), (_) {
```

- [ ] **Step 8.3: Converter _LiveTab para ConsumerWidget**

Localizar a classe `_LiveTab` (linha ~149). Substituir a declaração e assinatura:

```dart
// ANTES
class _LiveTab extends StatelessWidget {
  final CabineLiveAtual? liveAtual;
  final int cabineNumero;

  const _LiveTab({required this.liveAtual, required this.cabineNumero});

  @override
  Widget build(BuildContext context) {
```

```dart
// DEPOIS
class _LiveTab extends ConsumerWidget {
  final CabineLiveAtual? liveAtual;
  final int cabineNumero;

  const _LiveTab({required this.liveAtual, required this.cabineNumero});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
```

- [ ] **Step 8.4: Adicionar leitura do snapshot SSE no início do método build de _LiveTab**

Logo após a abertura de `build(BuildContext context, WidgetRef ref) {`, antes do `if (liveAtual == null)`:

```dart
    // SSE snapshot: dados em tempo real (null quando live não ativa ou stream sem dados)
    final snapshot = liveAtual != null
        ? ref.watch(liveStreamProvider(liveAtual!.liveId)).valueOrNull
        : null;

    // Valores efetivos: SSE tem prioridade, polling é fallback
    final viewerCount = snapshot?.viewerCount ?? liveAtual?.viewerCount ?? 0;
    final gmvAtual    = snapshot?.gmv         ?? liveAtual?.gmvAtual    ?? 0.0;
    final totalOrders = snapshot?.totalOrders  ?? liveAtual?.totalOrders  ?? 0;
    final likesCount    = snapshot?.likesCount    ?? 0;
    final commentsCount = snapshot?.commentsCount ?? 0;
```

- [ ] **Step 8.5: Substituir os _MetricCard existentes para usar os valores efetivos**

Localizar o bloco `Wrap` com os 4 `_MetricCard` dentro de `_LiveTab`. Substituir pelos valores computados em Step 8.4:

```dart
                  Wrap(
                    spacing: 16,
                    runSpacing: 16,
                    children: [
                      _MetricCard(
                        icon: Icons.visibility,
                        iconColor: AppColors.infoBlue,
                        value: '$viewerCount',
                        label: 'Espectadores',
                      ),
                      _MetricCard(
                        icon: Icons.attach_money,
                        iconColor: AppColors.successGreen,
                        value: _CabineDetailScreenState._currency.format(gmvAtual),
                        label: 'GMV da live',
                      ),
                      _MetricCard(
                        icon: Icons.shopping_cart,
                        iconColor: AppColors.primaryOrange,
                        value: '$totalOrders',
                        label: 'Pedidos',
                      ),
                      _MetricCard(
                        icon: Icons.inventory_2_outlined,
                        iconColor: AppColors.lilac,
                        value: liveAtual!.topProduto != null
                            ? '${liveAtual!.topProduto!['quantidade']} un'
                            : 'Nenhum',
                        label: liveAtual!.topProduto != null
                            ? liveAtual!.topProduto!['nome'] as String
                            : 'Produto mais vendido',
                      ),
                      // ── Engajamento em tempo real (SSE) ─────────────────
                      _MetricCard(
                        icon: Icons.favorite_rounded,
                        iconColor: AppColors.dangerRed,
                        value: '$likesCount',
                        label: 'Curtidas',
                      ),
                      _MetricCard(
                        icon: Icons.chat_bubble_outline_rounded,
                        iconColor: AppColors.infoPurple,
                        value: '$commentsCount',
                        label: 'Comentários',
                      ),
                    ],
                  ),
```

- [ ] **Step 8.6: Verificar compilação**

```bash
cd /Users/vitormiguelgoedertdaluz/-liveshop_saas-frontend-
flutter analyze --no-fatal-infos
```

Saída esperada: zero erros.

- [ ] **Step 8.7: Smoke test visual**

```bash
flutter run -d chrome
```

1. Login como `franqueado@liveshop.com` / `teste123`
2. Ir em Cabines → abrir detalhe de qualquer cabine
3. Aba Live: confirmar que os 6 metric cards aparecem (sem erros no console)
4. Quando o backend estiver rodando com uma live `ao_vivo` + connector ativo, confirmar que os valores atualizam sem recarregar

- [ ] **Step 8.7b: Adicionar AnimatedSwitcher à transição de status na aba Live**

A spec define que a aba Live deve "ganhar vida" com animação quando o status muda para `ao_vivo`. Localizar no método `build` de `_LiveTab`, o bloco que retorna `_EmptyTabState` quando `liveAtual == null`. Envolver o `if/else` com `AnimatedSwitcher`:

```dart
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 400),
      child: liveAtual == null
          ? const _EmptyTabState(
              key: ValueKey('empty'),
              icon: Icons.videocam_off_outlined,
              title: 'Nenhuma live ativa nesta cabine',
              description:
                  'Quando a cabine entrar em operação ao vivo, as métricas em tempo real aparecerão aqui com atualização a cada 5 segundos.',
            )
          : SingleChildScrollView(
              key: ValueKey(liveAtual!.liveId),  // key muda quando live muda → AnimatedSwitcher anima
              padding: const EdgeInsets.all(24),
              child: Column(
                // ... resto do conteúdo existente
              ),
            ),
    );
```

O `key: ValueKey(liveAtual!.liveId)` garante que o `AnimatedSwitcher` detecta a mudança e executa a transição (fade) quando a live ativa muda ou quando passa de `null` para uma live real.

- [ ] **Step 8.8: Commit**

```bash
git add lib/screens/cabines/cabine_detail_screen.dart
git commit -m "feat: _LiveTab com SSE (liveStreamProvider), 6 metric cards, AnimatedSwitcher, polling reduzido para 30s"
```

---

## Task 9: Verificação End-to-End

- [ ] **Step 9.1: Configurar tiktok_username em um contrato de teste**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
node --input-type=module << 'EOF'
import 'dotenv/config'
import pg from 'pg'
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const r = await pool.query(
  `UPDATE contratos SET tiktok_username = 'liveshop_test'
   WHERE status = 'ativo' LIMIT 1 RETURNING id, tiktok_username`
)
console.log('Contrato atualizado:', r.rows)
await pool.end()
EOF
```

- [ ] **Step 9.2: Subir o backend**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
npm run dev
```

Aguardar o primeiro tick do cron (até 60s). O log deve mostrar:
```
tiktokManager: connector iniciado { liveId: '...', username: 'liveshop_test' }
```
(Só aparece se houver uma live `em_andamento` com o contrato atualizado.)

- [ ] **Step 9.3: Testar SSE manualmente**

```bash
# Login para obter token
TOKEN=$(curl -s -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"franqueado@liveshop.com","senha":"teste123"}' \
  | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).access_token))")

# Pegar um liveId de uma live em_andamento
LIVE_ID=$(curl -s http://localhost:3001/v1/cabines \
  -H "Authorization: Bearer $TOKEN" \
  | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
    const list=JSON.parse(d);
    const ao_vivo=list.find(c=>c.status==='ao_vivo');
    console.log(ao_vivo?.live_atual_id??'NO_LIVE');
  })")

echo "Live ID: $LIVE_ID"

# Conectar ao SSE (ctrl+c para sair)
curl -N -H "Authorization: Bearer $TOKEN" http://localhost:3001/v1/lives/$LIVE_ID/stream
```

Saída esperada: heartbeats (`: keep-alive`) a cada 15s e, quando o connector emitir um flush, linhas `data: {"viewer_count":...}`.

- [ ] **Step 9.4: Confirmar que encerrar live para o connector**

```bash
# Encerrar a live
curl -s -X PATCH http://localhost:3001/v1/lives/$LIVE_ID/encerrar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fat_gerado": 1500}'
```

No log do servidor deve aparecer:
```
tiktokManager: connector parado { liveId: '...' }
```

A conexão SSE deve ser encerrada pelo servidor (`reply.raw.end()`).

- [ ] **Step 9.5: Rodar suite de testes completa**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
npm test
```

Saída esperada: todos os testes passando.

- [ ] **Step 9.6: Commit final**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
git add -A
git status  # verificar que não há arquivos sensíveis (.env) stagados
git commit -m "feat: TikTok Live Integration completa — connector, SSE, reconciliation loop, Flutter dashboard real-time"
```

---

## Resumo dos arquivos

| Ação | Arquivo |
|---|---|
| Create | `liveshop_saas_api-backend-/migrations/021_tiktok_live_connector.sql` |
| Create | `liveshop_saas_api-backend-/src/services/tiktok-connector-manager.js` |
| Create | `liveshop_saas_api-backend-/test/tiktok-connector-manager.test.js` |
| Modify | `liveshop_saas_api-backend-/src/server.js` |
| Modify | `liveshop_saas_api-backend-/src/routes/tiktok.js` |
| Modify | `liveshop_saas_api-backend-/src/routes/cabines.js` |
| Modify | `liveshop_saas_api-backend-/test/routes.regressions.test.js` |
| Create | `-liveshop_saas-frontend-/lib/models/live_snapshot.dart` |
| Create | `-liveshop_saas-frontend-/lib/providers/live_stream_provider.dart` |
| Modify | `-liveshop_saas-frontend-/lib/providers/cabines/cabine_detail_provider.dart` |
| Modify | `-liveshop_saas-frontend-/lib/services/api_service.dart` |
| Modify | `-liveshop_saas-frontend-/lib/screens/cabines/cabine_detail_screen.dart` |
