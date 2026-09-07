import { Trophy } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { formatMoney } from '../../utils/format'
import type { PresenterPortalRankingRow } from '../../services/presenter-portal'

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words.length > 1 ? `${words[0][0]}${words.at(-1)?.[0] ?? ''}`.toUpperCase() : name.slice(0, 2).toUpperCase()
}

export function PortalRanking({ rows }: { rows: PresenterPortalRankingRow[] }) {
  const leader = Math.max(...rows.map((row) => row.gmv_total), 0)
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><Trophy className="h-5 w-5" /></span>
          <div><h2 className="text-lg font-bold text-ink">Ranking do mês</h2><p className="mt-1 text-sm text-ink-muted">GMV total entre apresentadoras da unidade.</p></div>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {rows.length === 0 ? <p className="p-6 text-sm text-ink-muted">Ainda não há lives concluídas neste mês.</p> : rows.map((row) => {
          const progress = leader > 0 ? Math.round((row.gmv_total / leader) * 100) : 0
          return <div key={row.apresentadora_id} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5 last:border-b-0">
            <span className="w-5 text-center text-sm font-black text-ink-muted">{row.posicao}</span>
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-muted text-xs font-bold text-ink">
              {row.foto_url ? <img src={row.foto_url} alt="" className="h-full w-full object-cover" /> : initials(row.nome)}
            </span>
            <div className="min-w-[6rem] flex-1"><p className="truncate text-sm font-semibold text-ink">{row.nome}</p><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} /></div></div>
            <div className="basis-full border-t border-line pt-3 text-left sm:basis-auto sm:border-t-0 sm:pt-0 sm:text-right"><p className="num text-sm font-bold text-ink">{formatMoney(row.gmv_total, true)}</p><p className="text-[11px] text-ink-muted">{row.total_lives} live{row.total_lives === 1 ? '' : 's'}</p><p className="mt-1 text-[11px] text-ink-muted">Fixo {row.fixo === null ? '—' : formatMoney(row.fixo, true)} · variável {row.comissao_variavel === null ? '—' : formatMoney(row.comissao_variavel, true)}</p><p className="num text-xs font-bold text-ink">Estimativa do período: {row.total_recebido === null ? '—' : formatMoney(row.total_recebido, true)}</p><p className="text-[10px] text-ink-muted">Não inclui adicionais ou extras.</p></div>
          </div>
        })}
      </CardBody>
    </Card>
  )
}
