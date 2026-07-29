import { useQuery } from '@tanstack/react-query'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { LoadingState, ErrorState } from '../ui/States'
import { extractErrorMessage } from '../../services/api'
import { getFunilAnalytics } from '../../services/domain'
import { asArray, asNumber, asString, getRecord } from '../../utils/format'
import type { JsonRecord } from '../../types/models'

interface Props {
  from: string
  to: string
  marcaId?: string
  apresentadoraId?: string
}

function pct(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${(n * 100).toFixed(1)}%`
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

  const data = getRecord(query.data)
  const etapas = asArray<JsonRecord>(data.etapas)
  const resumo = getRecord(data.resumo)
  const temDadosAds = Boolean(data.tem_dados_ads)
  const maxValor = etapas.reduce((max, etapa) => Math.max(max, asNumber(etapa.valor)), 0)

  return (
    <Card>
      <CardHeader>
        <p className="text-base font-bold tracking-[-0.01em] text-ink">Funil de conversão</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          Impressões → visualizações → produto → cliques → pedidos. Lives encerradas ≥ 5 min no período.
        </p>
      </CardHeader>
      <CardBody>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : etapas.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">Nenhuma live encerrada no período.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {etapas.map((etapa, idx) => {
                const valor = asNumber(etapa.valor)
                const width = maxValor > 0 ? Math.max(2, (valor / maxValor) * 100) : 0
                return (
                  <div key={asString(etapa.chave, String(idx))} className="flex items-center gap-3">
                    <div className="w-40 shrink-0 text-sm font-medium text-ink">{asString(etapa.label)}</div>
                    <div className="relative h-9 flex-1 overflow-hidden rounded-lg bg-surface-muted">
                      <div
                        className="flex h-full items-center rounded-lg bg-[var(--primary)] px-3 text-sm font-bold text-white transition-all"
                        style={{ width: `${width}%` }}
                      >
                        <span className="tabular-nums">{valor.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="w-28 shrink-0 text-right text-xs tabular-nums text-ink-muted">
                      {idx === 0 ? (
                        <span className="font-semibold text-ink">topo</span>
                      ) : (
                        <>
                          <span className="font-semibold text-ink">
                            {etapa.taxa_etapa == null ? '—' : pct(etapa.taxa_etapa)}
                          </span>
                          <span className="block text-[10px]">
                            {etapa.taxa_total == null ? '' : `${pct(etapa.taxa_total)} do topo`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Likes', asNumber(resumo.likes).toLocaleString('pt-BR')],
                ['% de likes', resumo.like_rate_medio == null ? '—' : `${asNumber(resumo.like_rate_medio).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`],
                ['Novos seguidores', asNumber(resumo.novos_seguidores).toLocaleString('pt-BR')],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-line bg-surface-muted p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{label}</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-ink">{value}</p>
                </div>
              ))}
            </div>

            {!temDadosAds ? (
              <p className="rounded-xl border border-dashed border-line bg-surface-muted/50 p-3 text-xs text-ink-muted">
                As etapas de impressões e cliques dependem do import do TikTok. Sem esses dados, o funil
                mostra só visualizações → pedidos. Use a seção “Importar relatório do TikTok” acima.
              </p>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
