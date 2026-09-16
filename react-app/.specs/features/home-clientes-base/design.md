# Home, Clientes e Base Design

**Status:** proposta para execução posterior com Luna.
**Spec:** .specs/features/home-clientes-base/spec.md
**Verificação do estado:** frontend bd0f920, backend 17cbf330; worktree frontend com .fastcontext/ e .playwright-cli/ não versionados preservados; backend limpo. Produção publicada nesta sessão, frontend versão 1789530994751, backend /health 17cbf330. Revalidar antes de executar.

## Architecture Overview

Reutilizar o produto atual. Home precisa de mudanças pequenas de apresentação. Contratos exigem uma fonte temporal compartilhada entre leitores e escritores financeiros. A Base aproveita artigos/categorias e ganha autoria local, editor e isolamento por unidade.

Alternativas avaliadas:
1. **Recomendada:** evoluir os módulos existentes; histórico financeiro próprio e editor Markdown incorporado. Mantém um login, um deploy frontend e o backend atual.
2. Biblioteca própria com MDXEditor visual: mesma arquitetura, experiência mais próxima de documento; medir custo do bundle e desabilitar plugins JSX.
3. BookStack separado: produto completo, mas introduz PHP/MySQL, operação própria e integração de identidade. Desproporcional ao pedido compacto.

Esta recomendação é uma decisão proposta no plano; nenhuma dependência foi instalada.

## Pesquisa open source

Fontes primárias consultadas em 2026-09-16:

| Opção | Evidência | Adequação |
| --- | --- | --- |
| react-md-editor | React/TypeScript, licença MIT, editor baseado em textarea com prévia; variante nohighlight documentada | Recomendado para a primeira versão; toolbar simples em português e preview com sanitização existente |
| MDXEditor | React, licença MIT, edição visual de Markdown com plugins | Alternativa se a experiência de Markdown não atender; não habilitar execução de JSX |
| BookStack | Biblioteca/wiki completa; MIT; instalação requer PHP e MySQL/MariaDB | Referência de organização em coleções e materiais; não implantar outro serviço nesta entrega |

- https://github.com/uiwjs/react-md-editor
- https://github.com/mdx-editor/editor
- https://mdxeditor.dev/editor/docs/overview
- https://www.bookstackapp.com/
- https://www.bookstackapp.com/docs/admin/installation/

Não foram medidos tamanhos reais de bundle, compatibilidade com React 19 nem vulnerabilidades das opções nesta etapa. A tarefa do editor fará um spike local, fixará versão, manterá licença e rodará auditoria. Preferir nohighlight e carregamento dinâmico somente no modo de edição. A documentação do react-md-editor exige sanitização de conteúdo não confiável; preview e leitura precisam compartilhar a política já existente. Não substituir o leitor leve por todo o editor.

## Code Reuse Analysis

| Componente | Evidência | Reuso |
| --- | --- | --- |
| PresenterLeaderboard | front src/pages/DashboardPage.tsx:245 e src/components/dashboard/PresenterLeaderboard.tsx:107 | Alterar limite de 3 para 5 na Home; não modificar regra de ranking |
| Ranking da Home | back src/routes/home.js:493,650 | API já solicita até 10; não aumentar consultas |
| Assiduidade | back src/routes/analytics.js:2918 e front src/components/dashboard/AssiduidadeStrip.tsx:232 | Consumir resumo.horas_total; preservar presença física e classificação |
| Edição comercial | front src/pages/ComercialPage.tsx:798,530 | Lápis abre a edição existente; separar cadastro e condição financeira |
| Vigência de salário | back migrations/137_apresentadora_fixo_historico.sql | Referência de temporalidade e testes; não reutilizar tabela de apresentadoras para marcas |
| Trava financeira | back src/lib/live-finance-lock.js:1 | Contratos, recálculo, união/reversão e faturamento coordenados na mesma ordem |
| Artigos e categorias | back src/routes/knowledge.js:1,68 e migrations/063_knowledge_base_expansion.sql | CRUD/status já existem, mas são globais e master-only |
| Leitor da Base | front src/services/knowledge.ts:18 | Markdown e DOMPurify instalados; preservar leitor |
| Acesso Base | front src/utils/access.ts:227 e src/routes/AppRouter.tsx:148 | Alinhar menu, rota e API; hoje há divergência entre perfis |
| Storage | back src/routes/knowledge.js:95 | Reusar integração, mas não o bucket público de capas para PDFs privados |

## Home

- Manter as três primeiras posições com destaque e exibir 4ª/5ª como linhas normais. Legenda Top 5 do mês e link para ranking completo.
- Mover o bloco Agenda de hoje do início ao fim do DOM. Continua na data de hoje, ainda que os indicadores mostrem mês passado.
- Abaixo do nome da apresentadora: “32h30 registradas no período”. Mês e data final ficam no cabeçalho. O valor vem de resumo.horas_total e formato existente; ausência vira “Horas indisponíveis”.
- Não calcular horas usando comissões, percentual de GMV ou calendário de agenda. A API atual considera somente lives encerradas; informar isso no texto de apoio, sem promessa de tempo ao vivo.
- Verificação necessária: o CTE horas_por_dia em analytics.js:2837 filtra status encerrada, mas não usa activeLiveSql, embora o CTE historico use. Isso pode contar origem absorvida e consolidada. Confirmar com fixture de união/reversão e corrigir o leitor compartilhado antes de mostrar total. É um achado por leitura, ainda sem reprodução nesta etapa.
- Manter as regras de hoje não virar falta e dias fora do vínculo não virarem falta. Não converter zero GMV em zero presença.

## Clientes: edição e alertas

Lápis acessível na coluna de ações, com tooltip “Editar [nome]”. Mantém Detalhes. Ambos obedecem a permissões; linha agrupada abre escolha explícita.

Modal divide:
1. Cadastro: nome, contato, identidade visual e vínculo.
2. Condições comerciais: resumo vigente, próximas alterações e histórico.
3. Ação “Nova condição” abre formulário temporal, com comparação antes/depois e competência inicial.

Salvar cadastro não envia taxa, fixo ou tipo de cobrança. Hoje ComercialPage.tsx:571 envia todos os valores atuais ao editar um cliente; isso deve ser removido dessa ação. Cliente e marca têm identidades distintas; sempre resolver marca principal explicitamente, sem propagar negociação para todas as marcas do cliente por suposição.

Pendências produzidas por uma regra única do backend, consumida pela lista e editor:
- Fixo não informado; comissão não informada; sem marca vinculada; condição a revisar.
- Zero explicitamente configurado = Sem fixo/Sem comissão.
- Zero legado com origem ambígua = A revisar, sem afirmar falta ou cobrança.
- Campo que não se aplica ao tipo de entidade não gera alerta.
- Salvar contato não confirma uma negociação por acidente.

## Contratos: modelo temporal

Nome sugerido: marca_condicoes_comerciais. DDL final só na implementação.

Campos: id, tenant_id, marca_id, inicio_vigencia (DATE, primeiro dia do mês), fixo_mensal, comissao_franquia_pct, comissao_franqueadora_pct, tipo_cobranca, fixo_confirmado, comissao_confirmada, origem, motivo, created_by, created_at, revision, cancelled_at. Datas de término de cada versão podem ser derivadas da próxima vigência; períodos são [início, próximo início), evitando manutenção redundante de fim.

- UNIQUE para tenant + marca + início ativo; FK composta para impedir marca de outro tenant; RLS e índices por tenant/marca/data.
- Versões financeiras auditáveis, sem DELETE comum de histórico. Alterações de versão futura sem movimentos ainda exigem revisão esperada; versões já usadas não são sobrescritas silenciosamente.
- Regras inicialmente mensais. Datas atuais de contratação/desligamento continuam a limitar o rateio; não reinterpretá-las como negociação.
- Resolver por data de início da live em São Paulo, data de atribuição do vídeo e competência do fixo; a mesma escolha deve alimentar prévia, persistência, leitura e recálculo.
- Registrar condição_id quando gravar novos snapshots financeiros para rastreabilidade. Metadados antigos permanecem explicitamente legados.
- Implantação deve fotografar valores atuais como baseline técnico, com origem legada não verificada, sem inventar a data do acordo e sem recalcular o passado. Datas anteriores à primeira versão usam esse baseline, nunca os campos mutáveis de marcas depois da adoção temporal.
- Se o cadastro atual já perdeu o acordo de agosto, ele precisa ser informado por quem conhece o contrato. Nenhuma inferência automática a partir do valor atual.
- Compatibilidade: campos atuais de marcas podem continuar como projeção da versão vigente para leitores legados. A fonte canônica é temporal; agendamento futuro não pode alterar a projeção atual prematuramente. Todos os consumidores financeiros conhecidos devem migrar antes de habilitar escrita.
- Edição direta de campos financeiros no PATCH legado deve encaminhar para o serviço temporal com competência explícita, ou retornar 409 com orientação; não permitir bypass, inclusive por importação/automação e client-brand.

### Composição mensal

Fixo proporcional à vigência do vínculo, mantendo a regra de mês com atividade atual. Comissão usa as vendas atribuídas à competência. Aplicar tipo de cobrança dentro de cada mês e somar meses.

Fixture sintética (não são valores da Haag): agosto fixo R$ 1.000 + 5% sobre GMV R$ 10.000 = R$ 1.500. Setembro fixo R$ 1.200 + 8% sobre GMV R$ 10.000 = R$ 2.000. Consulta agosto–setembro = R$ 3.500, independentemente da data de execução. Para “fixo ou comissão”, resultado = R$ 1.000 + R$ 1.200 = R$ 2.200.

O DRE atual agrupa por marca no intervalo inteiro e seu normalizador rejeita critérios vencedores conflitantes. Evoluir o payload de forma aditiva para parcelas por competência e memória de cada versão; manter totais antigos compatíveis. O frontend soma receita reconhecida das parcelas e detalha por mês, sem escolher um vencedor global para meses de condições distintas.

### Endpoints propostos

- GET /v1/marcas/:id/condicoes: histórico, vigente e futuras, com leitura autorizada.
- POST /v1/marcas/:id/condicoes/preview: leitura sem escrita, avalia versão proposta, movimentos abertos/fechados, antes/depois e dependências.
- POST /v1/marcas/:id/condicoes: confirmação com revisão esperada e Idempotency-Key; refaz validações no servidor.

Transação: BEGIN → lockTenantLiveFinance → bloqueio da marca e revisões → revalidar fechamento/preview → inserir condição → recalcular apenas movimentos abertos afetados na mesma operação atômica → verificar conservação de atribuição de apresentadoras → auditar → COMMIT. Falha implica rollback completo. Não usar job não idempotente para um recálculo parcial invisível.

Uma mudança futura não recalcula vendas anteriores. Uma mudança retroativa exige prévia e confirmação; qualquer competência com cobrança/fechamento protegido é rejeitada na primeira versão, sem ajustes automáticos em boletos. A autorização de deploy não é autorização para cadastrar os valores reais da Haag.

### Inventário financeiro obrigatório

- src/routes/marcas.js: criação, PATCH e import/upsert.
- src/services/client-brand.js e src/lib/marca-sql.js: criação/resolução da marca.
- src/services/commission-engine.js, src/routes/vendas_atribuidas.js: taxas de franquia/franqueadora, vídeos e reprocessamento.
- src/routes/lives.js, portal-apresentadora-aprovacao.js, importações: escritores indiretos e snapshots.
- src/lib/performance-rollups.js e src/routes/financeiro.js: agregados, fixos e relatórios por período.
- src/jobs/billing_engine.js: consome comissão persistida e trava financeira.
- src/services/reports.js, src/routes/relatorios.js, src/routes/cliente_insights.js: leitores de snapshot/contrato e PDF/CSV.
- src/services/live-merge.js: união e reversão devem preservar versões atribuídas e locks.
- src/routes/contratos.js e contratos_auditoria.js: contrato formal não é a mesma entidade que condição da marca; não duplicar valores desconectados. Qualquer leitor de contrato.valor_fixo/comissao_pct precisa de fonte/procedência explícita.

T5 entrega inventário final com cada consumidor classificado: adaptar à resolução temporal, preservar snapshot imutável ou sem relevância financeira. Nenhum “grep limpo” isolado substitui testes de integração.

## Base: biblioteca compacta

UI: “Base da unidade”, busca, categorias/coleções, filtro Todos/Playbooks/Estudos/Vídeos/Documentos, cards compactos com título, tipo, resumo e data. Clique abre leitura; voltar preserva filtros. Sem visualização de progresso. Gestão vê Novo material e lápis; leitor só consulta. Rascunhos/arquivados em área da gestão.

Persistência recomendada: aproveitar manuais/knowledge_categories adicionando escopo explícito e tenant_id. Linhas antigas continuam globais, administradas pelo master. Materiais locais são filtrados no servidor e protegidos por RLS; categoria global pode classificar material local, mas material global não aponta categoria de uma unidade.

Atualizar TODOS os acessos: knowledge (incluindo search/reorder/upload), manuais legado, detail por slug/id, status actions e anexos. A API antiga usa app.db e pressupõe dados globais; só adicionar tenant_id à tabela causa vazamento. Não ativar criação local até fechar todos os leitores.

- Gestão local = franqueado e aliases administrativos existentes; master com escopo validado. Leitura somente por equipe interna e apresentadoras, conforme confirmação do usuário. Clientes/parceiros e automações são rejeitados por API, guard, busca e download, inclusive para materiais globais da rede.
- Tenant vem do contexto autenticado; troca de unidade do master deve respeitar allowedTenantIds. Cache deve incluir tenant e limpar conteúdo ao trocar contexto.
- Texto persistido como Markdown, editor visual simples com toolbar, preview sanitizado e proteção contra sair sem salvar.
- Categoria, título, tipo, resumo, texto, tags e opcional PDF/vídeo/link. Status e revisão na resposta. Publicar exige ao menos um conteúdo utilizável, não apenas título.
- Criar material tem chave idempotente; patch usa revision esperada; falha mantém o texto em memória.
- Arquivar é preferível a apagar; categoria usada é arquivada, materiais não desaparecem por cascata.
- Anexos: tabela de metadados por tenant/material; armazenamento privado, nomes opacos e link temporário após autorização. Não usar URL pública do upload-cover existente para documento privado.
- PDF é documento anexado; vídeo é URL suportada aberta externamente ou embed seguro criado a partir de ID validado; nunca aceitar iframe/JS fornecido pelo autor.
- Sem download server-side de URLs arbitrárias: evita SSRF.
- Capas opcionais; documentos sem capa mantêm layout. Validar bytes/MIME e limite durante o streaming, não depois de buffer ilimitado.
- Upload bem-sucedido só vira anexo quando vinculado; falha ao vincular permite retry sem duplicação e limpeza segura de órfãos próprios.
- Buscar/paginar no backend, 24 itens por página e teto 100, mantendo compatibilidade documentada do endpoint antigo. Não carregar todos os corpos Markdown na listagem.

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| --- | --- | --- | --- |
| Presença pode duplicar origens unidas | analytics.js:2837 | Horas incorretas na Home | Fixture SQL real + activeLiveSql e regressão de reversão |
| Valor atual altera passado | marcas.js:450; commission-engine.js:46 | Comissões e relatórios inconsistentes | Resolver temporal comum e snapshots protegidos |
| DRE agrega mês diferente como condição única | financeiro.js:548; operational-dre.ts:155 | Erro em fixo_ou_comissao e intervalo | Parcelas por competência, compatibilidade e teste de soma |
| Cliente salva marca em segunda requisição | ComercialPage.tsx:571 | Salvar contato pode sobrescrever contrato | Separar operações cadastrais e temporais |
| Biblioteca global por design | knowledge.js:3; manuais.js:3 | Vazamento de conteúdo de unidade | Escopo/RLS e revisão de todas as rotas antes de criar conteúdo local |
| Storage atual usa URL pública | knowledge.js:143 | Documento privado exposto por link | Bucket privado e autorização no download |
| Defaults financeiros são zero | marcas.js:288 | Alerta falso em negociação gratuita | Confirmação explícita e estado legado A revisar |
| Forma real dos dados de produção não inspecionada | Sem consulta autenticada/DB nesta etapa | Histórico/bucket/configuração podem divergir | Preflight com dados agregados, sem segredos; não inferir base real |

## Deployment and Rollback

Autorização de publicação concedida pelo usuário em 2026-09-16 para o escopo concluído e verificado. Esta etapa é apenas planejamento. Não requerer nova autorização genérica para o mesmo deploy ao executar, mas não usar essa autorização para cobranças, dados de teste financeiros ou redefinir permissões além do plano.

1. Revalidar git, instruções e produção. Numerar migrations a partir do próximo livre; 150 já existe, não reservar número por suposição.
2. Migrações aditivas, no runner obrigatório, com dry run SQL real e verificação de compatibilidade com o servidor anterior. Confirmar recuperação/backup antes de escrita estrutural em produção.
3. Backend compatível primeiro. Feature de vigências permanece desativada até todos os leitores serem compatíveis. Biblioteca local permanece sem criação até todas as rotas legadas aplicarem escopo.
4. Verificar capacidade de storage privado. Se não houver, registrar bloqueio de anexos e resolver antes de declarar BASE-03/09 pronta.
5. Frontend com build na nuvem Vercel, sem --prebuilt, artefato apenas versionado. Push Railway dispara deploy/migrações, tratar como publicação.
6. Smoke: health/readyz, SHA, version.json, login, Base conforme papéis, fluxo em fixture local e consultas reais somente leitura se houver sessão autorizada.
7. Rollback do frontend é possível preservando API compatível; desabilitar novas alterações temporais se necessário. Depois de existirem condições locais/históricas, NÃO voltar a backend que ignore vigência ou filtre Base como global. DDL aditiva não é desfeita por rollback de aplicação.
