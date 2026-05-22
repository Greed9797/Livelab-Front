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
  d?: number
  spark?: number[]
  sparkColor?: string
}

interface KpiStripProps {
  raw: JsonRecord
}

export function KpiStrip({ raw }: KpiStripProps) {
  const gmvMes = asNumber(raw.gmv_total_mes ?? raw.gmv_mes)
  const gmvPrev = asNumber(raw.gmv_mes_prev ?? raw.gmv_prev)
  const livesMes = asNumber(raw.lives_mes)
  const livesPrev = asNumber(raw.lives_prev)
  const videosMes = asNumber(raw.videos_mes)
  const videosPrev = asNumber(raw.videos_prev)
  const ticketMedio = asNumber(raw.ticket_medio_live_mes)
  const ticketPrev = asNumber(raw.ticket_prev)
  const viewers = asNumber(raw.media_viewers)
  const viewersPrev = asNumber(raw.media_viewers_prev)
  const clientesAtivos = asNumber(raw.clientes_ativos)
  const clientesPrev = asNumber(raw.clientes_prev)

  function fmtCompact(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
    if (v >= 1_000) return `${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  }

  const cells: KpiCell[] = [
    { label: 'GMV mês', value: `R$ ${fmtCompact(gmvMes)}`, d: delta(gmvMes, gmvPrev), spark: raw.gmv_year as number[] | undefined, sparkColor: 'var(--primary)' },
    { label: 'Lives', value: livesMes.toLocaleString('pt-BR'), d: delta(livesMes, livesPrev), spark: raw.lives_year as number[] | undefined, sparkColor: 'var(--info)' },
    { label: 'Vídeos', value: videosMes.toLocaleString('pt-BR'), d: delta(videosMes, videosPrev), spark: raw.videos_year as number[] | undefined, sparkColor: 'var(--success)' },
    { label: 'Ticket médio', value: `R$ ${fmtCompact(ticketMedio)}`, d: delta(ticketMedio, ticketPrev), sparkColor: 'var(--warning)' },
    { label: 'Viewers méd.', value: viewers.toLocaleString('pt-BR'), d: delta(viewers, viewersPrev), sparkColor: 'var(--info)' },
    { label: 'Clientes ativos', value: clientesAtivos.toLocaleString('pt-BR'), d: delta(clientesAtivos, clientesPrev), sparkColor: 'var(--success)' },
  ]

  return (
    <div
      className="rounded-[10px] overflow-hidden"
      style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)' }}
    >
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className="flex flex-col justify-between gap-2"
          style={{
            padding: '18px 20px',
            borderRight: i < cells.length - 1 ? '1px solid var(--divider, var(--border))' : undefined,
            minWidth: 0,
          }}
        >
          <span
            className="truncate text-[11px] font-semibold uppercase"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
          >
            {cell.label}
          </span>
          <div className="flex items-end justify-between gap-1">
            <span
              className="text-2xl font-medium font-mono leading-none"
              style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {cell.value}
            </span>
            {cell.spark && cell.spark.length > 2 && (
              <div className="shrink-0 opacity-70">
                <Sparkline data={cell.spark} width={70} height={24} stroke={cell.sparkColor ?? 'var(--primary)'} />
              </div>
            )}
          </div>
          {cell.d !== undefined && <DeltaPill d={cell.d} />}
        </div>
      ))}
    </div>
  )
}
