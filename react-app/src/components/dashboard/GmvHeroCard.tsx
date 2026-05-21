import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardBody } from '../ui/Card'
import { asNumber, formatMoney, formatPercent } from '../../utils/format'
import { liveCountLabel } from '../../utils/plural'

interface GmvHeroCardProps {
  gmvMes: unknown
  gmvLivesMes?: unknown
  gmvVideosMes?: unknown
  livesMes: unknown
  videosMes?: unknown
  ticketMedio: unknown
  variacaoMesAnterior: unknown
  comparacaoLabel?: unknown
}

export function GmvHeroCard({ gmvMes, gmvLivesMes, gmvVideosMes, livesMes, videosMes, ticketMedio, variacaoMesAnterior, comparacaoLabel }: GmvHeroCardProps) {
  const variation = asNumber(variacaoMesAnterior)
  const VariationIcon = variation >= 0 ? TrendingUp : TrendingDown
  const comparisonText = typeof comparacaoLabel === 'string' && comparacaoLabel.trim()
    ? comparacaoLabel
    : 'comparado com o mês anterior'

  return (
    <Card className="border-brand/25">
      <CardBody className="grid gap-5 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">GMV do mês</p>
          <p className="num mt-3 text-4xl font-extrabold leading-none text-ink md:text-5xl">{formatMoney(gmvMes, true)}</p>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-surface-muted px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Lives</p>
              <p className="num mt-1 text-lg font-extrabold text-ink">{formatMoney(gmvLivesMes, true)}</p>
              <p className="mt-1 text-xs text-ink-muted">{liveCountLabel(asNumber(livesMes))}</p>
            </div>
            <div className="rounded-2xl border border-line bg-surface-muted px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Vídeos</p>
              <p className="num mt-1 text-lg font-extrabold text-ink">{formatMoney(gmvVideosMes, true)}</p>
              <p className="mt-1 text-xs text-ink-muted">{asNumber(videosMes).toLocaleString('pt-BR')} vídeos gravados</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-line bg-surface-muted px-3 py-1.5 font-semibold text-ink">
              GMV médio por live {formatMoney(ticketMedio, true)}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface-muted p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <VariationIcon className="h-4 w-4 text-brand" />
            {formatPercent(variation)}
          </div>
          <p className="mt-2 text-xs text-ink-muted">{comparisonText}</p>
        </div>
      </CardBody>
    </Card>
  )
}
