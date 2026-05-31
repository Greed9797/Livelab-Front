# CRM Geográfico, Contratos e Análise de Crédito — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar 4 módulos — filtro de mapa por BottomSheet multiselect, formulário 4-steps com CEP autocomplete + geocoding, assinatura digital com signature_pad + PDF, e tela de backoffice de Análise de Crédito.

**Architecture:** Backend Fastify (Node.js) com novos endpoints em contratos.js + rota cep.js. Frontend Flutter Web com Riverpod, reescrita de CadastroClienteScreen (PageView 4 steps), ContratoScreen (signature_pad), nova AnaliseCreditoScreen. Fluxo: form → contrato → assinar-digital (auto-aprova se score≥60 ou envia para backoffice).

**Tech Stack:** Flutter Web + flutter_riverpod, flutter_map, signature ^5.4.0 (nova), Fastify + Supabase/PostgreSQL, ViaCEP API (gratuita), Nominatim OSM (gratuito)

---

## File Map

### Backend — criar/modificar

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `migrations/015_geocoding_contratos.sql` | criar | ALTER TABLE clientes + contratos |
| `src/routes/cep.js` | criar | GET /v1/cep/:cep proxy ViaCEP + Nominatim |
| `src/routes/contratos.js` | modificar | Adicionar assinar-digital, aprovar, arquivar, sinalizar-risco + GET analise-credito |
| `src/app.js` | modificar | Registrar cepRoutes |

### Frontend — criar/modificar

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `pubspec.yaml` | modificar | Adicionar `signature: ^5.4.0` |
| `lib/models/cliente.dart` | modificar | Adicionar cep, cidade, estado, siga |
| `lib/models/contrato.dart` | modificar | Adicionar campos de assinatura e risco |
| `lib/providers/clientes_provider.dart` | modificar | Adicionar buscarCep() |
| `lib/providers/contratos_provider.dart` | modificar | Adicionar assinarDigital(), aprovar(), arquivar(), sinalizarRisco(), fetchAnalise() |
| `lib/screens/vendas/cadastro_cliente_screen.dart` | reescrever | Formulário 4-steps com CEP autocomplete |
| `lib/screens/vendas/vendas_screen.dart` | modificar | Filtro BottomSheet multiselect (substitui dropdown) |
| `lib/screens/vendas/contrato_screen.dart` | modificar | Signature pad + PDF flow |
| `lib/screens/vendas/analise_credito_screen.dart` | criar | Backoffice de aprovação (franqueador_master) |
| `lib/routes/app_routes.dart` | modificar | Adicionar rota `/analise-credito` |
| `lib/widgets/app_scaffold.dart` | modificar | Adicionar item "Aprovações" no menu |

---

## Task 1 — Migrations: geocoding + contratos

**Files:**
- Create: `migrations/015_geocoding_contratos.sql`

- [ ] **Step 1: Criar o arquivo de migração**

```sql
-- migrations/015_geocoding_contratos.sql

-- Módulo 1: Geolocalização de clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS cep        VARCHAR(9),
  ADD COLUMN IF NOT EXISTS logradouro TEXT,
  ADD COLUMN IF NOT EXISTS cidade     TEXT,
  ADD COLUMN IF NOT EXISTS estado     CHAR(2),
  ADD COLUMN IF NOT EXISTS siga       TEXT;

-- Módulo 3: Assinatura digital (Fase 1) + Slot Fase 2 (ZapSign)
ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS signature_type        VARCHAR(10)  DEFAULT 'pad',
  ADD COLUMN IF NOT EXISTS external_signature_id TEXT,
  ADD COLUMN IF NOT EXISTS signature_image_url   TEXT,
  ADD COLUMN IF NOT EXISTS signed_ip             TEXT,
  ADD COLUMN IF NOT EXISTS accepted_terms_at     TIMESTAMPTZ;

-- Módulo 4: Análise de Crédito backoffice
ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS is_risco_franqueado BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS risco_assumido_em   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arquivado_em        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arquivado_motivo    TEXT;

-- Ampliar CHECK de status em contratos para incluir 'arquivado'
ALTER TABLE contratos DROP CONSTRAINT IF EXISTS contratos_status_check;
ALTER TABLE contratos
  ADD CONSTRAINT contratos_status_check
  CHECK (status IN ('rascunho','enviado','em_analise','ativo','cancelado','arquivado'));
```

- [ ] **Step 2: Executar migração no Supabase via psql**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
psql "$DATABASE_URL" -f migrations/015_geocoding_contratos.sql
```

Saída esperada: `ALTER TABLE` repetido 8-9 vezes, sem erros.

- [ ] **Step 3: Verificar colunas criadas**

```bash
psql "$DATABASE_URL" -c "\d clientes" | grep -E "cep|logradouro|cidade|estado|siga"
psql "$DATABASE_URL" -c "\d contratos" | grep -E "signature|risco|arquivado"
```

Saída esperada: linhas listando as 5 colunas de clientes e 7 colunas de contratos.

- [ ] **Step 4: Commit**

```bash
git add migrations/015_geocoding_contratos.sql
git commit -m "feat: add geocoding and contract signature migrations"
```

---

## Task 2 — Backend: rota CEP proxy (ViaCEP + Nominatim)

**Files:**
- Create: `src/routes/cep.js`
- Modify: `src/app.js`

- [ ] **Step 1: Criar `src/routes/cep.js`**

```js
// src/routes/cep.js

export async function cepRoutes(app) {
  // GET /v1/cep/:cep → { logradouro, cidade, estado, lat, lng }
  app.get('/v1/cep/:cep', { preHandler: app.authenticate }, async (request, reply) => {
    const cep = request.params.cep.replace(/\D/g, '')
    if (cep.length !== 8) {
      return reply.code(400).send({ error: 'CEP deve ter 8 dígitos' })
    }

    // 1. ViaCEP para endereço
    let logradouro = null, cidade = null, estado = null
    try {
      const viacepResp = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const viacep = await viacepResp.json()
      if (!viacep.erro) {
        logradouro = viacep.logradouro || null
        cidade = viacep.localidade || null
        estado = viacep.uf || null
      }
    } catch {
      // Falha silenciosa — retorna sem endereço
    }

    // 2. Nominatim para lat/lng
    let lat = null, lng = null
    try {
      const nomResp = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${cep}&country=BR&format=json&limit=1`,
        { headers: { 'User-Agent': 'LiveShopSaaS/1.0 contact@liveshop.com.br' } }
      )
      const nomData = await nomResp.json()
      if (nomData.length > 0) {
        lat = parseFloat(nomData[0].lat)
        lng = parseFloat(nomData[0].lon)
      }
    } catch {
      // Falha silenciosa — retorna sem coordenadas
    }

    return { cep, logradouro, cidade, estado, lat, lng }
  })
}
```

- [ ] **Step 2: Registrar em `src/app.js`**

Adicionar import e registro após os outros imports:

```js
// No topo, junto aos outros imports:
import { cepRoutes } from './routes/cep.js'

// Dentro de buildApp, junto aos outros registros (ex: após manuaisRoutes):
await app.register(cepRoutes)
```

- [ ] **Step 3: Testar com curl**

```bash
curl -s "http://localhost:3000/v1/cep/01310100" | jq .
```

Saída esperada:
```json
{
  "cep": "01310100",
  "logradouro": "Avenida Paulista",
  "cidade": "São Paulo",
  "estado": "SP",
  "lat": -23.561414,
  "lng": -46.6558819
}
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/cep.js src/app.js
git commit -m "feat: add CEP proxy route with ViaCEP + Nominatim geocoding"
```

---

## Task 3 — Backend: endpoint assinar-digital (com auto-score)

**Files:**
- Modify: `src/routes/contratos.js`

O endpoint recebe a imagem da assinatura em base64, armazena-a, calcula o score e aprova automaticamente se score ≥ 60.

- [ ] **Step 1: Adicionar `POST /v1/contratos/:id/assinar-digital` em `src/routes/contratos.js`**

Inserir após o bloco do `POST /v1/contratos/:id/assinar` (linha ~43):

```js
  // POST /v1/contratos/:id/assinar-digital
  // Body: { signatureImageBase64: string, acceptedTerms: boolean }
  app.post('/v1/contratos/:id/assinar-digital', { preHandler: app.authenticate }, async (request, reply) => {
    const { tenant_id } = request.user
    const { signatureImageBase64, acceptedTerms } = request.body ?? {}

    if (!acceptedTerms) {
      return reply.code(400).send({ error: 'É necessário aceitar os termos para assinar' })
    }
    if (!signatureImageBase64) {
      return reply.code(400).send({ error: 'Imagem da assinatura é obrigatória' })
    }

    const db = await app.dbTenant(tenant_id)
    try {
      // Busca contrato + cliente
      const q = await db.query(
        `SELECT c.id, c.status, c.cliente_id,
                cl.fat_anual, cl.cnpj, cl.score as cliente_score
         FROM contratos c JOIN clientes cl ON cl.id = c.cliente_id
         WHERE c.id = $1 AND c.status = 'rascunho'`,
        [request.params.id]
      )
      const contrato = q.rows[0]
      if (!contrato) {
        return reply.code(400).send({ error: 'Contrato não encontrado ou não está em rascunho' })
      }

      // Score interno (Auditoria Comercial — não Serasa)
      let score = 0
      if (Number(contrato.fat_anual) > 50000) score += 50
      if (contrato.cnpj) score += 20
      if ((contrato.cliente_score ?? 0) >= 70) score += 30

      const aprovado = score >= 60
      const novoStatus = aprovado ? 'ativo' : 'em_analise'
      const clienteStatus = aprovado ? 'ativo' : undefined
      const signatureUrl = `data:image/png;base64,${signatureImageBase64}`
      const clientIp = request.headers['x-forwarded-for']?.split(',')[0]?.trim()
                    || request.socket?.remoteAddress
                    || 'unknown'

      // Atualiza contrato
      await db.query(
        `UPDATE contratos
         SET status = $1,
             signature_type = 'pad',
             signature_image_url = $2,
             signed_ip = $3,
             accepted_terms_at = NOW(),
             assinado_em = NOW(),
             ativado_em = $4
         WHERE id = $5`,
        [novoStatus, signatureUrl, clientIp, aprovado ? new Date() : null, request.params.id]
      )

      // Se aprovado, atualiza status do cliente também
      if (clienteStatus) {
        await db.query(
          `UPDATE clientes SET status = 'ativo' WHERE id = $1`,
          [contrato.cliente_id]
        )
      }

      return { aprovado, score, status: novoStatus, requer_backoffice: !aprovado }
    } finally {
      db.release()
    }
  })
```

- [ ] **Step 2: Testar com curl** (crie um contrato em rascunho primeiro via `/v1/contratos`)

```bash
# Substitua <CONTRATO_ID> por um UUID real
curl -s -X POST "http://localhost:3000/v1/contratos/<CONTRATO_ID>/assinar-digital" \
  -H "Content-Type: application/json" \
  -d '{"signatureImageBase64":"iVBORw0KGgo=","acceptedTerms":true}' | jq .
```

Saída esperada:
```json
{"aprovado": true, "score": 70, "status": "ativo", "requer_backoffice": false}
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/contratos.js
git commit -m "feat: add assinar-digital endpoint with auto-score approval"
```

---

## Task 4 — Backend: rotas de Análise de Crédito (backoffice)

**Files:**
- Modify: `src/routes/contratos.js`

- [ ] **Step 1: Adicionar `GET /v1/analise-credito` em `src/routes/contratos.js`**

Inserir no final do arquivo, antes do `}` do `contratosRoutes`:

```js
  // GET /v1/analise-credito → contratos em_analise com dados do cliente
  app.get('/v1/analise-credito', { preHandler: app.authenticate }, async (request) => {
    const { tenant_id } = request.user
    const db = await app.dbTenant(tenant_id)
    try {
      const result = await db.query(
        `SELECT c.id, c.status, c.valor_fixo, c.comissao_pct,
                c.is_risco_franqueado, c.risco_assumido_em,
                c.arquivado_em, c.arquivado_motivo, c.assinado_em,
                cl.nome, cl.cnpj, cl.fat_anual, cl.nicho, cl.score,
                cl.razao_social
         FROM contratos c
         JOIN clientes cl ON cl.id = c.cliente_id
         WHERE c.tenant_id = $1
           AND c.status IN ('em_analise', 'ativo', 'arquivado')
         ORDER BY c.assinado_em DESC NULLS LAST`,
        [tenant_id]
      )
      return result.rows
    } finally {
      db.release()
    }
  })

  // PATCH /v1/contratos/:id/aprovar → batch: contrato ativo + cliente ativo
  app.patch('/v1/contratos/:id/aprovar', {
    preHandler: app.requirePapel(['franqueador_master']),
  }, async (request, reply) => {
    const { tenant_id } = request.user
    const db = await app.dbTenant(tenant_id)
    try {
      const q = await db.query(
        `UPDATE contratos
         SET status = 'ativo', ativado_em = NOW()
         WHERE id = $1 AND status = 'em_analise'
         RETURNING id, cliente_id`,
        [request.params.id]
      )
      if (!q.rows[0]) return reply.code(400).send({ error: 'Contrato não está em análise' })

      await db.query(
        `UPDATE clientes SET status = 'ativo' WHERE id = $1`,
        [q.rows[0].cliente_id]
      )
      return { ok: true, status: 'ativo' }
    } finally {
      db.release()
    }
  })

  // PATCH /v1/contratos/:id/arquivar → status=arquivado + motivo
  app.patch('/v1/contratos/:id/arquivar', {
    preHandler: app.requirePapel(['franqueador_master']),
  }, async (request, reply) => {
    const { tenant_id } = request.user
    const motivo = (request.body ?? {}).motivo ?? null
    const db = await app.dbTenant(tenant_id)
    try {
      const result = await db.query(
        `UPDATE contratos
         SET status = 'arquivado', arquivado_em = NOW(), arquivado_motivo = $2
         WHERE id = $1 AND status IN ('em_analise','rascunho')
         RETURNING id, status`,
        [request.params.id, motivo]
      )
      if (!result.rows[0]) return reply.code(400).send({ error: 'Contrato não pode ser arquivado' })
      return result.rows[0]
    } finally {
      db.release()
    }
  })

  // PATCH /v1/contratos/:id/sinalizar-risco → ativo + is_risco_franqueado=true
  app.patch('/v1/contratos/:id/sinalizar-risco', {
    preHandler: app.requirePapel(['franqueador_master']),
  }, async (request, reply) => {
    const { tenant_id } = request.user
    const db = await app.dbTenant(tenant_id)
    try {
      const q = await db.query(
        `UPDATE contratos
         SET status = 'ativo',
             is_risco_franqueado = true,
             risco_assumido_em = NOW(),
             ativado_em = NOW()
         WHERE id = $1 AND status = 'em_analise'
         RETURNING id, cliente_id`,
        [request.params.id]
      )
      if (!q.rows[0]) return reply.code(400).send({ error: 'Contrato não está em análise' })

      await db.query(
        `UPDATE clientes SET status = 'ativo' WHERE id = $1`,
        [q.rows[0].cliente_id]
      )
      return { ok: true, status: 'ativo', is_risco_franqueado: true }
    } finally {
      db.release()
    }
  })
```

- [ ] **Step 2: Testar GET /v1/analise-credito**

```bash
curl -s "http://localhost:3000/v1/analise-credito" | jq '. | length'
```

Saída esperada: número >= 0 (sem erros 500).

- [ ] **Step 3: Commit**

```bash
git add src/routes/contratos.js
git commit -m "feat: add analise-credito list + aprovar/arquivar/sinalizar-risco endpoints"
```

---

## Task 5 — Frontend: adicionar package `signature`

**Files:**
- Modify: `pubspec.yaml`

- [ ] **Step 1: Adicionar dependência no pubspec.yaml**

No bloco `dependencies:`, após `flutter_riverpod: ^2.5.1`, adicionar:

```yaml
  signature: ^5.4.0
```

- [ ] **Step 2: Instalar**

```bash
cd /Users/vitormiguelgoedertdaluz/-liveshop_saas-frontend-
flutter pub get
```

Saída esperada: `Got dependencies!` sem erros.

- [ ] **Step 3: Commit**

```bash
git add pubspec.yaml pubspec.lock
git commit -m "feat: add signature package for digital signature pad"
```

---

## Task 6 — Frontend: atualizar models (Cliente + Contrato)

**Files:**
- Modify: `lib/models/cliente.dart`
- Modify: `lib/models/contrato.dart`

- [ ] **Step 1: Atualizar `lib/models/cliente.dart`**

Substituir o conteúdo completo:

```dart
class Cliente {
  final String id;
  final String nome;
  final String celular;
  final String? email;
  final String status;
  final double? lat;
  final double? lng;
  final double fatAnual;
  final String? nicho;
  final int score;
  // Novos campos (Módulo 1 + 2)
  final String? cep;
  final String? cidade;
  final String? estado;
  final String? siga;

  const Cliente({
    required this.id,
    required this.nome,
    required this.celular,
    this.email,
    required this.status,
    this.lat,
    this.lng,
    required this.fatAnual,
    this.nicho,
    required this.score,
    this.cep,
    this.cidade,
    this.estado,
    this.siga,
  });

  factory Cliente.fromJson(Map<String, dynamic> j) => Cliente(
    id:       j['id'] as String,
    nome:     j['nome'] as String,
    celular:  j['celular'] as String,
    email:    j['email'] as String?,
    status:   j['status'] as String,
    lat:      (j['lat'] as num?)?.toDouble(),
    lng:      (j['lng'] as num?)?.toDouble(),
    fatAnual: (j['fat_anual'] as num? ?? 0).toDouble(),
    nicho:    j['nicho'] as String?,
    score:    (j['score'] as num? ?? 0).toInt(),
    cep:      j['cep'] as String?,
    cidade:   j['cidade'] as String?,
    estado:   j['estado'] as String?,
    siga:     j['siga'] as String?,
  );
}
```

- [ ] **Step 2: Atualizar `lib/models/contrato.dart`**

Substituir o conteúdo completo:

```dart
class Contrato {
  final String id;
  final String clienteId;
  final String status;
  final double valorFixo;
  final double comissaoPct;
  final bool deRisco;
  final bool isRiscoFranqueado;
  final DateTime? assinadoEm;
  final DateTime? ativadoEm;
  final String? signatureImageUrl;
  final String? signedIp;
  final DateTime? acceptedTermsAt;
  // Para a tela de Análise de Crédito
  final String? clienteNome;
  final String? clienteCnpj;
  final double? clienteFatAnual;
  final String? clienteNicho;
  final int? clienteScore;

  const Contrato({
    required this.id,
    required this.clienteId,
    required this.status,
    required this.valorFixo,
    required this.comissaoPct,
    required this.deRisco,
    this.isRiscoFranqueado = false,
    this.assinadoEm,
    this.ativadoEm,
    this.signatureImageUrl,
    this.signedIp,
    this.acceptedTermsAt,
    this.clienteNome,
    this.clienteCnpj,
    this.clienteFatAnual,
    this.clienteNicho,
    this.clienteScore,
  });

  factory Contrato.fromJson(Map<String, dynamic> j) => Contrato(
    id:                  j['id'] as String,
    clienteId:           j['cliente_id'] as String? ?? '',
    status:              j['status'] as String,
    valorFixo:           (j['valor_fixo'] as num? ?? 0).toDouble(),
    comissaoPct:         (j['comissao_pct'] as num? ?? 0).toDouble(),
    deRisco:             j['de_risco'] as bool? ?? false,
    isRiscoFranqueado:   j['is_risco_franqueado'] as bool? ?? false,
    assinadoEm:          j['assinado_em'] != null ? DateTime.parse(j['assinado_em'] as String) : null,
    ativadoEm:           j['ativado_em'] != null ? DateTime.parse(j['ativado_em'] as String) : null,
    signatureImageUrl:   j['signature_image_url'] as String?,
    signedIp:            j['signed_ip'] as String?,
    acceptedTermsAt:     j['accepted_terms_at'] != null ? DateTime.parse(j['accepted_terms_at'] as String) : null,
    clienteNome:         j['nome'] as String?,
    clienteCnpj:         j['cnpj'] as String?,
    clienteFatAnual:     (j['fat_anual'] as num?)?.toDouble(),
    clienteNicho:        j['nicho'] as String?,
    clienteScore:        (j['score'] as num?)?.toInt(),
  );
}
```

- [ ] **Step 3: Verificar que compila sem erros**

```bash
flutter analyze lib/models/
```

Saída esperada: `No issues found!`

- [ ] **Step 4: Commit**

```bash
git add lib/models/cliente.dart lib/models/contrato.dart
git commit -m "feat: extend Cliente and Contrato models with new fields"
```

---

## Task 7 — Frontend: atualizar providers

**Files:**
- Modify: `lib/providers/clientes_provider.dart`
- Modify: `lib/providers/contratos_provider.dart`

- [ ] **Step 1: Atualizar `lib/providers/clientes_provider.dart`**

Adicionar o método `buscarCep` dentro de `ClientesNotifier`, após o método `criar`:

```dart
  Future<Map<String, dynamic>> buscarCep(String cep) async {
    final resp = await ApiService.get('/cep/$cep');
    return resp.data as Map<String, dynamic>;
  }
```

O arquivo completo fica:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/cliente.dart';
import '../services/api_service.dart';

class ClientesNotifier extends AsyncNotifier<List<Cliente>> {
  @override
  Future<List<Cliente>> build() => _fetch();

  Future<List<Cliente>> _fetch() async {
    final resp = await ApiService.get('/clientes');
    return (resp.data as List)
        .map((e) => Cliente.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<Cliente> criar(Map<String, dynamic> data) async {
    final resp = await ApiService.post('/clientes', data: data);
    final cliente = Cliente.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData([cliente, ...state.valueOrNull ?? []]);
    return cliente;
  }

  Future<Map<String, dynamic>> buscarCep(String cep) async {
    final resp = await ApiService.get('/cep/$cep');
    return resp.data as Map<String, dynamic>;
  }
}

final clientesProvider =
    AsyncNotifierProvider<ClientesNotifier, List<Cliente>>(ClientesNotifier.new);
```

- [ ] **Step 2: Atualizar `lib/providers/contratos_provider.dart`**

Substituir o conteúdo completo:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/contrato.dart';
import '../services/api_service.dart';

class ContratosNotifier extends Notifier<void> {
  @override
  void build() {}

  Future<String> criar({
    required String clienteId,
    required double valorFixo,
    required double comissaoPct,
  }) async {
    final resp = await ApiService.post('/contratos', data: {
      'cliente_id':   clienteId,
      'valor_fixo':   valorFixo,
      'comissao_pct': comissaoPct,
    });
    return (resp.data as Map<String, dynamic>)['id'] as String;
  }

  // Legado — mantido para compatibilidade com AnaliseFinanceiraScreen
  Future<Map<String, dynamic>> assinar(String id) async {
    final resp = await ApiService.post('/contratos/$id/assinar');
    return resp.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> analisar(String id) async {
    final resp = await ApiService.post('/contratos/$id/analisar');
    return resp.data as Map<String, dynamic>;
  }

  /// Novo fluxo: assina + calcula score + auto-aprova se score >= 60
  Future<Map<String, dynamic>> assinarDigital({
    required String id,
    required String signatureBase64,
  }) async {
    final resp = await ApiService.post('/contratos/$id/assinar-digital', data: {
      'signatureImageBase64': signatureBase64,
      'acceptedTerms': true,
    });
    return resp.data as Map<String, dynamic>;
  }

  Future<void> assumirRisco(String id) async {
    await ApiService.patch('/contratos/$id/assumir-risco');
  }

  Future<void> cancelar(String id) async {
    await ApiService.patch('/contratos/$id/cancelar');
  }

  // Backoffice — Análise de Crédito
  Future<void> aprovar(String id) async {
    await ApiService.patch('/contratos/$id/aprovar');
  }

  Future<void> arquivar(String id, {String? motivo}) async {
    await ApiService.patch('/contratos/$id/arquivar', data: {'motivo': motivo});
  }

  Future<void> sinalizarRisco(String id) async {
    await ApiService.patch('/contratos/$id/sinalizar-risco');
  }
}

final contratosProvider =
    NotifierProvider<ContratosNotifier, void>(ContratosNotifier.new);

// Provider para a tela de Análise de Crédito
final analiseCreditoProvider = FutureProvider<List<Contrato>>((ref) async {
  final resp = await ApiService.get('/analise-credito');
  return (resp.data as List)
      .map((e) => Contrato.fromJson(e as Map<String, dynamic>))
      .toList();
});
```

- [ ] **Step 3: Verificar que compila sem erros**

```bash
flutter analyze lib/providers/
```

Saída esperada: `No issues found!`

- [ ] **Step 4: Commit**

```bash
git add lib/providers/clientes_provider.dart lib/providers/contratos_provider.dart
git commit -m "feat: add buscarCep, assinarDigital, aprovar/arquivar/sinalizarRisco to providers"
```

---

## Task 8 — Frontend: CadastroClienteScreen como formulário 4 steps

**Files:**
- Rewrite: `lib/screens/vendas/cadastro_cliente_screen.dart`

O formulário usa `PageController` para navegar entre os 4 steps. Step 3 faz CEP autocomplete com debounce de 500ms.

- [ ] **Step 1: Reescrever `lib/screens/vendas/cadastro_cliente_screen.dart`**

```dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../widgets/app_scaffold.dart';
import '../../widgets/action_button.dart';
import '../../providers/clientes_provider.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';

class CadastroClienteScreen extends ConsumerStatefulWidget {
  const CadastroClienteScreen({super.key});
  @override
  ConsumerState<CadastroClienteScreen> createState() => _CadastroClienteScreenState();
}

class _CadastroClienteScreenState extends ConsumerState<CadastroClienteScreen> {
  final _pageCtrl = PageController();
  int _step = 0;
  bool _loading = false;

  // Step 1 — Dados pessoais
  final _nomeCtrl    = TextEditingController();
  final _celularCtrl = TextEditingController();
  final _emailCtrl   = TextEditingController();
  final _cpfCtrl     = TextEditingController();

  // Step 2 — Dados comerciais
  final _cnpjCtrl       = TextEditingController();
  final _razaoCtrl      = TextEditingController();
  final _fatCtrl        = TextEditingController();
  final _nichoCtrl      = TextEditingController();
  final _sigaCtrl       = TextEditingController();

  // Step 3 — Localização
  final _cepCtrl        = TextEditingController();
  final _cidadeCtrl     = TextEditingController();
  final _estadoCtrl     = TextEditingController();
  double? _lat, _lng;
  bool _geocodingLoading = false;
  Timer? _cepDebounce;

  // Step 4 — Qualificação
  bool _jaVendeTikTok = false;

  @override
  void dispose() {
    _pageCtrl.dispose();
    _nomeCtrl.dispose(); _celularCtrl.dispose(); _emailCtrl.dispose(); _cpfCtrl.dispose();
    _cnpjCtrl.dispose(); _razaoCtrl.dispose(); _fatCtrl.dispose(); _nichoCtrl.dispose(); _sigaCtrl.dispose();
    _cepCtrl.dispose(); _cidadeCtrl.dispose(); _estadoCtrl.dispose();
    _cepDebounce?.cancel();
    super.dispose();
  }

  void _onCepChanged(String value) {
    _cepDebounce?.cancel();
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.length != 8) return;
    _cepDebounce = Timer(const Duration(milliseconds: 500), () => _buscarCep(digits));
  }

  Future<void> _buscarCep(String cep) async {
    setState(() => _geocodingLoading = true);
    try {
      final data = await ref.read(clientesProvider.notifier).buscarCep(cep);
      setState(() {
        _cidadeCtrl.text = data['cidade'] as String? ?? '';
        _estadoCtrl.text = data['estado'] as String? ?? '';
        _lat = (data['lat'] as num?)?.toDouble();
        _lng = (data['lng'] as num?)?.toDouble();
      });
    } catch (_) {
      // Falha silenciosa
    } finally {
      if (mounted) setState(() => _geocodingLoading = false);
    }
  }

  void _nextStep() {
    if (_step == 0 && (_nomeCtrl.text.isEmpty || _celularCtrl.text.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nome e celular são obrigatórios')),
      );
      return;
    }
    if (_step < 3) {
      setState(() => _step++);
      _pageCtrl.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    }
  }

  void _prevStep() {
    if (_step > 0) {
      setState(() => _step--);
      _pageCtrl.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    }
  }

  Future<void> _salvar({required bool gerarContrato}) async {
    setState(() => _loading = true);
    try {
      final cliente = await ref.read(clientesProvider.notifier).criar({
        'nome':         _nomeCtrl.text,
        'celular':      _celularCtrl.text,
        if (_emailCtrl.text.isNotEmpty)  'email':        _emailCtrl.text,
        if (_cpfCtrl.text.isNotEmpty)    'cpf':          _cpfCtrl.text,
        if (_cnpjCtrl.text.isNotEmpty)   'cnpj':         _cnpjCtrl.text,
        if (_razaoCtrl.text.isNotEmpty)  'razao_social': _razaoCtrl.text,
        if (_nichoCtrl.text.isNotEmpty)  'nicho':        _nichoCtrl.text,
        if (_sigaCtrl.text.isNotEmpty)   'siga':         _sigaCtrl.text,
        if (_cepCtrl.text.isNotEmpty)    'cep':          _cepCtrl.text.replaceAll(RegExp(r'\D'), ''),
        if (_cidadeCtrl.text.isNotEmpty) 'cidade':       _cidadeCtrl.text,
        if (_estadoCtrl.text.isNotEmpty) 'estado':       _estadoCtrl.text,
        'fat_anual':    double.tryParse(_fatCtrl.text.replaceAll(',', '.')) ?? 0,
        'vende_tiktok': _jaVendeTikTok,
        if (_lat != null) 'lat': _lat,
        if (_lng != null) 'lng': _lng,
      });
      if (!mounted) return;
      if (gerarContrato) {
        Navigator.pushNamed(context, AppRoutes.contrato, arguments: {'clienteId': cliente.id});
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Rascunho salvo!')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      currentRoute: AppRoutes.vendas,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 640),
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _StepIndicator(current: _step),
                    const SizedBox(height: 24),
                    SizedBox(
                      height: 360,
                      child: PageView(
                        controller: _pageCtrl,
                        physics: const NeverScrollableScrollPhysics(),
                        children: [
                          _step1(),
                          _step2(),
                          _step3(),
                          _step4(),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    _buildNavButtons(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _step1() => SingleChildScrollView(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Dados Pessoais', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 16),
        _field('Nome Completo *', _nomeCtrl),
        _field('Celular (WhatsApp) *', _celularCtrl, type: TextInputType.phone),
        _field('Email', _emailCtrl, type: TextInputType.emailAddress),
        _field('CPF', _cpfCtrl),
      ],
    ),
  );

  Widget _step2() => SingleChildScrollView(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Dados Comerciais', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 16),
        _field('CNPJ', _cnpjCtrl),
        _field('Razão Social', _razaoCtrl),
        _field('Faturamento Anual R\$', _fatCtrl, type: TextInputType.number),
        _field('Nicho (ex: Moda, Eletrônicos)', _nichoCtrl),
        _field('@ TikTok / Instagram', _sigaCtrl),
      ],
    ),
  );

  Widget _step3() => SingleChildScrollView(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Localização', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 16),
        TextField(
          controller: _cepCtrl,
          keyboardType: TextInputType.number,
          onChanged: _onCepChanged,
          decoration: InputDecoration(
            labelText: 'CEP *',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            suffixIcon: _geocodingLoading
                ? const Padding(padding: EdgeInsets.all(12), child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)))
                : const Icon(Icons.location_on_outlined),
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(flex: 3, child: _field('Cidade', _cidadeCtrl)),
            const SizedBox(width: 8),
            Expanded(flex: 1, child: _field('UF', _estadoCtrl)),
          ],
        ),
        if (_lat != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Row(children: [
              const Icon(Icons.check_circle_outline, color: AppColors.success, size: 14),
              const SizedBox(width: 4),
              Text('Geolocalizado (${_lat!.toStringAsFixed(4)}, ${_lng!.toStringAsFixed(4)})',
                  style: const TextStyle(fontSize: 11, color: AppColors.success)),
            ]),
          ),
      ],
    ),
  );

  Widget _step4() => SingleChildScrollView(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Qualificação', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 20),
        Row(children: [
          const Text('Já vende no TikTok Live?', style: TextStyle(fontSize: 14)),
          const SizedBox(width: 12),
          Switch(
            value: _jaVendeTikTok,
            activeThumbColor: AppColors.primary,
            onChanged: (v) => setState(() => _jaVendeTikTok = v),
          ),
          Text(_jaVendeTikTok ? 'Sim' : 'Não'),
        ]),
        const SizedBox(height: 24),
        const Divider(),
        const SizedBox(height: 12),
        const Text('Revisão', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        _reviewRow('Nome', _nomeCtrl.text),
        _reviewRow('Celular', _celularCtrl.text),
        if (_emailCtrl.text.isNotEmpty) _reviewRow('Email', _emailCtrl.text),
        if (_cnpjCtrl.text.isNotEmpty) _reviewRow('CNPJ', _cnpjCtrl.text),
        if (_nichoCtrl.text.isNotEmpty) _reviewRow('Nicho', _nichoCtrl.text),
        if (_cidadeCtrl.text.isNotEmpty) _reviewRow('Cidade/UF', '${_cidadeCtrl.text}/${_estadoCtrl.text}'),
      ],
    ),
  );

  Widget _reviewRow(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 4),
    child: Row(children: [
      SizedBox(width: 80, child: Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12))),
      Expanded(child: Text(value, style: const TextStyle(fontSize: 12))),
    ]),
  );

  Widget _buildNavButtons() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return Row(
      children: [
        if (_step > 0)
          TextButton.icon(
            onPressed: _prevStep,
            icon: const Icon(Icons.arrow_back_ios, size: 14),
            label: const Text('Voltar'),
          ),
        const Spacer(),
        if (_step < 3)
          ActionButton(label: 'PRÓXIMO', icon: Icons.arrow_forward_ios, onPressed: _nextStep)
        else ...[
          ActionButton(
            label: 'GERAR CONTRATO',
            icon: Icons.description_outlined,
            onPressed: () => _salvar(gerarContrato: true),
          ),
          const SizedBox(width: 12),
          ActionButton(
            label: 'RASCUNHO',
            icon: Icons.save_outlined,
            outlined: true,
            onPressed: () => _salvar(gerarContrato: false),
          ),
        ],
      ],
    );
  }

  Widget _field(String label, TextEditingController ctrl, {TextInputType? type}) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: TextField(
      controller: ctrl,
      keyboardType: type,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
    ),
  );
}

class _StepIndicator extends StatelessWidget {
  final int current;
  const _StepIndicator({required this.current});

  static const _labels = ['Pessoal', 'Comercial', 'Localização', 'Qualificação'];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(_labels.length, (i) {
        final active = i == current;
        final done   = i < current;
        return Expanded(
          child: Row(
            children: [
              Column(
                children: [
                  Container(
                    width: 28, height: 28,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: done ? AppColors.success : active ? AppColors.primary : Colors.grey.shade200,
                    ),
                    child: Center(
                      child: done
                          ? const Icon(Icons.check, size: 14, color: Colors.white)
                          : Text('${i + 1}', style: TextStyle(fontSize: 12, color: active ? Colors.white : Colors.grey, fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(_labels[i], style: TextStyle(fontSize: 9, color: active ? AppColors.primary : Colors.grey)),
                ],
              ),
              if (i < _labels.length - 1)
                Expanded(child: Container(height: 1, color: done ? AppColors.success : Colors.grey.shade300, margin: const EdgeInsets.only(bottom: 16))),
            ],
          ),
        );
      }),
    );
  }
}
```

- [ ] **Step 2: Verificar compilação**

```bash
flutter analyze lib/screens/vendas/cadastro_cliente_screen.dart
```

Saída esperada: `No issues found!`

- [ ] **Step 3: Commit**

```bash
git add lib/screens/vendas/cadastro_cliente_screen.dart
git commit -m "feat: rewrite CadastroClienteScreen as 4-step form with CEP autocomplete"
```

---

## Task 9 — Frontend: VendasScreen — filtro BottomSheet multiselect

**Files:**
- Modify: `lib/screens/vendas/vendas_screen.dart`

Substituir o `_StatusFilter` (dropdown simples) por botão "⚙️ Filtros" que abre BottomSheet com checkboxes multiselect.

- [ ] **Step 1: Substituir o conteúdo de `lib/screens/vendas/vendas_screen.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../widgets/app_scaffold.dart';
import '../../widgets/client_pin.dart';
import '../../providers/clientes_provider.dart';
import '../../providers/recomendacoes_provider.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';

class VendasScreen extends ConsumerStatefulWidget {
  const VendasScreen({super.key});

  @override
  ConsumerState<VendasScreen> createState() => _VendasScreenState();
}

class _VendasScreenState extends ConsumerState<VendasScreen> {
  final Set<String> _activeFilters = {};

  static const _statusOptions = [
    ('negociacao',   'Negociação',      AppColors.info),
    ('enviado',      'Enviado',         AppColors.warning),
    ('em_analise',   'Em Análise',      AppColors.warning),
    ('ativo',        'Ativo',           AppColors.success),
    ('inadimplente', 'Inadimplente',    AppColors.danger),
    ('recomendacao', 'Recomendação',    AppColors.lilac),
  ];

  bool _clientePassaFiltro(String status) {
    if (_activeFilters.isEmpty) return true;
    return _activeFilters.contains(status);
  }

  void _abrirFiltros() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text('Filtrar por Status', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  const Spacer(),
                  TextButton(
                    onPressed: () {
                      setModalState(() {});
                      setState(() => _activeFilters.clear());
                    },
                    child: const Text('Limpar tudo'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ..._statusOptions.map((opt) {
                final (value, label, color) = opt;
                return CheckboxListTile(
                  value: _activeFilters.contains(value),
                  title: Row(
                    children: [
                      Icon(Icons.circle, color: color, size: 12),
                      const SizedBox(width: 8),
                      Text(label, style: const TextStyle(fontSize: 14)),
                    ],
                  ),
                  onChanged: (checked) {
                    setModalState(() {
                      checked == true ? _activeFilters.add(value) : _activeFilters.remove(value);
                    });
                    setState(() {});
                  },
                  controlAffinity: ListTileControlAffinity.leading,
                  dense: true,
                );
              }),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final clientesAsync  = ref.watch(clientesProvider);
    final recsAsync      = ref.watch(recomendacoesProvider);
    final hasFilter      = _activeFilters.isNotEmpty;

    return AppScaffold(
      currentRoute: AppRoutes.vendas,
      child: Stack(
        children: [
          FlutterMap(
            options: const MapOptions(
              initialCenter: LatLng(-15.0, -55.0),
              initialZoom: 4.5,
              minZoom: 3.5,
              maxZoom: 10,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.liveshop.saas',
              ),
              MarkerLayer(
                markers: [
                  ...clientesAsync.valueOrNull
                          ?.where((c) =>
                              c.lat != null &&
                              c.lng != null &&
                              _clientePassaFiltro(c.status))
                          .map((c) => Marker(
                                width: 120,
                                height: 60,
                                point: LatLng(c.lat!, c.lng!),
                                child: ClientPin(status: c.status, nome: c.nome),
                              ))
                          .toList() ?? [],
                  if (_activeFilters.isEmpty || _activeFilters.contains('recomendacao'))
                    ...recsAsync.valueOrNull
                            ?.where((r) => r.lat != null && r.lng != null && r.status == 'pendente')
                            .map((r) => Marker(
                                  width: 120,
                                  height: 60,
                                  point: LatLng(r.lat!, r.lng!),
                                  child: ClientPin(status: 'recomendacao', nome: r.nomeIndicado),
                                ))
                            .toList() ?? [],
                ],
              ),
            ],
          ),
          // Botão flutuante de filtros
          Positioned(
            top: 16,
            left: 16,
            child: Material(
              elevation: 3,
              borderRadius: BorderRadius.circular(8),
              color: hasFilter ? AppColors.primary : Colors.white,
              child: InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: _abrirFiltros,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.tune, size: 16, color: hasFilter ? Colors.white : AppColors.textPrimary),
                      const SizedBox(width: 6),
                      Text(
                        hasFilter ? 'Filtros (${_activeFilters.length})' : '⚙️ Filtros',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: hasFilter ? Colors.white : AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const Positioned(
            bottom: 80,
            right: 16,
            child: _MapLegend(),
          ),
          Positioned(
            bottom: 24,
            right: 24,
            child: FloatingActionButton(
              backgroundColor: AppColors.primary,
              onPressed: () => Navigator.pushNamed(context, AppRoutes.cadastroCliente),
              child: const Icon(Icons.add, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

class _MapLegend extends StatelessWidget {
  const _MapLegend();

  @override
  Widget build(BuildContext context) {
    const items = [
      ('Negociação',       AppColors.info),
      ('Contrato Enviado', AppColors.warning),
      ('Ativo',            AppColors.success),
      ('Inadimplente',     AppColors.danger),
      ('Recomendação',     AppColors.lilac),
    ];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: items
              .map((item) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.circle, color: item.$2, size: 12),
                        const SizedBox(width: 6),
                        Text(item.$1, style: const TextStyle(fontSize: 12)),
                      ],
                    ),
                  ))
              .toList(),
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Verificar compilação**

```bash
flutter analyze lib/screens/vendas/vendas_screen.dart
```

Saída esperada: `No issues found!`

- [ ] **Step 3: Commit**

```bash
git add lib/screens/vendas/vendas_screen.dart
git commit -m "feat: replace map dropdown filter with multiselect BottomSheet"
```

---

## Task 10 — Frontend: ContratoScreen com signature_pad

**Files:**
- Modify: `lib/screens/vendas/contrato_screen.dart`

Adiciona pad de assinatura real (package `signature`) substituindo o `_SignatureField` estático. Ao clicar "ASSINAR AGORA", exibe dialog com o pad, captura a imagem e chama `assinarDigital`.

- [ ] **Step 1: Substituir o conteúdo de `lib/screens/vendas/contrato_screen.dart`**

```dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:signature/signature.dart';
import '../../widgets/app_scaffold.dart';
import '../../widgets/action_button.dart';
import '../../models/cliente.dart';
import '../../providers/contratos_provider.dart';
import '../../providers/clientes_provider.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';

class ContratoScreen extends ConsumerStatefulWidget {
  const ContratoScreen({super.key});
  @override
  ConsumerState<ContratoScreen> createState() => _ContratoScreenState();
}

class _ContratoScreenState extends ConsumerState<ContratoScreen> {
  bool _loading = false;
  String? _contratoId; // criado ao chegar na tela

  String? get _clienteId {
    final args = ModalRoute.of(context)?.settings.arguments as Map?;
    return args?['clienteId'] as String?;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _criarContrato());
  }

  Future<void> _criarContrato() async {
    final clienteId = _clienteId;
    if (clienteId == null) return;
    try {
      final id = await ref.read(contratosProvider.notifier).criar(
        clienteId: clienteId,
        valorFixo: 2990,
        comissaoPct: 5,
      );
      if (mounted) setState(() => _contratoId = id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro ao criar contrato: $e')));
      }
    }
  }

  Future<void> _abrirPadAssinatura() async {
    final contratoId = _contratoId;
    if (contratoId == null) return;
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _SignatureDialog(
        onConfirm: (base64) async {
          Navigator.of(ctx).pop();
          await _assinarDigital(contratoId, base64);
        },
        onCancel: () => Navigator.of(ctx).pop(),
      ),
    );
  }

  Future<void> _assinarDigital(String contratoId, String base64) async {
    setState(() => _loading = true);
    try {
      final result = await ref.read(contratosProvider.notifier).assinarDigital(
        id: contratoId,
        signatureBase64: base64,
      );
      if (!mounted) return;
      if (result['aprovado'] == true) {
        Navigator.pushNamed(context, AppRoutes.analise, arguments: {
          'contratoId': contratoId,
          'aprovadoAutomatico': true,
          'score': result['score'],
        });
      } else {
        Navigator.pushNamed(context, AppRoutes.analise, arguments: {
          'contratoId': contratoId,
          'aprovadoAutomatico': false,
          'requerBackoffice': true,
          'score': result['score'],
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro ao assinar: $e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _enviarWhatsApp() async {
    final contratoId = _contratoId;
    if (contratoId == null) return;
    // Fase 1: apenas copia link (futuramente integra com URL do PDF)
    final clienteId = _clienteId ?? '';
    final link = 'https://liveshop.app/assinar/$clienteId';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Link copiado: $link')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final clienteId = _clienteId;
    final clientes  = ref.watch(clientesProvider).valueOrNull ?? const <Cliente>[];
    Cliente? cliente;
    if (clienteId != null) {
      for (final c in clientes) {
        if (c.id == clienteId) { cliente = c; break; }
      }
    }

    return AppScaffold(
      currentRoute: AppRoutes.vendas,
      child: Row(
        children: [
          // Corpo do contrato
          Expanded(
            flex: 3,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(32),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(40),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Center(child: Text('CONTRATO DE PARCERIA',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500, letterSpacing: 1))),
                      const Center(child: Text('LIVESHOP ESTÚDIO',
                          style: TextStyle(fontSize: 14, color: AppColors.primary))),
                      const SizedBox(height: 32),
                      Text('CONTRATANTE: ${cliente?.nome ?? '[Nome do Cliente]'}'),
                      if (cliente?.email != null) ...[
                        const SizedBox(height: 8),
                        Text('EMAIL: ${cliente!.email}'),
                      ],
                      if (cliente?.cidade != null) ...[
                        const SizedBox(height: 8),
                        Text('CIDADE: ${cliente!.cidade}/${cliente.estado ?? ''}'),
                      ],
                      const Divider(height: 32),
                      const Text(
                        'O presente contrato tem por objeto a prestação de serviços de transmissão ao vivo (LiveShop) pela CONTRATADA, conforme plano escolhido, com vigência de 12 (doze) meses a partir da data de assinatura.\n\n'
                        'Cláusula 1ª — DAS OBRIGAÇÕES DA CONTRATADA\nA CONTRATADA se compromete a disponibilizar cabine, equipamentos, apresentador e suporte técnico para realização das transmissões conforme cronograma acordado.\n\n'
                        'Cláusula 2ª — DAS OBRIGAÇÕES DO CONTRATANTE\nO CONTRATANTE se compromete ao pagamento das mensalidades nas datas acordadas e ao fornecimento dos produtos para transmissão.\n\n'
                        'Cláusula 3ª — DO VALOR\nO valor mensal acordado é de R\$ 2.990,00, vencendo todo dia 10 de cada mês.',
                        style: TextStyle(fontSize: 12, height: 1.6),
                      ),
                      const SizedBox(height: 40),
                      const Text('Assinatura do Contratante:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      const SizedBox(height: 8),
                      Container(
                        width: 240, height: 64,
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Center(
                          child: Text('(clique em "Assinar Agora" →)', style: TextStyle(fontSize: 11, color: Colors.grey)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          // Painel lateral de ações
          Container(
            width: 220,
            color: Colors.white,
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Ações', style: TextStyle(fontWeight: FontWeight.w500, fontSize: 16)),
                const SizedBox(height: 20),
                if (_loading)
                  const Center(child: CircularProgressIndicator())
                else if (_contratoId == null)
                  const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)))
                else ...[
                  ActionButton(
                    label: 'ASSINAR AGORA',
                    icon: Icons.draw_outlined,
                    color: AppColors.success,
                    onPressed: _abrirPadAssinatura,
                  ),
                  const SizedBox(height: 12),
                  ActionButton(
                    label: 'ENVIAR POR WHATSAPP',
                    icon: Icons.send_outlined,
                    outlined: true,
                    onPressed: _enviarWhatsApp,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SignatureDialog extends StatefulWidget {
  final void Function(String base64) onConfirm;
  final VoidCallback onCancel;
  const _SignatureDialog({required this.onConfirm, required this.onCancel});

  @override
  State<_SignatureDialog> createState() => _SignatureDialogState();
}

class _SignatureDialogState extends State<_SignatureDialog> {
  late final SignatureController _ctrl;
  bool _acceptedTerms = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _ctrl = SignatureController(
      penStrokeWidth: 2.5,
      penColor: Colors.black,
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _confirmar() async {
    if (_ctrl.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Desenhe sua assinatura antes de confirmar')),
      );
      return;
    }
    setState(() => _saving = true);
    final bytes = await _ctrl.toPngBytes();
    if (bytes == null) {
      setState(() => _saving = false);
      return;
    }
    final base64Str = base64Encode(bytes);
    widget.onConfirm(base64Str);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Assinar Contrato'),
      content: SizedBox(
        width: 480,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Desenhe sua assinatura abaixo:', style: TextStyle(fontSize: 13, color: Colors.grey)),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(8),
                color: Colors.grey.shade50,
              ),
              child: Signature(
                controller: _ctrl,
                height: 180,
                backgroundColor: Colors.grey.shade50,
              ),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => _ctrl.clear(),
                icon: const Icon(Icons.refresh, size: 14),
                label: const Text('Limpar', style: TextStyle(fontSize: 12)),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Checkbox(
                  value: _acceptedTerms,
                  onChanged: (v) => setState(() => _acceptedTerms = v ?? false),
                ),
                const Expanded(
                  child: Text('Li e aceito os termos do contrato de parceria LiveShop',
                      style: TextStyle(fontSize: 12)),
                ),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: widget.onCancel, child: const Text('Cancelar')),
        ElevatedButton(
          onPressed: (_acceptedTerms && !_saving) ? _confirmar : null,
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
          child: _saving
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Confirmar Assinatura', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }
}
```

- [ ] **Step 2: Verificar compilação**

```bash
flutter analyze lib/screens/vendas/contrato_screen.dart
```

Saída esperada: `No issues found!`

- [ ] **Step 3: Commit**

```bash
git add lib/screens/vendas/contrato_screen.dart
git commit -m "feat: add signature pad to ContratoScreen with digital signing flow"
```

---

## Task 11 — Frontend: AnaliseCreditoScreen (backoffice)

**Files:**
- Create: `lib/screens/vendas/analise_credito_screen.dart`

Tela backoffice. Botões ✓/✕ aparecem para qualquer usuário em dev (auth bypass injeta `papel: 'franqueado'`). Para testar como `franqueador_master` em dev: mudar linha 13 e 26 de `src/plugins/auth.js` para `papel: 'franqueador_master'`.

- [ ] **Step 1: Criar `lib/screens/vendas/analise_credito_screen.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../widgets/app_scaffold.dart';
import '../../models/contrato.dart';
import '../../providers/contratos_provider.dart';
import '../../providers/auth_provider.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';

class AnaliseCreditoScreen extends ConsumerStatefulWidget {
  const AnaliseCreditoScreen({super.key});
  @override
  ConsumerState<AnaliseCreditoScreen> createState() => _AnaliseCreditoState();
}

class _AnaliseCreditoState extends ConsumerState<AnaliseCreditoScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  bool get _isMaster {
    final papel = ref.read(authProvider).user?.papel ?? 'franqueado';
    return papel == 'franqueador_master';
  }

  List<Contrato> _filtrar(List<Contrato> todos, int tabIndex) {
    return switch (tabIndex) {
      0 => todos,
      1 => todos.where((c) => c.status == 'em_analise' && !c.isRiscoFranqueado).toList(),
      2 => todos.where((c) => c.status == 'em_analise' && (c.clienteScore ?? 0) < 60).toList(),
      3 => todos.where((c) => c.status == 'ativo').toList(),
      _ => todos,
    };
  }

  Future<void> _aprovar(Contrato c) async {
    try {
      await ref.read(contratosProvider.notifier).aprovar(c.id);
      ref.invalidate(analiseCreditoProvider);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Aprovado!')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e')));
    }
  }

  Future<void> _arquivar(Contrato c) async {
    try {
      await ref.read(contratosProvider.notifier).arquivar(c.id);
      ref.invalidate(analiseCreditoProvider);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Arquivado.')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e')));
    }
  }

  Future<void> _assumirRisco(Contrato c) async {
    final confirmado = await showDialog<bool>(
      context: context,
      builder: (ctx) => _RiscoDialog(clienteNome: c.clienteNome ?? c.id),
    );
    if (confirmado != true) return;
    try {
      await ref.read(contratosProvider.notifier).sinalizarRisco(c.id);
      ref.invalidate(analiseCreditoProvider);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Risco assumido. Cliente ativado.')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(analiseCreditoProvider);

    return AppScaffold(
      currentRoute: AppRoutes.analiseCredito,
      child: Column(
        children: [
          // Header
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Análise de Crédito',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                const Text('Aprovações de contratos pendentes',
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                const SizedBox(height: 12),
                TabBar(
                  controller: _tabs,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary,
                  tabs: const [
                    Tab(text: 'Todos'),
                    Tab(text: 'Em Análise'),
                    Tab(text: 'Restrição'),
                    Tab(text: 'Aprovados'),
                  ],
                  onTap: (_) => setState(() {}),
                ),
              ],
            ),
          ),
          // Conteúdo
          Expanded(
            child: async.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Erro: $e')),
              data: (todos) {
                final lista = _filtrar(todos, _tabs.index);
                if (lista.isEmpty) {
                  return const Center(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.inbox_outlined, size: 48, color: AppColors.textSecondary),
                      SizedBox(height: 12),
                      Text('Nenhum contrato nesta categoria', style: TextStyle(color: AppColors.textSecondary)),
                    ]),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(20),
                  itemCount: lista.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _ContratoCard(
                    contrato: lista[i],
                    isMaster: _isMaster,
                    onAprovar:     () => _aprovar(lista[i]),
                    onArquivar:    () => _arquivar(lista[i]),
                    onAssumir:     () => _assumirRisco(lista[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ContratoCard extends StatelessWidget {
  final Contrato contrato;
  final bool isMaster;
  final VoidCallback onAprovar;
  final VoidCallback onArquivar;
  final VoidCallback onAssumir;

  const _ContratoCard({
    required this.contrato,
    required this.isMaster,
    required this.onAprovar,
    required this.onArquivar,
    required this.onAssumir,
  });

  bool get _temRestricao => (contrato.clienteScore ?? 100) < 60;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: _temRestricao ? Border(left: BorderSide(color: AppColors.danger, width: 4)) : null,
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header da card
          Row(
            children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(contrato.clienteNome ?? 'Sem nome',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  const SizedBox(height: 2),
                  Text(
                    '${contrato.clienteCnpj != null ? "CNPJ ${contrato.clienteCnpj!}" : "Sem CNPJ"} · ${contrato.clienteNicho ?? "Nicho não informado"}',
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
                ]),
              ),
              _StatusBadge(status: contrato.status, temRestricao: _temRestricao),
              const SizedBox(width: 8),
              if (isMaster) _buildActions(),
            ],
          ),
          // Alerta de restrição
          if (_temRestricao) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.danger.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(children: [
                const Icon(Icons.warning_amber_rounded, color: AppColors.danger, size: 14),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Score abaixo do mínimo (${contrato.clienteScore ?? "??"}/100)'
                    '${contrato.clienteCnpj == null ? " · CNPJ não informado" : ""}'
                    '${(contrato.clienteFatAnual ?? 0) < 50000 ? " · Faturamento abaixo de R\$ 50k" : ""}',
                    style: const TextStyle(fontSize: 11, color: AppColors.danger, fontWeight: FontWeight.w600),
                  ),
                ),
              ]),
            ),
          ],
          // Grid de métricas
          const SizedBox(height: 12),
          Row(
            children: [
              _MetricBox(label: 'VALOR FIXO', value: 'R\$ ${contrato.valorFixo.toStringAsFixed(0)}'),
              const SizedBox(width: 8),
              _MetricBox(label: 'COMISSÃO',   value: '${contrato.comissaoPct.toStringAsFixed(0)}%'),
              const SizedBox(width: 8),
              _MetricBox(
                label: 'FAT. ANUAL',
                value: _formatFat(contrato.clienteFatAnual),
                danger: (contrato.clienteFatAnual ?? 0) < 50000,
              ),
              const SizedBox(width: 8),
              _MetricBox(
                label: 'SCORE INTERNO',
                value: '${contrato.clienteScore ?? "??"}/100',
                highlight: true,
                danger: _temRestricao,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActions() {
    if (contrato.status == 'ativo') {
      return const Icon(Icons.check_circle, color: AppColors.success, size: 24);
    }
    if (_temRestricao) {
      return Row(mainAxisSize: MainAxisSize.min, children: [
        ElevatedButton(
          onPressed: onAssumir,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.warning,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          child: const Text('Assumir Risco', style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w700)),
        ),
        const SizedBox(width: 8),
        _ActionCircle(icon: Icons.delete_outline, color: AppColors.danger, onTap: onArquivar),
      ]);
    }
    return Row(mainAxisSize: MainAxisSize.min, children: [
      _ActionCircle(icon: Icons.check, color: AppColors.success, onTap: onAprovar),
      const SizedBox(width: 8),
      _ActionCircle(icon: Icons.close, color: AppColors.danger, onTap: onArquivar),
    ]);
  }

  String _formatFat(double? val) {
    if (val == null) return '—';
    if (val >= 1000000) return 'R\$ ${(val / 1000000).toStringAsFixed(1)}M';
    if (val >= 1000) return 'R\$ ${(val / 1000).toStringAsFixed(0)}k';
    return 'R\$ ${val.toStringAsFixed(0)}';
  }
}

class _ActionCircle extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _ActionCircle({required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) => InkWell(
    borderRadius: BorderRadius.circular(20),
    onTap: onTap,
    child: Container(
      width: 36, height: 36,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: color, width: 2),
        color: color.withValues(alpha: 0.1),
      ),
      child: Icon(icon, color: color, size: 18),
    ),
  );
}

class _StatusBadge extends StatelessWidget {
  final String status;
  final bool temRestricao;
  const _StatusBadge({required this.status, required this.temRestricao});

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      'ativo'      => ('APROVADO',   AppColors.success),
      'arquivado'  => ('ARQUIVADO',  AppColors.textSecondary),
      'cancelado'  => ('CANCELADO',  AppColors.danger),
      _            => temRestricao ? ('RESTRIÇÃO', AppColors.danger) : ('EM ANÁLISE', AppColors.warning),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w700)),
    );
  }
}

class _MetricBox extends StatelessWidget {
  final String label;
  final String value;
  final bool highlight;
  final bool danger;
  const _MetricBox({required this.label, required this.value, this.highlight = false, this.danger = false});

  @override
  Widget build(BuildContext context) {
    final color = danger ? AppColors.danger : (highlight ? AppColors.warning : AppColors.textPrimary);
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: danger
              ? AppColors.danger.withValues(alpha: 0.08)
              : highlight
                  ? AppColors.warning.withValues(alpha: 0.08)
                  : AppColors.surfaceGray,
          borderRadius: BorderRadius.circular(6),
          border: (danger || highlight) ? Border.all(color: color.withValues(alpha: 0.3)) : null,
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: TextStyle(fontSize: 9, color: color, fontWeight: FontWeight.w700)),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: color)),
        ]),
      ),
    );
  }
}

class _RiscoDialog extends StatefulWidget {
  final String clienteNome;
  const _RiscoDialog({required this.clienteNome});

  @override
  State<_RiscoDialog> createState() => _RiscoDialogState();
}

class _RiscoDialogState extends State<_RiscoDialog> {
  bool _confirmado = false;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Assumir Risco'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Você está prestes a aprovar ${widget.clienteNome} manualmente, assumindo o risco de inadimplência.',
              style: const TextStyle(fontSize: 13)),
          const SizedBox(height: 16),
          Row(children: [
            Checkbox(
              value: _confirmado,
              onChanged: (v) => setState(() => _confirmado = v ?? false),
            ),
            const Expanded(
              child: Text('Confirmo que estou ciente do risco e autorizo a ativação',
                  style: TextStyle(fontSize: 12)),
            ),
          ]),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancelar')),
        ElevatedButton(
          onPressed: _confirmado ? () => Navigator.of(context).pop(true) : null,
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.warning),
          child: const Text('Confirmar', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }
}
```

- [ ] **Step 2: Verificar compilação**

```bash
flutter analyze lib/screens/vendas/analise_credito_screen.dart
```

Saída esperada: `No issues found!`

- [ ] **Step 3: Commit**

```bash
git add lib/screens/vendas/analise_credito_screen.dart
git commit -m "feat: create AnaliseCreditoScreen backoffice with tabs and approval actions"
```

---

## Task 12 — Frontend: registrar rota e menu item

**Files:**
- Modify: `lib/routes/app_routes.dart`
- Modify: `lib/widgets/app_scaffold.dart`

- [ ] **Step 1: Adicionar rota em `lib/routes/app_routes.dart`**

No topo, junto aos outros imports, adicionar:

```dart
import '../screens/vendas/analise_credito_screen.dart';
```

Na classe `AppRoutes`, adicionar a constante:

```dart
static const analiseCredito = '/analise-credito';
```

No getter `routes`, adicionar o par:

```dart
analiseCredito: (_) => const AnaliseCreditoScreen(),
```

- [ ] **Step 2: Adicionar item "Aprovações" no menu em `lib/widgets/app_scaffold.dart`**

Localizar onde os itens do menu lateral são construídos (método `_buildPermanentMenu` ou similar). Adicionar item de Aprovações após o item de Vendas ou Boletos. Cada item de menu segue o padrão existente. O texto do item é "Aprovações" com ícone `Icons.verified_outlined` e rota `AppRoutes.analiseCredito`.

Encontrar o bloco de itens do menu (buscar por `AppRoutes.boletos` no método `_buildPermanentMenu`) e inserir após o item de boletos:

```dart
_MenuItem(
  icon: Icons.verified_outlined,
  label: 'Aprovações',
  route: AppRoutes.analiseCredito,
  currentRoute: currentRoute,
),
```

- [ ] **Step 3: Verificar compilação completa**

```bash
flutter analyze lib/
```

Saída esperada: `No issues found!`

- [ ] **Step 4: Commit**

```bash
git add lib/routes/app_routes.dart lib/widgets/app_scaffold.dart
git commit -m "feat: add /analise-credito route and Aprovacoes menu item"
```

---

## Task 13 — Teste end-to-end manual

- [ ] **Step 1: Iniciar backend**

```bash
cd /Users/vitormiguelgoedertdaluz/liveshop_saas_api-backend-
npm run dev
```

Esperado: `Server running at http://localhost:3000`

- [ ] **Step 2: Iniciar frontend**

```bash
cd /Users/vitormiguelgoedertdaluz/-liveshop_saas-frontend-
flutter run -d chrome
```

- [ ] **Step 3: Testar Módulo 2 — formulário 4 steps**

1. Menu lateral → Vendas → FAB (+)
2. Step 1: preencher Nome + Celular → PRÓXIMO
3. Step 2: preencher CNPJ e Faturamento → PRÓXIMO
4. Step 3: digitar CEP `01310100` → aguardar autocomplete "São Paulo / SP" + indicador verde de geolocalizado → PRÓXIMO
5. Step 4: revisar dados → GERAR CONTRATO
6. Verificar que navega para ContratoScreen com nome do cliente exibido

- [ ] **Step 4: Testar Módulo 3 — assinatura digital**

1. Na ContratoScreen → clicar "ASSINAR AGORA"
2. Dialog abre com área branca para desenho
3. Desenhar assinatura com mouse/touch
4. Marcar checkbox "Li e aceito os termos"
5. Clicar "Confirmar Assinatura"
6. Verificar navegação para AnaliseFinanceiraScreen

- [ ] **Step 5: Testar Módulo 1 — filtro BottomSheet**

1. Menu lateral → Vendas
2. Clicar botão "⚙️ Filtros" (top-left do mapa)
3. BottomSheet abre com checkboxes por status
4. Selecionar "Ativo" → fechar
5. Verificar que apenas pins verdes ficam visíveis no mapa
6. Badge do botão mostra "Filtros (1)"

- [ ] **Step 6: Testar Módulo 4 — Análise de Crédito**

1. Menu lateral → "Aprovações"
2. Verificar lista de contratos em análise
3. Clicar ✓ em um contrato → verificar SnackBar "Aprovado!"
4. Recarregar → contrato deve aparecer na tab "Aprovados"

- [ ] **Step 7: Verificar análise estática final**

```bash
flutter analyze lib/
```

Saída esperada: `No issues found!`

- [ ] **Step 8: Commit final de análise completa**

```bash
git add -A
git commit -m "feat: complete CRM geo, 4-step onboarding, signature pad and credit analysis modules"
```

---

## Nota sobre PDF (Fase 2)

O endpoint `POST /v1/contratos/:id/gerar-pdf` com `pdf-lib` não está incluído neste plano pois requer:
1. Instalar `pdf-lib` no backend (`npm install pdf-lib`)
2. Criar template PDF ou gerar from scratch
3. Configurar Supabase Storage para upload do arquivo

Isso foi postergado para Fase 2. O botão "ENVIAR POR WHATSAPP" no Módulo 3 atualmente copia um link placeholder.

## Nota sobre `franqueador_master`

O auth bypass em `src/plugins/auth.js` injeta `papel: 'franqueado'`. Para testar o fluxo completo de backoffice com botões ✓/✕ ativos, temporariamente mudar na linha 13:

```js
request.user = { ..., papel: 'franqueador_master', ... }
```

Reverter após testes.
