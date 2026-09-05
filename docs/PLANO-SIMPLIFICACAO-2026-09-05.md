# Simplificação de navegação e leitura — 05/09/2026

## Roteamento da tarefa

- Domínio: arquitetura de informação e UI React; complexidade 4.
- Risco: médio na interface; alto na fronteira de permissões de comissões. Apenas reorganizar acesso, sem mudar regras, pagamentos ou dados.
- Execução: principal em menu/rotas/Conteúdo/integração; workers em Clientes, Analytics e apresentação de comissões, sem sobreposição de arquivos.
- Tier: modelos da sessão; exploração focada, execução independente e revisão de permissões/diff antes de concluir.
- Autorização: usuário pediu simplificação destes módulos. Publicação desta rodada será apresentada ao final, com resultado verificável.

## Critérios de aceite

1. Clientes substitui Comercial no menu e na página; CRM/dashboard deixam de montar e consultar dados. CRUD e unificação cliente/marca preservados, informações relevantes derivadas dos dados existentes.
2. Agenda e Lives têm acessos diretos no menu. Acompanhamento operacional e vídeos gravados deixam a superfície de Conteúdo e não disparam consultas nessa navegação.
3. Links antigos continuam funcionando, preservando parâmetros de filtro, período e registro; voltar e proteção de alterações não salvas continuam funcionando.
4. Uma entrada Financeiro por perfil. Comissões reúne resultados e acesso às regras. Master mantém somente o acesso prévio às regras; nenhum perfil ganha leitura/escrita financeira nova.
5. Configurações fica no final do menu, próximo à conta, em desktop e celular.
6. Analytics mostra números/comparativos primeiro, menos texto repetido e mais espaçamento. Explicações complementares sob demanda, sem ocultar avisos críticos de qualidade nem modificar cálculos.
7. Typecheck, testes, build e cenários de navegador com dados sintéticos passam; revisão das rotas e permissões concluída.

## Fora do escopo

Não apagar registros ou tabelas, modificar APIs, dependências, autenticação, papéis, fórmulas, pagamento, regras financeiras ou configurações do usuário. Não repaginar globalmente a identidade visual. Não consultar dados financeiros reais.

## Plano compacto

1. Mapear dependências e definir destinos/permissões canônicos.
2. Implementar as quatro frentes em arquivos separados, reutilizando componentes e tokens.
3. Testar atalhos antigos, fluxos de edição, acesso por perfil, responsividade e ausência de consultas removidas.
4. Revisar diff e resultado frente aos critérios, registrar evidências e reversão por commit/deployment.

Fastcontext foi tentado; indisponível por ausência de endpoint configurado. Exploração seguiu com rg e leitura delimitada. A reversão desta rodada não requer migração; basta reverter os arquivos/commit de UI.

## Resultado verificado

Critérios 1–7 atendidos na implementação local. Build (lint de hooks + TypeScript + Vite), 447 testes unitários e 42 cenários Playwright em desktop/celular aprovados. Links de legado, período da apuração, proteção de edições e permissões de master/financeiro somente leitura cobertos. Revisão independente sem bloqueador; textos e atalhos restantes foram corrigidos.

O resumo de Clientes usa somente `gmv_mes`/`lives_mes`, confirmados nas rotas backend como mês corrente. Clientes e marcas sem cliente vinculado são grupos disjuntos; os totais da carteira não somam a mesma marca duas vezes. A tabela foi reduzida às colunas primárias, com acesso a detalhes visível em desktop.

Evidências locais: `/Users/lucas/livelab-audit-2026-09-05/simplificacao/ENTREGA.md`. Esta rodada ainda não foi publicada; backend não recebeu alterações.
