# Estado do frontend LiveLab

Última verificação: 26/10/2026.

- Aplicação ativa: `react-app/`, React/Vite.
- Produção: https://app.grupolivelab.com.br.
- Branch usada pela publicação automática: `feat/multi-apresentadora-agenda`.
- Commit publicado: `3eae78bfa269dc610f7e2028031e139a1b980597`.
- Marcador público: `1793054319509`, em `/version.json`.
- [Workflow automático final](https://github.com/Greed9797/Livelab-Front/actions/runs/40413624195): sucesso, com tipos, 1.034 testes em 142 arquivos, build e deploy remoto Vercel.
- API: `https://liveshop-saas-api-production.up.railway.app/v1`, publicada no commit backend `894e903`.

## Entrega mais recente

O CRM foi reativado como aba em **Clientes**, na rota `/clientes/crm`, preservando a carteira em `/clientes`, a identidade visual atual e as permissões do servidor. As ações usam a API real; cache e rascunhos são separados por unidade e usuário. Integrações externas precisam chamar a API autenticada; não há sincronização automática apenas por conectar outro serviço.

Treinamentos estão em `/conhecimento`, com gestão em `/conhecimento/treinamentos/gerenciar` e relatório em `/conhecimento/treinamentos/relatorio`. A migração 186 correspondente foi aplicada na API. A publicação preservou o portal e as mudanças de cadastros da base `30744bb`.

## Operação e limites

- [Registro de produção](docs/production-release-2026-10-26.md).
- [Procedimento de deploy](react-app/DEPLOY-HANDOFF.md).
- `migration/react-vercel` também aciona o workflow, mas não deve ser presumida como a versão atual; confirme o SHA e o domínio antes de publicar.
- O checkout principal contém trabalho local que não representa sozinho o estado publicado. Preserve-o; o grafo Graft descreve o checkout em que foi gerado.
- A sessão disponível no navegador era de cliente parceiro e foi corretamente redirecionada para `/cliente`. Não foi realizado novo smoke visual autenticado como franqueado/master, nem validação de vídeo da própria conta Panda em produção.
- Estados antigos de flags, pendências de Firebase e rotas de cadastro citados no status anterior não foram revalidados como pendências atuais. Consulte o código publicado e as evidências da release antes de agir sobre registros históricos.
