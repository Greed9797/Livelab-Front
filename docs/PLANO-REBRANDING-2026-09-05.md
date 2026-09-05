# Soft rebranding e uniformização — 05/09/2026

## Roteamento e autoridade

- Domínio: identidade visual, UI operacional e acessibilidade; complexidade 4.
- Risco médio na apresentação; alto nas fronteiras de métricas, presença e finanças. Não alterar dados, fórmulas, autenticação, pagamentos, endpoints ou permissões.
- Responsável: principal na integração, formulários/Conteúdo e verificação; workers exclusivos em foundations, Home e demais superfícies. Modelos da sessão e revisão independente após integração.
- Fonte de verdade: `react-app/docs/redesign/DESIGN-HANDOFF-visao-da-unidade.md`, fornecido pelo usuário e preservado. O canvas externo vinculado não respondeu pela ferramenta; a especificação local contém os valores e comportamentos necessários.
- Autorização: aplicar e otimizar o handoff, com vistoria e uniformização completa da interface. Publicação será tratada após resultado verificável.

## Aceite

1. Manrope como única família de UI; números tabulares. Sem requests/fontes Instrument/Geist. Carregamento sem bloqueio e sem nova biblioteca.
2. Dark neutro conforme tokens do handoff, laranja `#ff4d1c`, comparação em `--alt`. Paleta clara preservada; raios/tokens compartilhados sem quebrar claro.
3. Shell 248px quando expandido, preferência de recolhimento e Configurações ao final preservadas. PageHeader sem eyebrow/accent; títulos, subtítulos, painéis, modais, labels, placeholders, botões e estados com papéis visuais consistentes.
4. Home com status, régua de KPIs, herói GMV, pódio, marcas e assiduidade; grade vazia ausente, erros distinguíveis de vazio. Números reais das fontes existentes, sem valores ilustrativos nem regras inferidas.
5. Movimento restrito: pulso da live, entradas curtas quando justificadas, herói não reanima na troca de mês e reduced-motion respeitado. Não introduzir requests duplicados, remount de gráficos ou loops de atualização.
6. Contraste verificado no navegador, foco, labels, estados, viewport equivalente a 200% de zoom e desktop/celular. Testes unitários, build, fluxos operacionais e revisão independente aprovados.
7. Detector do handoff executado, achados corrigidos no escopo e exceções justificadas. Rodada visual conjunta seguida de uma rodada de confirmação, sem polimento indefinido.

## Adaptações à versão atual

- O handoff antecede a simplificação já publicada: não reintroduzir Vídeos, CRM ou Acompanhamento operacional na navegação. Régua da Home prioriza os quatro KPIs de lives existentes; indicadores de vídeos não voltam por causa do texto antigo.
- `Button`, `Modal` e formulários estavam limpos ao iniciar, apesar da nota histórica no handoff. Ownership exclusivo evita alterações concorrentes nesses caminhos.
- O briefing já determina identidade e produto. Contexto existente e este handoff substituem uma nova entrevista de design; a implementação pode seguir sem pedir decisões já tomadas.

## Plano

1. Inventário de tokens, componentes, tipografia, microcopy, estados e baseline de build/consultas.
2. Aplicar foundations, Home e superfícies em paralelo; principal uniformiza controles e formulários restantes.
3. Integrar; testes funcionais, inspeção de código/detector, screenshot e contraste em uma rodada conjunta.
4. Corrigir os achados relevantes em lote, confirmar e registrar evidências, limitações e reversão.

## Limites

Sem novos endpoints, serviços, stores, dependências, tabelas ou regras financeiras/metas/presença. Handoff não é autorização para inventar métricas ou recriar módulos retirados. Reversão por commit/deployment, sem migrações.
