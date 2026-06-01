import { useState } from 'react'
import { Badge } from '../ui/Badge'
import { getFaixaAtual, formatFaixaLabel } from '../../utils/faixaComissao'
import { asNumber } from '../../utils/format'
import type { JsonRecord } from '../../types/models'

interface Props {
  /** GMV acumulado da apresentadora no mês atual (em reais). */
  gmvMes: number
  /** Faixas de comissão da apresentadora (formato JsonRecord da API). */
  faixas: JsonRecord[]
}

/**
 * Badge that shows the current commission tier for an apresentadora.
 *
 * Cliff rule: the ENTIRE month's commission uses the % of the tier the
 * accumulated GMV falls into. When the presenter hits the next break,
 * commission rises retroactively for the full month.
 *
 * Weekend override (Sábado/Domingo): 2% fixo always overrides the tier.
 */
export function FaixaBadge({ gmvMes, faixas }: Props) {
  const [tooltipVisible, setTooltipVisible] = useState(false)

  if (!faixas || faixas.length === 0) return null

  const normalized = faixas.map((f) => ({
    gmv_inicio: asNumber(f.gmv_inicio),
    gmv_fim: f.gmv_fim != null ? asNumber(f.gmv_fim) : null,
    comissao_pct: asNumber(f.comissao_pct),
    ativo: f.ativo !== false,
  }))

  const faixaAtual = getFaixaAtual(gmvMes, normalized)

  if (!faixaAtual) return null

  const label = formatFaixaLabel(faixaAtual)

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
      onFocus={() => setTooltipVisible(true)}
      onBlur={() => setTooltipVisible(false)}
    >
      <Badge tone="info">{label}</Badge>

      {tooltipVisible ? (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-card)] text-xs text-ink-muted"
        >
          <p className="font-bold text-ink mb-1">Regra de faixa (cliff)</p>
          <p>
            TODA a comissão do mês usa o % da faixa em que o GMV acumulado caiu.
            Ao bater o próximo break, a comissão sobe retroativamente para o mês inteiro.
          </p>
          <p className="mt-2 border-t border-line pt-2 text-[10px] font-semibold text-ink-muted">
            Sábado/domingo: 2% fixo sobrepõe a faixa.
          </p>
        </div>
      ) : null}
    </span>
  )
}
