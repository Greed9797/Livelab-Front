/**
 * Utilities for cliff-based commission tiers (faixas de comissão).
 *
 * Cliff logic: the ENTIRE month's commission uses the % of whichever tier
 * the accumulated GMV falls into. When the next break is hit, commission
 * rises retroactively for the full month.
 */

export interface Faixa {
  gmv_inicio: number
  gmv_fim: number | null
  comissao_pct: number
  ativo?: boolean
}

/**
 * Espelho do fallback do backend (DEFAULT_APRESENTADORA_COMISSAO_FAIXAS):
 * escada exibida/comparada enquanto tenant_comissao_faixas_default estiver
 * vazia. Fonte única no front — não duplicar em páginas.
 */
export const FALLBACK_ESCADA: (Faixa & Record<string, unknown>)[] = [
  { gmv_inicio: 0, gmv_fim: 70000, comissao_pct: 1 },
  { gmv_inicio: 70000.01, gmv_fim: 150000, comissao_pct: 1.5 },
  { gmv_inicio: 150000.01, gmv_fim: null, comissao_pct: 2 },
]

/**
 * Returns the active tier that contains `gmvMes`, or null if no tiers exist.
 * Only considers tiers where `ativo !== false`.
 */
export function getFaixaAtual(gmvMes: number, faixas: Faixa[]): Faixa | null {
  const active = faixas.filter((f) => f.ativo !== false)
  if (active.length === 0) return null

  // Sort ascending by gmv_inicio so we find the highest matching tier.
  const sorted = [...active].sort((a, b) => a.gmv_inicio - b.gmv_inicio)

  let best: Faixa | null = null
  for (const faixa of sorted) {
    if (gmvMes >= faixa.gmv_inicio) {
      if (faixa.gmv_fim === null || gmvMes < faixa.gmv_fim) {
        best = faixa
        break
      }
      // gmv_fim is exclusive upper bound — keep looking for a higher tier.
      best = faixa
    }
  }

  return best
}

/**
 * Human-readable label for a tier badge.
 * Example: "1% (R$ 50k–150k)" or "2% (acima de R$ 150k)"
 */
export function formatFaixaLabel(faixa: Faixa): string {
  const pct = `${faixa.comissao_pct.toLocaleString('pt-BR')}%`

  const inicio = faixa.gmv_inicio
  const fim = faixa.gmv_fim

  const fmt = (v: number) => {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
    if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`
    return `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
  }

  if (fim === null) return `${pct} (acima de ${fmt(inicio)})`
  return `${pct} (${fmt(inicio)}–${fmt(fim)})`
}
