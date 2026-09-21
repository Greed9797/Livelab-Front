import { Users, Clock } from 'lucide-react'
import type { JsonRecord } from '../../types/models'
import { asNumber, asString } from '../../utils/format'
import { TikTokLiveButton } from '../ui/TikTokLiveButton'

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
  lives: JsonRecord[]
}

export function AoVivoPanel({ lives }: AoVivoPanelProps) {
  const totalGmv = lives.reduce((s, live) => s + asNumber(live.gmv_atual), 0)
  const totalViewers = lives.reduce((s, live) => s + asNumber(live.viewer_count), 0)

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          <span style={{ color: 'var(--live)' }}>●</span>
          Ao vivo agora · {lives.length}
        </h3>
      </div>

      {lives.length > 0 && (
        <div
          className="flex items-center gap-5 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elev-2)' }}
        >
          <div>
            <div
              className="text-[15px] font-semibold"
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
              className="text-[15px] font-semibold"
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

      {lives.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
          Nenhuma live ativa no momento
        </div>
      ) : (
        <div className="flex flex-col divide-y" style={{ '--tw-divide-opacity': 1, borderColor: 'var(--border)' } as React.CSSProperties}>
          {lives.map((live) => {
            const liveId = asString(live.id ?? live.live_atual_id, '')
            const nome = asString(live.apresentador_nome ?? live.apresentadora_nome, 'Apresentadora')
            const ini = initials(nome)
            const gmv = asNumber(live.gmv_atual)
            const viewers = asNumber(live.viewer_count)
            const elapsed = asNumber(live.duracao_min)
            const marca = asString(live.cliente_nome ?? live.marca_nome, nome)

            return (
              <div key={liveId || marca} className="flex items-center gap-3 px-4 py-3">
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
                      {marca}
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
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    R$ {fmtBRL(gmv)}
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    parcial
                  </div>
                </div>
                <TikTokLiveButton username={live.tiktok_username as string | undefined} compact />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
