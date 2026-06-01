import type { Cabine, JsonRecord } from '../../types/models'
import { asNumber, asString } from '../../utils/format'
import { isSameSaoPauloDate } from '../../utils/sao-paulo-date'

const START_H = 7
const END_H = 23
const RANGE = END_H - START_H

function toPct(h: number): number {
  return ((h - START_H) / RANGE) * 100
}

function parseHour(dt: string | undefined): number {
  if (!dt) return 0
  const d = new Date(dt)
  if (isNaN(d.getTime())) {
    // try HH:MM format
    const parts = dt.split(':')
    if (parts.length >= 2) return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60
    return 0
  }
  return d.getHours() + d.getMinutes() / 60
}

function blockClass(status: string): { bg: string; border: string; text: string } {
  const s = status.toLowerCase()
  if (s.includes('ao_vivo') || s.includes('live') || s === 'em_andamento') {
    return {
      bg: 'oklch(0.66 0.22 25 / 0.45)',
      border: 'oklch(0.66 0.22 25)',
      text: 'oklch(0.95 0.01 25)',
    }
  }
  if (s.includes('agendado') || s.includes('scheduled') || s.includes('reservado')) {
    return {
      bg: 'oklch(0.74 0.11 235 / 0.3)',
      border: 'oklch(0.74 0.11 235 / 0.6)',
      text: 'oklch(0.92 0.02 235)',
    }
  }
  if (s.includes('concl') || s.includes('encerr') || s.includes('finaliz') || s === 'done') {
    return {
      bg: 'oklch(0.72 0.10 160 / 0.22)',
      border: 'oklch(0.72 0.10 160 / 0.55)',
      text: 'oklch(0.86 0.06 160)',
    }
  }
  return {
    bg: 'oklch(0.62 0.02 60 / 0.18)',
    border: 'var(--border-strong)',
    text: 'var(--text-secondary)',
  }
}

interface Block {
  start: number
  end: number
  status: string
  label: string
}

interface Lane {
  id: string
  label: string
  status: string
  blocks: Block[]
}

function nowHour(): number {
  const now = new Date()
  return now.getHours() + now.getMinutes() / 60
}

interface CabinesGanttProps {
  agenda: JsonRecord[]
  cabines: Cabine[]
  date?: string
}

export function CabinesGantt({ agenda, cabines, date }: CabinesGanttProps) {
  const now = nowHour()

  const laneMap = new Map<string, Lane>()

  // seed lanes from cabines list
  for (const cab of cabines) {
    const num = asNumber(cab.numero)
    const key = `C-${String(num).padStart(2, '0')}`
    laneMap.set(key, {
      id: key,
      label: key,
      status: asString(cab.status, 'idle'),
      blocks: [],
    })
  }

  // add blocks from agenda
  for (const ev of agenda) {
    const eventStart = asString(ev.data_inicio, '')
    if (date && eventStart && !isSameSaoPauloDate(eventStart, date)) continue

    const num = asNumber(ev.cabine_numero ?? ev.numero)
    const cabineId = asString(ev.cabine_id)
    const key = num > 0 ? `C-${String(num).padStart(2, '0')}` : cabineId

    if (!laneMap.has(key) && key) {
      laneMap.set(key, { id: key, label: key, status: 'idle', blocks: [] })
    }

    const lane = laneMap.get(key)
    if (!lane) continue

    const start = parseHour(asString(eventStart || ev.hora_inicio, ''))
    const end = parseHour(asString(ev.data_fim ?? ev.hora_fim, ''))
    const status = asString(ev.status, 'agendado')
    const clienteNome = asString(ev.cliente_nome ?? ev.marca_nome ?? ev.titulo, '')

    if (start > 0 && end > start) {
      lane.blocks.push({ start, end, status, label: clienteNome })
    }
  }

  const lanes = Array.from(laneMap.values()).sort((a, b) => a.id.localeCompare(b.id))
  const ticks = Array.from({ length: RANGE + 1 }, (_, i) => START_H + i)
  const nowPct = Math.min(Math.max(toPct(now), 0), 100)

  if (lanes.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
        Sem eventos agendados para hoje
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 600 }}>
        {/* Header */}
        <div className="mb-2 flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span>
            Hoje · {String(START_H).padStart(2, '0')}h–{String(END_H).padStart(2, '0')}h
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--success)' }}
            />
            agora {String(Math.floor(now)).padStart(2, '0')}:{String(Math.round((now % 1) * 60)).padStart(2, '0')}
          </span>
        </div>

        {/* Lanes */}
        <div className="flex flex-col gap-1.5">
          {lanes.map((lane) => (
            <div key={lane.id} className="flex items-center gap-3">
              <div
                className="w-12 shrink-0 text-right text-[11px] font-medium font-mono"
                style={{ color: 'var(--text-muted)' }}
              >
                {lane.label}
              </div>
              <div
                className="relative flex-1 h-7 rounded"
                style={{ background: 'var(--bg-elev-3)' }}
              >
                {/* now line */}
                <div
                  className="absolute inset-y-0 w-px z-10 pointer-events-none"
                  style={{ left: `${nowPct}%`, background: 'var(--primary)', opacity: 0.7 }}
                />

                {lane.blocks.map((block, i) => {
                  const left = toPct(block.start)
                  const width = toPct(block.end) - left
                  if (width <= 0 || left < 0 || left > 100) return null
                  const colors = blockClass(block.status)
                  return (
                    <div
                      key={i}
                      className="absolute inset-y-0.5 rounded flex items-center overflow-hidden"
                      style={{
                        left: `${Math.max(0, left)}%`,
                        width: `${Math.min(width, 100 - Math.max(0, left))}%`,
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                      }}
                      title={`${block.label} (${String(Math.floor(block.start)).padStart(2, '0')}:${String(Math.round((block.start % 1) * 60)).padStart(2, '0')}–${String(Math.floor(block.end)).padStart(2, '0')}:${String(Math.round((block.end % 1) * 60)).padStart(2, '0')})`}
                    >
                      <span
                        className="truncate px-1.5 text-[10px] font-medium"
                        style={{ color: colors.text }}
                      >
                        {block.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Hour ticks */}
        <div className="mt-1 flex pl-15" style={{ paddingLeft: 60 }}>
          <div
            className="relative flex-1"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${RANGE}, 1fr)`,
            }}
          >
            {ticks.slice(0, -1).map((t) => (
              <span
                key={t}
                className="text-[10px] font-mono"
                style={{ color: 'var(--text-faint)' }}
              >
                {String(t).padStart(2, '0')}h
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
