# Carteira, Home, disponibilidade e financeiro

Base: `7e49046`. Pedido: tornar a carteira operacional, remover redundância da Home, mostrar quem ainda precisa de horários na agenda e investigar clientes repetidos no financeiro.

## Roteamento e limites

- Carteira e Home: apresentação e UX, complexidade 3, risco moderado; implementação em componentes existentes, revisão do root.
- Disponibilidade: lógica derivada da agenda, complexidade 4, risco operacional; worker Terra e revisão independente. Regra autorizada pelo usuário: apresentadora sai da lista após dois horários.
- Financeiro: identidade/agregação, complexidade 4, risco alto por envolver valores; exploração somente leitura, correção mínima da causa comprovada e revisão independente. Não alterar regras de cobrança, comissões, dados ou schema.
- Execução paralela com caminhos distintos. Preservar identidade atual, permissões, configurações e alterações alheias. Sem novas dependências. Publicação é etapa posterior, sujeita à autorização específica de produção.

## Aceite

1. Carteira abre com clientes ativos, busca e ações úteis. Inativos ficam acessíveis por filtro explícito; em Todos, vêm depois dos ativos e têm indicação textual e cor secundária legível. Remover indicadores sem utilidade ou fonte confiável; não mostrar zero em falhas de consulta.
2. Home mantém um atalho principal à agenda. A faixa de operação aparece somente com live identificada em andamento. Preservar acesso à live e os dados/pendências existentes.
3. Agenda corrente mostra abaixo da grade os clientes/marcas ativos sem horário e apresentadoras ativas com menos de dois horários no dia selecionado. Mostrar 0/2 e 1/2 com clareza. Contar horários reais distintos, incluindo participação em split quando disponível, sem depender de filtros visuais ou esconder ocupações por erro/loading. Disponibilidade significa ainda não escalada, não garantia de disponibilidade pessoal.
4. Financeiro apresenta uma entidade por identidade canônica quando a origem confirmar duplicação indevida. Não unir homônimos por nome, não somar linhas repetidas, não descartar faturamento legítimo nem mexer em cálculos de comissão.

## Sequência e verificação

Rastrear fontes e contratos → corrigir cada frente em diff pequeno → testes dirigidos → integração e build/typecheck/unitários → E2E desktop/mobile com dados sintéticos e fronteiras de erro/permissão → revisão independente comparando comportamento com os critérios.

Para qualquer SQL de valores alterado, validar também semântica em Postgres/PGlite com fixtures; teste de query mockada sozinho não basta. Reversão por revert das mudanças desta rodada, sem migração de dados.
