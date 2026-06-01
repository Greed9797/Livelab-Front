# Design Spec — CRM Geográfico, Contratos e Análise de Crédito
**Data:** 2026-04-02  
**Projeto:** LiveShop SaaS — Gestão de Franquias de Live Shopping  
**Stack:** Flutter Web (iPad-first) + Fastify/Supabase

---

## Escopo

Quatro módulos implementados em sequência:

| # | Módulo | Tela |
|---|--------|------|
| 1 | CRM Geográfico | VendasScreen (refactor) |
| 2 | Onboarding do Lead | CadastroClienteScreen (refactor) |
| 3 | Motor de Contratos | ContratoScreen (refactor) |
| 4 | Análise de Crédito | AnaliseCreditoScreen (nova) |

---

## Módulo 1 — CRM Geográfico

### Decisões de design

- **Biblioteca de mapas:** `flutter_map` + OpenStreetMap (já instalado, zero custo, sem API key)
- **Geocoding:** Nominatim (OSM) — chamado no backend, resultado salvo em `clientes.lat` / `clientes.lng`
- **Layout do filtro:** Opção C — Mapa full-screen (100%) com botão flutuante "⚙️ Filtros" que abre BottomSheet com checkboxes multiselect por status + legenda fixa no canto inferior direito

### Pins por status

| Cor | Status |
|-----|--------|
| 🔵 Azul `#3498DB` | Negociação (Prospect) |
| 🟡 Amarelo `#F1C40F` | Contrato Enviado |
| 🟢 Verde `#2ECC71` | Ativo |
| 🔴 Vermelho `#E74C3C` | Inadimplente |
| 🟣 Roxo `#8E44AD` | Recomendação |
| 🩶 Cinza | Sem lat/lng (excluído do mapa) |

Clientes sem CEP ficam fora do mapa; futuramente: tab toggle para lista.

### Migrations

```sql
ALTER TABLE clientes
  ADD COLUMN cep        VARCHAR(9),
  ADD COLUMN logradouro TEXT,
  ADD COLUMN cidade     TEXT,
  ADD COLUMN estado     CHAR(2),
  ADD COLUMN siga       TEXT;
```

### Backend

- `GET /v1/cep/:cep` — proxy: ViaCEP (endereço) + Nominatim (lat/lng)
- `POST /v1/clientes` — já chama Nominatim internamente ao receber `cep`

---

## Módulo 2 — Onboarding do Lead (Formulário 4-steps)

### Steps

| Step | Campos |
|------|--------|
| 1 — Dados pessoais | Nome*, Celular*, Email, CPF |
| 2 — Dados comerciais | CNPJ, Razão Social, Faturamento Anual, Nicho, Siga (TikTok/Insta) |
| 3 — Localização | CEP* → autocomplete cidade/estado → geocoding automático |
| 4 — Qualificação | "Já vende no TikTok Live?" (Sim/Não) + Revisão dos dados |

### Fluxo pós-salvar

```
SALVAR → POST /clientes (com geocoding)
       ↓
AUTO   → Navega para ContratoScreen (clienteId passado por parâmetro)
RASCUNHO → Salva e volta ao mapa
```

### CEP Autocomplete

1. Usuário digita CEP
2. Frontend debounce 500ms → `GET /v1/cep/:cep`
3. Backend retorna `{ logradouro, cidade, estado, lat, lng }`
4. Campos preenchidos automaticamente (editáveis)

---

## Módulo 3 — Motor de Contratos (Fase 1)

### PDF Dinâmico

- **Lib:** `pdf-lib` (Node.js, ~2MB) — sem puppeteer
- Template base em `.pdf` com campos marcados
- `POST /v1/contratos/:id/gerar-pdf` → preenche e retorna URL do arquivo no Supabase Storage
- `GET /v1/contratos/:id/preview` → retorna dados do cliente para pré-visualização antes de gerar

### Assinatura — Fase 1

- **Package Flutter:** `signature` (pad de assinatura na tela)
- Área ampla em landscape no mobile
- Checkbox obrigatório: "Li e aceito os termos"
- Backend captura: IP do request + `accepted_terms_at` timestamp
- Tudo impresso no rodapé do PDF final

### Slot Fase 2 (ZapSign)

Colunas DB criadas agora, preenchidas no futuro:

```sql
signature_type         VARCHAR(10) DEFAULT 'pad'  -- 'pad' | 'zapsign'
external_signature_id  TEXT        DEFAULT NULL   -- ID ZapSign
```

### Fluxo do contrato

```
1. Template preenchido com dados do cliente
2a. "Assinar Agora"       → pad na tela → salva PNG da assinatura
2b. "Enviar por WhatsApp" → link do PDF → status → contrato_enviado (pin 🟡)
3. Backend: PDF final com assinatura + rodapé jurídico
4. Status → em_analise → entra na fila da AnaliseCreditoScreen
```

### Migrations

```sql
ALTER TABLE contratos
  ADD COLUMN signature_type        VARCHAR(10)  DEFAULT 'pad',
  ADD COLUMN external_signature_id TEXT,
  ADD COLUMN signature_image_url   TEXT,
  ADD COLUMN signed_ip             INET,
  ADD COLUMN accepted_terms_at     TIMESTAMPTZ;
```

### Novos endpoints

- `GET  /v1/contratos/:id/preview`
- `POST /v1/contratos/:id/gerar-pdf`
- `POST /v1/contratos/:id/assinar-digital` — recebe `{ signatureImageBase64 }`, salva IP + timestamp

---

## Módulo 4 — Análise de Crédito (Backoffice)

### Acesso

- Rota: `/analise-credito` (nova entrada no menu lateral)
- Papel requerido: `franqueador_master`
- Franqueados veem a tela mas sem botões de ação (✓ ✕)

### Interface

Lista de contratos em análise com cards:
- Nome da empresa + CNPJ + Nicho
- Badge de status (🟡 Em Análise / 🔴 Restrição / 🟢 Aprovado)
- 4 mini-boxes: Valor Fixo, Comissão, Fat. Anual, **Score Interno** (Auditoria Comercial — **não Serasa**)
- Tabs de filtro: Todos / Em Análise / Restrição / Aprovados

### Ações por status

| Situação | Botões disponíveis |
|----------|-------------------|
| Em Análise | ✓ Aprovar / ✕ Arquivar |
| Restrição | "Assumir Risco" + 🗑 Arquivar |
| Aprovado | Somente visualização |

**"Assumir Risco"** → modal com checkbox obrigatório de confirmação → salva `is_risco_franqueado = true`

### Regras de negócio

- **Auto-aprovação:** score ≥ 60 → aprovado automático em ≤ 5min (job ou trigger)
- **Caminho manual:** score < 60 → backoffice analisa
- **Batch ao aprovar:**
  - `contrato.status → ativo`
  - `cliente.status → ativo` (pin 🟢)
  - Dashboard polling 15s detecta → atualiza HomeScreen

### Score Interno

Calculado como "Auditoria Comercial" com base em:
- CNPJ informado e válido
- Faturamento anual declarado (mínimo R$ 50k)
- Consistência dos dados do formulário

### Migrations

```sql
ALTER TABLE contratos
  ADD COLUMN is_risco_franqueado BOOLEAN    DEFAULT false,
  ADD COLUMN arquivado_em        TIMESTAMPTZ,
  ADD COLUMN arquivado_motivo    TEXT,
  ADD COLUMN risco_assumido_em   TIMESTAMPTZ;

-- Status ampliados:
-- 'rascunho' | 'em_analise' | 'ativo' | 'cancelado' | 'arquivado'
```

### Novos endpoints

- `GET    /v1/analise-credito`           — lista contratos em análise
- `PATCH  /v1/contratos/:id/aprovar`     — batch update (contrato + cliente)
- `PATCH  /v1/contratos/:id/sinalizar-risco` — flag + modal confirmado
- `PATCH  /v1/contratos/:id/arquivar`    — arquivar com motivo

---

## Resumo das Migrations

```sql
-- Módulo 1: Geolocalização de clientes
ALTER TABLE clientes
  ADD COLUMN cep        VARCHAR(9),
  ADD COLUMN logradouro TEXT,
  ADD COLUMN cidade     TEXT,
  ADD COLUMN estado     CHAR(2),
  ADD COLUMN siga       TEXT;

-- Módulo 3: Assinatura digital (Fase 1 + Slot Fase 2)
ALTER TABLE contratos
  ADD COLUMN signature_type        VARCHAR(10)  DEFAULT 'pad',
  ADD COLUMN external_signature_id TEXT,
  ADD COLUMN signature_image_url   TEXT,
  ADD COLUMN signed_ip             INET,
  ADD COLUMN accepted_terms_at     TIMESTAMPTZ;

-- Módulo 4: Análise de crédito
ALTER TABLE contratos
  ADD COLUMN is_risco_franqueado BOOLEAN     DEFAULT false,
  ADD COLUMN arquivado_em        TIMESTAMPTZ,
  ADD COLUMN arquivado_motivo    TEXT,
  ADD COLUMN risco_assumido_em   TIMESTAMPTZ;
```

---

## Resumo de Endpoints Novos

| Método | Rota | Módulo |
|--------|------|--------|
| GET | `/v1/cep/:cep` | 1, 2 |
| GET | `/v1/contratos/:id/preview` | 3 |
| POST | `/v1/contratos/:id/gerar-pdf` | 3 |
| POST | `/v1/contratos/:id/assinar-digital` | 3 |
| GET | `/v1/analise-credito` | 4 |
| PATCH | `/v1/contratos/:id/aprovar` | 4 |
| PATCH | `/v1/contratos/:id/sinalizar-risco` | 4 |
| PATCH | `/v1/contratos/:id/arquivar` | 4 |

---

## Dependências Flutter a Adicionar

```yaml
# pubspec.yaml
dependencies:
  signature: ^5.4.0   # Pad de assinatura (Módulo 3)
```

`flutter_map` já está instalado.  
`pdf-lib` fica no backend Node.js — sem mudança no pubspec.

---

## Critérios de Conclusão

- [ ] Mapa exibe pins coloridos com lat/lng real dos clientes
- [ ] Filtro de status funciona (multiselect BottomSheet)
- [ ] Formulário 4 steps salva cliente com geocoding
- [ ] CEP autocompleta cidade/estado automaticamente
- [ ] Contrato gera PDF via backend pdf-lib
- [ ] Assinatura no pad salva PNG + IP + timestamp no PDF
- [ ] AnaliseCreditoScreen lista contratos em análise
- [ ] Aprovação faz batch update contrato + cliente
- [ ] "Assumir Risco" salva flag + requer confirmação
- [ ] Botões ✓ ✕ só aparecem para `franqueador_master`
