import type { JsonRecord } from '../types/models'
import { asArray, asString, getRecord } from './format'

export function audienceNumber(value: unknown): number | null {
  if (value == null || value === '' || typeof value === 'boolean') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function buildAudienceMetrics(data: JsonRecord) {
  const stages = asArray<JsonRecord>(data.etapas)
  const summary = getRecord(data.resumo)
  const coverage = getRecord(data.cobertura)
  const coverageFields: Record<string, string> = {
    impressoes: 'lives_com_impressoes_registradas',
    impressoes_produto: 'lives_com_impressoes_produto_registradas',
    cliques: 'lives_com_cliques_produto_registrados',
  }
  const hasCoverage = Object.values(coverageFields).every((field) => audienceNumber(coverage[field]) !== null)
  const hasAds = data.tem_dados_ads === true
  const stageValue = (key: string, requiresAds = false) => {
    if (requiresAds) {
      const recordedLives = audienceNumber(coverage[coverageFields[key]])
      if (recordedLives === 0 || (recordedLives === null && !hasAds)) return null
    }
    return audienceNumber(stages.find((stage) => asString(stage.chave) === key)?.valor)
  }
  const impressions = stageValue('impressoes', true)
  const views = stageValue('visualizacoes')
  const productImpressions = stageValue('impressoes_produto', true)
  const clicks = stageValue('cliques', true)
  const orders = stageValue('pedidos')
  const ratio = (numerator: number | null, denominator: number | null) => (
    numerator !== null && denominator !== null && denominator > 0 ? numerator / denominator : null
  )

  return {
    hasAds,
    hasCoverage,
    totalLives: audienceNumber(summary.total_lives),
    impressions,
    views,
    productImpressions,
    clicks,
    orders,
    // Relações entre totais, sem interpretar exposições repetidas como pessoas no funil.
    clicksPerProductImpression: ratio(clicks, productImpressions),
    ordersPerClick: ratio(orders, clicks),
    likes: audienceNumber(summary.likes),
    newFollowers: audienceNumber(summary.novos_seguidores),
    reportedLikeRate: audienceNumber(summary.like_rate_medio),
  }
}
