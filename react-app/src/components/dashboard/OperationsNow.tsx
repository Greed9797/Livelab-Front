import { Link } from 'react-router-dom'
import { ArrowUpRight, CalendarDays } from 'lucide-react'
import type { JsonRecord } from '../../types/models'
import { asNumber, asString } from '../../utils/format'

export function OperationsNow({ cabines, today }: { cabines: JsonRecord[]; today: string }) {
  const lives = cabines.filter((cabine) => ['ao_vivo', 'live'].includes(asString(cabine.status)) && asString(cabine.live_atual_id, ''))
  return (
    <section aria-label="Operação agora" className="rounded-xl border border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Operação agora</h2>
          <p className="mt-1 text-xs text-ink-muted">{lives.length ? 'Abra a live para acompanhar ou revisar seu registro.' : 'Consulte a programação e os registros do dia.'} Este bloco acompanha hoje.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-surface-muted" to={`/agenda?data=${today}`}><CalendarDays className="h-4 w-4" aria-hidden="true" />Agenda de hoje</Link>
          <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-surface-muted" to="/lives?periodo=hoje&st=todas">Lives de hoje<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </div>
      {lives.length ? <ul className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2 xl:grid-cols-3">
        {lives.map((cabine) => <li key={asString(cabine.id)}>
          <Link to={`/lives?${new URLSearchParams({ st: 'em_andamento', live: asString(cabine.live_atual_id) })}`} className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 hover:bg-surface-muted">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{asString(cabine.cliente_nome, 'Live em andamento')} · Cabine {asString(cabine.numero)}</p>
              <p className="mt-1 text-xs text-ink-muted">{asNumber(cabine.duracao_min) > 240 ? 'Aberta há mais de 4h · conferir status' : 'Em andamento'}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-ink">Abrir<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></span>
          </Link>
        </li>)}
      </ul> : null}
    </section>
  )
}
