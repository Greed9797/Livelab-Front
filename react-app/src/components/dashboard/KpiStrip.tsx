import { Sparkline } from '../charts/Sparkline'
import { asNumber } from '../../utils/format'
import type { JsonRecord } from '../../types/models'

function delta(cur: number, prev: number): number {
  if (!prev) return 0
  return ((cur - prev) / prev) * 100
}

function DeltaPill({ d }: { d: number }) {
  if (d === 0) return null
  const pos = d >= 0
  return (
    <span
      className="inline-flex rounded px-1 py-0.5 text-[11px] font-mono"
      style={{
        background: pos ? 'var(--success-soft)' : 'var(--danger-soft)',
        color: pos ? 'var(--success)' : 'var(--danger)',
      }}
    >
      {pos ? '+' : ''}{d.toFixed(1)}%
    </span>
  )
}

interface KpiCell {
  label: string
  value: string
  prefix?: string
  suffix?: string
  d?: number
  spark?: number[]
  sparkColor?: string
}

export function KpiStrip({ raw }: { raw: JsonRecord }) {
  const livesMes    = asNumber(raw.lives_mes)
  const livesPrev   = asNumber(raw.lives_prev)
  const horasLive   = asNumber(raw.horas_live_mes ?? raw.horas_live)
  const horasPrev   = asNumber(raw.horas_prev)
  const gmvLives    = asNumber(raw.gmv_lives_mes)
  const gmvLivesPrev = asNumber(raw.gmv_lives_prev)
  const videosMes   = asNumber(raw.videos_mes)
  const videosPrev  = asNumber(raw.videos_prev)
  const gmvVideos   = asNumber(raw.gmv_videos_mes)
  const gmvVideosPrev = asNumber(raw.gmv_videos_prev)

  const gmvPorHora  = horasLive > 0 ? gmvLives / horasLive : 0
  const gmvPorHoraPrev = asNumber(raw.horas_prev) > 0 ? gmvLivesPrev / asNumber(raw.horas_prev) : 0
  const gmvPorVideo = videosMes > 0 ? gmvVideos / videosMes : 0
  const gmvPorVideoPrev = asNumber(raw.videos_prev) > 0 ? gmvVideosPrev / asNumber(raw.videos_prev) : 0

  function fmtMoney(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
    if (v >= 1_000) return `${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  }

  const cells: KpiCell[] = [
    {
      label: 'Lives',
      value: livesMes.toLocaleString('pt-BR'),
      suffix: 'lives',
      d: delta(livesMes, livesPrev),
      spark: raw.lives_year as number[] | undefined,
      sparkColor: 'var(--info)',
    },
    {
      label: 'Hs em live',
      value: horasLive.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
      suffix: 'h',
      d: delta(horasLive, horasPrev),
      sparkColor: 'var(--success)',
    },
    {
      label: 'GMV / hora',
      value: fmtMoney(gmvPorHora),
      prefix: 'R$',
      d: delta(gmvPorHora, gmvPorHoraPrev),
      sparkColor: 'var(--primary)',
    },
    {
      label: 'Vídeos',
      value: videosMes.toLocaleString('pt-BR'),
      suffix: 'vídeos',
      d: delta(videosMes, videosPrev),
      spark: raw.videos_year as number[] | undefined,
      sparkColor: 'var(--warning)',
    },
    {
      label: 'GMV vídeos',
      value: fmtMoney(gmvVideos),
      prefix: 'R$',
      d: delta(gmvVideos, gmvVideosPrev),
      sparkColor: 'var(--primary)',
    },
    {
      label: 'GMV / vídeo',
      value: fmtMoney(gmvPorVideo),
      prefix: 'R$',
      d: delta(gmvPorVideo, gmvPorVideoPrev),
      sparkColor: 'var(--warning)',
    },
  ]

  return (
    <div
      className="rounded-[10px] overflow-hidden"
      style={{
        background: 'var(--bg-elev-1)',
        border: '1px solid var(--border)',
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
      }}
    >
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          style={{
            padding: '16px 18px',
            borderRight: i < cells.length - 1 ? '1px solid var(--divider, var(--border))' : undefined,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {cell.label}
          </span>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, minWidth: 0 }}>
              {cell.prefix && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  {cell.prefix}
                </span>
              )}
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 500,
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {cell.value}
              </span>
              {cell.suffix && (
                <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>
                  {cell.suffix}
                </span>
              )}
            </div>
            {cell.spark && cell.spark.length > 2 && (
              <div style={{ flexShrink: 0, opacity: 0.7 }}>
                <Sparkline data={cell.spark} width={56} height={22} stroke={cell.sparkColor ?? 'var(--primary)'} />
              </div>
            )}
          </div>

          {cell.d !== undefined && <DeltaPill d={cell.d} />}
        </div>
      ))}
    </div>
  )
}
