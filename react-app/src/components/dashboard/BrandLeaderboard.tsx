import { useMemo, type ReactNode } from 'react'
import { Target } from 'lucide-react'
import type { JsonRecord } from '../../types/models'
import { asNumber, asString, formatMoney } from '../../utils/format'
import { resolveMarcaCor } from '../../utils/brandColor'
import { getBrandImage } from '../../utils/favicon'

type BrandLeaderboardProps = {
  rows: JsonRecord[]
  title?: string
  subtitle?: string
  action?: ReactNode
  limit?: number
  emptyLabel?: string
}

type BrandRow = {
  key: string
  name: string
  initials: string
  logoUrl: string
  color: string
  gmvPorHora: number
  faturamento: number
  horasLive: number
  lives: number
  /** null = marca sem meta configurada (backend não chuta valor). */
  pctMeta: number | null
  /** % da barra relativa ao líder em GMV/h. */
  progress: number
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'
}

function normalizeRows(rows: JsonRecord[], limit?: number): BrandRow[] {
  const mapped = rows.map((r, i) => {
    const marcaId = asString(r.marca_id, '')
    const name = asString(r.nome ?? r.marca_nome, 'Sem marca')
    // Cor manual (marcas.cor, migration 125) ganha; NULL cai no hash
    // determinístico por id — a mesma cor da Grade/Agenda em toda a app.
    const color = marcaId ? resolveMarcaCor(r.cor, marcaId) : 'var(--text-muted)'
    const pctRaw = r.pct_meta_hora
    return {
      key: marcaId || `marca-${i}`,
      name,
      initials: initialsOf(name),
      logoUrl: getBrandImage(r),
      color,
      gmvPorHora: asNumber(r.gmv_por_hora),
      faturamento: asNumber(r.faturamento ?? r.gmv_total ?? r.gmv),
      horasLive: asNumber(r.horas_live),
      lives: asNumber(r.lives ?? r.total_lives),
      pctMeta: pctRaw == null ? null : asNumber(pctRaw),
      progress: 0,
    }
  })

  // Métrica principal do card = eficiência (GMV/h), não faturamento bruto.
  const ordered = mapped
    .filter((row) => row.gmvPorHora > 0 || row.faturamento > 0)
    .sort((a, b) => b.gmvPorHora - a.gmvPorHora)

  const top = typeof limit === 'number' ? ordered.slice(0, limit) : ordered
  const lider = top[0]?.gmvPorHora ?? 0

  return top.map((row) => ({
    ...row,
    progress: lider > 0 ? Math.min(100, (row.gmvPorHora / lider) * 100) : 0,
  }))
}

function metaTone(pct: number) {
  if (pct >= 100) return { color: 'var(--success-text)', borderColor: 'color-mix(in srgb, var(--success) 46%, transparent)', background: 'var(--success-soft)' }
  if (pct >= 80) return { color: 'var(--info-text)', borderColor: 'color-mix(in srgb, var(--info) 42%, transparent)', background: 'var(--info-soft)' }
  return { color: 'var(--warning-text)', borderColor: 'color-mix(in srgb, var(--warning) 42%, transparent)', background: 'var(--warning-soft)' }
}

function MetaBadge({ pct }: { pct: number | null }) {
  if (pct == null) {
    return <span className="text-[11px] font-semibold text-ink-muted">sem meta</span>
  }
  return (
    <span
      className="num inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-bold"
      style={metaTone(pct)}
    >
      <Target className="h-3 w-3" />
      {pct.toFixed(0)}%
    </span>
  )
}

function BrandLogo({ row }: { row: BrandRow }) {
  return (
    <div
      className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[10px] text-[13px] font-black"
      style={{
        background: `${row.color}1f`,
        border: `1px solid ${row.color}59`,
        color: row.color,
      }}
    >
      {row.logoUrl ? (
        <img src={row.logoUrl} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        row.initials
      )}
    </div>
  )
}

// Literais completos de propósito: o scanner do Tailwind v4 só gera a classe
// se ela aparecer inteira no source — classe montada em runtime não sai no CSS.
const GRID = 'md:grid-cols-[44px_minmax(200px,1.1fr)_minmax(220px,1fr)_140px_92px]'
const GRID_HEAD = 'grid-cols-[44px_minmax(200px,1.1fr)_minmax(220px,1fr)_140px_92px]'

function BrandLeaderboardRow({ row, index }: { row: BrandRow; index: number }) {
  return (
    <div
      className={`grid gap-4 px-5 py-3 md:items-center ${GRID}`}
      style={{
        borderTop: index === 0 ? 'none' : '1px solid var(--divider)',
        background: 'transparent',
      }}
    >
      <div
        className="text-[13px] font-bold leading-none md:text-center"
        style={{ color: index === 0 ? 'var(--primary-text)' : 'var(--text-muted)' }}
      >
        {index + 1}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <BrandLogo row={row} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold tracking-[-0.01em] text-ink">{row.name}</p>
          <p className="num mt-0.5 text-[11px] font-semibold text-ink-muted">
            {row.horasLive > 0 ? `${row.horasLive.toFixed(1).replace('.', ',')} h no ar` : 'sem horas no ar'}
            {row.lives > 0 ? ` · ${row.lives} live${row.lives !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <p className="num text-xl font-black tracking-[-0.02em] text-ink">
            {formatMoney(row.gmvPorHora, true)}
            <span className="text-sm font-bold text-ink-muted">/h</span>
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full"
            style={{
              width: `${row.progress}%`,
              background: index === 0 ? 'var(--primary)' : 'var(--alt)',
            }}
          />
        </div>
        <p className="mt-1 text-[11px] font-semibold text-ink-muted">
          {row.progress.toFixed(0)}% do líder em GMV/h
        </p>
      </div>

      <div className="text-left md:text-right">
        <p className="num text-[15px] font-bold text-ink">{formatMoney(row.faturamento, true)}</p>
      </div>

      <div className="flex md:justify-end">
        <MetaBadge pct={row.pctMeta} />
      </div>
    </div>
  )
}

export function BrandLeaderboard({
  rows,
  title = 'Ranking de marcas',
  subtitle = 'Eficiência do mês · GMV por hora no ar',
  action,
  limit,
  emptyLabel = 'Nenhuma marca com GMV registrado neste mês.',
}: BrandLeaderboardProps) {
  const allBrands = useMemo(() => normalizeRows(rows), [rows])
  const brands = typeof limit === 'number' ? allBrands.slice(0, limit) : allBrands
  const remainingBrands = allBrands.slice(brands.length)

  return (
    <section
      className="overflow-hidden rounded-xl"
      style={{
        background: 'var(--bg-elev-1)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-7 py-6" style={{ borderBottom: '1px solid var(--divider)' }}>
        <div>
          <h2 className="text-lg font-bold tracking-[-0.015em] text-ink">{title}</h2>
          <p className="mt-1 text-[13px] text-ink-muted">{subtitle}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {brands.length > 0 ? (
        <div>
          <div className={`hidden gap-4 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-ink-muted md:grid ${GRID_HEAD}`}>
            <span>RK</span>
            <span>Marca</span>
            <span>GMV/h · vs líder</span>
            <span className="text-right">Faturamento</span>
            <span className="text-right">Meta/h</span>
          </div>
          {brands.map((row, index) => (
            <BrandLeaderboardRow key={row.key} row={row} index={index} />
          ))}
          {remainingBrands.length > 0 ? <p className="border-t border-line px-5 py-3 text-[13px] text-ink-muted">
            Mais {remainingBrands.length} {remainingBrands.length === 1 ? 'marca' : 'marcas'} no ranking: {remainingBrands.slice(0, 3).map(row => row.name).join(', ')}{remainingBrands.length > 3 ? '…' : ''}.
          </p> : null}
        </div>
      ) : (
        <div className="px-5 py-12 text-center text-sm text-ink-muted">{emptyLabel}</div>
      )}
    </section>
  )
}
