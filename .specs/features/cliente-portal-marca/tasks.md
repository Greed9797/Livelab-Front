# Tasks: portal do cliente frontend

## Test Coverage Matrix

| Layer | Requirements | Coverage |
| --- | --- | --- |
| Relógio | Gate temporal | Fixar setembro de 2026 sem alterar regra de produto |
| Interface | PORTAL-4,6,7,8,9 | Renderizações, paginação, conta, cache e navegação |
| Integração | PORTAL-10 | Typecheck, testes, build e revisão independente |

## Gate Check Commands

- Quick temporal: npx vitest run src/services/knowledge-training.test.ts
- Quick portal: npm run typecheck e testes focados de portal
- Build: npm run typecheck && npm run test && npm run build

## Execution Plan

T1 corrige a dependência temporal aprovada. T2 implementa o portal com o contrato do backend. T3 valida e registra a revisão.

## Task Breakdown

### T1: Estabilizar o teste temporal
Depends on: none
Tests: knowledge-training.test.ts com relógio fixado e restaurado
Gate: Quick temporal
Done when: teste atualizado passa sem mudar freshnessOf ou sua regra de 30 dias.
Status: complete
Owner: frontend_portal

### T2: Exibir resultados e lives com cache por conta
Depends on: T1
Tests: PORTAL-4,6,7,8,9 incluindo erro/vazio/zero/null, paginação e troca de conta
Gate: Quick portal
Done when: três áreas do portal, contratos tipados, consultas por conta e nenhuma tela ou chamada financeira.
Status: in progress
Owner: frontend_portal

### T3: Validar pacote de publicação
Depends on: T2
Tests: gates completos, fluxo móvel com dados sintéticos e revisão independente
Gate: Build
Done when: typecheck, testes e build verdes; evidência de validação registrada e nenhum deploy executado.
Status: pending
Owner: root/verifier
