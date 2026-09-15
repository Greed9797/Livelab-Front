# Plano: unir trechos de uma transmissão contínua

Status: implementação desenvolvida com subagentes Sol/Terra. Usuário autorizou publicação completa, incluindo execução da migração 150 em produção. Liberação em preparação, ainda sem deploy nesta etapa.

## Registro da implementação

- Backend efetivo: `/private/tmp/livelab-presenter-lives-back`, branch `codex/presenter-lives-safe-back`, base `44e538015c351f757f9f5d5fae2a94a49ba7abba`. A cópia inicialmente inspecionada em `/Users/lucas/Livelab-back` estava anterior aos fluxos mais recentes; as alterações foram transferidas para a base correta e a cópia antiga foi restaurada, preservando seu arquivo não versionado.
- Frontend permanece na base `42c177f` da seção abaixo.
- SQL aditivo preparado em `migrations/150_live_unioes.sql`; as migrações 148 e 149 já pertencem aos fluxos APRESENTADORA e arquivamento existentes. O SQL foi exercitado somente em PGlite descartável, sem conexão com produção.
- Novas uniões ficam desligadas por padrão. A API verifica `LIVE_MERGE_TENANT_ALLOWLIST`; histórico e reversão permanecem acessíveis quando a criação é desligada.
- Na união, as atribuições financeiras existentes são agregadas com centavos exatos, sem mudar taxas nem aprovar comissão. O motor continua apto a executar os recálculos mensais normais, preservando pedidos por apresentadora. A reversão bloqueia alterações financeiras posteriores.
- Registros oficiais encerrados podem ser unidos se tiverem o mesmo estado de publicação, inclusive `revisado` gerado pela aprovação do portal; publicar novamente não é pré-requisito. Submissões pendentes não são registros oficiais elegíveis.
- Usuário autorizou especificamente as duas edições locais: migração 150 registrada no runner e trava `ORDER BY id FOR UPDATE` na seleção de lives para faturamento, dentro da transação e antes do gateway. Nenhuma cobrança ou migração real foi executada.
- Publicação e migração autorizadas pelo usuário. A criação permanece desligada durante a troca de versões; a ativação exige configurar os UUIDs das unidades escolhidas no Railway.
- Corrida de snapshot reproduzida por três testes com barreiras de transações simuladas (RED). Corrigida com trava transacional comum por tenant, adquirida por faturamento, união e reversão antes das consultas e travas de linhas (GREEN). PostgreSQL externo com duas conexões não está disponível neste ambiente; os testes de concorrência são simulados, enquanto os fluxos SQL e a migração são exercitados em PGlite isolado.
- Backup/PITR de produção não foi verificado: não há acesso Railway/DB disponível. Migração 150 é aditiva e não une nem exclui lives existentes. Reverter o deploy não remove as estruturas adicionadas; antes de ativar uniões, o código anterior pode voltar sem dados absorvidos. Após haver uniões, manter leitores compatíveis e desligar a criação em vez de voltar a código que desconhece as origens absorvidas.

### Evidência local de verificação

- Frontend: typecheck e build passaram; 70 arquivos / 516 testes passaram; 6 cenários Playwright Chromium com APIs simuladas passaram. Proxy de verificação aponta para localhost, sem operações em produção.
- Núcleo backend: 50 testes de funções, serviço e HTTP passaram. Cobertura desse núcleo: 86,93% statements, 89,12% linhas, 71,29% branches; cobertura da rota: 95,65% statements.
- SQL real em PGlite descartável: prévia, união, idempotência, prévia obsoleta, três pontos de falha com rollback, conservação individual/global, origem APRESENTADORA, gestor original, proteção dos trechos, histórico, reversão exata e bloqueio por boleto direto passaram. Teste separado comprovou FKs por tenant e RLS do histórico.
- Regressões SQL do portal existente e do recálculo mensal passaram; frontend e backend passaram em `git diff --check`.
- A suíte backend sem `live_merge_finance.test.js` e `migrations_runner.test.js` passou, incluindo CLI com porta local permitida. Após autorização e aplicação dos dois ajustes locais, esses dois arquivos passaram: 8 testes, sem remover ou enfraquecer verificações. Os testes do runner usam cliente simulado, sem executar migrações em banco real.
- Nova execução dos testes de núcleo, serviço, rotas, HTTP e leitores: 5 arquivos / 53 testes passaram. Nenhuma migração real, cobrança, configuração de produção, push ou deploy foi executado.

## Base e classificação

- Frontend inspecionado: `42c177fb41442c70307bd19da374812026a58d60`, branch local `codex/presenter-lives-safe-front`. O commit coincide com o histórico informado; a branch não.
- Backend inspecionado: `/Users/lucas/Livelab-back`, `4d4a1209275e8abf923009e82c5bc979eb9f2137`, branch `feat/multi-apresentadora-agenda`, divergente do remoto. Não se presume que essa cópia corresponda à API em produção.
- Domínio: operação de lives, métricas, agenda e atribuição financeira. Complexidade 4/5; risco alto em integridade e comissões. Responsável pelo planejamento: agente principal, tier de raciocínio alto da sessão. Revisão de backend, SQL, permissões e regras financeiras obrigatória antes da implementação ser liberada.
- Análise baseada em código local e instruções dos repositórios. Não houve consulta a dados de produção, execução de SQL, build ou testes da aplicação nesta etapa de planejamento.

## Objetivo e critérios de aceite

Uma transmissão contínua cadastrada em trechos passa a aparecer como uma live, com horário total, métricas consolidadas e divisão real por apresentadora.

Exemplo: Ana, 12h–15h, R$ 2.000 e 20 pedidos; Bia, 15h–18h, R$ 3.000 e 30 pedidos. Resultado: uma live 12h–18h, 6h, R$ 5.000 e 50 pedidos; Ana mantém 3h e R$ 2.000, Bia mantém 3h e R$ 3.000. Impressões e visualizações são somadas quando representam os respectivos trechos.

Aceite:

1. Gestão seleciona duas ou mais lives e recebe prévia calculada pelo servidor, com impedimentos por registro.
2. Registros devem formar uma sequência contínua, da mesma marca por ID e unidade, sem lacuna ou sobreposição.
3. Soma do GMV e dos segundos por apresentadora fecha com o total consolidado; participação com GMV zero continua registrada.
4. Cada origem entra exatamente uma vez nas somas; consolidada e originais nunca contam simultaneamente.
5. Histórico, submissões, provas de origem e identificação dos trechos permanecem consultáveis.
6. União não valida submissões nem aprova comissões implicitamente.
7. Repetição da requisição não duplica resultado; concorrência e falha parcial não deixam estado intermediário.
8. Operação tem auditoria e reversão controlada, testada antes da liberação.

Fora do escopo inicial: alterar regras de remuneração, inferir GMV proporcional ao tempo, unir transmissões simultâneas, corrigir horários automaticamente, efetuar fechamento financeiro, aplicar migração ou publicar.

## Elegibilidade proposta para a primeira versão

As condições de mesma marca e continuidade foram solicitadas. Os bloqueios adicionais abaixo são recomendações a revisar antes de implementar:

- Todas encerradas, com início/fim válidos, duração positiva, e registros oficiais já validados. Submissões pendentes/devolvidas seguem o fluxo existente; depois de aprovadas, suas lives oficiais ficam elegíveis.
- Mesmo tenant/unidade, marca, cabine, tipo de live, cliente/contrato compatíveis e conta/canal quando informados. Igualdade de marca não prova que se trata da mesma transmissão.
- Ordenar cronologicamente; exigir igualdade dos instantes `fim[i] == inicio[i+1]`, considerando o fuso e a precisão persistida. Não truncar segundos nem absorver um minuto de intervalo. A tolerância de 60s do rateio atual não autoriza tolerância de continuidade.
- Mesma data operacional de São Paulo e duração total de até 24h na primeira versão. Virada de dia/mês fica bloqueada inicialmente: a data financeira deriva do início da live e poderia deslocar receita de um período para outro.
- Nenhuma comissão aprovada, pagamento/liquidação ou fechamento financeiro associado que impeça a operação. Verificar vínculos reais; não presumir que todos esses estados usam a mesma tabela.
- Nenhuma origem já absorvida ou consolidada em união anterior na primeira versão. Aceitar N trechos numa única operação, com limite de lote definido, evita exigir encadeamento de merges.
- Rateio existente deve estar confirmado e completo em valores e tempo. Para uma apresentadora inequívoca, atribuir a ela o GMV e duração do trecho. Para rateio planejado, percentual legado ou identidade ambígua, exigir correção pelo fluxo existente.
- Métricas precisam representar trechos distintos. Dados cumulativos da transmissão completa em ambos os registros não podem ser somados. Exigir confirmação explícita dessa condição; importações com escopo ambíguo ficam bloqueadas.
- Publicação deve ter estado compatível; não promover rascunho para publicado por herança de outro trecho.

## Composição das métricas

| Dado | Regra |
| --- | --- |
| GMV | Resolver o valor oficial de cada origem e só então somar; hoje a prioridade é `ads_gmv`, `manual_gmv`, `fat_gerado`. |
| Pedidos | Resolver por origem a prioridade `manual_orders`, `final_orders_count`; somar inteiros. |
| Impressões e visualizações | Somar contadores incrementais conhecidos. Se algum trecho não tem valor, resultado completo permanece pendente; mostrar subtotal conhecido e quais trechos faltam, sem converter ausência em zero. |
| Duração | Último fim menos primeiro início, igual à soma dos trechos contíguos. Calcular em segundos, sem arredondar cada trecho em horas. |
| Cliques, comentários, curtidas, compartilhamentos, custo | Somar apenas campos com definição e escopo compatíveis. Inventariar todos os campos antes da implementação. |
| GMV/h, ticket médio, CTR, conversão, ROAS | Recalcular a partir dos totais correspondentes; não somar taxas. Denominador ausente ou zero não produz taxa inventada. |
| Retenção média | Usar numerador e denominador corretos, se disponíveis; caso contrário, deixar não calculada. Não fazer média simples. |
| Pico simultâneo / espectadores únicos | Pico pode usar máximo dos trechos compatíveis; únicos não são deduplicáveis por soma de agregados. Não rotular visualizações somadas como pessoas únicas. |

Dinheiro calculado em decimal/centavos com limites validados; contadores devem respeitar limites do banco e serialização JS. A consolidação não deve somar campos brutos por coluna: uma origem com GMV em Ads e outra em manual perderia valor no COALESCE final. Gravar um total canônico compatível com os leitores, preservando a origem de cada parcela no histórico.

## Rateio e comissões

- Reutilizar `live_apresentadoras_v2`, `normalizarRateio` e `applyApresentadorasToLive`, com GMV absoluto e segundos, e a apresentação do `ImportRateioModal`.
- Se a mesma apresentadora aparecer em vários trechos, somar sua participação na consolidada e manter os intervalos originais na procedência.
- Não inferir tempo por participação no GMV. Quem vendeu zero pode ter trabalhado três horas.
- O motor atual coloca todos os pedidos na principal (`commission-engine.js:82`). Para preservar atribuições existentes, o plano inclui suporte explícito a pedidos por apresentadora para a consolidada, com fallback legado nas demais lives. Quando a origem já tem rateio, preservar a atribuição que o sistema conhece; não afirmar que ela mede pedidos reais de cada pessoa.
- Substituir atribuições financeiras operacionais das origens pelas da consolidada na mesma transação, mantendo snapshots auditáveis. Não usar o endpoint genérico de exclusão.
- O recálculo não pode enxergar simultaneamente GMV das origens e da consolidada: isso pode mudar a faixa mensal. Processar o conjunto e recalcular os meses/apresentadoras afetados uma vez após a substituição.
- Comparar antes/depois por apresentadora e marca. GMV, tempo e pedidos conhecidos devem ser conservados. Comissão pode revelar diferenças de arredondamento ou de recálculo de valores anteriormente desatualizados: mostrar na prévia e bloquear diferença não explicada; não alterar remuneração silenciosamente.
- Aplicar o bloqueio financeiro também na confirmação, edição, exclusão e reversão. Transação deve coordenar com aprovações e jobs concorrentes, não apenas com outras uniões.

## Persistência e transação propostas

Criar uma nova live consolidada, mantendo as origens como registros históricos absorvidos. Uma relação explícita de união registra tenant, destino, origens, ator, motivo, instante, versão e snapshots necessários à reversão. Nomes e DDL definitivos ficam para a implementação aprovada.

Não usar status `cancelada` para simular absorção: poderia afetar agenda, presença e explicações exibidas. Uma origem absorvida fica fora dos cálculos e é somente leitura; abrir seu ID informa o destino e permite consultar o trecho original com as mesmas permissões.

Endpoints propostos: prévia em `/v1/lives/uniao/preview` e confirmação em `/v1/lives/uniao`, ambos restritos à gestão. Prévia é sem mutação, mesmo se utilizar POST para transmitir IDs. Confirmação recebe IDs, identificador idempotente, versões e motivo; totais vêm exclusivamente do banco.

Sequência atômica:

1. Autenticar e verificar tenant/papel no servidor; validar IDs únicos e limite do lote.
2. Abrir transação explícita. `app.withTenant` sozinho não abre transação.
3. Bloquear origens em ordem determinística, relações e registros financeiros relevantes; coordenar com aprovação e recálculo para evitar corrida.
4. Revalidar versões, elegibilidade, procedência das métricas e situação financeira. Prévia obsoleta retorna conflito, sem alteração.
5. Capturar snapshots, criar destino, gravar totais e rateio, marcar origens absorvidas e resolver relações.
6. Substituir atribuições financeiras ativas e recalcular conforme os helpers existentes; validar conservação.
7. Gravar auditoria e resultado idempotente na mesma transação; commit. Erro em qualquer etapa faz rollback de tudo.

Restrições no banco devem impedir uma origem em duas uniões ativas. Validar referências por tenant e RLS; IDs de outro tenant não podem revelar conteúdo. Idempotência deve comparar o conteúdo da solicitação e rejeitar reutilização da chave para outro conjunto.

## Impactos e pontos obrigatórios de integração

| Área | Tratamento necessário |
| --- | --- |
| Listagem, filtros, paginação, exportação e resumo diário | Contar uma transmissão; excluir absorvidas de itens e total de páginas. Histórico tem acesso separado. |
| Dashboard, analytics, funil, ranking e metas | Aplicar exclusão de origens em todos os leitores; conferir joins de rateio para não duplicar GMV nem perder a segunda apresentadora. |
| Quantidade de lives | No total operacional, N registros viram uma transmissão. Por apresentadora, contar participações na transmissão; a mesma pessoa em dois trechos deixa de ter duas lives, mantendo horas/GMV. Isso muda médias por live e deve estar na prévia. |
| Agenda, grade e assiduidade | Preservar os turnos originais. Cada evento mantém a referência ao trecho; leituras resolvem a transmissão consolidada quando apropriado. Não esticar todos os eventos para seis horas nem criar reserva duplicada. |
| Portal e tag APRESENTADORA | Preservar submissões, revisão e procedência. Mostrar transmissão total separada de “sua participação”, sem exibir o GMV inteiro como individual. |
| Submissões aprovadas | Manter vínculo histórico com a origem e resolver o destino pela união. O índice atual permite só uma submissão por apresentadora/live; repontar tudo diretamente conflitaria quando a mesma pessoa tem dois trechos. |
| Aprovação/vínculo/devolução/arquivamento | Absorvidas não são candidatas operacionais. União não altera status de revisão nem aciona o tombstone de live excluída. |
| Importação TikTok/Ads e reimportação | Identificar se arquivo cobre trecho ou transmissão completa. Não ressuscitar origem, criar duplicata nem substituir seis horas por três. Primeira versão bloqueia alterações/importações em membros e destino de união ativa, com mensagem para desfazer antes; leitura permanece possível. |
| Links, snapshots, produtos, revisões e anexos | Preservar referência original e acesso ao histórico. Inventariar FKs e IDs polimórficos, incluindo `origem_id`; nenhuma exclusão em cascata. |
| Jobs e edições | Recálculo, encerramento automático e qualquer escrita devem respeitar absorção. Bloquear edição/exclusão direta de membros e destino até reversão na primeira versão. |
| Cache frontend | Reutilizar `invalidateOperational` e completar cobertura de resumo diário, financeiro, exportações e detalhes dos IDs envolvidos. Não presumir que o helper atual cobre todos. |

Consultas com `LIMIT 1` sobre apresentadoras existem em analytics; sua semântica precisa ser verificada com fixtures de revezamento. Remover `LIMIT 1` indiscriminadamente pode multiplicar totais. Não ampliar para uma refatoração geral sem evidência.

## Experiência na área Lives

Seleção por checkbox e ação “Unir lives”, restrita à gestão. Seleção identifica registros de forma estável e mostra todos os selecionados, mesmo entre páginas; limpar ao mudar contexto/filtros para evitar união acidental.

Modal mostra sequência de horários, marca/cabine, totais antes/depois, divisão já preenchida e procedência. Incompatibilidades têm mensagens concretas, por exemplo: “Há 5 minutos entre o fim de Ana e o início de Bia”. Mostrar redução da contagem de lives, métricas incompletas e qualquer diferença financeira. Usuário confirma que os números correspondem a cada trecho da mesma transmissão.

Após sucesso, abrir a consolidada com identificação “Unida de N registros” e histórico dos trechos. Não fazer atualização otimista financeira. Em conflito, atualizar prévia e exigir nova confirmação.

## Reversão e liberação

- “Desfazer união” é uma operação transacional auditada: desativa a consolidada, restaura origens e atribuições a partir dos snapshots, verifica totais e invalida caches.
- Reversão só permitida se versões conferem, não há nova aprovação/pagamento/fechamento nem dependências posteriores incompatíveis. Bloquear com explicação; nunca restaurar snapshot por cima de mudanças novas.
- Migração aditiva, listada em `MIGRATIONS_LIST`, sem absorver dados automaticamente. Implementar leitores e bloqueios antes de habilitar escrita, para que o código antigo não conte origens e destino juntos.
- Ativação controlada por unidade após testes. Desligar a ação impede novas uniões, mas leitores compatíveis devem permanecer enquanto houver uniões existentes. Reverter só o frontend ou voltar a uma API que ignora absorção não é rollback seguro.
- Backend Railway tem migrações no predeploy e publicação automática na branch operacional: implementação, migração e publicação precisam de autorização explícita e revisão dos commits efetivamente usados.

## Etapas e verificação

1. Confirmar regras adicionais propostas e reconciliar a base backend com a versão pretendida. Inventariar consumidores de lives, referências e jobs; fechar contrato de métricas incrementais/cumulativas.
2. Implementar funções puras de elegibilidade, consolidação e rateio com testes; definir contrato de prévia e regras de reversão.
3. Implementar modelo aditivo, leitores compatíveis e bloqueios, endpoint transacional e idempotência, mantendo ação desativada.
4. Integrar rateio/comissões, portal, agenda, importações e relatórios; provar conservação dos totais e isolamento de tenant.
5. Implementar seleção, prévia, confirmação e histórico/reversão no frontend.
6. Revisar diff, executar verificações proporcionais e comparar com os critérios de aceite; preparar liberação separada, sujeita a autorização.

Matriz mínima de testes:

- Duas e três lives contíguas, IDs em ordem inversa, marca/cabine/conta diferentes, lacuna de um segundo, sobreposição, início/fim ausentes, duplicidade de ID e união já existente.
- Uma e várias apresentadoras, apresentadora repetida em trechos, zero GMV com horas, legado percentual, rateio planejado/incompleto, arredondamento monetário e de segundos.
- GMV manual misturado com Ads, zero versus null, contadores ausentes, limites numéricos, métricas cumulativas e taxas derivadas.
- Pendentes/devolvidas, comissões aprovadas, virada de dia/mês, publicação incompatível e registros de outro tenant.
- Duplo clique, retry após timeout com commit já ocorrido, duas uniões concorrentes, edição/aprovação/job concorrente e falha injetada após cada etapa de escrita.
- Igualdade dos totais globais e individuais antes/depois, mudança esperada de contagem e médias, histórico preservado e restauração por reversão.
- Fluxo completo navegador: seleção → prévia → confirmação → detalhe/rateio → portal → relatórios → reversão; também cadastro, validação e importação existentes.

Gates da implementação: frontend typecheck, testes e build; backend testes; SQL executado em PostgreSQL/PGlite com dados de revezamento (a suíte mockada não prova a semântica), testes de autorização/RLS e concorrência no ambiente apropriado; smoke local e revisão de rollback. Testes de baseline distinguem problemas preexistentes de regressões.

Não é possível garantir ausência absoluta de falhas por planejamento. A condição de liberação é demonstrar os invariantes, a integração e a reversão acima em ambiente de teste, sem diferenças financeiras não explicadas.
