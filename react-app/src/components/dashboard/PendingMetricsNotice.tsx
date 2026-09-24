import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { asNumber, formatMoney } from '../../utils/format'

type PendingMetrics = { pendente_aprovacao?: unknown; em_conciliacao?: unknown; gmv_pendente_aprovacao?: unknown }

export function PendingMetricsNotice({ rows }: { rows: PendingMetrics[] }) {
  const pending = rows.filter(row => row.pendente_aprovacao)
  if (!pending.length) return null
  const collision = pending.some(row => row.em_conciliacao)
  const amount = pending.reduce((sum, row) => sum + asNumber(row.gmv_pendente_aprovacao), 0)
  const short = collision
    ? `Em conciliação · ${formatMoney(amount)} fora do total`
    : `Pendente aprovação · ${formatMoney(amount)}`
  return (
    <Link to="/lives?pendencia=validacao" role="status" className="flex h-10 items-center gap-2 rounded-[12px] border px-3 text-[13px] text-ink lg:block lg:h-auto lg:rounded-xl lg:p-3 lg:text-sm" style={{ background: '#1A1508', borderColor: '#3F3212', color: '#F8E3B8' }}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full lg:hidden" style={{ background: 'var(--warning)' }} />
      <span className="min-w-0 flex-1 truncate lg:hidden">{short}</span>
      <ChevronRight className="h-4 w-4 shrink-0 lg:hidden" aria-hidden="true" />
      <span className="hidden lg:inline">
        <strong>{collision ? 'Em conciliação — total consolidado indisponível.' : 'Valores operacionais provisórios.'}</strong>{' '}
        Pendente aprovação: {formatMoney(amount)}. {collision ? 'Os números exibidos são subtotais sem os envios com possível vínculo; o declarado pendente está discriminado separadamente.' : 'Incluído nas métricas e sujeito à validação.'}{' '}
        Comissões consideram somente registros validados.
      </span>
    </Link>
  )
}
