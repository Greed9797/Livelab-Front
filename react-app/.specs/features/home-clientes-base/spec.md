# Home, Clientes e Base Specification

**Data:** 2026-09-16
**Estado:** planejamento proposto; implementação posterior com Luna.

## Problem Statement

A Home corta o ranking em três pessoas e não mostra as horas acumuladas da assiduidade. A edição comercial mistura cadastro e negociação corrente, de modo que uma mudança pode alcançar cálculos antigos. A Base tem leitura, mas não oferece à unidade uma biblioteca com criação e edição de materiais.

## Routing

| Domínio | Complexidade | Risco | Dono de execução | Revisão |
| --- | --- | --- | --- | --- |
| Home e edição cadastral | 2/5 | Baixo, exceto contagem de presença | Luna | Revisão funcional e navegador |
| Vigência contratual | 5/5 | Alto: dinheiro, recálculo, migração e concorrência | Luna com tarefas delimitadas | Revisor independente Terra/Sol, SQL real e sensor financeiro |
| Biblioteca | 4/5 | Alto: autorização, isolamento e uploads | Luna com tarefas delimitadas | Revisão independente de segurança e integração |

Planejamento pela agente principal; nenhum código de aplicação alterado nesta etapa. Autorização do usuário para publicar quando pronto registrada, sem publicar durante o planejamento.

## Goals

- [ ] Mostrar cinco apresentadoras, horas acumuladas e agenda ao final da Home.
- [ ] Editar cadastros diretamente e distinguir condições financeiras por vigência.
- [ ] Preservar passado e fechamentos ao cadastrar a negociação seguinte.
- [ ] Disponibilizar biblioteca compacta com edição pela gestão e leitura por unidade.

## Out of Scope

| Feature | Reason |
| --- | --- |
| LMS, avaliações, certificados, progresso ou controle de visualização | Usuário quer biblioteca simples |
| Hospedagem/transcodificação de vídeos | Usar URL de provedor existente |
| Aplicar valores reais da Haag sem os valores informados | Exemplo define a regra temporal, não os valores |
| Reconstruir automaticamente negociações antigas já sobrescritas | Cadastro atual não prova valores passados |
| Troca das faixas de comissão de apresentadoras | Não solicitada |
| Reescrever cobranças emitidas, pagamentos ou uniões ativas | Preservar integridade financeira |
| Refatoração geral de dashboards ou agenda | Somente mudanças solicitadas |
| Vigência financeira arbitrária no meio do mês, na primeira versão | Marco mensal evita inventar regra para fixo ou comissão em mês dividido; datas de início/fim do vínculo continuam com rateio existente |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Horas acumuladas | Por apresentadora no mês selecionado até hoje; mês encerrado completo; apenas lives encerradas | Reutiliza o significado atual de assiduidade; indicar Horas registradas no período, sem prometer cronômetro ao vivo | Mês por apresentadora confirmado pelo usuário; apenas encerradas é a semântica atual explicitada |
| Marco financeiro | Mês inicial, convertido ao primeiro dia; ex.: setembro/2026 | Atende o exemplo agosto/setembro e a cobrança mensal atual | Proposto |
| Zero financeiro | Zero só é completo quando explicitamente confirmado; zeros legados ficam A revisar | Os defaults atuais não distinguem ausência de gratuidade | Proposto |
| Leitores da Base | Somente equipe interna e apresentadoras vinculadas à unidade; excluir clientes, parceiros e contas de automação | Restrição expressamente escolhida pelo usuário | Confirmado |
| Editores da Base | Master no escopo permitido e franqueado/gestão administrativa local; não todos os leitores | Evita dar permissão de publicação a todo usuário | Proposto; alinhar aliases existentes |
| Conteúdo global antigo | Preservar como Biblioteca da rede, sem convertê-lo a material de uma unidade por suposição | Dados atuais são globais por design | Proposto |
| PDFs e imagens | PDF até 10 MB, capa JPEG/PNG/WebP até 2 MB; upload privado para materiais locais | Limites concretos e reaproveitamento da integração de storage | Proposto |
| Histórico da Haag | A gestão informará valores anteriores/novos e competência; alterações em movimentos abertos terão prévia | Não assumir valores nem corrigir produção durante planejamento | Confirmado pelo escopo |
| Arquitetura Base | Reutilizar API e Markdown atuais e incorporar editor open source via lazy load | Menor infraestrutura e superfície de manutenção | Recomendação, não implementada |

**Open questions:** none untracked — decisões não respondidas estão registradas acima como propostas, não como aprovação tácita.

## User Stories

### P1: Home

**User Story:** Como usuário da unidade, quero home com informação correta e ações fáceis de encontrar.

**Acceptance Criteria**:

- **HOME-01** WHEN houver cinco ou mais apresentadoras no ranking do mês THEN a Home SHALL mostrar as cinco primeiras na ordem canônica, mantendo destaque visual para as três primeiras.
- **HOME-02** IF houver menos de cinco apresentadoras THEN a Home SHALL mostrar somente as existentes, sem inventar posições ou pessoas.
- **HOME-03** WHEN a assiduidade carregar THEN a tela SHALL exibir por apresentadora as horas acumuladas reportadas para o período selecionado, em horas e minutos, com o período identificado.
- **HOME-04** IF o total de horas estiver ausente ou inválido THEN a tela SHALL mostrar indisponibilidade para o total, sem converter ausência em zero.
- **HOME-05** The system SHALL contabilizar presença física sem rateio por GMV e sem duplicar origens absorvidas por união de lives.
- **HOME-06** WHEN a Home renderizar a agenda THEN o bloco Agenda de hoje SHALL ser o último bloco de conteúdo, preservando links, atualização e data de hoje independentemente do mês dos indicadores.

**Independent Test:** executar a matriz correspondente em tasks.md com fixtures controladas, sem escrever dados financeiros de teste em produção.

### P1: Clientes e contratos

**User Story:** Como usuário da unidade, quero clientes e contratos com informação correta e ações fáceis de encontrar.

**Acceptance Criteria**:

- **CLI-01** WHEN o gestor acionar o lápis de um cliente na lista THEN a tela SHALL abrir a edição desse registro sem exigir acesso prévio aos detalhes.
- **CLI-02** IF a linha agrupar múltiplos registros THEN a ação de edição SHALL exigir a escolha do registro pelo identificador antes de salvar.
- **CLI-03** The system SHALL separar alterações cadastrais de alterações financeiras, evitando enviar valores de contrato ao salvar somente nome ou contato.
- **CLI-04** WHEN o gestor cadastrar uma nova condição a partir de setembro de 2026 THEN o sistema SHALL usar a condição anterior até 2026-08-31 e a nova a partir de 2026-09-01.
- **CLI-05** The system SHALL resolver a condição pela data do fato gerador em America/Sao_Paulo, nunca pela data em que o relatório ou recálculo foi executado.
- **CLI-06** The system SHALL calcular receitas por marca e competência antes de somar intervalos, aplicando fixo + comissão ou o maior dos dois na competência correspondente.
- **CLI-07** The system SHALL preservar cobranças, aprovações e snapshots financeiros fechados ao criar uma nova vigência.
- **CLI-08** IF houver sobreposição, atualização concorrente ou tentativa de alterar período financeiramente fechado THEN a API SHALL rejeitar a operação com 409 e não persistir alteração parcial.
- **CLI-09** WHEN uma vigência retroativa atingir apenas movimentos abertos THEN o sistema SHALL mostrar prévia de impacto e exigir confirmação explícita antes de persistir os recálculos afetados.
- **CLI-10** The system SHALL preservar o estado legado na ativação da funcionalidade sem reescrever comissões ou inventar negociações históricas.
- **CLI-11** WHEN o cadastro financeiro não estiver confirmado THEN a lista e a edição SHALL mostrar texto de pendência para fixo, comissão ou vínculo de marca, além de indicador visual.
- **CLI-12** IF fixo ou comissão tiver zero explicitamente confirmado THEN a interface SHALL apresentar Sem fixo ou Sem comissão, sem classificá-lo como informação faltante.
- **CLI-13** The system SHALL aplicar isolamento por unidade e as permissões financeiras existentes a leitura, prévia e alteração das vigências.

**Independent Test:** executar a matriz correspondente em tasks.md com fixtures controladas, sem escrever dados financeiros de teste em produção.

### P1: Biblioteca Base

**User Story:** Como usuário da unidade, quero biblioteca base com informação correta e ações fáceis de encontrar.

**Acceptance Criteria**:

- **BASE-01** WHEN um leitor autorizado abrir a Base THEN a tela SHALL permitir encontrar materiais publicados por busca de título, resumo ou tags e filtro de categoria e tipo.
- **BASE-02** WHEN um gestor autorizado abrir a Base THEN a tela SHALL permitir criar, editar, pré-visualizar, publicar e arquivar materiais e organizar categorias.
- **BASE-03** The system SHALL suportar texto formatado, links de materiais, vídeo por URL e anexos PDF sem exigir progresso, conclusão, certificado ou matrícula.
- **BASE-04** The system SHALL permitir ler materiais locais publicados somente à equipe interna e apresentadoras da mesma unidade, rejeitando acesso de clientes e parceiros inclusive por URL direta.
- **BASE-05** WHILE um material estiver em rascunho ou arquivado THEN ele SHALL ficar invisível ao leitor comum, inclusive por URL direta, busca, anexos e endpoints legados.
- **BASE-06** The system SHALL sanitizar a prévia e a leitura de conteúdo e rejeitar URLs executáveis, HTML ativo e embeds arbitrários.
- **BASE-07** IF dois gestores editarem a mesma revisão THEN o segundo salvamento SHALL retornar 409 e preservar o texto não salvo no editor.
- **BASE-08** IF o armazenamento de anexos falhar THEN a tela SHALL manter o texto do material e informar a falha sem afirmar que o arquivo foi salvo.
- **BASE-09** The system SHALL validar tipo real e tamanho dos uploads e autorizar o download de arquivos privados pelo escopo do material.
- **BASE-10** The system SHALL carregar o editor somente quando a edição for aberta, sem incluir suas dependências no carregamento inicial da Home.
- **BASE-11** IF não houver material publicado THEN a tela SHALL explicar o estado vazio e oferecer criação apenas a quem possui permissão.

**Independent Test:** executar a matriz correspondente em tasks.md com fixtures controladas, sem escrever dados financeiros de teste em produção.

## Edge Cases

- Ranking com 0, 2, 5 e 8 pessoas; empate com ordem determinística; viewport móvel e teclado.
- Horas zero, ausentes, dia corrente, contratação/saída, feriado, revezamento, zero GMV, união ativa e reversão.
- Vigência em janeiro, virada de ano, competência futura, mesmo início repetido, conflito de versão e múltiplas marcas no cliente.
- Agosto e setembro somados devem equivaler a consultas mensais separadas; para fixo_ou_comissao, comparar por competência e somar os resultados, não aplicar MAX ao intervalo inteiro.
- Cadastro legado com zeros e sem marca principal; negociação sem fixo legítima; comissão da franqueadora não obrigatória para entidade à qual não se aplica.
- Base sem conteúdo, cliente/parceiro por URL direta, rascunho por link direto, ID de outra unidade, categoria global/local incompatível, upload interrompido, URL inválida e conflito entre duas abas; materiais globais existentes permanecem em escopo separado com a mesma restrição de público.

## Implicit Requirement Dimensions

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Competência válida, moeda em centavos, taxas 0–100, texto 50 mil caracteres, limites de upload |
| Failure / partial-failure | CLI-08/09 e BASE-07/08; transação financeira e editor preservado |
| Idempotency / retry | Idempotency-Key na alteração financeira e criação de material; upload não publica sozinho |
| Auth boundaries | CLI-13, BASE-04/05/09; tenant do contexto autenticado |
| Concurrency / ordering | CLI-08 e BASE-07; trava financeira por tenant e controle de revisão |
| Data lifecycle | Vigências auditáveis sem exclusão destrutiva; arquivo/rascunho/publicado; preservar global antigo |
| Observability | Auditoria de condição, publicação e arquivo com ator, tenant e revisão, sem conteúdo sensível no log |
| External dependency | BASE-08; storage sem acesso não produz sucesso falso; vídeo indisponível mantém link e explicação |
| State transitions | Prévia/confirmar para finanças; rascunho/publicado/arquivado para materiais |

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| HOME-01 | Home | T1 | In Tasks |
| HOME-02 | Home | T1 | In Tasks |
| HOME-03 | Home | T3 | In Tasks |
| HOME-04 | Home | T3 | In Tasks |
| HOME-05 | Home | T2 | In Tasks |
| HOME-06 | Home | T1 | In Tasks |
| CLI-01 | Clientes e contratos | T4 | In Tasks |
| CLI-02 | Clientes e contratos | T4 | In Tasks |
| CLI-03 | Clientes e contratos | T4, T13 | In Tasks |
| CLI-04 | Clientes e contratos | T5–T8, T14 | In Tasks |
| CLI-05 | Clientes e contratos | T7, T9–T12 | In Tasks |
| CLI-06 | Clientes e contratos | T10, T11 | In Tasks |
| CLI-07 | Clientes e contratos | T8, T9, T12 | In Tasks |
| CLI-08 | Clientes e contratos | T6, T8 | In Tasks |
| CLI-09 | Clientes e contratos | T8, T14 | In Tasks |
| CLI-10 | Clientes e contratos | T5, T6 | In Tasks |
| CLI-11 | Clientes e contratos | T15 | In Tasks |
| CLI-12 | Clientes e contratos | T6, T15 | In Tasks |
| CLI-13 | Clientes e contratos | T8, T13 | In Tasks |
| BASE-01 | Biblioteca Base | T17, T21 | In Tasks |
| BASE-02 | Biblioteca Base | T18, T20, T21 | In Tasks |
| BASE-03 | Biblioteca Base | T19–T21 | In Tasks |
| BASE-04 | Biblioteca Base | T16–T18, T22 | In Tasks |
| BASE-05 | Biblioteca Base | T17, T18, T22 | In Tasks |
| BASE-06 | Biblioteca Base | T19, T20 | In Tasks |
| BASE-07 | Biblioteca Base | T18, T20 | In Tasks |
| BASE-08 | Biblioteca Base | T19, T20 | In Tasks |
| BASE-09 | Biblioteca Base | T19 | In Tasks |
| BASE-10 | Biblioteca Base | T20 | In Tasks |
| BASE-11 | Biblioteca Base | T21 | In Tasks |

**Coverage:** 30 requisitos mapeados; implementação pendente.

## Success Criteria

- [ ] Testes da Home, CRUD da biblioteca e contratos temporais passam em desktop e mobile.
- [ ] Agosto não muda ao cadastrar setembro; parcelas e intervalos reconciliam em centavos.
- [ ] Leitor de outra unidade não obtém conteúdo privado por nenhum endpoint.
- [ ] Revisão independente aprova código, SQL real, segurança e rollback antes de publicar.
