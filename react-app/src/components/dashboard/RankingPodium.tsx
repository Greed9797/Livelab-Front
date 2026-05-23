import { Trophy } from 'lucide-react'
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

function getSubjectImage(item: JsonRecord, subject: Subject): string {
  if (subject === 'marca' || subject === 'unidade') return getBrandImage(item)
  return asString(item.foto_url ?? item.apresentadora_foto_url ?? item.avatar_url, '')
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
  const img = getSubjectImage(item, subject)
  const meta = metaKey ? asNumber(item[metaKey]).toLocaleString('pt-BR') : ''

  const barHeight = place === 1 ? 72 : place === 2 ? 48 : 34
  const avSize = place === 1 ? 76 : 64
  const tone = place === 1
    ? {
      accent: 'var(--primary)',
      soft: 'var(--primary-soft)',
      bar: 'linear-gradient(180deg, var(--primary), var(--primary-hover))',
      avatar: 'linear-gradient(160deg, var(--primary), oklch(0.70 0.15 50))',
      border: 'color-mix(in srgb, var(--primary) 62%, var(--border))',
      badgeText: '#fff',
    }
    : place === 2
      ? {
        accent: 'oklch(0.70 0.02 250)',
        soft: 'oklch(0.70 0.02 250 / 0.14)',
        bar: 'linear-gradient(180deg, oklch(0.72 0.02 250), oklch(0.52 0.02 250))',
        avatar: 'linear-gradient(160deg, oklch(0.72 0.02 250), oklch(0.52 0.02 250))',
        border: 'oklch(0.72 0.02 250 / 0.62)',
        badgeText: '#111',
      }
      : {
        accent: 'oklch(0.70 0.10 78)',
        soft: 'oklch(0.70 0.10 78 / 0.14)',
        bar: 'linear-gradient(180deg, oklch(0.72 0.11 78), oklch(0.50 0.09 78))',
        avatar: 'linear-gradient(160deg, oklch(0.72 0.11 78), oklch(0.50 0.09 78))',
        border: 'oklch(0.72 0.11 78 / 0.62)',
        badgeText: '#111',
      }
  const podShift = place === 1 ? '-translate-y-3' : ''
  const placeLabel = String(place)

  return (
    <div className={`relative flex flex-col items-center pt-[20px] text-center ${podShift}`}>
      {place === 1 ? (
        <div
          className="absolute -top-4 grid h-7 w-7 place-items-center rounded-full border"
          style={{ background: tone.soft, borderColor: tone.border, color: tone.accent }}
        >
          <Trophy className="h-4 w-4" />
        </div>
      ) : null}
      <div
        className="relative grid place-items-center overflow-hidden rounded-xl border-2 text-white font-bold tracking-wide"
        style={{
          width: avSize,
          height: avSize,
          background: tone.avatar,
          borderColor: place === 1 ? 'var(--bg-elev-1)' : tone.border,
          boxShadow: place === 1 ? '0 8px 22px -12px var(--primary)' : 'none',
          fontSize: place === 1 ? 22 : 20,
        }}
      >
        {img ? <img src={img} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" /> : null}
        {!img ? initials(name) : null}
        <span
          className="absolute bottom-1 right-1 grid h-5 min-w-5 place-items-center rounded-full border px-1 text-[10px] font-black leading-none"
          style={{ background: tone.accent, borderColor: 'var(--bg-elev-1)', color: tone.badgeText }}
        >
          {placeLabel}
        </span>
      </div>
      <p className={`mt-3 ${place === 1 ? 'text-[14.5px]' : 'text-[13.5px]'} font-bold tracking-[-0.005em] text-ink`}>{name}</p>
      {meta ? <p className="mt-1 text-[11px] text-ink-muted">{metaLabel}: <span className="num">{meta}</span></p> : null}
      <p className={`mt-2 ${place === 1 ? 'text-[18px]' : 'text-[16px]'} font-bold tabular-nums tracking-[-0.01em] text-brand`}>{formatMoney(value, true)}</p>
      <p className="mt-1 text-[11px] text-ink-muted">{valueLabel}</p>
      <div
        className="mt-3 grid w-full place-items-center rounded-t-lg border border-b-0"
        style={{ height: barHeight, background: tone.bar, borderColor: tone.border }}
      >
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
    <div className="relative overflow-hidden rounded-[10px] border border-line bg-surface px-5 pb-6 pt-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-brand/35" />
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
