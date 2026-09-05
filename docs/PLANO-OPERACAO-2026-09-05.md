# Operação e usabilidade — rodada após auditoria

## Roteamento

Produto operacional / React / API analítica; complexidade 4; risco alto de interpretação de datas, participação e pendências. Implementação por três workers de tier padrão (Analytics, Grade, Lives) em caminhos separados; integração e UI compartilhada pelo agente principal; revisão independente antes da entrega. Sem alteração de financeiro, autenticação, permissões, schema ou remuneração. Publicação não faz parte desta execução até os checks e revisão estarem concluídos.

## Aceitação

1. Analytics usa limites de dias em São Paulo independentes do fuso da sessão PostgreSQL. Testes reais de SQL cobrem virada de dia e mês.
2. A Grade permite acompanhar programação, reservas e lives do dia por cabine, com fontes e vínculos claros, sem deduzir falta ou ociosidade de dados incompletos.
3. Lives oferece pendências classificadas, motivo e ação contextual. Zero não equivale a ausente; possíveis duplicatas não são acusadas como confirmadas. Links preservam período e filtros.
4. Comparativos existentes explicam horas versus GMV/h, base/intervalo de comparação e cobertura, com acesso aos registros relevantes.
5. Formulários de live, agendamento e marca/cliente preservam alterações ao tentar sair, mantêm terminologia consistente e campos identificáveis. Fechar durante gravação não descarta o fluxo.
6. Componentes compartilhados mantêm foco, contraste, estados de carregamento/erro/vazio e adaptação móvel. Navegação continua respeitando os mesmos papéis e mantém os acessos existentes.

## Anticritérios

- Não alterar regras financeiras, de presença, comissões, metas, coortes ou banco.
- Não excluir abas ou registros com base em suposição de desuso.
- Não confirmar cancelamento, falta ou duplicidade por inferência fraca.
- Não adicionar bibliotecas, modais ou painéis redundantes para capacidades existentes.
- Não enviar mensagens, gravar registros de produção ou publicar durante testes.

## Plano

1. Implementar e testar Analytics, Grade e pendências em paralelo.
2. Melhorar proteção de formulários, nomes e acessibilidade usando os componentes existentes.
3. Integrar os links entre telas e revisar o diff contra a aceitação.
4. Executar suites completas, typecheck, build, SQL local real e testes de navegador com dados sintéticos; inspecionar capturas desktop/móvel e temas.
5. Corrigir achados da revisão independente e registrar entrega/limites.

## Reversão

Mudanças apenas em código, aditivas onde possível, sem migração. Reverter os commits desta rodada (quando criados) restaura o comportamento anterior; não há alteração de dados a desfazer. Endpoints novos de leitura não devem ser necessários às telas antigas. Acompanhamento deve informar indisponibilidade quando a API ainda não tiver sido atualizada.

## Entrega e validação

Os seis critérios foram implementados e verificados em 05/09/2026. Front: 428 testes aprovados, typecheck, hooks e build. Back: 871 aprovados/7 ignorados. Navegador: 32 cenários aprovados em desktop/celular; verificação específica da indicação dos filtros da Grade também aprovada. SQL local PGlite verificou datas e isolamento/paginação. Revisão independente gerou correções para estados conservadores, associações de marca e navegação com alterações/gravações pendentes.

[Relatório e limites da entrega](/Users/lucas/livelab-audit-2026-09-05/rodada-7-operacao/ENTREGA.md). Capturas locais na mesma pasta. Nenhuma publicação ou alteração de dados reais nesta execução. Os arquivos `.fastcontext/` e o plano pré-existente do backend foram preservados.
