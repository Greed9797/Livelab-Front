# Correções de desempenho — 05/09/2026

Especificação: auditoria em `/Users/lucas/livelab-audit-2026-09-05/performance/AUDITORIA.md`. Usuário autorizou resolver os problemas identificados.

## Roteamento e risco

- Domínio: React/Vite/React Query e Fastify/Postgres. Complexidade 4 pela integração e semântica SQL.
- Execução: agente principal (gráficos, integração, medidas e revisão), worker Conteúdo, worker Analytics e worker API, com ownership separado.
- Modelos: workers padrão herdados da sessão; revisão independente após implementações. Leitura e medições locais usam ferramentas determinísticas.
- Risco: médio no frontend; alto nos caminhos SQL por datas e isolamento de unidades. Não alterar autenticação/RLS, schema, credenciais, dependências, fórmulas financeiras ou configuração de produção.
- Publicação: preparar código e evidências primeiro. Nenhum deploy faz parte dos testes de desempenho locais.

## Critérios e tarefas

- [x] Grade ativa inicia sem depender da consulta da Agenda legada. Listas antigas de 200 lives só existem se houver consumidor real. Links de reserva/live, resultado, marca inativa e proteção de formulários continuam funcionando.
- [x] Os quatro tipos de gráfico lazy mantêm identidade entre atualizações. Atualizar respostas idênticas preserva seus SVGs; novos dados continuam atualizando.
- [x] Analytics compartilha a consulta diária por recorte. Selecionar marca e Atualizar não duplicam a mesma URL; comparação anterior, filtros e exportações permanecem corretos. Leitura individual de marca preserva frescor.
- [x] Helpers/defaults não importam as abas inteiras. Build comprova chunks de Lives e Vídeos sob demanda e ausência dos avisos correspondentes.
- [x] API: validar filtros de data e agregações com SQL real e dados sintéticos; aplicar reduções de trabalho sem alterar resultados. Examinar planos de consulta antes/depois.
- [x] Grade API: reduzir a espera das leituras usando a mesma conexão, com validação de tenant e medição controlada; não remover a configuração segura da sessão. A solução consolidou queries, sem mudar concorrência/pool.
- [x] Revisar diffs, executar typecheck/testes/build, repetir navegador desktop/celular e comparar métricas ao baseline.

## Anticritérios

Não otimizar rota sem consumidor conhecido, alterar a Agenda legada por suposição, cachear controles de foco sem gargalo medido, aumentar cache global ou remover validações. Não interpretar timing sintético como p75 real de produção. Não criar índices nem alterar topologia/pool sem evidência e aprovação específica.

## Validação e reversão

Comparar mesma fixture e mesma configuração de build. Manter o baseline original e salvar resultados da correção separadamente. Testar datas de São Paulo, NULL/zero, paginação, divisão entre apresentadoras e tenant nas consultas tocadas. Revisão independente para os limites API/SQL e integração frontend.

Alterações isoláveis por arquivos/commits lógicos; sem migração. Reverter o código correspondente restaura o comportamento anterior. Nenhuma operação sobre dados reais é necessária para esta rodada.

## Resultado validado

- Grade: 8 → 6 chamadas no navegador; API de acompanhamento: 5 → 4 consultas na mesma conexão.
- Analytics: consulta diária filtrada 2 → 1; gráficos recriados ao Atualizar 4 → 0. Atualizar também refaz a leitura individual da marca selecionada.
- Chunk principal de Conteúdo: 181.738 → 108.468 bytes minificados (aproximadamente 40% menor), com Lives e Vídeos em chunks separados.
- SQL sintético com 100 mil lives: mesmos 25 resultados; descarte de linhas extras no filtro temporal 7.555 → 0 pelo uso do intervalo no índice existente.
- Typecheck, lint de hooks, build, 438 testes frontend, 874 testes backend (7 ignorados) e 34 cenários Playwright aprovados.
- Revisão cruzada frontend e revisão independente SQL concluídas; achados corrigidos antes da entrega. Evidências em `/Users/lucas/livelab-audit-2026-09-05/performance-fixes/`.

Medições locais demonstram redução de trabalho e preservação funcional. Não são p75 de produção nem promessa de ganho equivalente em toda rede/dispositivo. Nenhuma publicação ocorreu nesta execução.
