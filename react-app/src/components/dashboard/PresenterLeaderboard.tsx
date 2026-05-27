import type { ReactNode } from 'react'
import { Crown, Flame, Medal, Sparkles } from 'lucide-react'
import type { JsonRecord } from '../../types/models'
import { asArray, asNumber, asString, formatMoney } from '../../utils/format'

type PresenterLeaderboardProps = {
  rows: JsonRecord[]
  title?: string
  subtitle?: string
  action?: ReactNode
  limit?: number
  variant?: 'compact' | 'full'
  emptyLabel?: string
}

type PresenterRow = {
  key: string
  name: string
  initials: string
  avatarUrl: string
  cabine: string
  gmv: number
  lives: number
  pedidos: number
  commission: number
  progress: number
  sparkline: number[]
  badges: Array<{ label: string; tone: 'gold' | 'red' | 'green' | 'blue' }>
}

function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function getPresenterLeaderboardName(row: JsonRecord): string {
  return asString(row.nome ?? row.apresentadora_nome ?? row.apresentador_nome, '—')
}

export function getPresenterLeaderboardProgress(gmv: number, maxGmv: number): number {
  if (maxGmv <= 0 || gmv <= 0) return 0
  return clamp(Number(((gmv / maxGmv) * 100).toFixed(2)))
}

export function getPresenterSparklinePoints(row: JsonRecord, index = 0): number[] {
  const realSeries = asArray<unknown>(row.sparkline ?? row.gmv_diario ?? row.serie_diaria)
    .map((point) => asNumber(point))
    .filter((point) => Number.isFinite(point) && point >= 0)

  if (realSeries.length >= 2) {
    const max = Math.max(...realSeries)
    return realSeries.slice(-7).map((point) => getPresenterLeaderboardProgress(point, max))
  }

  const gmv = asNumber(row.gmv ?? row.gmv_total)
  const lives = asNumber(row.lives ?? row.total_lives)
  const pedidos = asNumber(row.pedidos)
  const seed = Math.max(1, Math.round(gmv + lives * 37 + pedidos * 11 + index * 23))
  const base = clamp(Math.log10(gmv + 10) * 18, 18, 74)

  return Array.from({ length: 7 }, (_, i) => {
    const climb = gmv > 0 ? i * 4.2 : 0
    const pulse = Math.sin((seed % 19) + i * 0.9) * 8
    const liveBoost = lives > 0 ? Math.min(10, lives) : 0
    return Math.round(clamp(base + climb + pulse + liveBoost))
  })
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0 || name === '—') return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function getPresenterCabine(row: JsonRecord): string {
  const direct = asString(row.cabine_nome ?? row.cabine_label ?? row.cabine, '')
  if (direct) return direct
  const number = asNumber(row.cabine_numero)
  return number > 0 ? `C-${String(number).padStart(2, '0')}` : ''
}

function getPresenterCommission(row: JsonRecord): number {
  return asNumber(
    row.total_recebido ??
      row.ganho_total ??
      row.comissao_apresentadora ??
      row.comissao_variavel ??
      row.comissao,
  )
}

function buildBadges(row: JsonRecord, index: number): PresenterRow['badges'] {
  const badges: PresenterRow['badges'] = []
  const gmv = asNumber(row.gmv ?? row.gmv_total)
  const lives = asNumber(row.lives ?? row.total_lives)
  const pctMeta = asNumber(row.pct_meta, -1)

  if (index === 0 && gmv > 0) badges.push({ label: 'Topo do mês', tone: 'gold' })
  else if (index < 3 && gmv > 0) badges.push({ label: 'Pódio', tone: 'gold' })

  if (pctMeta >= 100) badges.push({ label: 'Meta batida', tone: 'green' })
  else if (lives >= 4) badges.push({ label: 'Em alta', tone: 'green' })
  else if (lives > 0) badges.push({ label: 'Ativa', tone: 'blue' })
  else if (gmv > 0) badges.push({ label: 'GMV atribuído', tone: 'blue' })

  if (index === 0 && lives >= 7) badges.unshift({ label: 'Streak', tone: 'red' })
  return badges.slice(0, 3)
}

function normalizeRows(rows: JsonRecord[], limit?: number): PresenterRow[] {
  const visibleRows = typeof limit === 'number' ? rows.slice(0, limit) : rows
  const maxGmv = visibleRows.reduce((max, row) => Math.max(max, asNumber(row.gmv ?? row.gmv_total)), 0)

  return visibleRows.map((row, index) => {
    const name = getPresenterLeaderboardName(row)
    const gmv = asNumber(row.gmv ?? row.gmv_total)
    const lives = asNumber(row.lives ?? row.total_lives)

    return {
      key: asString(row.id ?? row.apresentadora_id, String(index)),
      name,
      initials: initialsFromName(name),
      avatarUrl: asString(row.foto_url ?? row.apresentadora_foto_url ?? row.avatar_url, ''),
      cabine: getPresenterCabine(row),
      gmv,
      lives,
      pedidos: asNumber(row.pedidos),
      commission: getPresenterCommission(row),
      progress: getPresenterLeaderboardProgress(gmv, maxGmv),
      sparkline: getPresenterSparklinePoints(row, index),
      badges: buildBadges(row, index),
    }
  })
}

function positionTone(index: number) {
  if (index === 0) return {
    number: 'linear-gradient(135deg, oklch(0.92 0.08 86), var(--primary))',
    ring: 'linear-gradient(135deg, oklch(0.90 0.10 88), var(--primary), oklch(0.55 0.14 42))',
    fill: 'linear-gradient(145deg, color-mix(in srgb, var(--primary) 46%, var(--bg-elev-2)), oklch(0.34 0.08 42))',
  }
  if (index === 1) return {
    number: 'linear-gradient(135deg, oklch(0.85 0.02 250), oklch(0.58 0.02 250))',
    ring: 'linear-gradient(135deg, oklch(0.82 0.02 250), oklch(0.50 0.02 250))',
    fill: 'linear-gradient(145deg, oklch(0.30 0.04 220), oklch(0.22 0.03 220))',
  }
  if (index === 2) return {
    number: 'linear-gradient(135deg, oklch(0.78 0.10 60), oklch(0.54 0.10 42))',
    ring: 'linear-gradient(135deg, oklch(0.74 0.12 58), oklch(0.48 0.12 42))',
    fill: 'linear-gradient(145deg, oklch(0.31 0.06 310), oklch(0.22 0.05 310))',
  }
  return {
    number: 'linear-gradient(135deg, var(--text-secondary), var(--text-faint))',
    ring: 'var(--border-strong)',
    fill: 'var(--bg-elev-3)',
  }
}

function badgeStyle(tone: PresenterRow['badges'][number]['tone']) {
  if (tone === 'gold') return {
    color: 'oklch(0.86 0.11 82)',
    borderColor: 'oklch(0.70 0.12 70 / 0.46)',
    background: 'oklch(0.34 0.06 62 / 0.34)',
  }
  if (tone === 'red') return {
    color: 'oklch(0.82 0.15 24)',
    borderColor: 'oklch(0.66 0.18 24 / 0.42)',
    background: 'oklch(0.33 0.08 24 / 0.35)',
  }
  if (tone === 'green') return {
    color: 'var(--success)',
    borderColor: 'color-mix(in srgb, var(--success) 46%, transparent)',
    background: 'var(--success-soft)',
  }
  return {
    color: 'var(--info)',
    borderColor: 'color-mix(in srgb, var(--info) 42%, transparent)',
    background: 'var(--info-soft)',
  }
}

function Sparkline({ points, highlight }: { points: number[]; highlight: boolean }) {
  const safePoints = points.length >= 2 ? points : [0, 0]
  const width = 112
  const height = 34
  const max = Math.max(...safePoints, 1)
  const min = Math.min(...safePoints)
  const range = Math.max(1, max - min)
  const polyline = safePoints
    .map((point, index) => {
      const x = (index / Math.max(1, safePoints.length - 1)) * width
      const y = height - ((point - min) / range) * (height - 6) - 3
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-28" aria-hidden="true">
      <polyline
        fill="none"
        points={polyline}
        stroke={highlight ? 'var(--primary)' : 'var(--text-muted)'}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <polygon
        points={`0,${height} ${polyline} ${width},${height}`}
        fill={highlight ? 'var(--primary)' : 'var(--text-muted)'}
        opacity="0.08"
      />
    </svg>
  )
}

function Badge({ badge }: { badge: PresenterRow['badges'][number] }) {
  const style = badgeStyle(badge.tone)
  const Icon = badge.tone === 'gold' ? Crown : badge.tone === 'red' ? Flame : badge.tone === 'green' ? Medal : Sparkles
  return (
    <span
      className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-bold"
      style={style}
    >
      <Icon className="h-3 w-3" />
      {badge.label}
    </span>
  )
}

function Avatar({ row, index }: { row: PresenterRow; index: number }) {
  const tone = positionTone(index)
  const isPodium = index < 3

  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full p-[2px] ${isPodium ? 'h-14 w-14' : 'h-12 w-12'}`}
      style={{ background: tone.ring, boxShadow: isPodium ? '0 0 22px color-mix(in srgb, var(--primary) 22%, transparent)' : 'none' }}
    >
      <div
        className="relative grid h-full w-full place-items-center overflow-hidden rounded-full text-sm font-black text-white"
        style={{ background: tone.fill }}
      >
        {row.avatarUrl ? (
          <img src={row.avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : null}
        {!row.avatarUrl ? row.initials : null}
        {isPodium ? (
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2"
            style={{ background: index === 0 ? 'var(--primary)' : index === 1 ? 'var(--info)' : 'oklch(0.62 0.12 48)', borderColor: 'var(--bg-elev-1)' }}
          />
        ) : null}
      </div>
    </div>
  )
}

function PresenterLeaderboardRow({ row, index, variant }: { row: PresenterRow; index: number; variant: 'compact' | 'full' }) {
  const tone = positionTone(index)
  const showMeta = row.lives > 0 || row.pedidos > 0
  const gmvPerLive = row.lives > 0 ? row.gmv / row.lives : 0
  const gridClass = variant === 'full'
    ? 'md:grid-cols-[44px_minmax(230px,1.2fr)_minmax(220px,1fr)_110px_120px]'
    : 'md:grid-cols-[38px_minmax(210px,1.2fr)_minmax(180px,0.8fr)_110px]'

  return (
    <div
      className={`grid gap-4 px-4 py-4 md:items-center ${gridClass}`}
      style={{
        borderTop: index === 0 ? 'none' : '1px solid var(--divider)',
        background: index === 0 ? 'linear-gradient(90deg, color-mix(in srgb, var(--primary) 10%, transparent), transparent 62%)' : 'transparent',
      }}
    >
      <div
        className="serif text-4xl leading-none md:text-center"
        style={{ background: tone.number, WebkitBackgroundClip: 'text', color: 'transparent' }}
      >
        {index + 1}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <Avatar row={row} index={index} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[15px] font-extrabold tracking-[-0.01em] text-ink">{row.name}</p>
            {row.cabine ? (
              <span className="rounded-md border border-line bg-surface-muted px-1.5 py-0.5 text-[11px] font-bold text-ink-muted">
                {row.cabine}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {row.badges.map((badge) => <Badge key={badge.label} badge={badge} />)}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <p className="num text-xl font-black tracking-[-0.02em] text-ink">{formatMoney(row.gmv, true)}</p>
          {showMeta ? (
            <p className="hidden text-right text-xs font-semibold text-ink-muted md:block">
              {row.lives > 0 ? `${row.lives} live${row.lives !== 1 ? 's' : ''}` : ''}
              {row.lives > 0 && row.pedidos > 0 ? ' · ' : ''}
              {row.pedidos > 0 ? `${row.pedidos}/live` : ''}
            </p>
          ) : null}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full"
            style={{
              width: `${row.progress}%`,
              background: index === 0
                ? 'linear-gradient(90deg, var(--primary), oklch(0.82 0.12 70))'
                : 'linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 42%, var(--text-muted)))',
            }}
          />
        </div>
        <p className="mt-1 text-[11px] font-semibold text-ink-muted">
          {row.progress.toFixed(0)}% do líder{gmvPerLive > 0 ? ` · ${formatMoney(gmvPerLive, true)}/live` : ''}
        </p>
      </div>

      {variant === 'full' ? (
        <div className="hidden md:block">
          <Sparkline points={row.sparkline} highlight={index === 0} />
        </div>
      ) : null}

      <div className="text-left md:text-right">
        <p className="num text-lg font-black text-[var(--success)]">{row.commission > 0 ? formatMoney(row.commission, true) : '—'}</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">Comissão</p>
      </div>
    </div>
  )
}

export function PresenterLeaderboard({
  rows,
  title = 'Ranking de apresentadoras',
  subtitle = 'Progresso vs. líder',
  action,
  limit,
  variant = 'compact',
  emptyLabel = 'Nenhuma apresentadora com GMV registrado neste mês.',
}: PresenterLeaderboardProps) {
  const presenters = normalizeRows(rows, limit)

  return (
    <section
      className="overflow-hidden rounded-xl"
      style={{
        background: 'var(--bg-elev-1)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-muted">
            <span className="serif normal-case text-base tracking-normal text-brand">Ranking</span> de apresentadoras
          </p>
          <h3 className="mt-0.5 text-base font-extrabold tracking-[-0.01em] text-ink">{title}</h3>
          <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {presenters.length > 0 ? (
        <div>
          <div
            className={`hidden px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-ink-muted md:grid ${
              variant === 'full'
                ? 'grid-cols-[44px_minmax(230px,1.2fr)_minmax(220px,1fr)_110px_120px]'
                : 'grid-cols-[38px_minmax(210px,1.2fr)_minmax(180px,0.8fr)_110px]'
            } gap-4`}
          >
            <span>RK</span>
            <span>Apresentadora</span>
            <span>GMV · progresso vs líder</span>
            {variant === 'full' ? <span>Pulso</span> : null}
            <span className="text-right">Comissão</span>
          </div>
          {presenters.map((row, index) => (
            <PresenterLeaderboardRow key={row.key} row={row} index={index} variant={variant} />
          ))}
        </div>
      ) : (
        <div className="px-5 py-12 text-center text-sm text-ink-muted">{emptyLabel}</div>
      )}
    </section>
  )
}
