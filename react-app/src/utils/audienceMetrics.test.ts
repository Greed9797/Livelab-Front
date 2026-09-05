import { describe, expect, it } from 'vitest'
import { audienceNumber, buildAudienceMetrics } from './audienceMetrics'

const stages = [
  { chave: 'impressoes', valor: 10000 },
  { chave: 'visualizacoes', valor: 100 },
  { chave: 'impressoes_produto', valor: 500 },
  { chave: 'cliques', valor: 25 },
  { chave: 'pedidos', valor: 2 },
]

describe('leitura de audiência e interação', () => {
  it('usa a cobertura por campo para distinguir zero de ausência com a flag legada falsa', () => {
    const metrics = buildAudienceMetrics({
      tem_dados_ads: false,
      cobertura: {
        lives_com_impressoes_registradas: 2,
        lives_com_impressoes_produto_registradas: 1,
        lives_com_cliques_produto_registrados: 0,
      },
      etapas: stages.map((stage) => ({ ...stage, valor: 0 })),
    })
    expect(metrics.hasCoverage).toBe(true)
    expect(metrics.impressions).toBe(0)
    expect(metrics.productImpressions).toBe(0)
    expect(metrics.clicks).toBeNull()
    expect(metrics.ordersPerClick).toBeNull()
  })

  it('a cobertura de um campo prevalece sobre a flag positiva de outro', () => {
    const metrics = buildAudienceMetrics({
      tem_dados_ads: true,
      cobertura: { lives_com_impressoes_registradas: 0 },
      etapas: stages,
    })
    expect(metrics.impressions).toBeNull()
    expect(metrics.clicks).toBe(25)
  })

  it('não transforma ausência de importação em zero impressões ou cliques', () => {
    const metrics = buildAudienceMetrics({ tem_dados_ads: false, etapas: stages })
    expect(metrics.impressions).toBeNull()
    expect(metrics.productImpressions).toBeNull()
    expect(metrics.clicks).toBeNull()
    expect(metrics.ordersPerClick).toBeNull()
    expect(metrics.views).toBe(100)
    expect(metrics.orders).toBe(2)
  })

  it('relaciona cliques a impressões de produto, sem usar visualizações como denominador', () => {
    const metrics = buildAudienceMetrics({ tem_dados_ads: true, etapas: stages })
    expect(metrics.clicksPerProductImpression).toBe(0.05)
    expect(metrics.ordersPerClick).toBe(0.08)
    expect(metrics.productImpressions).toBe(500)
  })

  it('preserva zero informado, mas não calcula taxas com denominador zero', () => {
    const metrics = buildAudienceMetrics({
      tem_dados_ads: true,
      etapas: stages.map((stage) => ({ ...stage, valor: 0 })),
      resumo: { total_lives: 1, likes: 0, novos_seguidores: 0, like_rate_medio: 0 },
    })
    expect(metrics.impressions).toBe(0)
    expect(metrics.likes).toBe(0)
    expect(metrics.reportedLikeRate).toBe(0)
    expect(metrics.clicksPerProductImpression).toBeNull()
    expect(metrics.ordersPerClick).toBeNull()
  })

  it('mantém campo ausente desconhecido e tolera números vindos como texto', () => {
    const metrics = buildAudienceMetrics({ tem_dados_ads: true, etapas: [{ chave: 'pedidos', valor: '12' }] })
    expect(metrics.orders).toBe(12)
    expect(metrics.clicks).toBeNull()
    expect(metrics.totalLives).toBeNull()
    for (const value of [null, undefined, '', 'invalido', -1, Infinity, false]) {
      expect(audienceNumber(value)).toBeNull()
    }
  })
})
