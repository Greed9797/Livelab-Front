import { useQuery } from '@tanstack/react-query'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { LoadingState, ErrorState } from '../ui/States'
import { extractErrorMessage } from '../../services/api'
import { getFunilAnalytics } from '../../services/domain'
import { getRecord } from '../../utils/format'
import { buildAudienceMetrics } from '../../utils/audienceMetrics'

interface Props {
  from: string
  to: string
  marcaId?: string
  apresentadoraId?: string
}

function count(value: number | null): string {
  return value == null ? '—' : value.toLocaleString('pt-BR')
}

function percent(value: number | null): string {
  return value == null ? '—' : value.toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 1 })
}

export function FunilAnalyticsSection({ from, to, marcaId, apresentadoraId }: Props) {
  const query = useQuery({
    queryKey: ['funil-analytics', from, to, marcaId, apresentadoraId],
    queryFn: () => getFunilAnalytics({
      from,
      to,
      marca_id: marcaId || undefined,
      apresentadora_id: apresentadoraId || undefined,
    }),
    staleTime: 5 * 60_000,
  })
  const metrics = buildAudienceMetrics(getRecord(query.data))
  const groups: { title: string; items: [string, number | null][] }[] = [
    { title: 'Exposição da live', items: [
      ['Impressões da live', metrics.impressions],
      ['Visualizações / pico registrado', metrics.views],
    ] },
    { title: 'Interesse nos produtos', items: [
      ['Impressões de produto', metrics.productImpressions],
      ['Cliques no produto', metrics.clicks],
    ] },
    { title: 'Resultado e engajamento', items: [
      ['Pedidos', metrics.orders],
      ['Likes', metrics.likes],
      ['Novos seguidores', metrics.newFollowers],
    ] },
  ]

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-ink">Audiência e interação</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {marcaId ? 'Marca selecionada' : 'Todas as marcas'}{apresentadoraId ? ' · apresentadora selecionada' : ''}.
          {' '}Lives encerradas com pelo menos 5 minutos, no período do filtro.
        </p>
      </CardHeader>
      <CardBody>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : metrics.totalLives === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">Nenhuma live encerrada com pelo menos 5 minutos neste recorte.</p>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-ink-muted">
              {metrics.totalLives == null ? 'Lives do período' : `${count(metrics.totalLives)} lives no recorte`}.
              {' '}Impressões contam exibições e podem se repetir; não representam pessoas únicas.
            </p>
            <div className="grid gap-5 lg:grid-cols-3">
              {groups.map((group) => (
                <section key={group.title} className="min-w-0 border-t border-line pt-3">
                  <h3 className="text-sm font-semibold text-ink">{group.title}</h3>
                  <dl className="mt-3 space-y-3">
                    {group.items.map(([label, value]) => (
                      <div key={label} className="flex items-baseline justify-between gap-3">
                        <dt className="text-sm text-ink-muted">{label}</dt>
                        <dd className="shrink-0 text-lg font-semibold tabular-nums text-ink">{count(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
            <div className="rounded-xl bg-surface-muted p-4">
              <dl className="grid gap-4 sm:grid-cols-3">
                {[
                  ['Cliques / impressões de produto', percent(metrics.clicksPerProductImpression)],
                  ['Pedidos / cliques', percent(apresentadoraId ? null : metrics.ordersPerClick)],
                  ['Taxa média de likes · TikTok', metrics.reportedLikeRate == null ? '—' : `${metrics.reportedLikeRate.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-ink-muted">{label}</dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                As duas primeiras taxas relacionam os totais do período; não acompanham uma jornada individual.
                {' '}A taxa de likes é a média informada pelo TikTok.
                {apresentadoraId ? ' Pedidos por clique não é comparável neste filtro: os pedidos são atribuídos à apresentadora, mas os cliques abrangem a live.' : ''}
              </p>
            </div>
            <p className="text-xs leading-relaxed text-ink-muted">
              {metrics.hasCoverage
                ? 'Cada métrica soma os campos registrados no período. Zero registrado aparece como 0; ausência aparece como “—”. Importações antigas podem ter gravado zero para colunas ausentes no arquivo.'
                : metrics.hasAds
                ? 'Impressões e cliques dependem dos relatórios importados e podem cobrir só parte das lives.'
                : 'Não há valores positivos de impressões ou cliques neste recorte. O resumo atual não distingue ausência de importação de um relatório zerado.'}
              {' '}Registros antigos de visualizações podem usar o pico de espectadores como alternativa.
              {' '}“—” indica dado indisponível ou taxa sem base para cálculo.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
