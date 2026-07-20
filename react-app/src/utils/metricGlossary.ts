/**
 * Glossário central de métricas — FONTE ÚNICA das definições exibidas na UI.
 *
 * Regra: cada entrada descreve o que o BACKEND realmente calcula, com a
 * referência arquivo:linha do repositório Livelab-back. Nada aqui é inferido
 * "pelo nome da métrica" — se a fórmula não pôde ser comprovada no código, a
 * métrica NÃO entra neste mapa.
 *
 * Por que as chaves são prefixadas por tela (`home.*` / `financeiro.*`):
 * métricas homônimas têm definições DIFERENTES por endpoint. O caso mais
 * perigoso é o GMV de vídeos —
 *   • Home  lê `vendas_atribuidas.gmv` com `origem = 'video'`
 *   • Financeiro lê `video_registros.gmv_atribuido`
 * — duas tabelas distintas. Unificar as chaves esconderia exatamente a
 * divergência que este glossário existe para tornar visível.
 */

export interface MetricDefinition {
  /** Rótulo canônico da métrica (como aparece no card). */
  rotulo: string
  /** Uma frase: o que a métrica mede. */
  definicao: string
  /** Como o número é obtido, em linguagem de negócio. */
  formula: string
  /** Janela temporal e regras de recorte. */
  periodo: string
  /** Endpoint + arquivo:linha que produz o valor. */
  fonte: string
}

export const METRIC_GLOSSARY = {
  /* ─────────────────────── Home — GET /v1/home/dashboard ─────────────────── */

  'home.gmv_total': {
    rotulo: 'GMV — Mês',
    definicao: 'Volume bruto de vendas do mês, somando lives encerradas e vídeos.',
    formula: 'GMV de lives + GMV de vídeos (balde "total"; não confundir com o balde só de lives).',
    periodo: 'Mês de referência inteiro, fuso America/Sao_Paulo.',
    fonte: 'GET /v1/home/dashboard → gmv_total_mes (routes/home.js:337 e 938)',
  },

  'home.gmv_lives': {
    rotulo: 'GMV de lives',
    definicao: 'Parcela do GMV do mês gerada apenas por lives, sem vídeos.',
    formula: 'Σ do primeiro valor preenchido entre ads_gmv, manual_gmv e fat_gerado de cada live com status "encerrada".',
    periodo: 'Lives com iniciado_em dentro do mês de referência (America/Sao_Paulo).',
    fonte: 'GET /v1/home/dashboard → gmv_lives_mes (routes/home.js:281; lib/metric-sql.js:2)',
  },

  'home.gmv_videos': {
    rotulo: 'GMV de vídeos',
    definicao: 'Parcela do GMV do mês atribuída a vídeos gravados.',
    formula: 'Σ vendas_atribuidas.gmv com origem = "video", excluindo vendas com status_aprovacao = "reprovada".',
    periodo: 'Vendas com data dentro do mês de referência (America/Sao_Paulo).',
    fonte: 'GET /v1/home/dashboard → gmv_videos_mes (routes/home.js:301)',
  },

  'home.lives': {
    rotulo: 'Lives realizadas',
    definicao: 'Quantidade de lives concluídas no mês.',
    formula: 'COUNT de lives com status "encerrada". Lives em andamento ou canceladas não contam.',
    periodo: 'Lives com iniciado_em dentro do mês de referência (America/Sao_Paulo).',
    fonte: 'GET /v1/home/dashboard → lives_mes (routes/home.js:268)',
  },

  'home.horas_live': {
    rotulo: 'Horas em live',
    definicao: 'Tempo total no ar somado sobre as lives encerradas do mês.',
    formula: 'Σ (encerrado_em − iniciado_em) em horas, com teto de 24h por live para neutralizar lives esquecidas abertas. Sem encerrado_em, usa previsto_fim.',
    periodo: 'Lives com iniciado_em dentro do mês de referência (America/Sao_Paulo).',
    fonte: 'GET /v1/home/dashboard → horas_live_mes (routes/home.js:477)',
  },

  'home.videos': {
    rotulo: 'Vídeos gravados',
    definicao: 'Quantidade de vídeos registrados no mês.',
    formula: 'COUNT de linhas em video_registros.',
    periodo: 'Registros com data dentro do mês de referência (America/Sao_Paulo).',
    fonte: 'GET /v1/home/dashboard → videos_mes (routes/home.js:319)',
  },

  'home.gmv_por_live': {
    rotulo: 'GMV / live',
    definicao: 'Quanto uma live rendeu, em média, no mês.',
    formula: 'GMV TOTAL do mês (lives + vídeos) ÷ nº de lives encerradas. Atenção: o numerador inclui vídeos, então a métrica sobe mesmo em mês com muito vídeo e pouca live.',
    periodo: 'Mês de referência inteiro (America/Sao_Paulo).',
    fonte: 'GET /v1/home/dashboard → gmv_por_live (routes/home.js:920)',
  },

  'home.gmv_por_hora': {
    rotulo: 'GMV / hora',
    definicao: 'Eficiência de cada hora no ar.',
    formula: 'GMV de LIVES ÷ horas em live. Vídeos ficam de fora do numerador — mesma convenção do Analytics e do ranking de marcas.',
    periodo: 'Mês de referência inteiro (America/Sao_Paulo).',
    fonte: 'GET /v1/home/dashboard → gmv_por_hora (routes/home.js:922; lib/performance-rollups.js:20)',
  },

  'home.ticket_medio': {
    rotulo: 'Ticket médio',
    definicao: 'Valor médio por pedido no mês.',
    formula: 'GMV total do mês ÷ pedidos totais (lives + vídeos). Pedidos de live usam manual_orders e, na falta dele, final_orders_count.',
    periodo: 'Mês de referência inteiro (America/Sao_Paulo).',
    fonte: 'GET /v1/home/dashboard → ticket_medio (routes/home.js:924; lib/metric-sql.js:6)',
  },

  'home.meta_mes': {
    rotulo: 'Meta do mês',
    definicao: 'Meta de GMV da unidade para o mês de referência.',
    formula: 'Usa meta_unidade.meta_gmv quando há registro mensal explícito; senão deriva tenants.meta_diaria_gmv × dias úteis do mês. Sem nenhuma das duas configurações, fica vazia (não vira zero).',
    periodo: 'Dias úteis contados como seg–sex; feriados nacionais NÃO são descontados.',
    fonte: 'GET /v1/home/dashboard → meta_mes (routes/home.js:855)',
  },

  'home.ritmo_projetado': {
    rotulo: 'Ritmo projetado',
    definicao: 'Projeção linear de onde o GMV fecha o mês mantendo o ritmo atual.',
    formula: '(GMV total do mês ÷ dias úteis já decorridos) × total de dias úteis do mês. É extrapolação simples — não considera sazonalidade nem agenda futura.',
    periodo: 'Vazio enquanto nenhum dia útil tiver decorrido (evita divisão por zero).',
    fonte: 'GET /v1/home/dashboard → ritmo_projetado (routes/home.js:891)',
  },

  'home.dia_util': {
    rotulo: 'Dia útil',
    definicao: 'Posição do mês no calendário útil, usada como base do ritmo projetado.',
    formula: 'Dias seg–sex decorridos ÷ total de dias úteis do mês. Mês passado conta como fechado (total); mês futuro conta como 0.',
    periodo: 'Referência: data atual em America/Sao_Paulo. Feriados nacionais não são descontados.',
    fonte: 'GET /v1/home/dashboard → periodo.dia_util (routes/home.js:876)',
  },

  /* ──────────────── Financeiro — GET /v1/financeiro/resumo ───────────────── */

  'financeiro.gmv_total': {
    rotulo: 'GMV total',
    definicao: 'Volume bruto de vendas do período, somando lives encerradas e vídeos.',
    formula: 'GMV de lives + GMV de vídeos. Diferente da Home: aqui o GMV de vídeos vem de video_registros.gmv_atribuido, não de vendas_atribuidas.',
    periodo: 'Intervalo selecionado no filtro de período (não é fixo no mês).',
    fonte: 'GET /v1/financeiro/resumo → gmv_total / fat_bruto (routes/financeiro.js:149)',
  },

  'financeiro.gmv_lives': {
    rotulo: 'GMV de lives',
    definicao: 'Parcela do GMV do período gerada por lives.',
    formula: 'Σ do primeiro valor preenchido entre ads_gmv, manual_gmv e fat_gerado de cada live com status "encerrada".',
    periodo: 'Lives com iniciado_em dentro do intervalo selecionado (America/Sao_Paulo).',
    fonte: 'GET /v1/financeiro/resumo → gmv_lives (routes/financeiro.js:84; lib/metric-sql.js:2)',
  },

  'financeiro.gmv_videos': {
    rotulo: 'GMV de vídeos',
    definicao: 'Parcela do GMV do período atribuída a vídeos gravados.',
    formula: 'Σ video_registros.gmv_atribuido.',
    periodo: 'Registros com data dentro do intervalo selecionado.',
    fonte: 'GET /v1/financeiro/resumo → gmv_videos (routes/financeiro.js:104)',
  },

  'financeiro.receita_liquida': {
    rotulo: 'Comissão de franquia',
    definicao: 'Receita da unidade sobre o GMV do período, antes de descontar custos.',
    formula: 'Σ (GMV da live × % de comissão da marca resolvida) + fixo mensal das marcas. Calculada na hora a partir do cadastro da marca — não depende da coluna pré-processada lives.comissao_calculada.',
    periodo: 'Lives encerradas dentro do intervalo selecionado.',
    fonte: 'GET /v1/financeiro/resumo → receita_liquida (routes/financeiro.js:151 e 88)',
  },

  'financeiro.fixo_mensal': {
    rotulo: 'Fixo mensal',
    definicao: 'Parcela fixa da comissão, cobrada por marca contratada como cliente.',
    formula: 'Σ marcas.valor_fixo_minimo × nº de meses com atividade da marca (GMV ou pedidos > 0). Marcas com tipo diferente de "cliente" não entram.',
    periodo: 'Somado uma vez por mês com atividade dentro do intervalo selecionado.',
    fonte: 'GET /v1/financeiro/resumo → fixo_mensal (routes/financeiro.js:120)',
  },

  'financeiro.total_custos': {
    rotulo: 'Custos reais',
    definicao: 'Custos operacionais lançados manualmente para o período.',
    formula: 'Σ custos.valor. Inclui aluguel, salário, energia, internet e outros — só o que foi efetivamente lançado.',
    periodo: 'Lançamentos cuja competência cai dentro do intervalo selecionado.',
    fonte: 'GET /v1/financeiro/resumo → total_custos (routes/financeiro.js:110)',
  },

  'financeiro.fat_liquido': {
    rotulo: 'Resultado líquido',
    definicao: 'O que sobra para a unidade depois dos custos do período.',
    formula: 'Comissão de franquia − custos reais, com piso em zero: prejuízo aparece como R$ 0,00, nunca negativo.',
    periodo: 'Intervalo selecionado no filtro de período.',
    fonte: 'GET /v1/financeiro/resumo → fat_liquido (routes/financeiro.js:152)',
  },

  'financeiro.pedidos': {
    rotulo: 'Pedidos',
    definicao: 'Total de pedidos gerados no período.',
    formula: 'Pedidos de lives + pedidos de vídeos. Live usa manual_orders e, na falta dele, final_orders_count; vídeo usa video_registros.pedidos_atribuidos.',
    periodo: 'Intervalo selecionado no filtro de período.',
    fonte: 'GET /v1/financeiro/resumo → pedidos (routes/financeiro.js:159; lib/metric-sql.js:6)',
  },

  'financeiro.lives': {
    rotulo: 'Lives',
    definicao: 'Quantidade de lives concluídas no período.',
    formula: 'COUNT de lives com status "encerrada".',
    periodo: 'Lives com iniciado_em dentro do intervalo selecionado (America/Sao_Paulo).',
    fonte: 'GET /v1/financeiro/resumo → total_lives (routes/financeiro.js:86)',
  },

  'financeiro.videos': {
    rotulo: 'Vídeos',
    definicao: 'Quantidade de vídeos registrados no período.',
    formula: 'COUNT de linhas em video_registros.',
    periodo: 'Registros com data dentro do intervalo selecionado.',
    fonte: 'GET /v1/financeiro/resumo → total_videos (routes/financeiro.js:106)',
  },

  'financeiro.take_rate': {
    rotulo: 'Take rate',
    definicao: 'Percentual do GMV que vira comissão de franquia.',
    formula: 'Comissão de franquia ÷ GMV total × 100. Calculada no frontend a partir dos dois campos do resumo — não vem pronta do backend.',
    periodo: 'Intervalo selecionado no filtro de período.',
    fonte: 'Derivada em components/dashboard/FinanceiroHeroPanel.tsx:80',
  },

  'financeiro.ticket_medio': {
    rotulo: 'Ticket médio',
    definicao: 'Valor médio por pedido no período.',
    formula: 'GMV total ÷ pedidos totais. Calculada no frontend a partir dos campos do resumo.',
    periodo: 'Intervalo selecionado no filtro de período.',
    fonte: 'Derivada em components/dashboard/FinanceiroHeroPanel.tsx:48',
  },

  'financeiro.comissao_faltante': {
    rotulo: 'Comissão ausente',
    definicao: 'Lives que geraram GMV mas ficaram sem comissão por falha de cadastro.',
    formula: 'COUNT de lives com GMV > 0 cuja marca não foi resolvida ou está com % de comissão de franquia igual a zero. Enquanto for > 0, Financeiro e Comissões não fecham.',
    periodo: 'Lives encerradas dentro do intervalo selecionado.',
    fonte: 'GET /v1/financeiro/resumo → comissao_faltante_count (routes/financeiro.js:92)',
  },
} as const satisfies Record<string, MetricDefinition>

export type MetricKey = keyof typeof METRIC_GLOSSARY
