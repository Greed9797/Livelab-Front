# Validation Report — Home, Clientes e Base

## Validation

**Result**: PASS

**Verifier:** independente; sem edição de código de aplicação.  
**Diff revisado:** frontend `bd0f920..bdcf654`; backend `17cbf330..accf001`.  
**Worktree:** apenas `.fastcontext/` e `.playwright-cli/` não versionados, preservados.

## Spec-anchored evidence

| Requisitos | Evidência de implementação | Evidência observável |
| --- | --- | --- |
| HOME-01, HOME-02, HOME-06 | `src/pages/DashboardPage.tsx:223-227` passa `limit={5}` e legenda Top 5; `:261-286` coloca Agenda de hoje após os demais blocos. | `tests/e2e/rebranding.e2e.ts:52` passou nos temas claro/escuro e layout responsivo. |
| HOME-03, HOME-04 | `src/components/dashboard/AssiduidadeStrip.tsx:285` lê `resumo.horas_total`; `:595` mostra `formatHoras` ou “Horas indisponíveis”. | `AssiduidadeStrip.test.ts` e `AssiduidadeStrip.render.test.tsx` passaram no gate focal. |
| HOME-05 | `src/routes/analytics.js:2790` usa horas de presença; `:2833-2835` aplica `activeLiveSql`. | `test/assiduidade_union.pglite.mjs` passou para união, reversão, zero GMV e revezamento. |
| NAV-01, NAV-02 | `src/components/layout/Shell.tsx:45-48,66,83` seleciona wordmark/ícone PNG por tema e estado. | `Shell.test.ts:19-22` e os cenários Home passaram. |
| CLI-01, CLI-02, CLI-03 | `src/pages/ComercialPage.tsx:568-579` separa payload cadastral; `:806-813` expõe o lápis direto; o fluxo de escolha de registro preserva o identificador. | `tests/e2e/operational-forms.e2e.ts:184` verifica lápis e ausência de campos financeiros no PATCH. |
| CLI-04 a CLI-10, CLI-13 | `src/lib/marca-condicoes.js:53-84,95-123` normaliza competência e calcula por mês; `src/services/marca-condicoes.js:285-379` usa transação, lock, revisão, idempotência, prévia e rollback; `src/routes/marcas.js:443-488,658-669` expõe a API e bloqueia PATCH financeiro legado. | `test/marca_condicoes_service.pglite.mjs`, `test/marca_condicoes_schema.pglite.mjs` e `test/billing_temporal.pglite.mjs` passaram. |
| CLI-06, CLI-07 | `src/routes/financeiro.js:240-281` calcula parcelas por competência e aplica `GREATEST` dentro de cada mês; `src/lib/performance-rollups.js:211-241` mantém a mesma composição nos agregados. | Os sensores de competência temporal e “OU” mensal do PGlite passaram. |
| CLI-11, CLI-12 | `src/routes/marcas.js:119-160` produz a configuração canônica; `src/components/comercial/CondicoesComerciais.tsx:74-76,204-236` distingue legado, pendência e zero confirmado. | `ComercialPage.test.ts` e `CondicoesComerciais.test.ts` passaram no gate focal. |
| BASE-01, BASE-02, BASE-11 | `src/pages/KnowledgeLibraryPage.tsx:75-140` entrega catálogo, busca, filtros, estado vazio, gestão e biblioteca da rede; `src/routes/knowledge-unit.js:237-265,268-372` implementa listagem, detalhe, autoria, publicação e arquivo. | `tests/e2e/knowledge-unit.e2e.ts:65-115` passou para criação, leitura, rede, reload e erros do editor. |
| BASE-03, BASE-06, BASE-08 a BASE-10 | `src/components/knowledge/KnowledgeEditor.tsx:85-156` preserva o texto e prévia sanitizada; `src/routes/knowledge-unit.js:53-67,374-462` valida Markdown/URLs/PDF, isola upload e assina download privado. | `test/knowledge_unit.test.js` e `test/knowledge_storage.test.js` passaram. |
| BASE-04, BASE-05, BASE-07, BASE-09 | `src/routes/knowledge-unit.js:8-13,181-182,257-265,429-462` limita leitores, tenant, status, revisão e anexos; `src/routes/manuais.js:24-45` fecha o leitor legado para cliente/parceiro. | `test/knowledge_unit_sql.pglite.test.js` e `test/manuais_scope.test.js` passaram. |
| Organização de categorias (BASE-02) | `src/routes/knowledge-unit.js:32,185-187,206-215` aceita `is_active` e restringe inativas à gestão; `src/pages/KnowledgeLibraryPage.tsx:65-72,90` edita, reordena, desativa e reativa. | Sensor pós-correção: PATCH `{is_active:false}` retornou 200, gerou `is_active = $1`; gestor com `include_inactive=true` recebeu inativas. `test/knowledge_unit.test.js` cobre reativação e não exposição a apresentadora. |

## Discrimination sensor

| Mutação conceitual | Resultado |
| --- | --- |
| Condição atual aplicada retroativamente | **Killed** — fixture de competência histórica manteve a condição do fato gerador. |
| `MAX` global entre competências em `fixo_ou_comissao` | **Killed** — `billing_temporal.pglite.mjs` exige cálculo mensal, não máximo do intervalo. |
| Bypass de fechamento, retry duplicado e tenant forjado | **Killed** — serviço retorna 409/rollback, retry idempotente não escreve novamente e FK/RLS do schema rejeitam outro tenant. |
| Bypass legado da Base, rascunho por URL e upload sem papel | **Killed** — guards, status e testes de `knowledge_unit`/`manuais_scope` rejeitam os acessos. |
| Categoria desativada não atualizável | **Killed na correção `accf001`** — reprodução anterior retornava 400; após o patch retorna 200 com UPDATE explícito. |

## Focused gates executed

- Backend PGlite: `marca_condicoes_service`, `marca_condicoes_schema`, `billing_temporal` e `assiduidade_union` — PASS.
- Backend unit/integration focal: 38 testes em 8 arquivos — PASS antes da correção; `knowledge_unit` foi revalidado após `accf001` pela rota Fastify/inject e pelos testes adicionados.
- Frontend: `npm run typecheck` e 94 testes focais — PASS.
- Browser: `tests/e2e/rebranding.e2e.ts --project=chromium` — 4 passed; os cenários focais de Base e Comercial foram executados na rodada anterior sem falha observada.

Nenhum dado, cobrança, migração ou serviço de produção foi usado pela validação.
