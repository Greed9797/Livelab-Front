import { Link } from 'react-router-dom'
import { ArrowRight, Circle } from 'lucide-react'
import type { JsonRecord } from '../../types/models'
import { asNumber, asString } from '../../utils/format'

export function OperationsNow({ cabines, today, gradeVazia = false }: { cabines: JsonRecord[]; today: string; gradeVazia?: boolean }) {
  const lives = cabines.filter((cabine) => ['ao_vivo', 'live'].includes(asString(cabine.status)) && asString(cabine.live_atual_id, ''))
  const primeiraLive = lives[0]
  return (
    <section aria-label="Operação agora" className="rounded-[var(--radius-panel)] border border-line bg-surface px-[18px] py-3 shadow-[var(--shadow-card)]" style={lives.length ? { borderColor: 'color-mix(in srgb, var(--danger) 45%, transparent)', background: 'linear-gradient(90deg, color-mix(in srgb, var(--danger) 14%, var(--bg-elev-1)), var(--bg-elev-1) 55%)' } : undefined}>
      {primeiraLive ? <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full px-2 text-[11px] font-extrabold tracking-[.08em] text-button-danger-foreground" style={{ background: 'var(--live)' }}><span className="live-pulse h-1.5 w-1.5 rounded-full bg-current" />AO VIVO</span>
        <span className="text-sm font-bold text-ink">Cabine {asString(primeiraLive.numero, '—')} · {asString(primeiraLive.apresentador_nome, 'Apresentadora a definir')} × {asString(primeiraLive.cliente_nome, 'Marca não informada')}</span>
        <span className="text-xs text-ink-muted">no ar há {asNumber(primeiraLive.duracao_min) || '—'} min</span>
        <span className="hidden h-6 w-px bg-line sm:block" />
        {primeiraLive.gmv_atual != null ? <span className="text-sm font-semibold text-ink">R$ {asNumber(primeiraLive.gmv_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-xs font-medium text-ink-muted">GMV nesta live</span></span> : null}
        <span className="text-xs text-ink-muted">{lives.length} de {cabines.length} cabines ocupadas agora</span>
        <Link to={`/lives?${new URLSearchParams({ st: 'em_andamento', live: asString(primeiraLive.live_atual_id) })}`} className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--primary-text)]">Acompanhar live <ArrowRight className="h-4 w-4" /></Link>
      </div> : <div className="flex min-h-7 flex-wrap items-center gap-3">
        <Circle className="h-2.5 w-2.5 fill-[var(--text-muted)] text-[var(--text-muted)]" aria-hidden="true" />
        <span className="text-sm font-semibold text-ink">Nenhuma live no ar</span>
        <span className="text-[13px] text-ink-muted">{gradeVazia ? 'Grade de hoje vazia.' : 'Consulte a programação e os registros de hoje.'}</span>
        <Link to={`/agenda?data=${today}`} className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--primary-text)]">Abrir agenda <ArrowRight className="h-4 w-4" /></Link>
      </div>}
    </section>
  )
}
