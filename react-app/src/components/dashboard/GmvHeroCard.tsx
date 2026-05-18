import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardBody } from '../ui/Card'
import { asNumber, formatMoney, formatPercent } from '../../utils/format'

interface GmvHeroCardProps {
  gmvMes: unknown
  livesMes: unknown
  ticketMedio: unknown
  variacaoMesAnterior: unknown
}

export function GmvHeroCard({ gmvMes, livesMes, ticketMedio, variacaoMesAnterior }: GmvHeroCardProps) {
  const variation = asNumber(variacaoMesAnterior)
  const VariationIcon = variation >= 0 ? TrendingUp : TrendingDown

  return (
    <Card className="border-brand/25">
      <CardBody className="grid gap-5 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">GMV do mês</p>
          <p className="num mt-3 text-4xl font-extrabold leading-none text-ink md:text-5xl">{formatMoney(gmvMes, true)}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-line bg-surface-muted px-3 py-1.5 font-semibold text-ink">
              {asNumber(livesMes).toLocaleString('pt-BR')} lives realizadas
            </span>
            <span className="rounded-full border border-line bg-surface-muted px-3 py-1.5 font-semibold text-ink">
              Ticket medio {formatMoney(ticketMedio, true)}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface-muted p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <VariationIcon className="h-4 w-4 text-brand" />
            {formatPercent(variation)}
          </div>
          <p className="mt-2 text-xs text-ink-muted">comparado com o mês anterior</p>
        </div>
      </CardBody>
    </Card>
  )
}
