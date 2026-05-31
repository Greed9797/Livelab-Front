# Route Contract - React x Railway API

Fonte da API: `VITE_API_URL` deve apontar para a API Railway com prefixo `/v1`, por exemplo `https://liveshop-saas-api-production.up.railway.app/v1`.

Antes do E2E real, validar no Railway:

- `CORS_ORIGIN` contém o domínio Vercel atual e `https://app.grupolivelab.com.br`.
- Migrations pendentes foram aplicadas no banco usado pelo Railway.
- Existem usuários de teste por papel para login E2E.

| Rota React | Roles permitidas | Endpoints usados | Payloads principais | Status |
| --- | --- | --- | --- | --- |
| `/login` | público | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` | `{ email, senha }`, `{ refresh_token }` | done |
| `/esqueci-senha` | público | `POST /auth/esqueci-senha` | `{ email }` | done |
| `/onboarding` | `cliente_parceiro` pendente | `POST /onboarding` | JSON com dados comerciais, TikTok, meta e canais | partial |
| `/` | internos | `GET /home/dashboard` | `periodo` quando aplicável | done |
| `/master` | master/admin/regional | `GET /master/dashboard` | `periodo=YYYY-MM` | done |
| `/master/unidades` | master/admin/regional | `GET /master/unidades` | `periodo`, `status` | done |
| `/master/consolidado` | master/admin/regional | `GET /master/consolidado` | `periodo`, `status` | done |
| `/master/franqueados` | `franqueador_master` | `GET /master/unidades` | `periodo`, `status` | done |
| `/master/crm` | master/comercial | `GET /crm/summary`, `GET/POST/PATCH/DELETE /leads`, `POST /leads/:id/contato`, `POST /leads/:id/tarefa` | lead manual, etapa CRM, contato e tarefa | done |
| `/leads` | master/comercial | redireciona para `/master/crm` | nenhum | done |
| `/cliente` | `cliente_parceiro` completo | `GET /cliente/dashboard` | `mes`, `ano` | done |
| `/cliente/lives` | `cliente_parceiro` completo | `GET /cliente/lives` | `mes`, `ano` | done |
| `/cliente/agenda` | `cliente_parceiro` completo | `GET /cliente/agenda`, `GET /cliente/reservas`, `POST /cliente/solicitacao` | `{ cabine_id, data_solicitada, hora_inicio, hora_fim, observacoes }` | done |
| `/cliente/configuracoes` | `cliente_parceiro` completo | `GET /cliente/perfil`, `POST /cliente/perfil/tiktok`, `GET/PATCH /cliente/meta`, `PATCH /auth/senha` | `{ tiktok_username }`, `{ ano, mes, meta_gmv }`, `{ senha_atual, nova_senha }` | done |
| `/cabines` | operação/cabines | `GET/POST/PATCH /cabines`, `PATCH /cabines/:id/liberar`, `PATCH /cabines/:id/reservar`, `PATCH /cabines/:id/status`, `GET /cabines/:id/historico`, `GET /cabines/:id/live-atual`, `PATCH /lives/:id/encerrar`, `GET /contratos` | cabine, contrato de reserva, status, encerramento | partial |
| `/agendamentos` | operação/cabines | redireciona para `/solicitacoes` | nenhum | done |
| `/solicitacoes` | operação | `GET/POST /solicitacoes`, `PATCH /solicitacoes/:id/aprovar`, `PATCH /solicitacoes/:id/recusar`, `GET /clientes`, `GET /cabines`, `GET /apresentadoras` | agendamento direto e motivo de recusa | done |
| `/apresentadoras` | operação | `GET/POST/PATCH/DELETE /apresentadoras` | perfil operacional, remuneração e status ativo | done |
| `/analytics-dashboard` | financeiro/comercial | `GET /analytics/dashboard` | filtros de período | done |
| `/financeiro` | financeiro | `GET /financeiro/resumo`, `GET /financeiro/fluxo-caixa`, `GET /financeiro/faturamento`, `GET/POST/DELETE /financeiro/custos`, `GET /boletos` | custo mensal e boletos | done |
| `/configuracoes` | franqueador/franqueado | `GET/PATCH /configuracoes` | dados da unidade | done |
| `/boletos` | financeiro/cliente | `GET /boletos`, `GET /boletos/alertas`, `GET /boletos/:id`, `PATCH /boletos/:id/visto`, `PATCH /boletos/:id/pagar` | detalhe, alerta visto, pagamento manual por papel financeiro | done |
| `/conhecimento` | roles autenticadas | `GET /knowledge/categories`, `GET /knowledge/articles` | filtros de categoria | partial |

## Pendencias objetivas

- Onboarding: upload de logo segue pendente ate o backend expor endpoint multipart proprio do onboarding.
- Cabines: reserva operacional depende de contrato ativo; a tela usa `/contratos` e envia `contrato_id`, mas E2E precisa de massa real.
- Knowledge Base: leitura esta migrada; CRUD admin deve ser implementado se a base passar a ser gerenciada pelo painel.
- E2E real contra Railway depende de credenciais de teste por papel e banco com migrations aplicadas.
