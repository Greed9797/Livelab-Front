# Financeiro com DRE confiável

## Problem Statement

A área financeira apresenta uma margem comercial que desconta apenas custos manuais, enquanto o resultado operacional completo inclui fixos, comissões e adicionais de apresentadoras. A coexistência das duas bases torna receita, custo e margem difíceis de interpretar e aumenta o risco de decisões com números incompletos.

## Goals

- [x] Tornar o resultado operacional completo a visão financeira principal, incluindo toda remuneração conhecida.
- [x] Organizar receitas e despesas como DRE resumido, com detalhes expansíveis por marca, apresentadora e custo.
- [x] Preservar regras de comissão, edição, fechamento, CSV e PDF existentes.
- [x] Remover apenas superfícies e variáveis comprovadamente sem função vigente.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Alterar percentuais, faixas ou regras de aprovação | O pedido preserva funcionalidades e regras financeiras. |
| Remover colunas do banco | Nenhuma nova coluna foi comprovada morta; as candidatas aparentes ainda têm consumidores. |
| Modelar folha de supervisor e outras funções | O schema atual não possui remuneração estruturada para esses papéis; salários continuam como custo manual. |
| Alterar PDFs ou CSVs | Os contratos atuais devem permanecer compatíveis. |
| Publicar, executar migração ou modificar produção | Exige autorização específica posterior. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Fonte do resultado principal | `/v1/financeiro/operacional` | É a única fonte atual que inclui fixos, comissões, adicionais e custos manuais. | y |
| Comissão pendente de aprovação | Preservar a regra vigente: incluir tudo que não esteja reprovado | Evita mudar o fechamento e o comportamento financeiro existente. | y |
| Contrato de marca `fixo_ou_comissao` | Exibir fixo e comissão calculados na memória; reconhecer somente o maior | Mantém a regra financeira e explica o valor contabilizado. | y |
| Salários sem perfil de apresentadora | Manter em custos manuais do tipo `salario` | Não existe fonte estruturada segura para inferi-los. | y |
| Campo plano `apresentadoras.comissao_pct` | Não remover do banco/API nesta entrega; retirar apenas o rótulo enganoso “base” da lista de usuários | O motor atual usa faixas, mas rotas de lives e snapshots ainda leem a coluna. | y |
| Relatórios | Preservar todos os campos consumidos por PDFs e CSVs | Evita regressões em documentos financeiros e operacionais. | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Resultado operacional verdadeiro

**User Story**: As a gestor financeiro, I want receita, custos e margem na mesma base para que eu possa avaliar o resultado real da unidade.

**Why P1**: A margem atual omite remuneração automática e pode esconder prejuízo.

**Acceptance Criteria**:

1. **FIN-01** WHEN o gestor abrir a aba Operacional THEN o sistema SHALL exibir como resultado principal `receita de marcas - todas as despesas`, sem piso em zero.
2. **FIN-02** The system SHALL incluir no total de despesas fixos, comissões e adicionais de apresentadoras, além de todos os custos manuais do período.
3. **FIN-03** The system SHALL exibir receita total, despesas totais, resultado operacional e margem operacional calculados sobre a mesma composição.
4. **FIN-04** IF algum total ou conjunto de lançamentos estiver ausente na resposta THEN o sistema SHALL exibir estado de indisponibilidade sem converter ausência em zero.

**Independent Test**: Um fixture com receita de R$ 550, fixos de R$ 3.700 e variáveis de R$ 150 exibe resultado de -R$ 3.300 e margem negativa correspondente.

### P1: Composição em formato DRE

**User Story**: As a gestor financeiro, I want uma composição resumida e expansível para que eu possa entender o total e auditar cada entidade.

**Why P1**: A lista atual mistura entradas e saídas por valor, sem hierarquia contábil.

**Acceptance Criteria**:

1. **FIN-05** WHEN o DRE for exibido THEN o sistema SHALL ordenar as seções como Receita de marcas, Remuneração de apresentadoras, Custos operacionais e Resultado operacional.
2. **FIN-06** WHEN a seção Receita de marcas for expandida THEN o sistema SHALL separar fixo calculado, comissão calculada e receita reconhecida por marca.
3. **FIN-07** WHEN a seção Remuneração de apresentadoras for expandida THEN o sistema SHALL separar fixo, comissão, adicionais e total por apresentadora.
4. **FIN-08** WHEN a seção Custos operacionais for expandida THEN o sistema SHALL agrupar custos manuais por tipo e permitir consultar cada lançamento.
5. **FIN-09** WHILE uma seção estiver recolhida, o sistema SHALL mostrar seu subtotal e a quantidade de entidades ou lançamentos cobertos.
6. **FIN-10** IF a marca usar `fixo_ou_comissao` THEN o sistema SHALL contabilizar somente o maior valor e SHALL identificar o critério vencedor nos detalhes.
7. **FIN-11** The system SHALL reconciliar cada subtotal com os lançamentos e o resultado final, com arredondamento monetário em centavos.

**Independent Test**: Um período com duas marcas, duas apresentadoras e três custos manuais fecha cada seção e o resultado final com a soma das linhas detalhadas.

### P1: Comissões claras e preservadas

**User Story**: As a gestor, I want a área de comissões objetiva para que eu possa fechar pagamentos sem confundir regras vigentes com campos legados.

**Why P1**: Valores de pagamento afetam pessoas reais e precisam manter rastreabilidade.

**Acceptance Criteria**:

1. **FIN-12** The system SHALL preservar fixo, comissão, adicionais, total, memória completa e histórico de lives no fechamento de apresentadoras.
2. **FIN-13** WHEN o gestor abrir regras de comissão THEN o sistema SHALL continuar permitindo configurar a escada padrão, faixas personalizadas e recalcular o mês pelas permissões existentes.
3. **FIN-14** The system SHALL remover da lista administrativa o rótulo de comissão plana “base” que não representa a regra vigente.
4. **FIN-15** IF os detalhes do fechamento divergirem do total variável ou estiverem incompletos THEN o sistema SHALL continuar bloqueando a exportação do PDF.

**Independent Test**: O fechamento e seu PDF mantêm os mesmos valores antes e depois do redesenho, e a lista de usuários deixa de mostrar a base plana.

### P2: Limpeza comprovadamente segura

**User Story**: As a maintainer, I want remover código financeiro sem consumidor para reduzir fontes de erro.

**Why P2**: A antiga margem comercial duplica conceitos com base diferente e mantém componentes sem utilidade após o DRE.

**Acceptance Criteria**:

1. **FIN-16** WHEN o DRE substituir a visão comercial THEN o sistema SHALL remover queries, imports e componentes que só sustentavam a margem após custos manuais.
2. **FIN-17** The system SHALL preservar todo campo consumido por PDF, CSV, cobrança, portal, snapshot ou integração identificada no inventário.
3. **FIN-18** IF um campo tiver qualquer consumidor vigente ou semântica distinta THEN o sistema SHALL mantê-lo e SHALL não executar alteração de schema.

**Independent Test**: Busca de consumidores e testes de PDF/CSV demonstram que somente a superfície plana e os componentes sem uso foram removidos.

---

## Edge Cases

- **FIN-19** IF não houver movimento no período THEN o sistema SHALL exibir DRE vazio com subtotais zero reportados pelo servidor e explicação de ausência de lançamentos.
- **FIN-20** IF houver GMV sem comissão processada ou apresentadora resolvida THEN o sistema SHALL exibir a pendência existente e SHALL não inventar custo variável.
- **FIN-21** WHEN o período abranger vários meses THEN o sistema SHALL aplicar os fixos e vigências conforme a regra mensal histórica existente.
- **FIN-22** IF custos superarem receitas THEN o sistema SHALL exibir resultado e margem negativos.
- **FIN-23** WHILE o usuário tiver papel somente leitura, o sistema SHALL ocultar controles de criação e exclusão de custos e SHALL manter a consulta do DRE.

## Implicit Requirement Dimensions

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Preservar schemas e limites vigentes para custos, adicionais, faixas e percentuais. |
| Failure / partial-failure states | FIN-04 e FIN-15 cobrem payload incompleto e PDF inconsistente. |
| Idempotency / retry / duplicate handling | N/A because this feature does not add mutations; existing mutations remain unchanged. |
| Auth boundaries & rate limits | FIN-23 preserves existing read/write roles; no new endpoint is public. |
| Concurrency / ordering | N/A because calculations remain read-only snapshots and no state transition is added. |
| Data lifecycle / expiry | N/A because no persistence or retention rule changes. |
| Observability | Existing endpoint errors and cache headers remain; no new background processing is added. |
| External-dependency failure | N/A because the DRE uses existing local API responses and does not add providers. |
| State-transition integrity | Existing approval, recalculation, additional cancellation and cost CRUD transitions remain unchanged. |

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FIN-01 | Resultado operacional verdadeiro | T2 | Implemented |
| FIN-02 | Resultado operacional verdadeiro | T1 | Implemented |
| FIN-03 | Resultado operacional verdadeiro | T1 | Implemented |
| FIN-04 | Resultado operacional verdadeiro | T1 | Implemented |
| FIN-05 | Composição em formato DRE | T2 | Implemented |
| FIN-06 | Composição em formato DRE | T1 | Implemented |
| FIN-07 | Composição em formato DRE | T1 | Implemented |
| FIN-08 | Composição em formato DRE | T1 | Implemented |
| FIN-09 | Composição em formato DRE | T2 | Implemented |
| FIN-10 | Composição em formato DRE | T1 | Implemented |
| FIN-11 | Composição em formato DRE | T1 | Implemented |
| FIN-12 | Comissões claras e preservadas | T3 | Preserved |
| FIN-13 | Comissões claras e preservadas | T3 | Preserved |
| FIN-14 | Comissões claras e preservadas | T4 | Implemented |
| FIN-15 | Comissões claras e preservadas | T3 | Preserved |
| FIN-16 | Limpeza comprovadamente segura | T3 | Implemented |
| FIN-17 | Limpeza comprovadamente segura | T3 | Preserved |
| FIN-18 | Limpeza comprovadamente segura | T5 | Preserved |
| FIN-19 | Edge cases | T1 | Implemented |
| FIN-20 | Edge cases | T3 | Implemented |
| FIN-21 | Edge cases | T1 | Implemented |
| FIN-22 | Edge cases | T1 | Implemented |
| FIN-23 | Edge cases | T3 | Preserved |

**Coverage:** 23 total, 23 mapped to T1–T5, 0 pending.

## Success Criteria

- [x] O único resultado destacado da aba Operacional inclui toda remuneração conhecida e pode ser negativo.
- [x] Totais do DRE reconciliam em centavos com todos os detalhes retornados.
- [x] PDFs, CSVs, fechamento, regras, edição e permissões mantêm comportamento e valores.
- [x] Nenhum campo com consumidor vigente é removido.
- [x] Typecheck, testes, build, testes backend e validação SQL financeira passam.
