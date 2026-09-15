# Revisão da versão de lives — 14/09/2026

## Escopo conferido

- Entrada numérica estrita, campos obrigatórios enxutos e opcionais recolhidos.
- Datas no mês corrente de São Paulo para cadastro, correção e reenvio no portal.
- Registro unificado paginado com APRESENTADORA, rascunho e validação visível.
- Vínculo por marca/dia/participante com horários, GMV oficial e paginação.
- Pendências nas métricas, rankings, diário, relatório/PDF, CSV e resumo do dia.
- Sobreposições ficam em conciliação, sem duplicar o consolidado; comissões não
  recebem os dados declarados. Fixo do ranking mantém a fonte contratual existente.
- Revisão gestora de devolvidas antigas exige versão e motivo auditado.
- Publicação mantém as permissões existentes; origem APRESENTADORA é preservada.
- Cache de relatórios/portal invalidado após as transições.

Vídeos não foram adicionados à base de comissão. A orientação final do usuário
foi ignorá-los nessa correção; nenhum motor financeiro ou valor cadastrado mudou.

## Verificações locais

- Frontend: typecheck, build e 511 testes passaram (70 arquivos).
- Backend: 1020 testes passaram; 7 ignorados preexistentes. Syntax/diff checks OK.
- PGlite: SQL real de fluxo HTTP, RLS, isolamento, idempotência, auditoria/rollback,
  candidatos, registro paginado e migration 148; fixo 2850 preservado antes de validar,
  sem venda/comissão criada pelo envio. Seleção de mês da Home inclui pending-only.
- Navegador: 24 cenários desktop/mobile passaram; teste adicional de tema escuro e
  ampliação 200% passou. Larguras 320, 360, 390, 430 e 1280 verificadas.
- Auditoria das dependências de produção: zero vulnerabilidades nos dois repositórios.
- Os testes de cadastro usam exclusivamente fixtures e proxy localhost; não criam
  registros de teste em produção. Não houve teste em aparelho físico.
- Revisão independente: nenhum bloqueador restante nos patches revisados.

## Publicação e reversão

Base backend: `4f80b6fd3e7c6c0b9e50168fe6dc971214afb79d`, branch
`codex/blumenau-operational-fase1`, Railway `kind-rebirth / production`.
Base frontend: `a98dcc9701a40109b42ad9137271e925bfbab263`, branch
`feat/multi-apresentadora-agenda`, Vercel `liveshop-saas-frontend-react`.
Deployment frontend anterior: `dpl_B132ypqyXdHTN69qBsHA2mujcuvN`.

Aplicar backend primeiro (migração aditiva 148 no pre-deploy, sem backfill),
conferir health/readyz, depois frontend com build remoto, nunca `--prebuilt`.
Conferir versão nova, login renderizado e ausência de placeholder de ambiente.

Em falha: reverter alias do frontend para o deployment anterior e código backend
para a versão anterior por novo deployment. Manter a constraint aditiva da migration
148; não apagar dados, não refazer valores históricos e não usar reset/push forçado.

Este arquivo registra a validação pré-publicação. O resultado efetivo dos deployments
deve ser conferido nos provedores e informado na entrega, não presumido deste checklist.
