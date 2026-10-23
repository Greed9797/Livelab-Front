# CRM dentro de Clientes

Base: frontend publicado 3102003. Domínio comercial, complexidade 3; risco de permissões e dados entre unidades. Execução frontend pelo agente principal, revisão independente do contrato/API e do diff. Reutilizar as permissões existentes; não criar cadastro, serviço, schema ou migração.

Critérios:
1. Clientes mantém a carteira em /clientes e oferece a aba CRM em /clientes/crm, com navegação acessível e identidade existente.
2. Franqueados e os papéis comerciais já autorizados acessam a aba; rotas legadas de CRM levam à aba nova. Clientes parceiros e apresentadoras não ganham acesso.
3. Leads/detalhes no cache são separados por unidade e usuário. Escrita só aparece para papéis aceitos por WRITE_LEADS; o servidor continua sendo a autoridade.
4. Cadastro, edição, contatos, tarefas e mudança de etapa usam as APIs existentes. Cancelar uma ação não escreve; falha de movimento restaura a etapa anterior.
5. Os formulários e confirmações seguem os componentes atuais. Kanban funciona em desktop/celular, com alternativa à movimentação por arrastar.
6. Corrigir achados concretos da revisão e registrar os limites da validação. Tipos, testes aplicáveis, build e revisão do diff devem estar verdes antes de entregar.

Fora de escopo: alterações financeiras/comissões, migração de dados, integrações novas, regras novas de conversão de leads, backend de treinamentos e mudanças de credenciais.
