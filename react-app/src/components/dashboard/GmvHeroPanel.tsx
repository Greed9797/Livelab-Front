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

function DailyChart({ data }: { data: Array<{ dia: number; gmv: number }> }) {
  const today = new Date().getDate()
  const values = data.map(d => d.gmv)
  const plotted = data.filter(d => d.dia <= today).map(d => d.gmv)

  const max = Math.max(...values, 1)
  const W = 100
  const H = 120
  const pad = 6

  const pts = plotted.map((v, i) => {
    const x = plotted.length <= 1 ? W / 2 : (i / (plotted.length - 1)) * (W - pad * 2) + pad
    const y = H - pad - ((v / max) * (H - pad * 2))
    return [x, y]
  })

  if (pts.length < 2) return (
    <div className="flex items-center justify-center h-12 text-[11px]" style={{ color: 'var(--text-faint)' }}>
      sem dados ainda
    </div>
  )

  const line = pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ')
  const area = `${line} L ${pts[pts.length - 1][0]} ${H} L ${pts[0][0]} ${H} Z`
  const gradId = 'gmv-daily-grad'

  const tickDays = data.filter(d => d.dia % 5 === 0 || d.dia === 1)

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 120, display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
          {[0.25, 0.5, 0.75].map(f => (
            <line key={f} x1={0} y1={H * f} x2={W} y2={H * f} stroke="var(--hairline)" strokeWidth="0.5" />
          ))}
        </defs>
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" fill="var(--primary)" />
      </svg>
      <div className="flex justify-between mt-1 text-[10px]" style={{ color: 'var(--text-faint)' }}>
        {tickDays.map(d => (
          <span key={d.dia}>{d.dia}</span>
        ))}
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
