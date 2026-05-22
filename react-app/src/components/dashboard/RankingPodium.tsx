import type { JsonRecord } from '../../types/models'
import { asNumber, asString, formatMoney } from '../../utils/format'
import { getBrandImage } from '../../utils/favicon'

type Subject = 'apresentadora' | 'marca' | 'unidade'

type Props = {
  data: JsonRecord[]
  subject: Subject
  valueKey?: string
  valueLabel?: string
  metaKey?: string
  metaLabel?: string
}

const NAME_FALLBACKS: Record<Subject, string[]> = {
  apresentadora: ['apresentadora_nome', 'nome', 'apresentador_nome'],
  marca: ['marca_nome', 'nome', 'cliente_nome'],
  unidade: ['nome', 'tenant_nome', 'cliente_nome'],
}

function getName(item: JsonRecord, subject: Subject): string {
  for (const key of NAME_FALLBACKS[subject]) {
    const v = asString(item[key], '')
    if (v) return v
  }
  return '—'
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function PodiumCard({ item, place, subject, valueKey, valueLabel, metaKey, metaLabel }: {
  item: JsonRecord
  place: 1 | 2 | 3
  subject: Subject
  valueKey: string
  valueLabel: string
  metaKey?: string
  metaLabel?: string
}) {
  const name = getName(item, subject)
  const value = item[valueKey] ?? item.gmv ?? item.valor
  const img = subject === 'marca' ? getBrandImage(item) : ''
  const meta = metaKey ? asNumber(item[metaKey]).toLocaleString('pt-BR') : ''

  const barHeight = place === 1 ? 'h-[72px]' : place === 2 ? 'h-[48px]' : 'h-[32px]'
  const barBg = place === 1
    ? 'bg-gradient-to-b from-brand to-[#FFA570] shadow-[0_0_24px_rgba(232,93,44,0.4)]'
    : place === 2
      ? 'bg-gradient-to-b from-[#9CA3AF] to-[#6B7280]'
      : 'bg-gradient-to-b from-[#C2913A] to-[#8C661F]'
  const avSize = place === 1 ? 'h-[76px] w-[76px] text-[22px]' : 'h-[64px] w-[64px] text-[20px]'
  const avRing = place === 1 ? 'shadow-[0_0_0_4px_rgba(232,93,44,0.25),0_6px_22px_rgba(232,93,44,0.5)]' : 'shadow-md'
  const avColor = place === 1
    ? 'bg-gradient-to-br from-brand to-[#FFA570]'
    : place === 2
      ? 'bg-gradient-to-br from-[#9CA3AF] to-[#6B7280]'
      : 'bg-gradient-to-br from-[#C2913A] to-[#8C661F]'
  const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉'
  const podShift = place === 1 ? '-translate-y-3' : ''
  const placeLabel = String(place)

  return (
    <div className={`relative flex flex-col items-center pt-[18px] text-center ${podShift}`}>
      {place === 1 ? <div className="absolute -top-6 text-[28px] drop-shadow-[0_2px_8px_rgba(232,93,44,0.6)] animate-bounce">👑</div> : null}
      <div className={`${avSize} ${avColor} ${avRing} relative grid place-items-center rounded-2xl border-[3px] border-surface text-white font-bold tracking-wide overflow-hidden`}>
        {img ? <img src={img} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" /> : null}
        {!img ? initials(name) : null}
      </div>
      <div className="mt-[-12px] mb-1 text-[22px] drop-shadow-sm">{medal}</div>
      <p className={`mt-0.5 ${place === 1 ? 'text-[14.5px]' : 'text-[13.5px]'} font-bold tracking-[-0.005em]`}>{name}</p>
      {meta ? <p className="mt-1 text-[11px] text-ink-muted">{metaLabel}: <span className="num">{meta}</span></p> : null}
      <p className={`mt-2 ${place === 1 ? 'text-[18px]' : 'text-[16px]'} font-bold tabular-nums tracking-[-0.01em] text-brand`}>{formatMoney(value, true)}</p>
      <p className="mt-1 text-[11px] text-ink-muted">{valueLabel}</p>
      <div className={`mt-3 w-full grid place-items-center rounded-t-lg ${barHeight} ${barBg}`}>
        <span className={`${place === 1 ? 'text-[38px]' : 'text-[32px]'} font-extrabold tracking-[-0.04em] leading-none text-white/85`}>{placeLabel}</span>
      </div>
    </div>
  )
}

export function RankingPodium({ data, subject, valueKey = 'gmv_total', valueLabel = 'GMV', metaKey, metaLabel }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-muted">
        Nenhum dado para o ranking ainda.
      </div>
    )
  }

  const top3 = [data[0], data[1], data[2]].filter(Boolean)
  if (top3.length === 0) return null
  const ordered: Array<{ item: JsonRecord; place: 1 | 2 | 3 } | null> = [
    top3[1] ? { item: top3[1], place: 2 } : null,
    top3[0] ? { item: top3[0], place: 1 } : null,
    top3[2] ? { item: top3[2], place: 3 } : null,
  ]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-[rgba(232,93,44,0.14)] to-transparent px-6 pb-7 pt-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(232,93,44,0.18),transparent_70%)]" />
      <div className="relative grid grid-cols-3 items-end gap-3.5">
        {ordered.map((slot, idx) => slot ? (
          <PodiumCard
            key={asString(slot.item.id ?? slot.item.apresentadora_id ?? slot.item.marca_id, String(idx))}
            item={slot.item}
            place={slot.place}
            subject={subject}
            valueKey={valueKey}
            valueLabel={valueLabel}
            metaKey={metaKey}
            metaLabel={metaLabel}
          />
        ) : (
          <div key={`empty-${idx}`} />
        ))}
      </div>
    </div>
  )
}
