# Design: Cores Laranja + Fix Financeiro RLS

**Data**: 2026-04-11
**Escopo**: Frontend (cores) + Backend (bug RLS)

---

## Problema 1: Elementos roxos devem ser laranja

### Contexto

A identidade visual usa laranja `#E8673C` como cor primária. Porém, `infoPurple` (`#8E44AD`) e seu alias `lilac` são usados em ~20 pontos do frontend para cards, botões, badges e containers.

### Solução

Redirecionar na fonte: alterar o valor de `infoPurple` em `app_colors.dart` de `0xFF8E44AD` para `0xFFE8673C` (mesmo valor de `primaryOrange`). O alias `lilac = infoPurple` propaga automaticamente.

### Arquivo alterado

- `lib/theme/app_colors.dart` — linha 16: valor de `infoPurple`

### Componentes afetados (propagação automática)

| Arquivo | Linhas | Elemento |
|---------|--------|----------|
| financeiro_screen.dart | 442 | Container Recebíveis |
| excelencia_screen.dart | 168, 174, 182, 195 | Card ROI |
| cabine_detail_screen.dart | 254, 270 | Cards métricas |
| recomendacoes_screen.dart | 51, 246, 248, 266, 369, 519 | Botões e dialogs |
| vendas_screen.dart | 41, 246 | Legenda mapa |
| cliente_screen.dart | 135 | Card Lucro Estimado |
| boleto_item.dart | 47, 53, 250 | Badge Auto, ícone marketing |
| status_badge.dart | 35 | Badge Recomendação |
| client_pin.dart | 29 | Pin Recomendação |
| roleta_widget.dart | 55 | Label currency roller |

---

## Problema 2: Erro 500 no POST /v1/financeiro/custos

### Causa raiz

Linha ~123 de `src/routes/financeiro.js` usa `app.db.query()` (sem RLS) para INSERT na tabela `custos`. A policy RLS exige `current_setting('app.tenant_id')` que nunca é setado, rejeitando o INSERT.

### Solução

Trocar `app.db.query()` por `app.dbTenant(tenant_id)` com `try/finally { db.release() }`, seguindo o padrão já usado nas rotas GET do mesmo arquivo.

### Arquivo alterado

- `src/routes/financeiro.js` — bloco do POST `/v1/financeiro/custos`

---

## Fora de escopo

- Renomear constantes `infoPurple`/`lilac` (manter nomes atuais)
- Adicionar endpoint PUT para custos
- Adicionar `WITH CHECK` na policy RLS de custos
- Refatorar DELETE para incluir filtro explícito de tenant_id
