# Portal do cliente por marca

## Problem Statement

O cliente precisa acessar resultados revisados exclusivamente da própria marca contratante. O portal atual inclui lives sem revisão e dados de apresentadoras. Plano aprovado pelo usuário em 21/10/2026. Implementação local autorizada; publicação e criação de contas reais não autorizadas.

Routing: domínio backend/frontend e autorização; complexidade 4/5; risco alto de exposição entre clientes; execução root com trabalhadores de dados e UI; modelo herdado da sessão; revisão independente obrigatória antes de entrega.

## Out of Scope

Financeiro, ranking, afiliadas, agenda, acompanhamento ao vivo, exportações, dados de apresentadoras, cadastro público, migrations, novas dependências, novos serviços, push, deploy e banco de produção.

## Assumptions & Open Questions

| Decision | Chosen default | Rationale |
| --- | --- | --- |
| Contas | Um login por marca contratante | Escolha explícita do usuário; usar vínculo existente |
| Entrada | Mesmo domínio e login existente | Escolha explícita do usuário |
| Revisão | Encerrada com status revisado ou publicado | Liberação após revisão aprovada, sem segunda aprovação |
| Dados incompletos | null e Não informado; zero real preservado | Não inventar métricas |
| Histórico | Página de 50; offset validado; resumo de todo período | Plano aprovado |
| Datas | America/Sao_Paulo; seis meses até o mês escolhido | Plano aprovado |
| Erros de vínculo | 403, sem fallback | Isolamento falha fechado |
| Alterações em testes legados | Atualizar contratos incompatíveis com este plano, mantendo cenários e asserts explícitos | A mudança de regra foi aprovada pelo usuário |

Open questions: None. Publicação e identificação da marca piloto ficam pendentes de autorização futura, fora da implementação.

## User Stories

### Marca acompanha resultados

Acceptance Criteria:
- WHEN uma conta cliente consulta o portal, o sistema SHALL resolver usuário e tenant em um único cliente e uma única marca contratante, negando com 403 vínculos ausentes ou ambíguos. [PORTAL-1]
- WHEN resultados são consultados, o sistema SHALL filtrar simultaneamente tenant, cliente e marca vinculados, sem confiar em IDs enviados pelo navegador. [PORTAL-2]
- WHEN uma live é elegível, o sistema SHALL exigir encerrada, revisado ou publicado, não arquivada, não absorvida e sem união desfeita; usar o mesmo filtro em todas as consultas. [PORTAL-3]
- WHEN uma resposta do cliente é produzida, o sistema SHALL retornar somente DTO permitido, sem nomes, IDs, fotos, comissões, rateios, textos internos ou financeiro de apresentadoras e sem informações de outra marca. [PORTAL-4]
- WHEN o cliente tenta uma rota fora do escopo, o sistema SHALL negar com 403 antes do handler, preservando login, refresh, logout e recuperação/troca da própria senha; sessões inválidas permanecem negadas. [PORTAL-5]
- WHEN o histórico é paginado, o sistema SHALL retornar no máximo 50 itens, total e resumo do período inteiro, com ordem estável e datas de São Paulo. [PORTAL-6]
- WHEN dados são incompletos, o sistema SHALL preservar null e zero real, não imputar 24 horas nem calcular razões sem denominador válido; período vazio retorna totais zero. [PORTAL-7]
- WHEN a conta troca, o sistema SHALL isolar caches por usuário e tenant e limpar a sessão anterior, com respostas privadas no-store incluindo erros. [PORTAL-8]
- WHEN o cliente navega, a interface SHALL oferecer apenas Resultados, Lives e Minha conta, funcionar em largura móvel, distinguir vazio de erro e permitir trocar a própria senha. [PORTAL-9]
- WHEN as consultas e permissões são validadas, a suíte SHALL provar isolamento com duas marcas no mesmo tenant e uma em outro tenant em SQL real PGlite e mocks, e passar pelos gates completos e revisão independente. [PORTAL-10]

## Requirement Traceability

| ID | Requirement | Status |
| --- | --- | --- |
| PORTAL-1 | Identidade inequívoca | implementing |
| PORTAL-2 | Tenant, cliente e marca | implementing |
| PORTAL-3 | Apenas revisadas elegíveis | implementing |
| PORTAL-4 | DTO sem dados internos | implementing |
| PORTAL-5 | Restrição central de rotas | implementing |
| PORTAL-6 | Paginação e totais completos | implementing |
| PORTAL-7 | Métricas sem dados inventados | implementing |
| PORTAL-8 | Cache por conta e no-store | implementing |
| PORTAL-9 | Portal e conta em mobile | implementing |
| PORTAL-10 | SQL real, testes e revisão | implementing |
