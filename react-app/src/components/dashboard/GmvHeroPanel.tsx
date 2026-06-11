import { useMemo } from 'react'
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

/* ── helpers ── */

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
  diaUtil: number
  diasUteisTotal: number
  ritmo: number | null
}

function MetaBar({ gmv, meta, diaUtil, diasUteisTotal, ritmo }: MetaBarProps) {
  if (meta === null) {
    return (
      <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
        Meta —
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

/* ── Intraday SVG chart (port of design GMVChart) ── */

const CHART_W = 1000
const CHART_H = 220
const PAD = { l: 36, r: 12, t: 14, b: 26 }

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
  if (!paths) return null

  const { currPath, currAreaPath, prevPath, xFn, yFn, nowIdx, yticks } = paths
  const nowX = nowIdx >= 0 ? xFn(nowIdx) : null
  const nowY = nowIdx >= 0 && data[nowIdx].v != null ? yFn(data[nowIdx].v as number) : null
  const gradId = 'gmvIntradayGrad'

  return (
    <div style={{ position: 'relative', height: CHART_H }}>
      <svg
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
      </svg>
    </div>
  )
}

/* ── Main exported component ── */

export function GmvHeroPanel({ raw }: GmvHeroPanelProps) {
  // GMV + delta
  const gmv = asNumber(raw.gmv_total_mes ?? raw.gmv_mes)
  const gmvPrev = asNumber(raw.gmv_mes_prev ?? raw.gmv_prev)
  const delta = gmvPrev > 0 ? ((gmv - gmvPrev) / gmvPrev) * 100 : 0

  // meta — prefer new field names, fallback to legacy (raw.meta_mes ?? raw.meta_gmv)
  const metaRaw = raw.meta_mes ?? raw.meta_gmv
  const meta: number | null = metaRaw != null ? asNumber(metaRaw) || null : null

  // ritmo from payload, or null so MetaBar calculates client-side
  const ritmo: number | null =
    raw.ritmo_projetado != null ? asNumber(raw.ritmo_projetado) || null : null

  // periodo: prefer payload, fallback to client-side business-day calc
  const { diaUtil: diaUtilCalc, diasUteisTotal: diasUteisTotalCalc } = useMemo(computeBusinessDays, [])
  const periodoRaw = raw.periodo as { dia_util?: number; dias_uteis_total?: number } | undefined
  const diaUtil = periodoRaw?.dia_util ?? diaUtilCalc
  const diasUteisTotal = periodoRaw?.dias_uteis_total ?? diasUteisTotalCalc

  // intraday: only render chart if array has at least one non-null v
  const intradayData = useMemo((): IntradayPoint[] | null => {
    if (!Array.isArray(raw.gmv_intraday) || raw.gmv_intraday.length === 0) return null
    const pts = (raw.gmv_intraday as IntradayPoint[]).filter((p) => p && typeof p.h === 'string')
    if (pts.length === 0) return null
    return pts.some((p) => p.v != null) ? pts : null
  }, [raw.gmv_intraday])

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
        <DeltaPill v={delta} />
        <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
          vs. mesmo período do mês anterior
        </span>
      </div>

      {/* MetaBar */}
      <MetaBar
        gmv={gmv}
        meta={meta}
        diaUtil={diaUtil}
        diasUteisTotal={diasUteisTotal}
        ritmo={ritmo}
      />

      {/* Intraday chart — rendered only when data is present */}
      {intradayData && (
        <IntradayChart data={intradayData} />
      )}
    </div>
  )
}

/* Legacy display helper — kept for tests that still use formatMoney directly */
export { formatMoney }
