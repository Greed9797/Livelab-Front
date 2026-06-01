# TikTok Live Integration — Design Spec

**Date:** 2026-04-04
**Project:** LiveShop SaaS
**Epic:** TikTok Live Real-Time Integration

---

## Goal

Replace the mocked `getLiveData()` polling service with a real-time data pipeline powered by `tiktok-live-connector`, feeding live audience, sales, and engagement metrics into the LiveShop dashboard with sub-200ms latency — while keeping the existing 60s cron as a resilience fallback.

---

## Context

The existing architecture has:
- `src/services/tiktok.js` — `getLiveData()` returns MOCK data; `pollAllTenants()` runs every 60s via node-cron writing to `live_snapshots`
- `live_snapshots` table — `viewer_count`, `total_viewers`, `total_orders`, `gmv`, `captured_at`
- `tiktok_tokens` and `tiktok_user_id` on tenants (OAuth fields, not used for connector)
- `tiktok-live-connector` NOT installed

The `contratos` table holds the relationship between franqueado and cliente_parceiro. The TikTok `@username` of the presenter will be stored here (new column).

---

## Design Decisions

| Question | Decision |
|---|---|
| Data priority | Audience → Sales → Engagement (all three) |
| Username storage | `contratos.tiktok_username` |
| Connector vs polling | Coexist — connector for real-time, cron polling as fallback |
| Flutter update mechanism | Server-Sent Events (SSE) |
| Connector lifecycle | Auto-managed by cron (reconciliation loop) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Fastify Process                       │
│                                                          │
│  node-cron (60s) ──► TikTokConnectorManager             │
│                           │                             │
│                      Map<liveId, {                      │
│                        connection,   ◄── tiktok-live-   │
│                        tenantId,         connector       │
│                        username,         events          │
│                        state (accum.)                    │
│                      }>                                  │
│                           │                             │
│               flush every 30s (or on demand)            │
│                           ▼                             │
│                    live_snapshots (PG)                   │
│                           │                             │
│                    EventEmitter interno                  │
│                           │                             │
│  GET /v1/lives/:id/stream ◄─── SSE push por liveId     │
│                                                          │
│  (cron ainda chama getLiveData como fallback)           │
└─────────────────────────────────────────────────────────┘
```

---

## Schema Changes (new migration)

### `contratos`
```sql
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS tiktok_username TEXT;
```
Stores the presenter's TikTok handle (e.g., `livestream_nike`) without the `@`.

### `live_snapshots`
```sql
ALTER TABLE live_snapshots ADD COLUMN IF NOT EXISTS likes_count    BIGINT NOT NULL DEFAULT 0;
ALTER TABLE live_snapshots ADD COLUMN IF NOT EXISTS comments_count BIGINT NOT NULL DEFAULT 0;
```

`comments_count` captures comment volume — the strongest "heat" indicator of a live. High comments + low orders signals the presenter attracted audience but didn't convert (valuable BI insight).

---

## New File: `src/services/tiktok-connector-manager.js`

Singleton module. Exported as a Fastify plugin so `app.tiktokManager` is available across routes.

### In-memory Map entry shape

```javascript
{
  connection: TikTokWebcastPushConnection,  // tiktok-live-connector instance
  tenantId: string,                          // UUID
  username: string,                          // TikTok @handle (no @)
  state: {
    viewer_count: 0,     // latest value from roomUser event (overwrite)
    total_viewers: 0,    // peak accumulated
    total_orders: 0,     // incremental counter
    gmv: 0.0,            // incremental sum
    likes_count: 0,      // incremental counter (gift + social events)
    comments_count: 0,   // incremental counter (chat events)
    dirty: false,        // true when state changed since last flush
    lastFlush: Date      // timestamp of last DB write
  },
  flushTimer: NodeJS.Timer  // setInterval(30_000)
}
```

### Event mapping

| TikTok event | Field updated | Strategy |
|---|---|---|
| `roomUser` | viewer_count, total_viewers | overwrite (latest value) |
| `gift`, `social` | likes_count | increment |
| `chat` | comments_count | increment |
| `order` | total_orders, gmv (snapshot) + live_products (detail) | see below |
| `disconnect` | — | log.warn, set `reconnecting: true`, do NOT remove from Map |
| `error` | — | log.warn, do NOT throw |

### `order` event — dual write strategy

The `order` event feeds two destinations with different purposes:

**`live_snapshots` (fast, totals):** Increments `total_orders` and `gmv`. Batched in the 30s flush. Feeds the real-time line chart on the dashboard.

**`live_products` (slow, detail):** When the order payload contains a keyword match against known product names for the live (queried once at `startConnector()` and cached in-memory), the connector does an immediate `UPDATE live_products SET quantidade = quantidade + 1, valor_total = valor_total + $valor WHERE live_id = $liveId AND produto_nome ILIKE $keyword`. This feeds the per-product benchmark visible at live close.

If no keyword match is found, the order still increments the snapshot totals — no data is lost.

### Methods

**`syncLives(db)`** — called by cron every 60s:
1. `SELECT lives.id, lives.tenant_id, contratos.tiktok_username FROM lives JOIN contratos ON ... WHERE lives.status = 'ao_vivo' AND contratos.tiktok_username IS NOT NULL`
2. For each `liveId` in result but NOT in Map → `startConnector()`
3. For each `liveId` in Map but NOT in result → `stopConnector()`

This diff covers server restart recovery: on first cron tick after restart, all active lives are detected as missing and reconnected (≤60s recovery window).

**`startConnector(liveId, tenantId, username, db)`**:
- Guard: if `Map.size >= TIKTOK_MAX_CONNECTORS` (default 20) → `log.warn`, return
- Queries `live_products WHERE live_id = $liveId` → caches `[{ id, produto_nome }]` in Map entry for keyword matching
- Creates `TikTokWebcastPushConnection(username)`
- Binds event handlers
- Inserts entry into Map
- Starts `flushTimer`
- Connects (non-blocking, errors handled via `error` event)

**`stopConnector(liveId)`**:
- Calls `flushToDb(liveId)` (final flush)
- Calls `connection.disconnect()`
- Clears `flushTimer`
- Removes from Map

**`flushToDb(liveId)`**:
- If `!state.dirty` → skip (no changes since last flush)
- `INSERT INTO live_snapshots (live_id, tenant_id, viewer_count, total_viewers, total_orders, gmv, likes_count, comments_count, captured_at) VALUES (...)`
- Emits `snapshot:${liveId}` on internal EventEmitter (triggers SSE push)
- Sets `dirty = false`, updates `lastFlush`
- On Postgres error → `log.error`, preserves in-memory state for next attempt

---

## Modified: `src/services/tiktok.js`

- `pollAllTenants()` enhanced: after existing polling logic, calls `app.tiktokManager.syncLives(db)`
- `getLiveData()` updated to query real `live_snapshots` instead of returning mock data
- Mock data removed entirely

---

## Modified: `src/routes/tiktok.js`

### New endpoint: `GET /v1/lives/:liveId/stream`

Authentication: `app.authenticate` (JWT required).

Flow:
1. Validate `liveId` belongs to `request.user.tenant_id` → 404 if not
2. Set SSE headers:
   ```
   Content-Type: text/event-stream
   Cache-Control: no-cache
   Connection: keep-alive
   ```
3. Send current snapshot immediately (from `live_snapshots`, latest row for `liveId`)
4. Register listener: `manager.on('snapshot:${liveId}', handler)`
5. Heartbeat: `setInterval(() => reply.raw.write(': keep-alive\n\n'), 15_000)`
6. On client disconnect (`request.raw.on('close')`): remove listener, clear heartbeat interval

Response while live is active: `200` stream. If live not found: `404` JSON before upgrading.

---

## Modified: `src/routes/cabines.js`

In `encerrar-live` endpoint, after the COMMIT that closes the live:

```javascript
// Stop connector and flush final snapshot
if (app.tiktokManager.has(liveId)) {
  app.tiktokManager.stopConnector(liveId).catch(err =>
    app.log.error({ err }, 'Falha ao parar connector TikTok')
  )
}
```

---

## Flutter: New `LiveSnapshot` model + `liveStreamProvider`

### `lib/models/live_snapshot.dart`
```dart
class LiveSnapshot {
  final int viewerCount;
  final int totalViewers;
  final int totalOrders;
  final double gmv;
  final int likesCount;
  final int commentsCount;
  final DateTime capturedAt;
}
```

### `lib/providers/live_stream_provider.dart`
```dart
final liveStreamProvider = StreamProvider.family<LiveSnapshot, String>(
  (ref, liveId) => ApiService.streamLiveSnapshot(liveId),
);
```

`ApiService.streamLiveSnapshot(liveId)` opens an HTTP stream, parses `data: {...}\n\n` SSE frames, deserializes into `LiveSnapshot`.

### Consumption: `CabineDetailScreen`

The stream is consumed in the existing `CabineDetailScreen` (not a new screen). The screen uses `AnimatedSwitcher` to transform based on live status:

- **`disponivel` / `reservada`:** Static view — historical data, presenter info, schedule
- **`ao_vivo`:** "Operation Monitor" mode — real-time counters (viewer_count, GMV, orders, likes, comments) driven by `liveStreamProvider`. Counters animate on each SSE event.
- **`encerrada`:** Final snapshot frozen — shows end-of-live totals, no stream

The status-driven switch uses `ref.watch(cabineProvider)` for status and `ref.watch(liveStreamProvider(liveId))` for metrics — two independent providers, no coupling.

The "Efeito UAU": the franqueado watching a cabine detail sees the screen come alive with rising counters the moment the live goes `ao_vivo`, with no navigation required.

---

## Error Handling Matrix

| Scenario | Behavior |
|---|---|
| `@username` not found on TikTok | `error` event → `log.warn` → not added to Map → cron retries in 60s |
| Live not broadcasting on TikTok | Connector connects silently → cron/polling serves as fallback |
| Connector drops mid-live | `disconnect` → `reconnecting: true` flag → cron reconnects on next tick |
| Fastify restart | Map cleared → cron reconnects all active lives within 60s |
| Postgres down during flush | `log.error`, skip flush, state preserved in memory for next interval |
| SSE client disconnects | Listener removed, heartbeat cleared, no memory leak |
| `TIKTOK_MAX_CONNECTORS` reached | `log.warn`, new connector not started, polling fallback continues |

---

## Environment Variables

```bash
TIKTOK_MAX_CONNECTORS=20   # max simultaneous live connectors (default: 20)
```

No TikTok API key required — `tiktok-live-connector` uses the public WebSocket endpoint.

---

## Files Summary

| Action | File |
|---|---|
| Create | `src/services/tiktok-connector-manager.js` |
| Create | `migrations/021_tiktok_live_connector.sql` |
| Modify | `src/services/tiktok.js` |
| Modify | `src/routes/tiktok.js` |
| Modify | `src/routes/cabines.js` |
| Create | `lib/models/live_snapshot.dart` |
| Create | `lib/providers/live_stream_provider.dart` |
| Modify | `lib/screens/cabines/cabine_detail_screen.dart` (AnimatedSwitcher + stream) |

---

## Out of Scope

- TikTok OAuth flow (already exists, not touched)
- Chat content/sentiment analysis (comment count is captured; content is not)
- Horizontal scaling / Redis pub-sub (not needed at current scale)
- `tiktok_tokens` / token refresh (connector uses public WebSocket, no auth token needed)
