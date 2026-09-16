/**
 * Glossário central de métricas — FONTE ÚNICA das definições exibidas na UI.
 *
 * Regra: cada entrada descreve o que o BACKEND realmente calcula, com a
 * referência arquivo:linha do repositório Livelab-back. Nada aqui é inferido
 * "pelo nome da métrica" — se a fórmula não pôde ser comprovada no código, a
 * métrica NÃO entra neste mapa.
 *
 * As chaves são prefixadas por tela para manter a origem de cada definição
 * explícita. A visão financeira antiga foi removida quando o DRE operacional
 * passou a ser a fonte única desta página; suas métricas não têm consumidor
 * de runtime e não permanecem no glossário.
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

} as const satisfies Record<string, MetricDefinition>

export type MetricKey = keyof typeof METRIC_GLOSSARY
