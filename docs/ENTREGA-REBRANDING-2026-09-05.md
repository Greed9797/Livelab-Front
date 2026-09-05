# Soft rebranding — entrega de 05/09/2026

O handoff foi aplicado à estrutura operacional atual, com componentes compartilhados e correções de legibilidade, responsividade e foco. Base anterior: `d181cf2`. A publicação desta rodada ainda depende de autorização; nenhuma alteração foi feita no backend ou em produção.

## Identidade e consistência

- Manrope substitui as três famílias anteriores; números tabulares, carregamento com `display=swap` e preconnect existentes. Sem nova dependência.
- Tokens dark neutros, laranja `#ff4d1c` e comparação em `--alt`. O fundo geral perde o brilho antigo; o wash previsto fica no herói de GMV.
- Nenhum token claro existente mudou. Foram acrescentados aliases de estado, divisores, raios e foregrounds que mantêm contraste no claro.
- Shell expandido de 248px, preferência de recolhimento preservada e Configurações ao final. Cabeçalhos sem eyebrow/accent; títulos completos e subtítulos secundários.
- Botões, painéis, modais, tooltips, toast e campos usam os padrões comuns. Labels visíveis nos formulários antigos, placeholders específicos e nomes acessíveis nas edições em linha.
- O reset de fonte deixou de sobrescrever tamanho/peso dos controles. O modal mantém o foco escolhido pelo usuário, inclusive em confirmação de alterações, e recupera foco quando o controle ativo desaparece.

## Home e operação

- Status da operação, agenda apenas quando carregada e preenchida, régua de KPIs, GMV, pódio, marcas e assiduidade.
- Uma linha por cabine na agenda; múltiplos horários não são apresentados como ocupação contínua. Falha de consulta não é tratada como grade vazia.
- Quatro KPIs de lives: vídeos, CRM e Acompanhamento operacional não foram reintroduzidos.
- Número de GMV adapta-se à largura do painel. A animação chega ao valor exato, só ocorre na primeira carga e respeita movimento reduzido; não recomeça ao trocar o mês.
- SVG existente do gráfico reutilizado, mantendo carregamento leve. Série comparativa usa `--alt`; destaque de máximo, tooltip e animação curta da série atual.
- Ranking de marcas mostra três linhas e identifica as restantes. O pódio mantém a pendência de atribuição mesmo quando não há participantes ranqueados.
- Assiduidade começa com quatro apresentadoras, células de 30px, dias alinhados e ícones além das cores. “Ver as N apresentadoras” expande os dados já carregados e preserva o período, sem nova consulta. Páginas dedicadas continuam completas.

## Adaptações justificadas

- A régua se reorganiza em duas colunas em telas estreitas para manter as quatro métricas visíveis.
- O tamanho de 68px do GMV é teto responsivo, evitando corte de números no celular.
- O acesso à assiduidade completa é uma expansão local: o antigo destino sugerido, Ranking, não contém assiduidade.
- Foco no tema claro usa texto primário; laranja sobre o canvas claro teria apenas 2,81:1. Textos pequenos sobre cores de estado também usam foreground apropriado por tema. O selo AO VIVO mantém a cor de estado com texto escuro para contraste.
- Os gráficos gerais usam os tokens em vez de cores fixas e não reanimam desnecessariamente. O herói mantém a entrada breve prevista no handoff.

## Verificação

- Build de produção, lint de hooks e TypeScript aprovados.
- **446 testes unitários em 56 arquivos aprovados.**
- **54 E2E aprovados no pacote compilado**, Chrome desktop e Pixel 7: operações, navegação, regras de acesso, formulários, alterações não salvas, dados incompletos, tema claro/escuro, fonte real, teclado e movimento reduzido.
- GMV verificado pelos limites do próprio painel, além do scroll da página. Viewport de 720×480 reproduz a área em pixels CSS de uma tela 1440×960 a 200%; não foi usado `style.zoom` como prova de responsividade.
- Detector Impeccable: quatro achados na base; **zero na entrega**. Isso não equivale a uma certificação completa de acessibilidade.
- Revisão independente do diff, foco de modais e fronteiras de dados. Nenhuma mudança em serviços, stores, permissões, regras de comissão/meta/presença, schema ou dependências.
- Evidências e screenshots com dados sintéticos em `/Users/lucas/livelab-audit-2026-09-05/rebranding/`. O canvas externo não foi acessível; a referência aplicada foi o handoff local integral, preservado com SHA-256 `fde59d1a788fb0383e26ce123b0167b800644bf869cc2ae0c17aef21096b471e`.

## Desempenho e reversão

Baseline e entrega foram compilados com as mesmas dependências instaladas e `VITE_API_URL=/v1`, sem Sentry, para comparação equivalente. O total de JavaScript comprimido permaneceu praticamente igual; o CSS acrescentou 181 bytes gzip. Fontes passaram de três famílias para uma. O resultado mede artefatos locais, não latência de produção. Detalhes exatos em `performance.json`.

Reversão local por revert do commit desta entrega; não há migração ou transformação de dados. Para eventual publicação, o frontend anterior é `d181cf2`, deployment `dpl_HGitnTWieUqv3pEFZ3ABu9VrD8Kr`. Reversão em produção deve promover esse deployment somente com autorização. O backend permanece em `7984930`.
