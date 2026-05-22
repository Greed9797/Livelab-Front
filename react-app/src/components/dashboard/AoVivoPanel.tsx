import { Users, Clock } from 'lucide-react'
import type { Cabine } from '../../types/models'
import { asNumber, asString } from '../../utils/format'

function elapsedMin(startedAt: string | undefined): number {
  if (!startedAt) return 0
  const d = new Date(startedAt)
  if (isNaN(d.getTime())) return 0
  return Math.floor((Date.now() - d.getTime()) / 60_000)
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
}

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

interface AoVivoPanelProps {
  liveCabines: Cabine[]
}

export function AoVivoPanel({ liveCabines }: AoVivoPanelProps) {
  const totalGmv = liveCabines.reduce((s, c) => s + asNumber(c.gmv_atual), 0)
  const totalViewers = liveCabines.reduce((s, c) => s + asNumber(c.viewer_count), 0)

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          <span style={{ color: 'var(--live)' }}>●</span>
          Ao vivo agora · {liveCabines.length}
        </h3>
        <a href="#" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
          Sala de controle →
        </a>
      </div>

      {/* Summary */}
      {liveCabines.length > 0 && (
        <div
          className="flex items-center gap-5 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elev-2)' }}
        >
          <div>
            <div
              className="text-[15px] font-semibold font-mono"
              style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
            >
              R$ {fmtBRL(totalGmv)}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              GMV em andamento
            </div>
          </div>
          <div>
            <div
              className="text-[15px] font-semibold font-mono"
              style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {totalViewers.toLocaleString('pt-BR')}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              viewers somados
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {liveCabines.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
          Nenhuma live ativa no momento
        </div>
      ) : (
        <div className="flex flex-col divide-y" style={{ '--tw-divide-opacity': 1, borderColor: 'var(--border)' } as React.CSSProperties}>
          {liveCabines.map((cab) => {
            const nome = asString(cab.apresentador_nome ?? cab.cliente_nome, 'Apresentadora')
            const ini = initials(nome)
            const gmv = asNumber(cab.gmv_atual)
            const viewers = asNumber(cab.viewer_count)
            const elapsed = elapsedMin(cab.live_atual_id ? undefined : undefined)
            const cabNum = asNumber(cab.numero)
            const cabLabel = cabNum > 0 ? `C-${String(cabNum).padStart(2, '0')}` : 'Cabine'

            return (
              <div key={cab.id} className="flex items-center gap-3 px-4 py-3">
                <div className="relative shrink-0">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      background: 'linear-gradient(160deg, var(--primary), oklch(0.60 0.19 40))',
                      color: '#1a1208',
                    }}
                  >
                    {ini}
                  </div>
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2"
                    style={{ background: 'var(--live)', borderColor: 'var(--bg-elev-1)' }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {asString(cab.cliente_nome, nome)}
                    </span>
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium font-mono"
                      style={{ background: 'var(--bg-elev-3)', color: 'var(--text-muted)' }}
                    >
                      {cabLabel}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    <span>{nome}</span>
                    {elapsed > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Clock size={10} />
                        {elapsed} min
                      </span>
                    )}
                    {viewers > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Users size={10} />
                        {viewers.toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div
                    className="text-sm font-semibold font-mono"
                    style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    R$ {fmtBRL(gmv)}
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    parcial
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
