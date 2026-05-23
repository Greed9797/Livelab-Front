import { useState, useRef, useCallback } from 'react'
import { asNumber, formatMoney } from '../../utils/format'
import type { JsonRecord } from '../../types/models'

interface GmvHeroPanelProps {
  raw: JsonRecord
}

function DeltaPill({ v }: { v: number }) {
  const pos = v >= 0
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium font-mono"
      style={{
        background: pos ? 'var(--success-soft)' : 'var(--danger-soft)',
        color: pos ? 'var(--success)' : 'var(--danger)',
      }}
    >
      {pos ? '+' : ''}{v.toFixed(1)}%
    </span>
  )
}

function MetaBar({ gmv, meta }: { gmv: number; meta: number | null }) {
  const pct = meta && meta > 0 ? Math.min((gmv / meta) * 100, 100) : 0
  const diasNoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const diaAtual = new Date().getDate()
  let diasUteis = 0, diasUteisTotal = 0
  for (let d = 1; d <= diasNoMes; d++) {
    const dow = new Date(new Date().getFullYear(), new Date().getMonth(), d).getDay()
    if (dow !== 0 && dow !== 6) {
      diasUteisTotal++
      if (d <= diaAtual) diasUteis++
    }
  }
  const ritmo = diasUteis > 0 && meta && meta > 0 ? (gmv / diasUteis) * diasUteisTotal : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
        <span>Meta {meta ? formatMoney(meta, true) : '—'} · {pct.toFixed(1)}% realizado</span>
        <span style={{ color: 'var(--text-faint)' }}>
          Dia útil {diasUteis}/{diasUteisTotal}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${pct}%`, background: 'var(--primary)' }}
        />
      </div>
      {meta && meta > 0 && (
        <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
          Ritmo projetado {formatMoney(ritmo, true)} · {((ritmo / meta) * 100).toFixed(0)}% da meta
        </div>
      )}
    </div>
  )
}

const W = 300
const H = 156
const PAD_X = 8
const PAD_Y = 16

function DailyChart({ data }: { data: Array<{ dia: number; gmv: number }> }) {
  const today = new Date().getDate()
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const plotted = data.filter(d => d.dia <= today)
  const max = Math.max(...plotted.map(d => d.gmv), 1)
  const yMax = max * 1.12

  const pts = plotted.map((d, i) => ({
    x: plotted.length <= 1 ? W / 2 : (i / (plotted.length - 1)) * (W - PAD_X * 2) + PAD_X,
    y: H - PAD_Y - ((d.gmv / yMax) * (H - PAD_Y * 2)),
    dia: d.dia,
    gmv: d.gmv,
  }))

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || pts.length < 2) return
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    let closest = 0
    let minDist = Infinity
    pts.forEach((p, i) => {
      const dist = Math.abs(p.x - svgX)
      if (dist < minDist) { minDist = dist; closest = i }
    })
    setHoveredIdx(closest)
  }, [pts])

  if (pts.length < 2) return (
    <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>sem dados ainda</span>
    </div>
  )

  const line = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
  const area = `${line} L ${pts[pts.length - 1].x} ${H - PAD_Y} L ${pts[0].x} ${H - PAD_Y} Z`
  const gradId = 'gmv-daily-grad'

  const hp = hoveredIdx !== null ? pts[hoveredIdx] : null
  const lastPt = pts[pts.length - 1]
  const markerPts = pts.filter((point, index) => point.gmv > 0 || index === pts.length - 1)
  const tickDays = data.filter(d => d.dia === 1 || d.dia % 5 === 0)

  const tooltipPct = hp ? (hp.x / W) * 100 : 0
  const tooltipFlip = tooltipPct > 75

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', cursor: 'crosshair' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      {hp && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltipPct}%`,
            top: `${(hp.y / H) * 100}%`,
            transform: tooltipFlip ? 'translate(-100%, -120%)' : 'translate(8px, -120%)',
            background: 'var(--bg-elev-3)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 11,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 10,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span style={{ color: 'var(--text-faint)', marginRight: 4 }}>Dia {hp.dia}</span>
          {formatMoney(hp.gmv, true)}
        </div>
      )}

      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ height: H, display: 'block' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={0} y1={H * f} x2={W} y2={H * f} stroke="var(--border)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        ))}

        {hp && (
          <line
            x1={hp.x} y1={PAD_Y} x2={hp.x} y2={H - PAD_Y}
            stroke="var(--primary)" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.5" vectorEffect="non-scaling-stroke"
          />
        )}

        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>

      {markerPts.map((point) => {
        const active = hp?.dia === point.dia || (!hp && point.dia === lastPt.dia)
        return (
          <span
            key={point.dia}
            style={{
              position: 'absolute',
              left: `${(point.x / W) * 100}%`,
              top: `${(point.y / H) * 100}%`,
              width: active ? 10 : 7,
              height: active ? 10 : 7,
              borderRadius: 999,
              background: 'var(--primary)',
              border: active ? '2px solid var(--bg-elev-1)' : '1px solid var(--bg-elev-1)',
              boxShadow: active ? '0 0 0 4px color-mix(in srgb, var(--primary) 18%, transparent)' : 'none',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        )
      })}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text-faint)' }}>
        {tickDays.map(d => <span key={d.dia}>{d.dia}</span>)}
      </div>
    </div>
  )
}

export function GmvHeroPanel({ raw }: GmvHeroPanelProps) {
  const gmv = asNumber(raw.gmv_total_mes ?? raw.gmv_mes)
  const delta = asNumber(raw.variacao_gmv_mes_anterior_pct)
  const meta = raw.meta_gmv != null ? asNumber(raw.meta_gmv) : null
  const dailyData = (raw.gmv_diario_mes as Array<{ dia: number; gmv: number }> | undefined) ?? []

  return (
    <div
      className="flex flex-col gap-4 rounded-[10px] p-5"
      style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}
        >
          GMV — Desempenho
        </span>
        <span className="text-[11px] font-mono" style={{ color: 'var(--text-faint)' }}>
          {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div className="flex items-baseline gap-3">
        <span
          className="font-mono font-medium leading-none"
          style={{ fontSize: 44, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', lineHeight: 1 }}
        >
          {formatMoney(gmv, true)}
        </span>
        <DeltaPill v={delta} />
        <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>vs mês ant.</span>
      </div>

      <MetaBar gmv={gmv} meta={meta} />

      <div>
        <div className="text-[11px] mb-2 font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--text-faint)' }}>
          GMV acumulado — dia a dia
        </div>
        <DailyChart data={dailyData} />
      </div>
    </div>
  )
}
