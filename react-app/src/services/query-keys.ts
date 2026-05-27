export const QK = {
  cabines: ['cabines'] as const,
  cabineHistorico: (id: string) => ['cabine-historico', id] as const,
  liveTiktokStatus: (id: string) => ['live-tiktok-status', id] as const,
  agenda: (params?: { start?: string; end?: string; date?: string; view?: string }) =>
    params ? ['agenda', params] as const : ['agenda'] as const,
  lives: ['lives'] as const,
  livesByStatus: (status: string) => ['lives', status] as const,
  homeDashboard: ['home-dashboard'] as const,
  rankingApresentadoras: (mes?: number) =>
    mes ? ['ranking-apresentadoras', mes] as const : ['ranking-apresentadoras'] as const,
  rankingMarcas: (mes?: number) =>
    mes ? ['ranking-marcas', mes] as const : ['ranking-marcas'] as const,
  comissoesResumo: ['comissoes-resumo'] as const,
  comissoesApresentadoras: ['comissoes-apresentadoras'] as const,
  comissoesMarcas: ['comissoes-marcas'] as const,
  comissoesPendentes: ['comissoes-pendentes'] as const,
  comissoesDaLive: (liveId: string) => ['comissoes-da-live', liveId] as const,
  comissoesPorLive: (mes: string) => ['comissoes-por-live', mes] as const,
  clientes: (scope?: string) => (scope ? ['clientes', scope] : ['clientes']) as readonly string[],
  marcas: (scope?: string) => (scope ? ['marcas', scope] : ['marcas']) as readonly string[],
  apresentadoras: (scope?: string) => (scope ? ['apresentadoras', scope] : ['apresentadoras']) as readonly string[],
  leads: ['leads'] as const,
  leadById: (id: string) => ['lead', id] as const,
  boletos: ['boletos'] as const,
  boletoDetalhe: (id: string) => ['boleto-detalhe', id] as const,
  boletoAlertas: ['boletos-alerta'] as const,
  videos: ['videos'] as const,
  apresentadoraFaixas: (id: string) => ['apresentadora-faixas', id] as const,
  apresentadoraFaixasComissao: (id?: string) =>
    id ? ['apresentadora-faixas-comissao', id] as const : ['apresentadora-faixas-comissao'] as const,
  clientePerfil: ['cliente-perfil'] as const,
  clienteReservas: ['cliente-reservas'] as const,
  clienteMeta: (period?: { mes: number; ano: number }) =>
    period ? ['cliente-meta', period.ano, period.mes] as const : ['cliente-meta'] as const,
  clienteAgenda: (params?: { start?: string; end?: string }) =>
    params ? ['cliente-agenda', params] as const : ['cliente-agenda'] as const,
  clienteDashboard: (period?: { mes: number; ano: number }) =>
    period ? ['cliente-dashboard', period] as const : ['cliente-dashboard'] as const,
  clienteLives: (period?: { mes: number; ano: number }) =>
    period ? ['cliente-lives', period] as const : ['cliente-lives'] as const,
  crmSummary: ['crm-summary'] as const,
  financeiroCustos: (mes?: string) =>
    mes ? ['financeiro-custos', mes] as const : ['financeiro-custos'] as const,
  financeiroResumo: ['financeiro-resumo'] as const,
  financeiroFaturamento: ['financeiro-faturamento'] as const,
  financeiroFluxo: ['financeiro-fluxo'] as const,
  financeiroFranqueadora: ['financeiro-franqueadora'] as const,
  financeiroClienteOperacional: (params?: { clienteKind?: string; clienteId?: string }) =>
    params ? ['financeiro-cliente-operacional', params] as const : ['financeiro-cliente-operacional'] as const,
  masterDashboard: (period?: { mes: number; ano: number }) =>
    period ? ['master-dashboard', period] as const : ['master-dashboard'] as const,
  masterUnits: (period?: { mes: number; ano: number }, status?: string) =>
    period ? ['master-units', period, status] as const : ['master-units'] as const,
  masterConsolidated: (period?: { mes: number; ano: number }) =>
    period ? ['master-consolidated', period] as const : ['master-consolidated'] as const,
  masterCrm: ['master-crm'] as const,
  configuracoes: (clienteMode?: boolean) =>
    clienteMode !== undefined ? ['configuracoes', clienteMode] as const : ['configuracoes'] as const,
  configuracoeRankingPublico: ['configuracoes-ranking-publico'] as const,
  publicRanking: ['public-ranking'] as const,
  publicRankingNacional: ['public-ranking', 'nacional'] as const,
  publicRankingApresentadoras: (unidadeId?: string) =>
    unidadeId ? ['public-ranking-apresentadoras', unidadeId] as const : ['public-ranking-apresentadoras'] as const,
  usuarios: ['usuarios'] as const,
  knowledgeCategories: ['knowledge-categories'] as const,
  knowledgeArticles: ['knowledge-articles'] as const,
  ativoOperacional: (params?: { kind?: string; id?: string }) =>
    params ? ['ativo-operacional', params] as const : ['ativo-operacional'] as const,
  historicoGmv: (liveId: string) => ['historico-gmv', liveId] as const,
  metaUnidade: (anoMes?: string) =>
    anoMes ? ['meta-unidade', anoMes] as const : ['meta-unidade'] as const,
  metasApresentadoras: (mes?: string) =>
    mes ? ['metas-apresentadoras', mes] as const : ['metas-apresentadoras'] as const,
  metasSupervisor: (mes?: string) =>
    mes ? ['metas-supervisor', mes] as const : ['metas-supervisor'] as const,
  analyticsDashboard: (period?: { mes: number; ano: number }) =>
    period ? ['analytics-dashboard', period] as const : ['analytics-dashboard'] as const,
}
