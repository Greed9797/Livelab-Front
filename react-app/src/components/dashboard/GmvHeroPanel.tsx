import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { asNumber, formatMoney } from '../../utils/format'
import type { JsonRecord } from '../../types/models'

interface GmvHeroPanelProps {
  raw: JsonRecord
}

interface IntradayPoint {
  h: string
  v: number | null
  prev: number | null
}

interface DailyPoint {
  dia: number
  gmv: number
  pedidos: number
  /** GMV do mesmo dia no mês anterior (série comparativa tracejada). */
  prev: number
}

/* ── helpers ── */

/**
 * Tooltip dos gráficos SVG artesanais. Posicionado por proporção do eixo X;
 * vira para a esquerda depois da metade para não vazar do card.
 */
function ChartTooltip({
  xRatio,
  title,
  rows,
}: {
  xRatio: number
  title: string
  rows: Array<{ label: string; value: string; color?: string }>
}) {
  const flip = xRatio > 0.6
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-lg border border-line bg-surface px-3 py-2 shadow-[var(--shadow-card)]"
      style={{
        left: `${xRatio * 100}%`,
        top: 8,
        transform: flip ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)',
        minWidth: 150,
      }}
    >
      <p className="mb-1 text-[11px] font-bold text-ink">{title}</p>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 text-[11px]">
          <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            {row.color ? (
              <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: row.color }} />
            ) : null}
            {row.label}
          </span>
          <span className="num font-semibold" style={{ color: 'var(--text-primary)' }}>{row.value}</span>
        </div>
      ))}
    </div>
  )
}

export function fmtCompact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
  if (v >= 1_000) return `${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

/** Counts business days (Mon–Fri) for the current month in America/Sao_Paulo. */
export function computeBusinessDays(): { diaUtil: number; diasUteisTotal: number } {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }),
  )
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  let diaUtil = 0
  let diasUteisTotal = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay()
    if (dow !== 0 && dow !== 6) {
      diasUteisTotal++
      if (d <= today) diaUtil++
    }
  }
  return { diaUtil, diasUteisTotal }
}

/** Calculates ritmo projetado (projected GMV at end of month given current pace). */
export function calcRitmoProjetado(gmv: number, diaUtil: number, diasUteisTotal: number): number {
  if (diaUtil <= 0 || diasUteisTotal <= 0) return 0
  return (gmv / diaUtil) * diasUteisTotal
}

/**
 * Returns the current day in America/Sao_Paulo timezone (1-based).
 * Exported for testing purposes.
 */
export function getTodaySP(): number {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }),
  )
  return now.getDate()
}

/* ── sub-components ── */

function DeltaPill({ v }: { v: number }) {
  const pos = v >= 0
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium num"
      style={{
        background: pos ? 'var(--success-soft)' : 'var(--danger-soft)',
        color: pos ? 'var(--success)' : 'var(--danger)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {pos ? '+' : ''}{v.toFixed(1)}%
    </span>
  )
}

interface MetaBarProps {
  gmv: number
  meta: number | null
  metaOrigem: string | null
  diaUtil: number
  diasUteisTotal: number
  ritmo: number | null
}

function MetaBar({ gmv, meta, metaOrigem, diaUtil, diasUteisTotal, ritmo }: MetaBarProps) {
  if (meta === null) {
    return (
      <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
        Meta não definida · defina em Configurações → Metas
      </div>
    )
  }

  const pct = meta > 0 ? Math.min((gmv / meta) * 100, 100) : 0
  const falta = meta > gmv ? meta - gmv : 0
  const ritmoVal = ritmo ?? calcRitmoProjetado(gmv, diaUtil, diasUteisTotal)
  const ritmoPct = meta > 0 ? (ritmoVal / meta) * 100 : 0
  const barFilled = pct >= 100

  return (
    <div className="flex flex-col gap-1.5">
      {/* row 1 */}
      <div
        className="flex items-center justify-between gap-4 text-[11px] flex-wrap"
        style={{ color: 'var(--text-muted)' }}
      >
        <span>
          Meta ·{' '}
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            R$ {meta.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          {metaOrigem === 'diaria_legada' ? (
            <span style={{ color: 'var(--text-faint)' }}> · derivada da meta diária antiga</span>
          ) : null}
        </span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
          {pct.toFixed(1).replace('.', ',')}% realizado
        </span>
      </div>

      {/* 6px progress bar */}
      <div className="relative rounded-full overflow-hidden" style={{ height: 6, background: 'var(--border)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: barFilled ? 'var(--success)' : 'var(--primary)',
          }}
        />
        {/* target tick at 100% edge */}
        <div
          className="absolute top-[-3px] bottom-[-3px] w-[2px] rounded"
          style={{ right: 0, background: 'var(--text-muted)', opacity: 0.4 }}
        />
      </div>

      {/* row 2 */}
      <div
        className="flex items-center justify-between gap-4 text-[11px] flex-wrap"
        style={{ color: 'var(--text-muted)' }}
      >
        <span>
          Dia útil{' '}
          <span className="num" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {diaUtil}/{diasUteisTotal}
          </span>
          {falta > 0 && (
            <>
              {' '}· faltam{' '}
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                R$ {fmtCompact(falta)}
              </span>
            </>
          )}
        </span>
        <span>
          Ritmo projetado{' '}
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            R$ {fmtCompact(ritmoVal)}
          </span>
          {' '}·{' '}
          <span
            style={{
              color: ritmoPct >= 100 ? 'var(--success)' : 'var(--text-muted)',
              fontWeight: ritmoPct >= 100 ? 500 : 400,
            }}
          >
            {ritmoPct.toFixed(0)}% da meta
          </span>
        </span>
      </div>
    </div>
  )
}

/* ── Shared chart constants ── */

const CHART_W = 1000
const CHART_H = 220
const PAD = { l: 36, r: 12, t: 14, b: 26 }

/* ── Intraday SVG chart (port of design GMVChart) ── */

function buildIntradayPaths(data: IntradayPoint[]) {
  const innerW = CHART_W - PAD.l - PAD.r
  const innerH = CHART_H - PAD.t - PAD.b

  const allVals = data.flatMap((d) => [d.v, d.prev]).filter((v): v is number => v != null)
  if (allVals.length === 0) return null

  const maxV = Math.max(...allVals)
  const niceMax = Math.ceil(maxV / 500) * 500 || 1000

  const xFn = (i: number) => PAD.l + (i / Math.max(data.length - 1, 1)) * innerW
  const yFn = (v: number) => PAD.t + innerH - (v / niceMax) * innerH

  // today: skip null segments
  let currPath = ''
  let currAreaPath = ''
  let firstX: number | null = null
  let lastX: number | null = null
  data.forEach((d, i) => {
    if (d.v == null) return
    const X = xFn(i)
    const Y = yFn(d.v)
    if (currPath === '') { currPath = `M ${X} ${Y}`; firstX = X }
    else currPath += ` L ${X} ${Y}`
    lastX = X
  })
  if (firstX != null && lastX != null) {
    currAreaPath = `${currPath} L ${lastX} ${yFn(0)} L ${firstX} ${yFn(0)} Z`
  }

  // prev: full dashed traversal
  let prevPath = ''
  data.forEach((d, i) => {
    if (d.prev == null) return
    const X = xFn(i)
    const Y = yFn(d.prev)
    prevPath += prevPath === '' ? `M ${X} ${Y}` : ` L ${X} ${Y}`
  })

  // "now" = last index with non-null v
  let nowIdx = -1
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].v != null) { nowIdx = i; break }
  }

  const YTICK_COUNT = 4
  const yticks = Array.from({ length: YTICK_COUNT + 1 }, (_, i) => ({
    val: (niceMax * i) / YTICK_COUNT,
    y: yFn((niceMax * i) / YTICK_COUNT),
  }))

  return { currPath, currAreaPath, prevPath, xFn, yFn, nowIdx, yticks }
}

function IntradayChart({ data }: { data: IntradayPoint[] }) {
  const paths = useMemo(() => buildIntradayPaths(data), [data])
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  if (!paths) return null

  const { currPath, currAreaPath, prevPath, xFn, yFn, nowIdx, yticks } = paths
  const nowX = nowIdx >= 0 ? xFn(nowIdx) : null
  const nowY = nowIdx >= 0 && data[nowIdx].v != null ? yFn(data[nowIdx].v as number) : null
  const gradId = 'gmvIntradayGrad'
  const hovered = hoveredIdx != null ? data[hoveredIdx] : null

  function onMove(event: ReactMouseEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width === 0 || data.length === 0) return
    const ratio = (event.clientX - rect.left) / rect.width
    const idx = Math.round(ratio * (data.length - 1))
    setHoveredIdx(Math.min(Math.max(idx, 0), data.length - 1))
  }

  return (
    <div style={{ position: 'relative', height: CHART_H }}>
      <svg
        data-testid="gmv-chart-intraday"
        width="100%"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        style={{ display: 'block', height: CHART_H }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines + y labels */}
        {yticks.map(({ val, y }) => (
          <g key={val}>
            <line
              x1={PAD.l} y1={y} x2={CHART_W - PAD.r} y2={y}
              stroke="var(--border)" strokeWidth="0.8" vectorEffect="non-scaling-stroke"
            />
            <text
              x={PAD.l - 4} y={y + 3}
              fontSize="9" fill="var(--text-faint)"
              textAnchor="end"
              fontFamily="var(--font-mono, monospace)"
            >
              {fmtCompact(val)}
            </text>
          </g>
        ))}

        {/* x axis labels — every other hour */}
        {data.map((d, i) =>
          i % 2 === 0 ? (
            <text
              key={d.h}
              x={xFn(i)}
              y={CHART_H - 8}
              fontSize="9"
              fill="var(--text-faint)"
              textAnchor="middle"
              fontFamily="var(--font-mono, monospace)"
            >
              {d.h}h
            </text>
          ) : null,
        )}

        {/* prev dashed line */}
        {prevPath && (
          <path
            d={prevPath}
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="1.25"
            strokeDasharray="3 4"
            opacity="0.6"
          />
        )}

        {/* today area fill */}
        {currAreaPath && <path d={currAreaPath} fill={`url(#${gradId})`} />}

        {/* today line */}
        {currPath && (
          <path
            d={currPath}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.75"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* "now" vertical marker + dot */}
        {nowX != null && nowY != null && (
          <g>
            <line
              x1={nowX} x2={nowX}
              y1={PAD.t} y2={PAD.t + (CHART_H - PAD.t - PAD.b)}
              stroke="var(--primary)" strokeWidth="1"
              strokeDasharray="2 3" opacity="0.5"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={nowX} cy={nowY}
              r="3.5"
              fill="var(--primary)"
              stroke="var(--bg-elev-1)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}

        {/* guia + dots do ponto sob o cursor */}
        {hovered && hoveredIdx != null && (
          <g pointerEvents="none">
            <line
              x1={xFn(hoveredIdx)} x2={xFn(hoveredIdx)}
              y1={PAD.t} y2={PAD.t + (CHART_H - PAD.t - PAD.b)}
              stroke="var(--text-muted)" strokeWidth="1" opacity="0.5"
              vectorEffect="non-scaling-stroke"
            />
            {hovered.v != null && <circle cx={xFn(hoveredIdx)} cy={yFn(hovered.v)} r="3.5" fill="var(--primary)" />}
            {hovered.prev != null && (
              <circle cx={xFn(hoveredIdx)} cy={yFn(hovered.prev)} r="3" fill="var(--text-muted)" opacity="0.8" />
            )}
          </g>
        )}

        {/* overlay de captura do mouse */}
        <rect
          x={PAD.l} y={PAD.t}
          width={CHART_W - PAD.l - PAD.r} height={CHART_H - PAD.t - PAD.b}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={() => setHoveredIdx(null)}
        />
      </svg>

      {hovered && hoveredIdx != null && (
        <ChartTooltip
          xRatio={(xFn(hoveredIdx) - PAD.l) / (CHART_W - PAD.l - PAD.r)}
          title={`${hovered.h}h`}
          rows={[
            { label: 'Hoje', value: hovered.v != null ? formatMoney(hovered.v) : '—', color: 'var(--primary)' },
            { label: 'Mês anterior', value: hovered.prev != null ? formatMoney(hovered.prev) : '—', color: 'var(--text-muted)' },
          ]}
        />
      )}
    </div>
  )
}

/* ── Daily SVG chart (fallback when intraday is empty) ── */

interface DailyChartProps {
  data: DailyPoint[]
  /** 'YYYY-MM' string from payload — used to determine if we clip future days */
  mesReferencia: string | null
}

function buildDailyPaths(data: DailyPoint[], todayDia: number, isCurrentMonth: boolean) {
  const innerW = CHART_W - PAD.l - PAD.r
  const innerH = CHART_H - PAD.t - PAD.b

  // For current month: clip points to todayDia; for past months: use all
  const visibleData = isCurrentMonth ? data.filter((p) => p.dia <= todayDia) : data
  if (visibleData.length === 0) return null

  // A escala considera as duas séries — senão a linha do mês anterior sai do gráfico.
  const allVals = [
    ...visibleData.map((p) => p.gmv),
    ...data.map((p) => p.prev ?? 0),
  ].filter((v) => v > 0)
  if (allVals.length === 0) return null

  const maxV = Math.max(...allVals)
  const niceMax = Math.ceil(maxV / 500) * 500 || 1000

  // Total days in month for x-axis scaling
  const totalDays = data.length

  const xFn = (dia: number) => PAD.l + ((dia - 1) / Math.max(totalDays - 1, 1)) * innerW
  const yFn = (v: number) => PAD.t + innerH - (v / niceMax) * innerH

  // Build line + area paths
  let linePath = ''
  let areaPath = ''
  let firstX: number | null = null
  let lastX: number | null = null

  visibleData.forEach((p) => {
    const X = xFn(p.dia)
    const Y = yFn(p.gmv)
    if (linePath === '') { linePath = `M ${X} ${Y}`; firstX = X }
    else linePath += ` L ${X} ${Y}`
    lastX = X
  })

  if (firstX != null && lastX != null) {
    areaPath = `${linePath} L ${lastX} ${yFn(0)} L ${firstX} ${yFn(0)} Z`
  }

  // Série comparativa do mês anterior (mês inteiro, tracejada cinza).
  let prevPath = ''
  data.forEach((p) => {
    const value = p.prev ?? 0
    const X = xFn(p.dia)
    const Y = yFn(value)
    prevPath += prevPath === '' ? `M ${X} ${Y}` : ` L ${X} ${Y}`
  })
  const hasPrev = data.some((p) => (p.prev ?? 0) > 0)

  const YTICK_COUNT = 4
  const yticks = Array.from({ length: YTICK_COUNT + 1 }, (_, i) => ({
    val: (niceMax * i) / YTICK_COUNT,
    y: yFn((niceMax * i) / YTICK_COUNT),
  }))

  // x-axis day labels: every ~5 days
  const xLabels = data
    .filter((p) => p.dia === 1 || p.dia % 5 === 0)
    .map((p) => ({ dia: p.dia, x: xFn(p.dia) }))

  // "today" vertical marker x-position (only when current month)
  const todayX = isCurrentMonth && data.some((p) => p.dia === todayDia)
    ? xFn(todayDia)
    : null

  return { linePath, areaPath, prevPath, hasPrev, xFn, yFn, yticks, xLabels, todayX, visibleData }
}

function DailyChart({ data, mesReferencia }: DailyChartProps) {
  const todayDia = useMemo(() => getTodaySP(), [])
  const [hovered, setHovered] = useState<DailyPoint | null>(null)

  const isCurrentMonth = useMemo(() => {
    if (!mesReferencia) return true
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return mesReferencia === currentYm
  }, [mesReferencia])

  const paths = useMemo(
    () => buildDailyPaths(data, todayDia, isCurrentMonth),
    [data, todayDia, isCurrentMonth],
  )

  if (!paths) return null

  const { linePath, areaPath, prevPath, hasPrev, xFn, yFn, yticks, xLabels, todayX, visibleData } = paths
  const gradId = 'gmvDailyGrad'

  // Do X do cursor (em coordenadas do viewBox) acha o ponto mais próximo.
  function onMove(event: ReactMouseEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width === 0 || visibleData.length === 0) return
    const xView = ((event.clientX - rect.left) / rect.width) * (CHART_W - PAD.l - PAD.r) + PAD.l
    let closest = visibleData[0]
    for (const p of visibleData) {
      if (Math.abs(xFn(p.dia) - xView) < Math.abs(xFn(closest.dia) - xView)) closest = p
    }
    setHovered(closest)
  }

  return (
    <div style={{ position: 'relative', height: CHART_H }}>
      <svg
        data-testid="gmv-chart-daily"
        width="100%"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        style={{ display: 'block', height: CHART_H }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines + y labels */}
        {yticks.map(({ val, y }) => (
          <g key={val}>
            <line
              x1={PAD.l} y1={y} x2={CHART_W - PAD.r} y2={y}
              stroke="var(--border)" strokeWidth="0.8" vectorEffect="non-scaling-stroke"
            />
            <text
              x={PAD.l - 4} y={y + 3}
              fontSize="9" fill="var(--text-faint)"
              textAnchor="end"
              fontFamily="var(--font-mono, monospace)"
            >
              {fmtCompact(val)}
            </text>
          </g>
        ))}

        {/* x axis labels — every ~5 days */}
        {xLabels.map(({ dia, x }) => (
          <text
            key={dia}
            x={x}
            y={CHART_H - 8}
            fontSize="9"
            fill="var(--text-faint)"
            textAnchor="middle"
            fontFamily="var(--font-mono, monospace)"
          >
            {String(dia).padStart(2, '0')}
          </text>
        ))}

        {/* area fill */}
        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}

        {/* mês anterior — tracejada cinza (mesmo padrão do IntradayChart) */}
        {hasPrev && prevPath && (
          <path
            d={prevPath}
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="1.25"
            strokeDasharray="3 4"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.6"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* main line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.75"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* "today" vertical marker (only in current month) */}
        {todayX != null && (
          <line
            x1={todayX} x2={todayX}
            y1={PAD.t} y2={PAD.t + (CHART_H - PAD.t - PAD.b)}
            stroke="var(--primary)" strokeWidth="1"
            strokeDasharray="2 3" opacity="0.5"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* guia + dots do ponto sob o cursor */}
        {hovered && (
          <g pointerEvents="none">
            <line
              x1={xFn(hovered.dia)} x2={xFn(hovered.dia)}
              y1={PAD.t} y2={PAD.t + (CHART_H - PAD.t - PAD.b)}
              stroke="var(--text-muted)" strokeWidth="1" opacity="0.5"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={xFn(hovered.dia)} cy={yFn(hovered.gmv)} r="3.5" fill="var(--primary)" />
            {hasPrev && (
              <circle cx={xFn(hovered.dia)} cy={yFn(hovered.prev ?? 0)} r="3" fill="var(--text-muted)" opacity="0.8" />
            )}
          </g>
        )}

        {/* overlay de captura do mouse */}
        <rect
          x={PAD.l} y={PAD.t}
          width={CHART_W - PAD.l - PAD.r} height={CHART_H - PAD.t - PAD.b}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={() => setHovered(null)}
        />
      </svg>

      {hovered && (
        <ChartTooltip
          xRatio={(xFn(hovered.dia) - PAD.l) / (CHART_W - PAD.l - PAD.r)}
          title={`Dia ${String(hovered.dia).padStart(2, '0')}`}
          rows={[
            { label: 'GMV', value: formatMoney(hovered.gmv), color: 'var(--primary)' },
            { label: 'Vendas', value: `${hovered.pedidos.toLocaleString('pt-BR')} pedidos` },
            ...(hasPrev ? [{ label: 'Mês anterior', value: formatMoney(hovered.prev ?? 0), color: 'var(--text-muted)' }] : []),
          ]}
        />
      )}
    </div>
  )
}

/* ── Main exported component ── */

export function GmvHeroPanel({ raw }: GmvHeroPanelProps) {
  // GMV + delta
  const gmv = asNumber(raw.gmv_total_mes ?? raw.gmv_mes)
  const gmvPrev = asNumber(raw.gmv_mes_prev ?? raw.gmv_prev)
  // null quando não há mês anterior → não mostra pill nem "vs. mês anterior"
  const delta = gmvPrev > 0 ? ((gmv - gmvPrev) / gmvPrev) * 100 : null

  // meta — prefer new field names, fallback to legacy (raw.meta_mes ?? raw.meta_gmv)
  const metaRaw = raw.meta_mes ?? raw.meta_gmv
  const meta: number | null = metaRaw != null ? asNumber(metaRaw) || null : null
  // meta_origem: 'mensal' | 'diaria_legada' | null (payload novo do back)
  const metaOrigem: string | null = typeof raw.meta_origem === 'string' ? raw.meta_origem : null

  // ritmo from payload, or null so MetaBar calculates client-side
  const ritmo: number | null =
    raw.ritmo_projetado != null ? asNumber(raw.ritmo_projetado) || null : null

  // periodo: prefer payload, fallback to client-side business-day calc
  const { diaUtil: diaUtilCalc, diasUteisTotal: diasUteisTotalCalc } = useMemo(computeBusinessDays, [])
  const periodoRaw = raw.periodo as { dia_util?: number; dias_uteis_total?: number } | undefined
  const diaUtil = periodoRaw?.dia_util ?? diaUtilCalc
  const diasUteisTotal = periodoRaw?.dias_uteis_total ?? diasUteisTotalCalc

  // intraday: qualify if ANY point has v != null OR prev != null
  const intradayData = useMemo((): IntradayPoint[] | null => {
    if (!Array.isArray(raw.gmv_intraday) || raw.gmv_intraday.length === 0) return null
    const pts = (raw.gmv_intraday as IntradayPoint[]).filter((p) => p && typeof p.h === 'string')
    if (pts.length === 0) return null
    return pts.some((p) => p.v != null || p.prev != null) ? pts : null
  }, [raw.gmv_intraday])

  // daily: qualify if gmv_diario_mes has at least one gmv > 0
  // (no longer gated by intraday — both can be available so the toggle can switch)
  const dailyData = useMemo((): DailyPoint[] | null => {
    if (!Array.isArray(raw.gmv_diario_mes) || raw.gmv_diario_mes.length === 0) return null
    // pedidos/prev tolerantes: backend antigo mandava só {dia, gmv}.
    const pts = (raw.gmv_diario_mes as JsonRecord[])
      .filter((p) => p && typeof p.dia === 'number')
      .map((p): DailyPoint => ({
        dia: Number(p.dia),
        gmv: asNumber(p.gmv),
        pedidos: asNumber(p.pedidos),
        prev: asNumber(p.prev),
      }))
    return pts.some((p) => p.gmv > 0) ? pts : null
  }, [raw.gmv_diario_mes])

  const mesReferencia = raw.mes_referencia != null ? String(raw.mes_referencia) : null
  // Legenda mostra o mês que os dados representam (pode ser um mês passado via seletor)
  const mesReferenciaLabel = useMemo(() => {
    if (!mesReferencia || !/^\d{4}-\d{2}/.test(mesReferencia)) return null
    const [y, m] = mesReferencia.split('-').map(Number)
    const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    return label.charAt(0).toUpperCase() + label.slice(1) // "Julho de 2026", não "Julho De"
  }, [mesReferencia])

  // chart view toggle — defaults to 'mes' (month view). If only one dataset
  // is available, the effective view is forced to that one and the other
  // toggle option is hidden.
  const [view, setView] = useState<'hoje' | 'mes'>('mes')

  const hasIntraday = intradayData != null
  const hasDaily = dailyData != null

  // effective view: honor selection when available, otherwise fall back to the
  // only dataset present.
  const effectiveView: 'hoje' | 'mes' | null = !hasIntraday && !hasDaily
    ? null
    : view === 'hoje'
      ? hasIntraday
        ? 'hoje'
        : 'mes'
      : hasDaily
        ? 'mes'
        : 'hoje'

  // legend: adapts to the chart actually being shown
  const showIntradayLegend = effectiveView === 'hoje'
  const showDailyLegend = effectiveView === 'mes'

  return (
    <div
      className="flex flex-col gap-4 rounded-[10px] p-5"
      style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)' }}
    >
      {/* header: title + legend */}
      <div className="flex items-center justify-between gap-3">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: 'var(--text-muted)' }}
        >
          GMV — desempenho do mês
        </span>
        <div className="flex items-center gap-3 shrink-0">
          {/* segmented toggle: Hoje | Mês (only when a chart can render) */}
          {(hasIntraday || hasDaily) && (
            <div
              role="group"
              aria-label="Período do gráfico"
              className="inline-flex items-center rounded-[7px] p-0.5"
              style={{ background: 'var(--bg-elev-2)', border: '1px solid var(--border)' }}
            >
              <button
                type="button"
                onClick={() => setView('hoje')}
                disabled={!hasIntraday}
                aria-pressed={effectiveView === 'hoje'}
                hidden={!hasIntraday}
                className="rounded-[5px] px-2 py-0.5 text-[11px] font-medium transition-colors"
                style={{
                  background: effectiveView === 'hoje' ? 'var(--bg-elev-1)' : 'transparent',
                  color: effectiveView === 'hoje' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: hasIntraday ? 'pointer' : 'default',
                }}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setView('mes')}
                disabled={!hasDaily}
                aria-pressed={effectiveView === 'mes'}
                hidden={!hasDaily}
                className="rounded-[5px] px-2 py-0.5 text-[11px] font-medium transition-colors"
                style={{
                  background: effectiveView === 'mes' ? 'var(--bg-elev-1)' : 'transparent',
                  color: effectiveView === 'mes' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: hasDaily ? 'pointer' : 'default',
                }}
              >
                Mês
              </button>
            </div>
          )}
          {showIntradayLegend ? (
            <>
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: 'var(--primary)' }}
                />
                Hoje
              </span>
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: 'var(--text-muted)', opacity: 0.6 }}
                />
                Mês anterior
              </span>
            </>
          ) : showDailyLegend ? (
            <>
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: 'var(--primary)' }}
                />
                <span>{mesReferenciaLabel ?? 'Mês atual'}</span>
              </span>
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: 'var(--text-muted)', opacity: 0.6 }}
                />
                Mês anterior
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* big GMV number + delta pill */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <div className="flex items-baseline gap-1 leading-none">
          <span
            className="font-medium"
            style={{ fontSize: 15, lineHeight: 1, color: 'var(--text-muted)' }}
          >
            R$
          </span>
          <span
            className="num font-mono font-medium"
            style={{
              fontSize: 44,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--text-primary)',
            }}
          >
            {gmv.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        {delta !== null ? (
          <>
            <DeltaPill v={delta} />
            <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
              vs. mesmo período do mês anterior
            </span>
          </>
        ) : null}
      </div>

      {/* MetaBar */}
      <MetaBar
        gmv={gmv}
        meta={meta}
        metaOrigem={metaOrigem}
        diaUtil={diaUtil}
        diasUteisTotal={diasUteisTotal}
        ritmo={ritmo}
      />

      {/* Chart driven by the toggle (defaults to 'mes'). Falls back to whichever
          dataset is available; renders nothing if neither qualifies. */}
      {effectiveView === 'hoje' && intradayData ? (
        <IntradayChart data={intradayData} />
      ) : effectiveView === 'mes' && dailyData ? (
        <DailyChart data={dailyData} mesReferencia={mesReferencia} />
      ) : null}
    </div>
  )
}

/* Legacy display helper — kept for tests that still use formatMoney directly */
export { formatMoney }
