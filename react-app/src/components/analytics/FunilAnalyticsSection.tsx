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
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">Alcance e interesse</p>
            <h2 className="mt-0.5 text-base font-semibold text-ink">Audiência e interação</h2>
          </div>
          <p className="text-xs text-ink-muted">{marcaId ? 'Marca selecionada' : 'Todas as marcas'}{apresentadoraId ? ' · apresentadora selecionada' : ''}</p>
        </div>
      </CardHeader>
      <CardBody>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : metrics.totalLives === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">Nenhuma live encerrada com pelo menos 5 minutos neste recorte.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-muted/40 px-3 py-2.5 text-sm">
              <span className="font-semibold text-ink">{metrics.totalLives == null ? 'Lives do período' : `${count(metrics.totalLives)} lives analisadas`}</span>
              <span className="text-xs text-ink-muted">Encerradas com pelo menos 5 min</span>
            </div>
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
            <div className="rounded-xl border border-line bg-surface-muted/60 p-4">
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
              <p className="mt-3 text-xs leading-relaxed text-ink-muted">Taxas calculadas sobre os totais do período; não representam uma jornada individual.{apresentadoraId ? ' Pedidos por clique não se aplica ao filtro de apresentadora.' : ''}</p>
            </div>
            <div role="note" aria-label="Qualidade dos dados" className="rounded-lg border border-line px-3 py-2.5 text-xs leading-5 text-ink-muted">
              <span className="font-semibold text-ink">Qualidade dos dados:</span>{' '}
              {metrics.hasCoverage
                ? 'zero registrado é 0; “—” indica ausência ou taxa sem base. Importações antigas podem ter gravado zero quando uma coluna não existia.'
                : metrics.hasAds
                ? 'impressões e cliques dependem dos relatórios importados e podem cobrir só parte das lives.'
                : 'não há valores positivos de impressões ou cliques; o resumo não separa ausência de importação de relatório zerado.'}
              <details className="mt-1.5">
                <summary className="cursor-pointer font-semibold text-ink">Ver critérios</summary>
                <p className="mt-1">Impressões são exibições, não pessoas únicas. Registros antigos de visualizações podem usar o pico de espectadores.</p>
              </details>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
