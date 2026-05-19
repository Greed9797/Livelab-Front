import type { ChartPoint, JsonRecord, Metric } from '../types/models'
import { asArray, asNumber, asString, formatMoney, formatPercent, getRecord } from '../utils/format'

export function metric(label: string, value: unknown, hint?: string, tone: Metric['tone'] = 'neutral'): Metric {
  return { label, value: String(value ?? '—'), hint, tone }
}

export function moneyMetric(label: string, value: unknown, hint?: string, tone: Metric['tone'] = 'brand'): Metric {
  return metric(label, formatMoney(value), hint, tone)
}

export function percentMetric(label: string, value: unknown, hint?: string, tone: Metric['tone'] = 'info'): Metric {
  return metric(label, formatPercent(value), hint, tone)
}

export function historyPoints(raw: unknown, labelKeys = ['label', 'mes', 'periodo', 'data'], valueKeys = ['gmv', 'valor', 'total', 'receita']): ChartPoint[] {
  return asArray<JsonRecord>(raw).map((item, index) => {
    const labelValue = labelKeys.map((key) => item[key]).find((value) => value !== undefined)
    const value = valueKeys.map((key) => item[key]).find((candidate) => candidate !== undefined)
    return {
      label: asString(labelValue, `${index + 1}`),
      value: asNumber(value),
      secondary: asNumber(item.lives ?? item.qtd_lives ?? item.total_lives),
    }
  })
}

export function normalizeHome(raw: JsonRecord) {
  const resumo = raw.resumo_mes ? getRecord(raw.resumo_mes) : raw
  const cabines = asArray<JsonRecord>(raw.cabines)
  const liveCabines = cabines.filter((cabine) => asString(cabine.status, '').includes('ao_vivo'))
  const ocupacao = getRecord(raw.ocupacao_cabines_hoje)
  const alertas = getRecord(raw.alertas)
  const livesMes = asNumber(raw.lives_mes ?? resumo.lives_mes)
  const gmvMes = raw.gmv_lives_mes ?? raw.gmv_mes ?? resumo.gmv_lives_mes ?? raw.fat_bruto
  const ticketMedio = raw.ticket_medio_live_mes ?? (livesMes > 0 ? asNumber(gmvMes) / livesMes : 0)
  const liveNow = asArray<JsonRecord>(raw.live_now ?? raw.lives_acontecendo_agora ?? liveCabines)
  const agendaHoje = asArray<JsonRecord>(raw.agenda_hoje ?? raw.agendaHoje)
  const operationalAlerts = asArray<JsonRecord>(raw.alertas_operacionais).length > 0
    ? asArray<JsonRecord>(raw.alertas_operacionais)
    : [
        { label: 'Conflitos de agenda', valor: alertas.conflitos_agenda ?? raw.conflitos_agenda ?? 0, prioridade: 'alta' },
        { label: 'Lives sem apresentadora definida', valor: raw.lives_sem_apresentador ?? 0, prioridade: 'media' },
        { label: 'Cabines em manutenção', valor: raw.cabines_manutencao ?? 0, prioridade: 'baixa' },
      ]

  return {
    hero: {
      gmvMes,
      livesMes,
      ticketMedio,
      variacaoMesAnterior: raw.variacao_gmv_mes_anterior_pct ?? raw.gmv_crescimento_pct ?? 0,
      comparacaoLabel: raw.comparacao_label ?? raw.gmv_comparacao_label,
    },
    metrics: [
      metric('Agenda de hoje', agendaHoje.length, agendaHoje.length === 1 ? '1 evento no dia' : `${agendaHoje.length} eventos no dia`, 'info'),
      moneyMetric('GMV ao vivo agora', raw.gmv_ao_vivo_agora ?? liveNow.reduce((acc, cabine) => acc + asNumber(cabine.gmv_atual), 0), liveNow.length ? 'soma das lives em andamento' : 'nenhuma cabine em live agora', 'success'),
      metric('Cabines em live', `${asNumber(raw.lives_ativas_agora ?? ocupacao.ao_vivo ?? liveNow.length)} / ${asNumber(ocupacao.operacionais ?? cabines.length)}`, `${asNumber(ocupacao.operacionais ?? cabines.length)} operacionais`, 'neutral'),
      metric('Alertas operacionais', operationalAlerts.reduce((acc, item) => acc + asNumber(item.valor ?? item.total ?? item.count ?? 0), 0), 'itens para revisar', 'warning'),
    ],
    liveNow,
    liveCabines: liveNow,
    alerts: [
      metric('Contratos aguardando', alertas.contratos_aguardando_assinatura ?? raw.contratos_aguardando_assinatura ?? 0, 'assinatura pendente', 'warning'),
      metric('Boletos vencidos', alertas.boletos_vencidos ?? raw.boletos_vencidos ?? 0, 'atenção financeira', 'danger'),
      metric('Conflitos de agenda', alertas.conflitos_agenda ?? raw.conflitos_agenda ?? 0, 'próximas 48h', 'neutral'),
    ],
    occupancy: {
      live: asNumber(ocupacao.ao_vivo ?? liveCabines.length),
      total: asNumber(ocupacao.operacionais ?? cabines.length),
    },
    ranking: asArray<JsonRecord>(raw.ranking_dia ?? raw.ranking ?? raw.ranking_clientes ?? raw.top_clientes),
    rankingGmvDia: asArray<JsonRecord>(raw.ranking_dia ?? raw.ranking ?? raw.ranking_clientes ?? raw.top_clientes),
    rankingApresentadoras: asArray<JsonRecord>(raw.ranking_apresentadoras_hoje ?? raw.ranking_apresentadoras ?? raw.ranking_apresentadores),
    upcoming: asArray<JsonRecord>(raw.proximas_lives_dia ?? raw.proximas_lives),
    agendaHoje,
    operationalAlerts,
  }
}

export function normalizeMaster(raw: JsonRecord) {
  const cards = getRecord(raw.cards)
  return {
    metrics: [
      moneyMetric('GMV da rede', cards.gmv_rede ?? raw.gmv_rede ?? raw.gmv_total, 'rede consolidada', 'brand'),
      metric('Unidades ativas', cards.unidades_ativas ?? raw.unidades_ativas ?? 0, 'franquias em operação', 'neutral'),
      metric('Clientes ativos', cards.clientes_ativos ?? raw.clientes_ativos ?? 0, 'clientes faturando', 'success'),
      moneyMetric('Comissões', cards.comissoes ?? raw.comissoes ?? getRecord(raw.commissionSummary).total, 'base de repasse', 'info'),
    ],
    history: historyPoints(raw.networkHistory ?? raw.history ?? raw.historico),
    growth: historyPoints(raw.unitGrowth ?? raw.crescimento_unidades, ['tenant_nome', 'nome', 'label'], ['growth', 'crescimento', 'gmv']),
    ranking: asArray<JsonRecord>(raw.revenueRanking ?? raw.ranking ?? raw.ranking_receita),
    alerts: asArray<JsonRecord>(raw.alerts ?? raw.alertas),
    pipeline: asArray<JsonRecord>(raw.crmPipeline ?? raw.pipeline),
  }
}

export function normalizeCliente(raw: JsonRecord) {
  return {
    metrics: [
      moneyMetric('GMV', raw.gmv ?? raw.gmv_mes ?? raw.gmv_total, 'vendas atribuídas às lives', 'brand'),
      moneyMetric('Valor investido', raw.valor_investido_lives ?? raw.valor_investido, 'proporcional a horas usadas', 'info'),
      metric('Lives realizadas', raw.total_lives ?? raw.lives_realizadas ?? 0, 'no período selecionado', 'neutral'),
      percentMetric('ROAS', raw.roas ?? raw.roas_mes, 'retorno sobre investimento', 'success'),
      metric('Horas de live', asNumber(raw.horas_live ?? raw.horas_live_mes).toFixed(1), 'consumo do pacote', 'neutral'),
      percentMetric('Meta GMV', raw.pct_meta ?? raw.percentual_meta, asString(raw.status_meta, 'ritmo do mês'), 'warning'),
    ],
    history: historyPoints(raw.historico_mensal ?? raw.history ?? raw.evolucao_mensal),
    upcoming: asArray<JsonRecord>(raw.proximas_lives),
    liveAtiva: getRecord(raw.live_ativa),
    lives: asArray<JsonRecord>(raw.lives),
    topHorarios: asArray<JsonRecord>(raw.top_horarios ?? raw.melhores_horarios),
  }
}
