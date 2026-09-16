# Home, Clientes e Base Tasks

**Status:** plano, nenhuma tarefa implementada.
**Execução:** Luna em lotes sequenciais, um dono por caminho e um commit por entrega. Luna implementa; revisor independente Terra/Sol verifica finanças, autorização e regressões. Nenhum agente escreve no mesmo arquivo ao mesmo tempo.
**Repos:** front = /private/tmp/livelab-presenter-lives-front/react-app; back = /private/tmp/livelab-presenter-lives-back.
**Alcance:** mudanças auxiliares mínimas (import, tipo, cliente API, teste e runner de migração) pertencem à tarefa do componente principal. T24 é gate de inventário, não autorização de um megacommit: qualquer consumidor adicional exige subtarefa atômica.

## Test Coverage Matrix

Guidelines: /Users/lucas/Livelab-Front/AGENTS.md e /Users/lucas/Livelab-back/AGENTS.md. Estilo: AssiduidadeStrip.test.ts/render.test.tsx, PresenterLeaderboard.test.tsx, ComercialPage.test.ts, knowledge.test.ts, test/assiduidade.test.js, apresentadora_fixo_historico.test.js, knowledge_reorder.test.js e E2E financeiro/remuneration.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| UI/modelo | unit e render | Estados definido/zero/ausente, permissão e cálculos por requisito | src/**/*.test.ts(x) | npm run typecheck && npm test |
| API financeira | integração e SQL real | Data histórica, transação, idempotência e fechamentos | test/*condicoes*.test.js | npm test + harness PostgreSQL/PGlite isolado |
| Schema/RLS | integração real | FK, unicidade, tenant e rollback, com papel não owner | test/*scope*.test.js | harness isolado definido junto ao teste |
| Base | integração e navegador | CRUD, XSS, escopo, status, upload/falha e concorrência | test/*knowledge*.test.js + tests/e2e | npm test + npx playwright test |
| Integração UI | e2e | Fluxos completos desktop e mobile, não busca textual no fonte | tests/e2e/*.e2e.ts | npx playwright test --project=chromium |
| Inventário/documentação | review | Consumidor classificado e referência verificável | docs | revisão de diff e scripts estruturais |

PGlite testa semântica SQL. Corrida entre transações exige duas conexões de PostgreSQL isolado; não chamar mocks/barreiras JS de prova de lock de banco. Se o ambiente não permitir esse teste, registrar limitação e resolver antes de liberar escrita financeira.

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Cada alteração unitária | Front npm run typecheck && npm test; back npm test ou suite focal |
| Full | APIs e fluxos | Quick + E2E afetado + SQL real conforme a tarefa |
| Build | Final de lote | Front npm run typecheck && npm test && npm run build; back npm test |
| Release | Antes de publicar | Build + E2E desktop/mobile afetados + npm audit --omit=dev nos dois repos + diff review + verificador independente |

Usar Chrome local via E2E_CHROMIUM_EXECUTABLE_PATH se necessário. Guardar saídas completas localmente e resumir falhas. Não rodar testes com escrita contra produção.

## Execution Plan

- Lote A, Luna: T1–T4 (Home e edição cadastral).
- Lote B, Luna: T5–T8 (inventário e base temporal).
- Lote C, Luna: T9–T15 (consumidores financeiros e gestão).
- Lote D, Luna: T16–T19 (segurança e APIs da Base).
- Lote E, Luna: T20–T24 (biblioteca, integração e fechamento do inventário).
- Revisão final independente, correções delimitadas pelo Luna e publicação coordenada.
- Feature temporal fica desativada até T24; escopo local da Base não aceita criação antes de T22.
- Cada tarefa abaixo depende da anterior como barreira de execução e revisão; nenhuma inicia antes do gate precedente.

```
T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7 -> T8 -> T9 -> T10 -> T11 -> T12 -> T13 -> T14 -> T15 -> T16 -> T17 -> T18 -> T19 -> T20 -> T21 -> T22 -> T23 -> T24
```

## Task Breakdown

### T1: Top 5 e agenda ao final

**What**: Alterar limite e legenda para cinco; mover Agenda de hoje para último bloco no DOM; restaurar wordmark/ícone da sidebar por tema e estado.
**Where**: `front src/pages` e `front src/components/layout`
**Depends on**: None
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: HOME-01, HOME-02, HOME-06, NAV-01, NAV-02
**Done when**:

- [x] E2E com 2/5/8 pessoas, ordem do ranking, último bloco, mês passado sem mudar data da agenda, mobile e logos por tema/estado.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commits atômicos registrados (`4cef9d6`, `2def2d4`, `64ba48a`).

**Tests**: e2e
**Gate**: full

### T2: Presença sem duplicar uniões

**What**: Reproduzir contagem de consolidada e origens; aplicar filtro de live ativa ao CTE de horas se confirmado.
**Where**: `back src/routes/analytics.js`
**Depends on**: T1
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: HOME-05
**Done when**:

- [x] Fixture PostgreSQL/PGlite com união e reversão conserva horas; revezamento e zero GMV não perdem presença; teste prova query real.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado (`c73af12`).

**Tests**: integration
**Gate**: full

### T3: Horas acumuladas visíveis

**What**: Adicionar horas_total ao modelo da linha e exibi-lo com formatHoras e rótulo de horas registradas.
**Where**: `front src/components/dashboard/AssiduidadeStrip.tsx`
**Depends on**: T2
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: HOME-03, HOME-04, HOME-05
**Done when**:

- [x] Render e navegador com zero, ausente, 32.5h = 32h30, mês encerrado e dia corrente sem criar faltas.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commits atômicos registrados (`bf245c0`, `64ba48a`).

**Tests**: unit + e2e
**Gate**: full

### T4: Lápis cadastral por registro

**What**: Reutilizar editor para abertura direta pelo lápis; separar salvar cadastro de campos financeiros.
**Where**: `front src/pages/ComercialPage.tsx`
**Depends on**: T3
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: CLI-01, CLI-02, CLI-03
**Done when**:

- [x] Teste de clique no lápis, linha duplicada exige ID, leitor sem botão; PATCH de contato não contém condições financeiras.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commits atômicos registrados (`874b267`, `8baeb98`).

**Tests**: e2e
**Gate**: full

### T5: Inventário e baseline temporal

**What**: Catalogar cada leitor/escritor de condições e snapshots com fonte, data de competência e bloqueio de fechamento; definir fixture de baseline.
**Where**: `docs/plano-consumidores-condicoes.md`
**Depends on**: T4
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: CLI-05, CLI-07, CLI-10
**Done when**:

- [x] Revisão do inventário contra rotas e jobs, com testes já existentes mapeados; nenhum consumidor financeiro fica sem destino.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: review
**Gate**: quick

### T6: Persistência de condições

**What**: Criar DDL aditiva com tenant, vigência, revisão, confirmação de zero e snapshot técnico legado; registrar no runner como suporte à migração.
**Where**: `back migrations/NNN_marca_condicoes_comerciais.sql`
**Depends on**: T5
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: CLI-04, CLI-08, CLI-10, CLI-12
**Done when**:

- [x] SQL real para unique, FK composta, RLS com papel não privilegiado, backfill idempotente sem recalcular valores; confirmar número livre.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: integration
**Gate**: full

### T7: Resolver temporal compartilhado

**What**: Criar resolução por data/competência e geração SQL parametrizada equivalente para leitores agregados.
**Where**: `back src/lib/marca-condicoes.js`
**Depends on**: T6
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: CLI-04, CLI-05, CLI-06
**Done when**:

- [x] Fixture 31/08 vs 01/09, virada de ano, baseline desconhecido, data futura, soma em centavos e paridade SQL/JS.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: unit + integration
**Gate**: full

### T8: Serviço transacional de alteração

**What**: Implementar histórico/prévia/confirmação idempotente, revisão esperada e locks; bloquear fechado, recálculo aberto atômico.
**Where**: `back src/services/marca-condicoes.js`
**Depends on**: T7
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: CLI-04, CLI-07, CLI-08, CLI-09, CLI-13
**Done when**:

- [x] Concorrência real de duas alterações e corrida com faturamento/união; falha intermediária reverte tudo; preview não escreve.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: integration
**Gate**: full

### T9: Motor de comissão por vigência

**What**: Resolver taxas pela data da live e persistir identificação da condição sem alterar divisão de apresentadoras.
**Where**: `back src/services/commission-engine.js`
**Depends on**: T8
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: CLI-05, CLI-07, CLI-09
**Done when**:

- [x] Agosto imutável depois de setembro; recálculo em data atual usa versão histórica; atribuições/pedidos/uniões preservados.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: unit + integration
**Gate**: full

### T10: DRE e fixos por competência

**What**: Substituir composição por condição corrente por parcelas mensais usando resolver comum; payload aditivo com memória temporal.
**Where**: `back src/routes/financeiro.js`
**Depends on**: T9
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: CLI-05, CLI-06, CLI-07
**Done when**:

- [x] SQL real: fixture 1500+2000=3500 e OU 1000+1200=2200; mês parcial, sem movimento, negativo e fechamento preservado.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: integration
**Gate**: full

### T11: Agregados compartilhados históricos

**What**: Migrar agregação financeira compartilhada para resolução por data/competência sem alterar fórmulas de presença ou ranking.
**Where**: `back src/lib/performance-rollups.js`
**Depends on**: T10
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: CLI-05, CLI-06
**Done when**:

- [x] SQL real e testes de consumidores de home/analytics/rankings; intervalo equivale à soma mensal e não multiplica GMV.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: integration
**Gate**: full

### T12: Atribuições e vídeos históricos

**What**: Aplicar condição da data do vídeo/atribuição em criação e reprocessamento e preservar status financeiro protegido.
**Where**: `back src/routes/vendas_atribuidas.js`
**Depends on**: T11
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: CLI-05, CLI-07, CLI-09
**Done when**:

- [x] Vídeo de agosto reprocessado em setembro usa agosto; aprovado/fechado bloqueado; PDF/CSV continuam com snapshots.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: integration
**Gate**: full

### T13: API de vigências e proteção do PATCH

**What**: Expor histórico/prévia/confirmação sobre serviço e impedir PATCH/import legado de sobrescrever condição fora do serviço.
**Where**: `back src/routes/marcas.js`
**Depends on**: T12
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: CLI-03, CLI-08, CLI-09, CLI-13
**Done when**:

- [x] API cobre autenticação, 403/404 cross-tenant, 409 conflito/fechado, dupla confirmação idempotente e cadastro sem efeito financeiro.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: integration
**Gate**: full

### T14: Editor de condições por marco

**What**: Criar componente com vigente/futura/histórico, competência inicial, antes/depois e confirmar prévia; integrar ao modal existente.
**Where**: `front src/components/comercial/CondicoesComerciais.tsx`
**Depends on**: T13
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: CLI-04, CLI-07, CLI-08, CLI-09
**Done when**:

- [x] E2E Haag sintética agosto/setembro, cancelar sem gravar, preview obsoleto, erro preserva formulário, futuro não muda vigente.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: e2e
**Gate**: full

### T15: Alertas e leitura temporal na interface

**What**: Integrar indicador canônico de configuração e links de correção na lista/modal, diferenciando legado incerto e zero confirmado.
**Where**: `front src/pages/ComercialPage.tsx`
**Depends on**: T14
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: CLI-11, CLI-12, CLI-03
**Done when**:

- [x] Render/E2E fixo ausente, taxa ausente, zero explícito, sem marca e campo não aplicável; alerta não depende só de cor.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: e2e
**Gate**: full

### T16: Schema de biblioteca por escopo

**What**: Adicionar escopo, tenant, revisão e anexos privados preservando conteúdo global e FKs compatíveis; registrar no runner.
**Where**: `back migrations/NNN_knowledge_scope.sql`
**Depends on**: T15
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: BASE-04, BASE-05, BASE-07, BASE-09
**Done when**:

- [x] SQL real com dois tenants/global, FK de categoria inválida, RLS, migração repetível e compatibilidade com leitura legada.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: integration
**Gate**: full

### T17: Leituras e busca da biblioteca

**What**: Aplicar escopo e status a lista/detalhe/busca/categorias com paginação limitada e contexto de tenant.
**Where**: `back src/routes/knowledge.js`
**Depends on**: T16
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: BASE-01, BASE-04, BASE-05
**Done when**:

- [x] API tenta ID/slug de outro tenant, rascunho, arquivado, master restrito; paginação/filtros não expõem corpos nem vazam categorias.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: integration
**Gate**: full

### T18: Autoria e revisão da biblioteca

**What**: Permitir gestão local autorizada criar/editar/publicar/arquivar; controlar revisão/idempotência, categorias e reorder.
**Where**: `back src/routes/knowledge.js`
**Depends on**: T17
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: BASE-02, BASE-05, BASE-07
**Done when**:

- [x] Gestor A não muda material B/global; leitor não escreve; conflito 409 preserva revisão; publish exige conteúdo válido.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: integration
**Gate**: full

### T19: Anexos privados e URLs

**What**: Reutilizar storage com upload limitado e metadados; download autorizado; validar PDF/imagem e URLs suportadas.
**Where**: `back src/services/knowledge-assets.js`
**Depends on**: T18
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: BASE-03, BASE-06, BASE-08, BASE-09
**Done when**:

- [x] MIME falso, tamanho excedido, interrupção, arquivo de outro tenant/rascunho, URL javascript, SSRF e órfão recuperável.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: integration
**Gate**: full

### T20: Editor leve com prévia

**What**: Medir spike do editor MIT nohighlight, lazy load, toolbar PT-BR, prévia sanitizada e proteção de saída; integrar serviços.
**Where**: `front src/components/knowledge/KnowledgeEditor.tsx`
**Depends on**: T19
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: BASE-02, BASE-03, BASE-06, BASE-07, BASE-08, BASE-10
**Done when**:

- [x] React 19, mobile/teclado, XSS na prévia, falha de upload/save preserva texto, conflito não sobrescreve; editor ausente do chunk inicial.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: unit + e2e
**Gate**: full

### T21: Biblioteca e navegação de materiais

**What**: Adicionar catálogo compacto, categorias/tipo/busca, ações da gestão e leitor de texto/vídeo/PDF com filtros preservados.
**Where**: `front src/pages/KnowledgePage.tsx`
**Depends on**: T20
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: BASE-01, BASE-02, BASE-03, BASE-11
**Done when**:

- [x] CRUD completo e leitura após reload; leitor comum só publicados; vazio tem ação correta; lazy editor só para gestão.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: e2e
**Gate**: full

### T22: Fechar acesso legado e menus

**What**: Aplicar mesmas regras de escopo/status no endpoint legado e alinhar grupos de papéis, guards/menu frontend e cache por tenant.
**Where**: `back src/routes/manuais.js`
**Depends on**: T21
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: BASE-04, BASE-05
**Done when**:

- [x] E2E/API de perfis leitores/editores, dois tenants e troca de contexto; clientes/parceiros bloqueados inclusive por URL direta; nenhum bypass por rota antiga, download ou cache.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: integration + e2e
**Gate**: full

### T23: Parcelas temporais no DRE frontend

**What**: Reconhecer parcelas mensais e critérios diferentes na mesma marca; adaptar detalhe DRE mantendo compatibilidade do payload antigo.
**Where**: `front src/components/financeiro/operational-dre.ts`
**Depends on**: T22
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: CLI-05, CLI-06, CLI-07
**Done when**:

- [x] Agosto/setembro com vencedores distintos em OU, total das parcelas igual aos cards, legado renderiza e divergência bloqueia.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: unit + e2e
**Gate**: full

### T24: Integrações financeiras restantes

**What**: Fechar inventário T5 com provas de cada leitor/escritor, splitar correções adicionais em tarefas por arquivo antes de codificar e habilitar escrita temporal.
**Where**: `docs/plano-consumidores-condicoes.md`
**Depends on**: T23
**Reuses**: componentes, resolução de identidade e infraestrutura documentados em design.md.
**Requirement**: CLI-05, CLI-07, CLI-10, CLI-13
**Done when**:

- [x] PDF/CSV/cliente/contrato formal/import/portal/billing/live-merge testados; sem campos correntes em cálculos históricos; sem ativação parcial.
- [x] Requisitos mapeados, diff revisado, testes da tarefa passando e commit atômico registrado.

**Tests**: integration
**Gate**: full

## Task Granularity Check

| Entrega | Granularidade |
| --- | --- |
| T1–T4, T14–T15, T20–T23 | Um componente/página ou contrato de acesso por tarefa, com testes e integração mínima |
| T6–T13, T16–T19 | Um modelo, serviço ou grupo coeso de endpoints por tarefa |
| T5 e T24 | Um inventário verificável; código adicional vira tarefa própria antes de editar |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | início | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T3 | T3 -> T4 | Match |
| T5 | T4 | T4 -> T5 | Match |
| T6 | T5 | T5 -> T6 | Match |
| T7 | T6 | T6 -> T7 | Match |
| T8 | T7 | T7 -> T8 | Match |
| T9 | T8 | T8 -> T9 | Match |
| T10 | T9 | T9 -> T10 | Match |
| T11 | T10 | T10 -> T11 | Match |
| T12 | T11 | T11 -> T12 | Match |
| T13 | T12 | T12 -> T13 | Match |
| T14 | T13 | T13 -> T14 | Match |
| T15 | T14 | T14 -> T15 | Match |
| T16 | T15 | T15 -> T16 | Match |
| T17 | T16 | T16 -> T17 | Match |
| T18 | T17 | T17 -> T18 | Match |
| T19 | T18 | T18 -> T19 | Match |
| T20 | T19 | T19 -> T20 | Match |
| T21 | T20 | T20 -> T21 | Match |
| T22 | T21 | T21 -> T22 | Match |
| T23 | T22 | T22 -> T23 | Match |
| T24 | T23 | T23 -> T24 | Match |

## Test Co-location Validation

| Task | Layer | Tests | Status |
| --- | --- | --- | --- |
| T1 | front | e2e | Co-localizar na entrega, não ao final |
| T2 | back | integration | Co-localizar na entrega, não ao final |
| T3 | front | unit + e2e | Co-localizar na entrega, não ao final |
| T4 | front | e2e | Co-localizar na entrega, não ao final |
| T5 | docs/plano-consumidores-condicoes.md | review | Co-localizar na entrega, não ao final |
| T6 | back | integration | Co-localizar na entrega, não ao final |
| T7 | back | unit + integration | Co-localizar na entrega, não ao final |
| T8 | back | integration | Co-localizar na entrega, não ao final |
| T9 | back | unit + integration | Co-localizar na entrega, não ao final |
| T10 | back | integration | Co-localizar na entrega, não ao final |
| T11 | back | integration | Co-localizar na entrega, não ao final |
| T12 | back | integration | Co-localizar na entrega, não ao final |
| T13 | back | integration | Co-localizar na entrega, não ao final |
| T14 | front | e2e | Co-localizar na entrega, não ao final |
| T15 | front | e2e | Co-localizar na entrega, não ao final |
| T16 | back | integration | Co-localizar na entrega, não ao final |
| T17 | back | integration | Co-localizar na entrega, não ao final |
| T18 | back | integration | Co-localizar na entrega, não ao final |
| T19 | back | integration | Co-localizar na entrega, não ao final |
| T20 | front | unit + e2e | Co-localizar na entrega, não ao final |
| T21 | front | e2e | Co-localizar na entrega, não ao final |
| T22 | back | integration + e2e | Co-localizar na entrega, não ao final |
| T23 | front | unit + e2e | Co-localizar na entrega, não ao final |
| T24 | docs/plano-consumidores-condicoes.md | integration | Co-localizar na entrega, não ao final |

## Validação independente e publicação

Depois de T24 e de quaisquer subtarefas de inventário, verificador novo compara todos os requisitos da spec com resultados observados. No caminho financeiro, sensor isolado com pelo menos cinco mutações: usar condição atual no passado, MAX global entre meses, bypass de fechamento, ignorar tenant, dupla confirmação. Na Base testar bypass legado, leitura de rascunho e upload sem autorização. Não mutar árvore real nem usar git stash.

Escrever validation.md somente quando houver implementação verificável; nenhuma validação PASS é afirmada no planejamento. Executar validate_state na conclusão da implementação.

Publicação autorizada pelo usuário, seguindo design.md: backend aditivo/compatível e migrations verificadas, frontend em build Vercel na nuvem, smoke e SHA. Nenhuma cobrança de teste nem alteração de valores reais de Haag durante deploy. Se surgirem novas exigências de negócio, registrá-las e resolver antes da tarefa dependente.
