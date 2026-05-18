# Chamadas de API — Frontend

> Auditoria gerada em: 2026-05-18
> Branch: `stabilization/core-restructure`
> Fontes: `src/services/domain.ts`, `src/services/api.ts`, `src/services/auth.ts`, `src/services/onboarding.ts`

---

## Infraestrutura de API

**Arquivo base**: `src/services/api.ts`
- Cliente HTTP: `axios` com baseURL de `VITE_API_URL` (padrão: `http://127.0.0.1:3001/v1`)
- Autenticação: interceptor que injeta `Authorization: Bearer <token>` em cada requisição
- Refresh automático: em caso de 401, tenta renovar via `POST /auth/refresh` antes de deslogar
- Helpers exportados: `apiGet<T>()`, `apiPost<T>()`, `apiPatch<T>()`, `apiDelete<T>()`

---

## Por serviço/arquivo

### `src/services/domain.ts` — Domínio principal da aplicação

#### Dashboard e Home
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getHomeDashboard()` | GET | `/home/dashboard` | DashboardPage |
| `getPublicRanking(params)` | GET | `/public/ranking` | PublicRankingPage |
| `getMasterDashboard(period)` | GET | `/master/dashboard` | MasterDashboardPage |
| `getMasterUnits(period, status)` | GET | `/master/unidades` | MasterUnitsPage |
| `getMasterConsolidated(period, status)` | GET | `/master/consolidado` | MasterConsolidatedPage |

#### CRM e Leads
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getCrmSummary()` | GET | `/crm/summary` | ComercialPage |
| `getLeads()` | GET | `/leads` | ComercialPage |
| `createLead(payload)` | POST | `/leads` | ComercialPage |
| `updateLead(id, payload)` | PATCH | `/leads/:id` | ComercialPage |
| `deleteLead(id)` | DELETE | `/leads/:id` | ComercialPage |
| `addLeadContato(id, payload)` | POST | `/leads/:id/contato` | ComercialPage |
| `addLeadTarefa(id, payload)` | POST | `/leads/:id/tarefa` | ComercialPage |

#### Clientes
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getClientes()` | GET | `/clientes` | ComercialPage, ConfiguracoesPage |
| `getContratos(params)` | GET | `/contratos` | ConfiguracoesPage, ConteudoPage |

#### Usuários
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getUsuarios(params)` | GET | `/usuarios` | ConfiguracoesPage |
| `getConvitesPendentes()` | GET | `/usuarios/convites-pendentes` | ConfiguracoesPage |
| `convidarUsuario(payload)` | POST | `/usuarios/convidar` | ConfiguracoesPage |
| `updateUsuario(id, payload)` | PATCH | `/usuarios/:id` | ConfiguracoesPage |
| `resetSenhaUsuario(id)` | POST | `/usuarios/:id/reset-senha` | ConfiguracoesPage |
| `forceLogoutUsuario(id)` | POST | `/usuarios/:id/force-logout` | ConfiguracoesPage |
| `reenviarConviteUsuario(id)` | POST | `/usuarios/:id/reenviar-convite` | ConfiguracoesPage |

#### Marcas
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getMarcas(params)` | GET | `/marcas` | ConteudoPage |
| `createMarca(payload)` | POST | `/marcas` | ConteudoPage |
| `updateMarca(id, payload)` | PATCH | `/marcas/:id` | ConteudoPage |
| `deleteMarca(id)` | DELETE | `/marcas/:id` | ConteudoPage |

#### Agenda
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getAgenda(params)` | GET | `/agenda` | ConteudoPage, ClienteAgendaPage |
| `createAgendaEvento(payload)` | POST | `/agenda` | ConteudoPage |
| `updateAgendaEvento(id, payload)` | PATCH | `/agenda/:id` | ConteudoPage |
| `deleteAgendaEvento(id)` | DELETE | `/agenda/:id` | ConteudoPage |

#### Vídeos
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getVideos(params)` | GET | `/videos` | ConteudoPage |
| `createVideo(payload)` | POST | `/videos` | ConteudoPage |
| `updateVideo(id, payload)` | PATCH | `/videos/:id` | ConteudoPage |
| `deleteVideo(id)` | DELETE | `/videos/:id` | ConteudoPage |

#### Vendas Atribuídas e Comissões
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getVendasAtribuidas(params)` | GET | `/vendas-atribuidas` | ConteudoPage |
| `getComissoesResumo(params)` | GET | `/comissoes/resumo` | ConteudoPage, FinanceiroPage |
| `getComissoesApresentadoras(params)` | GET | `/comissoes/apresentadoras` | ConteudoPage |
| `getComissoesMarcas(params)` | GET | `/comissoes/marcas` | ConteudoPage |
| `getContratos(params)` | GET | `/contratos` | ConteudoPage, ConfiguracoesPage |

#### Portal do Cliente
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getClienteDashboard(period)` | GET | `/cliente/dashboard` | ClienteDashboardPage |
| `getClienteLives(period)` | GET | `/cliente/lives` | ClienteLivesPage |
| `getClientePerfil()` | GET | `/cliente/perfil` | ClienteDashboardPage, ConfiguracoesPage (modo cliente) |
| `updateClienteTiktok(tiktok_username)` | POST | `/cliente/perfil/tiktok` | ConfiguracoesPage (modo cliente) |
| `getClienteMeta(period)` | GET | `/cliente/meta` | ClienteDashboardPage |
| `updateClienteMeta(payload)` | PATCH | `/cliente/meta` | ClienteDashboardPage |
| `getClienteAgenda(params)` | GET | `/cliente/agenda` | ClienteAgendaPage |
| `getClienteReservas()` | GET | `/cliente/reservas` | ClienteAgendaPage |
| `solicitarClienteLive(payload)` | POST | `/cliente/solicitacao` | ClienteAgendaPage |

#### Cabines
| Função | Método | Path | Acoplamento contrato | Usado em |
|---|---|---|---|---|
| `getCabines()` | GET | `/cabines` | Retorna `contrato_id` | ConteudoPage |
| `getCabinesFilaAtivacao()` | GET | `/cabines/fila-ativacao` | **Lógica baseada em contratos** | ConteudoPage |
| `createCabine(payload)` | POST | `/cabines` | Não | ConteudoPage |
| `updateCabine(id, payload)` | PATCH | `/cabines/:id` | Não | ConteudoPage |
| `liberarCabine(id)` | PATCH | `/cabines/:id/liberar` | Remove `contrato_id` | ConteudoPage |
| `reservarCabine(id, contratoId)` | PATCH | `/cabines/:id/reservar` | **Envia `contrato_id`** | ConteudoPage |
| `atualizarStatusCabine(id, status)` | PATCH | `/cabines/:id/status` | Não | ConteudoPage |
| `getCabineHistorico(id)` | GET | `/cabines/:id/historico` | Não (retornado) | ConteudoPage |
| `getCabineLiveAtual(id)` | GET | `/cabines/:id/live-atual` | Retorna `contrato_id` | ConteudoPage |

#### Lives
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getLives()` | GET | `/lives` | ConteudoPage |
| `iniciarLive(payload)` | POST | `/lives` | ConteudoPage |
| `encerrarLive(id, payload)` | PATCH | `/lives/:id/encerrar` | ConteudoPage |

#### Solicitações
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getSolicitacoes(status)` | GET | `/solicitacoes` | SolicitacoesPage |
| `aprovarSolicitacao(id)` | PATCH | `/solicitacoes/:id/aprovar` | SolicitacoesPage |
| `recusarSolicitacao(id, motivo)` | PATCH | `/solicitacoes/:id/recusar` | SolicitacoesPage |
| `criarSolicitacao(payload)` | POST | `/solicitacoes` | SolicitacoesPage |

#### Apresentadoras
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getApresentadoras()` | GET | `/apresentadoras` | ApresentadorasPage, ConteudoPage |
| `createApresentadora(payload)` | POST | `/apresentadoras` | ApresentadorasPage |
| `updateApresentadora(id, payload)` | PATCH | `/apresentadoras/:id` | ApresentadorasPage |
| `deleteApresentadora(id)` | DELETE | `/apresentadoras/:id` | ApresentadorasPage |

#### Analytics
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getAnalyticsDashboard(filters)` | GET | `/analytics/dashboard` | ConteudoPage (tab analytics) |

#### Financeiro
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getFinanceiroResumo(filters)` | GET | `/financeiro/resumo` | FinanceiroPage |
| `getFinanceiroFluxo(filters)` | GET | `/financeiro/fluxo-caixa` | FinanceiroPage |
| `getFinanceiroFaturamento(filters)` | GET | `/financeiro/faturamento` | FinanceiroPage |
| `getFinanceiroCustos(filters)` | GET | `/financeiro/custos` | FinanceiroPage |
| `createFinanceiroCusto(payload)` | POST | `/financeiro/custos` | FinanceiroPage |
| `deleteFinanceiroCusto(id)` | DELETE | `/financeiro/custos/:id` | FinanceiroPage |

#### Boletos
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getBoletos()` | GET | `/boletos` | FinanceiroPage |
| `getBoletoAlertas()` | GET | `/boletos/alertas` | FinanceiroPage, Shell (notificação) |
| `getBoletoDetalhe(id)` | GET | `/boletos/:id` | FinanceiroPage |
| `marcarBoletoVisto(id)` | PATCH | `/boletos/:id/visto` | FinanceiroPage |
| `marcarBoletoPago(id)` | PATCH | `/boletos/:id/pagar` | FinanceiroPage |

#### Configurações e Auth
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getConfiguracoes()` | GET | `/configuracoes` | ConfiguracoesPage |
| `updateConfiguracoes(payload)` | PATCH | `/configuracoes` | ConfiguracoesPage |
| `trocarSenha(payload)` | PATCH | `/auth/senha` | ConfiguracoesPage |

#### Base de Conhecimento
| Função | Método | Path | Usado em |
|---|---|---|---|
| `getKnowledgeCategories()` | GET | `/knowledge/categories` | KnowledgePage |
| `getKnowledgeArticles(params)` | GET | `/knowledge/articles` | KnowledgePage |

---

### `src/services/auth.ts` — Autenticação

| Função | Método | Path | Usado em |
|---|---|---|---|
| `login(email, password)` | POST | `/auth/login` | LoginPage |
| `logout()` | POST | `/auth/logout` | Shell, useAuth hook |
| `refreshToken()` | POST | `/auth/refresh` | Interceptor automático em api.ts |
| `forgotPassword(email)` | POST | `/auth/forgot-password` | ForgotPasswordPage |
| `resetPassword(token, password)` | POST | `/auth/redefinir-senha` | (página de reset) |
| `acceptInvite(token, password)` | POST | `/auth/aceitar-convite` | (página de aceitar convite) |

---

### `src/services/onboarding.ts` — Onboarding de clientes

| Função | Método | Path | Usado em |
|---|---|---|---|
| `submitOnboarding(payload)` | POST | `/onboarding` | OnboardingPage |

---

## Observações importantes

1. **Acoplamento frontend ao contrato**: `reservarCabine(id, contratoId)` em `domain.ts:209` envia `contrato_id` diretamente. Se o backend desacoplar o endpoint de reserva para usar `cliente_id`, esta função deve ser atualizada.

2. **`getCabinesFilaAtivacao()`** — chama `/cabines/fila-ativacao` que, no backend, lista "contratos ativos sem cabine". Quando o desacoplamento ocorrer, este endpoint e sua chamada frontend precisarão ser redesenhados.

3. **`getCabineLiveAtual(id)`** — a resposta inclui `contrato_id` (backend linha 731). O frontend pode estar consumindo este campo; verificar se algum componente depende de `liveData.contrato_id`.

4. **Chamadas não mapeadas**: as chamadas dentro de páginas individuais (via hooks ou diretamente) não estão mapeadas aqui — este inventário cobre apenas as funções declaradas em `domain.ts`, `auth.ts` e `onboarding.ts`. Páginas podem fazer chamadas adicionais via `api.ts` diretamente.

5. **Todos os endpoints** do `domain.ts` usam os helpers `apiGet/apiPost/apiPatch/apiDelete` que injetam automaticamente o `Authorization: Bearer` token via interceptor do axios.

---

## Totais

- Total de chamadas de API em `domain.ts`: **~70 funções**
- Métodos GET: ~35 | POST: ~15 | PATCH: ~15 | DELETE: ~8
- Arquivos de serviço: 4 (`domain.ts`, `api.ts`, `auth.ts`, `onboarding.ts`)
- Chamadas com acoplamento a `contrato_id`: 3 (`reservarCabine`, `getCabinesFilaAtivacao`, retorno de `getCabineLiveAtual`)
