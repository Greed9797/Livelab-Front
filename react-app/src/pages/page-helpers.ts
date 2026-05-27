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

export function historyPoints(raw: unknown, labelKeys = ['label', 'mes', 'periodo', 'data', 'dia'], valueKeys = ['gmv', 'valor', 'total', 'receita', 'entradas']): ChartPoint[] {
  return asArray<JsonRecord>(raw).map((item, index) => {
    const labelValue = labelKeys.map((key) => item[key]).find((value) => value !== undefined)
    const value = valueKeys.map((key) => item[key]).find((candidate) => candidate !== undefined)
    return {
      label: asString(labelValue, `${index + 1}`),
      value: asNumber(value),
      secondary: asNumber(item.saidas ?? item.lives ?? item.qtd_lives ?? item.total_lives),
    }
  })
}

export function normalizeHome(raw: JsonRecord) {
  const resumo = raw.resumo_mes ? getRecord(raw.resumo_mes) : raw
  const cabines = asArray<JsonRecord>(raw.cabines)
  const liveCabines = cabines.filter((cabine) => asString(cabine.status, '').includes('ao_vivo'))
  const ocupacao = getRecord(raw.ocupacao_cabines_hoje)
  const livesMes = asNumber(raw.lives_mes ?? resumo.lives_mes)
  const videosMes = asNumber(raw.videos_mes ?? resumo.videos_mes)
  const gmvMes = raw.gmv_total_mes ?? resumo.gmv_total_mes ?? 0
  const gmvLivesMes = raw.gmv_lives_mes ?? resumo.gmv_lives_mes ?? 0
  const gmvVideosMes = raw.gmv_videos_mes ?? resumo.gmv_videos_mes ?? 0
  const ticketMedio = raw.ticket_medio_live_mes ?? (livesMes > 0 ? asNumber(gmvLivesMes) / livesMes : 0)
  const liveNow = asArray<JsonRecord>(raw.live_now ?? raw.lives_acontecendo_agora ?? liveCabines)
  const agendaHoje = asArray<JsonRecord>(raw.agenda_hoje ?? raw.agendaHoje)

  return {
    hero: {
      gmvMes,
      gmvLivesMes,
      gmvVideosMes,
      livesMes,
      videosMes,
      ticketMedio,
      variacaoMesAnterior: raw.variacao_gmv_mes_anterior_pct ?? raw.gmv_crescimento_pct ?? 0,
      comparacaoLabel: raw.comparacao_label ?? raw.gmv_comparacao_label,
    },
    metrics: [
      metric('Agenda de hoje', agendaHoje.length, undefined, 'info'),
      metric('Lives realizadas', livesMes.toLocaleString('pt-BR'), 'mês atual', 'brand'),
      metric('Vídeos gravados', videosMes.toLocaleString('pt-BR'), 'mês atual', 'info'),
      metric('Cabines em live', `${asNumber(raw.lives_ativas_agora ?? ocupacao.ao_vivo ?? liveNow.length)} / ${asNumber(ocupacao.operacionais ?? cabines.length)}`, `${asNumber(ocupacao.operacionais ?? cabines.length)} operacionais`, 'neutral'),
    ],
    liveNow,
    liveCabines: liveNow,
    occupancy: {
      live: asNumber(ocupacao.ao_vivo ?? liveCabines.length),
      total: asNumber(ocupacao.operacionais ?? cabines.length),
    },
    ranking: asArray<JsonRecord>(raw.ranking_marcas_mes),
    rankingMarcasMes: asArray<JsonRecord>(raw.ranking_marcas_mes),
    rankingApresentadoras: asArray<JsonRecord>(raw.ranking_apresentadoras_mes ?? raw.ranking_apresentadoras),
    upcoming: asArray<JsonRecord>(raw.proximas_lives_dia ?? raw.proximas_lives),
    agendaHoje,
  }
}

export function normalizeMaster(raw: JsonRecord) {
  const cards = getRecord(raw.cards)
  const bioTotals = getRecord(raw.bio_totals)
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
    pipeline: asArray<JsonRecord>(raw.crmPipeline ?? raw.crm_pipeline ?? raw.pipeline),
    crmSummary: getRecord(raw.crm_summary),
    crmTotals: getRecord(raw.crm_totals),
    bioTotals,
    bioPorPersona: asArray<JsonRecord>(raw.bio_por_persona),
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
