import { asNumber, formatMoney } from '../../utils/format'

type PendingMetrics = { pendente_aprovacao?: unknown; em_conciliacao?: unknown; gmv_pendente_aprovacao?: unknown }

export function PendingMetricsNotice({ rows }: { rows: PendingMetrics[] }) {
  const pending = rows.filter(row => row.pendente_aprovacao)
  if (!pending.length) return null
  const collision = pending.some(row => row.em_conciliacao)
  const amount = pending.reduce((sum, row) => sum + asNumber(row.gmv_pendente_aprovacao), 0)
  return <div role="status" className="rounded-xl border border-[var(--warning)]/40 bg-[var(--warning-soft)] p-3 text-sm text-ink">
    <strong>{collision ? 'Em conciliação — total consolidado indisponível.' : 'Valores operacionais provisórios.'}</strong>{' '}
    Pendente aprovação: {formatMoney(amount)}. {collision ? 'Os números exibidos são subtotais sem os envios com possível vínculo; o declarado pendente está discriminado separadamente.' : 'Incluído nas métricas e sujeito à validação.'}{' '}
    Comissões consideram somente registros validados.
  </div>
}
