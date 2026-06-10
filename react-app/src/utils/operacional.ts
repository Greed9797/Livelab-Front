import type { BadgeTone } from '../components/ui/Badge'
import type { Metric } from '../types/models'
import { asNumber, formatMoney } from './format'

/** Tone values shared between Badge and Metric (excludes Badge-only 'sistema'). */
type MetricTone = NonNullable<Metric['tone']>

/**
 * Mapeia o status da API do painel operacional para o BadgeTone do design
 * system.
 *
 * ok            → success
 * atencao       → warning
 * critico       → danger
 * dados_incompletos → info (neutral-informativo)
 * qualquer outro → neutral
 */
export function operacionalStatusTone(status: unknown): BadgeTone {
  switch (status) {
    case 'ok':
      return 'success'
    case 'atencao':
      return 'warning'
    case 'critico':
      return 'danger'
    case 'dados_incompletos':
      return 'info'
    default:
      return 'neutral'
  }
}

/**
 * Mapeia o status do painel operacional para um rótulo em português.
 */
export function operacionalStatusLabel(status: unknown): string {
  switch (status) {
    case 'ok':
      return 'OK'
    case 'atencao':
      return 'Atenção'
    case 'critico':
      return 'Crítico'
    case 'dados_incompletos':
      return 'Incompleto'
    default:
      return 'Desconhecido'
  }
}

const NI = 'não informado'

/**
 * Formata um valor monetário — retorna 'não informado' quando o valor é null
 * ou undefined (≠ 0). NUNCA retorna "R$ 0,00" para null.
 */
export function formatMoneyOrNI(value: unknown): string {
  if (value === null || value === undefined) return NI
  return formatMoney(value)
}

/**
 * Calcula o tom de cor para o card de GMV/h vs meta.
 *
 * >= 100% → success
 * >= 70%  → warning
 * <  70%  → danger
 * null    → neutral  (não informado)
 *
 * Returns MetricTone so it is compatible with both MetricCard and Badge.
 */
export function gmvPorHoraTone(pctMeta: unknown): MetricTone {
  if (pctMeta === null || pctMeta === undefined) return 'neutral'
  const pct = asNumber(pctMeta)
  if (pct >= 100) return 'success'
  if (pct >= 70) return 'warning'
  return 'danger'
}

/**
 * Gera o hint para o card de GMV/h: ex. "73% da meta (R$ 500,00/h)".
 * Retorna 'não informado' quando não há dados suficientes.
 */
export function gmvPorHoraHint(pctMeta: unknown, metaGmvHora: unknown): string {
  if (pctMeta === null || pctMeta === undefined) return NI
  const pct = asNumber(pctMeta)
  const meta = metaGmvHora !== null && metaGmvHora !== undefined ? formatMoney(metaGmvHora) : null
  const metaPart = meta ? ` (${meta}/h)` : ''
  return `${pct.toFixed(0)}% da meta${metaPart}`
}
