import type { JsonRecord } from '../../types/models'
import { formatMoney } from '../../utils/format'
import { rankingGmv, rankingId, rankingImage, rankingName } from '../../utils/ranking'

type Props = {
  data: JsonRecord[]
  valueKey?: string
  nameKey?: string
  imageKey?: 'marca'
  limit?: number
}

export function RankingBars({ data, valueKey = 'gmv_total', nameKey = 'nome', imageKey, limit = 10 }: Props) {
  const rows = (data ?? []).slice(0, limit)
  if (rows.length === 0) return null
  const subject = imageKey === 'marca' ? 'marca' : 'apresentadora'
  const max = rows.reduce((acc, r) => Math.max(acc, rankingGmv(r)), 0) || 1

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => {
        const value = valueKey === 'gmv_total' ? rankingGmv(row) : Number(row[valueKey] ?? 0)
        const pct = Math.max(2, (value / max) * 100)
        const name = nameKey === 'nome' ? rankingName(row, subject) : String(row[nameKey] ?? '—')
        const img = rankingImage(row, subject)
        return (
          <div key={rankingId(row, subject) || String(idx)} className="grid grid-cols-[22px_28px_1fr_auto] items-center gap-3">
            <span className="num text-xs font-bold text-ink-muted">#{idx + 1}</span>
            {img ? (
              <img src={img} alt="" loading="lazy" decoding="async" className="h-7 w-7 rounded-md object-cover" />
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-soft text-[10px] font-bold text-brand">
                {name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div>
              <p className="truncate text-sm font-semibold text-ink">{name}</p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-[#FFA570]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <span className="num text-sm font-bold tabular-nums text-ink">{formatMoney(value, true)}</span>
          </div>
        )
      })}
    </div>
  )
}
