import { TrendingUp, TrendingDown } from 'lucide-react'
import { Sparkline } from '../charts/Sparkline'
import { asNumber } from '../../utils/format'
import type { JsonRecord } from '../../types/models'

interface KpiItemProps {
  label: string
  value: string
  delta?: number
  spark?: number[]
  sparkColor?: string
  prefix?: string
  suffix?: string
}

function delta(cur: number, prev: number): number {
  if (!prev) return 0
  return ((cur - prev) / prev) * 100
}

function DeltaPill({ d }: { d: number }) {
  const positive = d >= 0
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium font-mono"
      style={{
        background: positive ? 'var(--success-soft)' : 'var(--danger-soft)',
        color: positive ? 'var(--success)' : 'var(--danger)',
      }}
    >
      {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {positive ? '+' : ''}{d.toFixed(1)}%
    </span>
  )
}

function KpiItem({ label, value, delta: d, spark, sparkColor, prefix, suffix }: KpiItemProps) {
  return (
    <div
      className="flex flex-col justify-between gap-3 rounded-xl p-4"
      style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        {d !== undefined && <DeltaPill d={d} />}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-0.5">
            {prefix && (
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {prefix}
              </span>
            )}
            <span
              className="text-[22px] font-semibold leading-none tracking-tight font-mono"
              style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {value}
            </span>
            {suffix && (
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {suffix}
              </span>
            )}
          </div>
        </div>
        {spark && spark.length > 2 && (
          <div className="shrink-0 opacity-80">
            <Sparkline data={spark} width={60} height={22} stroke={sparkColor ?? 'var(--primary)'} />
          </div>
        )}
      </div>
    </div>
  )
}

interface KpiStripProps {
  raw: JsonRecord
}

export function KpiStrip({ raw }: KpiStripProps) {
  const gmvMes = asNumber(raw.gmv_total_mes ?? raw.gmv_mes ?? raw.gmv_lives_mes ?? raw.fat_bruto)
  const gmvPrev = asNumber(raw.gmv_mes_prev ?? raw.gmv_prev)
  const livesMes = asNumber(raw.lives_mes ?? raw.total_lives)
  const livesPrev = asNumber(raw.lives_prev)
  const horasLive = asNumber(raw.horas_live ?? raw.horas_live_mes)
  const horasPrev = asNumber(raw.horas_prev)
  const videosMes = asNumber(raw.videos_mes ?? raw.total_videos)
  const videosPrev = asNumber(raw.videos_prev)
  const gmvPorLive = asNumber(raw.gmv_por_live ?? raw.gmv_por_live_mes) || (livesMes > 0 ? gmvMes / livesMes : 0)
  const gmvPorLivePrev = asNumber(raw.gmv_por_live_prev)
  const gmvPorHora = asNumber(raw.gmv_por_hora ?? raw.gmv_por_hora_mes ?? raw.gmv_hora) || (horasLive > 0 ? gmvMes / horasLive : 0)
  const gmvPorHoraPrev = asNumber(raw.gmv_por_hora_prev)

  const gmvSpark = (raw.gmv_year as number[] | undefined)
  const livesSpark = (raw.lives_year as number[] | undefined)
  const horasSpark = (raw.horas_year as number[] | undefined)
  const videosSpark = (raw.videos_year as number[] | undefined)

  function fmtCompact(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
    if (v >= 1_000) return `${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  }

  const items: KpiItemProps[] = [
    {
      label: 'GMV — Mês',
      value: fmtCompact(gmvMes),
      prefix: 'R$',
      delta: delta(gmvMes, gmvPrev),
      spark: gmvSpark,
    },
    {
      label: 'Lives realizadas',
      value: livesMes.toLocaleString('pt-BR'),
      delta: delta(livesMes, livesPrev),
      spark: livesSpark,
      sparkColor: 'var(--info)',
    },
    {
      label: 'Horas em live',
      value: horasLive.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
      suffix: 'h',
      delta: delta(horasLive, horasPrev),
      spark: horasSpark,
      sparkColor: 'var(--success)',
    },
    {
      label: 'Vídeos gravados',
      value: videosMes.toLocaleString('pt-BR'),
      delta: delta(videosMes, videosPrev),
      spark: videosSpark,
      sparkColor: 'var(--warning)',
    },
    {
      label: 'GMV / live',
      value: fmtCompact(gmvPorLive),
      prefix: 'R$',
      delta: delta(gmvPorLive, gmvPorLivePrev),
    },
    {
      label: 'GMV / hora',
      value: fmtCompact(gmvPorHora),
      prefix: 'R$',
      delta: delta(gmvPorHora, gmvPorHoraPrev),
    },
  ]

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
      {items.map((item) => (
        <KpiItem key={item.label} {...item} />
      ))}
    </div>
  )
}
