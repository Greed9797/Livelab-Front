# Carteira, Home, disponibilidade e identidade financeira

Implementação local sobre frontend `7e49046` e backend `7984930`. Esta rodada ainda não foi publicada.

## Carteira de clientes

- Removidos os indicadores do topo e as colunas de GMV/lives do mês. A lista prioriza identidade, status, acesso, contato e ações.
- Ativos é a visão padrão. Inadimplência continua como pendência financeira de um cliente operacional, sem ser confundida com desativação. Todos e Inativos mantêm acesso aos cancelados, marcas inativas e arquivados; registros desativados ficam no fim em Todos, com texto secundário legível e status explícito.
- Arquivados e marcas inativas só são consultados ao abrir a visão correspondente ou um link por nome que exige o catálogo completo. Busca e exportação seguem a visão escolhida.
- Filtros e ações permanecem disponíveis durante carga/erro. Contagens não são apresentadas como atuais nesse estado. Inativos vazio orienta voltar aos ativos.
- Os links por nome consultam o catálogo completo antes de decidir. Homônimos ativos/arquivados abrem o seletor existente, e falhas de carga não apagam o parâmetro. A identificação dos registros segue os IDs cadastrados.

## Home

A faixa de operação aparece somente quando há live em andamento com ID válido, preservando o atalho para acompanhar. Há um único botão principal de agenda; foram retirados o aviso vazio e os botões repetidos. Pendências, métricas e agenda carregada continuam preservadas.

## Agenda atual

O painel abaixo da Grade mostra marcas ativas sem horário e apresentadoras ativas com menos de dois horários no dia selecionado. As contagens 0/2 e 1/2 usam os horários da operação; duas cabines no mesmo horário não viram dois horários para a mesma pessoa.

A fonte combina a Grade completa (padrão/exceções) com uma consulta de reservas do dia. Filtros visuais não alteram a disponibilidade. Reservas e revezamentos são projetados nos slots, inclusive sem célula-base; turnos respeitam o evento e o dia, e uma reserva parcial preserva o restante do planejamento. Na semana/mês, um seletor mantém a leitura diária.

O painel não conclui quem está livre com catálogo/Grade/reservas em falha, dados anteriores de outro período, dia ausente ou resposta de reservas no limite de 500. Uma lista confirmada sem cadastro ativo usa mensagem própria. A informação descreve a escala cadastrada, não um compromisso de disponibilidade pessoal.

## Financeiro por cliente

A consulta antiga agrupava lives apenas pela marca quando `lives.cliente_id` estava vazio, mesmo com a marca vinculada a um cliente. Outras lives eram agrupadas pelo cliente, criando duas linhas visualmente iguais. A correção resolve o cliente pelo vínculo cadastrado da marca somente quando falta o cliente explícito, antes de agregar.

Não há união por nome nem mudança nos cálculos de GMV/comissão, períodos ou status financeiros. O novo join é por ID e tenant e mantém uma linha por live. Marcas sem cliente e homônimos permanecem separados. A API informa a identidade da linha, e o frontend usa essa identidade para abrir o detalhe correto. O detalhe inclui o legado por marca sem contar novamente vendas já atribuídas.

**Limite preservado:** o detalhe operacional usa também `vendas_atribuidas`; o faturamento agrupa as próprias lives. Em um cadastro historicamente conflitante, com cliente explícito diferente do cliente da venda atribuída, essas fontes já podem divergir. O reparo preserva a atribuição existente; reconciliar tais conflitos seria outra decisão de negócio, não uma deduplicação por nome.

## Verificação e reversão

- Build Vite, lint de hooks e TypeScript aprovados; 459 testes frontend aprovados.
- Backend: 876 testes aprovados, 7 testes já marcados como ignorados. Sintaxe e diff sem erros.
- Execução real do handler Fastify e detalhe operacional em PGlite, com fixtures e asserts: legado, vendas atribuídas, nomes iguais, vínculo explícito, afiliada, marca inativa, entidade sem marca e isolamento de tenant. Revisão independente repetiu a verificação SQL.
- Testes no navegador com dados sintéticos, chamadas interceptadas e sem gravações externas; resultado consolidado em `browser-verification.json` na pasta de evidências.
- Revisões independentes de frontend e backend encerradas sem bloqueios. Falhas encontradas na reconciliação de horários e nos links de inativos foram corrigidas antes da entrega.

Evidências: `/Users/lucas/livelab-audit-2026-09-05/operational-followup/`. Nenhuma dependência, migração, credencial, regra de cobrança ou dado de produção foi alterado. Reversão por revert dos commits desta rodada; a publicação deve incluir API e frontend, com autorização específica e verificação em produção.
