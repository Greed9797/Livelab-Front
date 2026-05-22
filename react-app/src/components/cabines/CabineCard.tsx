import { CalendarClock, MonitorPlay, Presentation } from 'lucide-react'
import { Button } from '../ui/Button'
import { TikTokLiveButton } from '../ui/TikTokLiveButton'
import { getBrandImage } from '../../utils/favicon'
import { asNumber, asString, formatMoney } from '../../utils/format'
import type { Cabine, JsonRecord } from '../../types/models'
import { getNestedValue } from './cabineUtils'

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, '0') + 'min' : ''}` : `${m}min`
}

interface CabineCardProps {
  cabine: Cabine
  isActive: boolean
  canWriteLive: boolean
  canWriteCabine: boolean
  onSelect: () => void
  onStartLive: () => void
  onSchedule: () => void
}

export function CabineCard({
  cabine,
  isActive,
  canWriteLive,
  canWriteCabine,
  onSelect,
  onStartLive,
  onSchedule,
}: CabineCardProps) {
  const isLive = cabine.status === 'ao_vivo'
  const record = cabine as Cabine & JsonRecord

  const brandLogo = getBrandImage({
    logo_url: record.marca_logo_url ?? getNestedValue(record.proxima_agenda, 'marca_logo_url'),
    site: record.marca_site ?? getNestedValue(record.proxima_agenda, 'marca_site'),
  })
  const brandName = asString(
    record.marca_nome
      ?? (getNestedValue(record.proxima_agenda, 'marca_nome') as string | undefined)
      ?? record.cliente_nome
      ?? record.cliente_em_live_nome,
    '',
  )
  const brandInitials = brandName
    ? brandName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
    : ''

  const iniciado = isLive && record.iniciado_em ? new Date(asString(record.iniciado_em)) : null
  const duracaoMin =
    iniciado && !Number.isNaN(iniciado.getTime())
      ? Math.floor((Date.now() - iniciado.getTime()) / 60000)
      : 0

  return (
    <article
      className={`relative overflow-hidden rounded-[18px] border transition-all duration-[250ms] ${isLive ? 'cabine-card-live' : 'cabine-card-avail border-[var(--border)] hover:border-[var(--border-strong)]'}`}
      style={
        isLive
          ? {
              borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
              background:
                'radial-gradient(500px 180px at 100% -30%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 60%), var(--bg-elev-1)',
            }
          : { background: 'var(--bg-elev-1)' }
      }
    >
      {/* card body */}
      <div className="relative z-[2] p-[22px_24px_20px]">

        {/* head: icon + name + status badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-[14px] min-w-0">
            {brandLogo ? (
              <img
                src={brandLogo}
                alt={brandName}
                loading="lazy"
                decoding="async"
                className="h-[42px] w-[42px] flex-none rounded-[11px] object-cover border border-[var(--border)]"
              />
            ) : brandInitials ? (
              <div className="h-[42px] w-[42px] flex-none rounded-[11px] grid place-items-center text-[11px] font-bold tracking-[0.08em] bg-[var(--bg-elev-3)] text-[var(--text-secondary)] border border-[var(--border)]">
                {brandInitials}
              </div>
            ) : (
              <div
                className="h-[42px] w-[42px] flex-none rounded-[11px] grid place-items-center border"
                style={
                  isLive
                    ? {
                        background: 'var(--primary-soft)',
                        color: 'var(--primary)',
                        borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                      }
                    : { background: 'var(--bg-elev-3)', color: 'var(--text-muted)', borderColor: 'var(--border)' }
                }
              >
                <Presentation className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="m-0 text-[19px] font-semibold tracking-[-0.015em] text-[var(--text-primary)] leading-tight">
                Cabine {String(cabine.numero ?? '').padStart(2, '0')}
              </h3>
              {brandName ? (
                <p className="mt-[3px] text-[11.5px] uppercase tracking-[0.08em] font-mono text-[var(--text-muted)] truncate">
                  {brandName}
                </p>
              ) : (
                <p className="mt-[3px] text-[12px] italic text-[var(--text-faint)]">sem cliente</p>
              )}
            </div>
          </div>

          {/* status badge */}
          {isLive ? (
            <span
              className="shrink-0 inline-flex items-center gap-2 px-[10px] py-[5px] rounded-full text-[11px] font-semibold tracking-[0.06em] uppercase font-mono border bg-[var(--primary-soft)] text-[var(--primary)]"
              style={{ borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)' }}
            >
              <span className="cabine-live-ping relative w-[7px] h-[7px] rounded-full bg-[var(--primary)]" />
              AO VIVO
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-2 px-[10px] py-[5px] rounded-full text-[11px] font-semibold tracking-[0.06em] uppercase font-mono border border-[var(--border)] bg-[var(--bg-elev-3)] text-[var(--text-muted)]">
              <span className="w-[7px] h-[7px] rounded-full bg-[var(--text-faint)]" />
              {isActive ? 'DISPONÍVEL' : 'INATIVA'}
            </span>
          )}
        </div>

        {/* presenter row */}
        <div
          className="mt-[18px] flex items-center gap-[10px] px-[14px] py-[11px] rounded-[11px] border border-[var(--border)] text-[13px] text-[var(--text-secondary)]"
          style={{ background: 'rgba(0,0,0,0.02)' }}
        >
          {isLive ? (
            <>
              <span
                className="w-[7px] h-[7px] shrink-0 rounded-full bg-[var(--primary)]"
                style={{ boxShadow: '0 0 8px var(--primary)' }}
              />
              <span className="truncate">
                <span className="font-medium text-[var(--text-primary)]">
                  {asString(record.apresentador_nome, 'Apresentadora')}
                </span>
                {' · em transmissão'}
              </span>
              {duracaoMin > 0 && (
                <span className="ml-auto shrink-0 font-mono text-[11px] text-[var(--text-muted)]">
                  há {fmtDuration(duracaoMin)}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="w-[7px] h-[7px] shrink-0 rounded-full bg-[var(--text-faint)]" />
              <span className="text-[var(--text-faint)]">sem apresentadora definida</span>
            </>
          )}
        </div>

        {/* metrics 3-col */}
        <div className="mt-[14px] grid grid-cols-3 gap-px rounded-[12px] overflow-hidden border border-[var(--border)] bg-[var(--border)]">
          {[
            { label: 'Viewers', value: isLive ? asNumber(cabine.viewer_count).toLocaleString('pt-BR') : '—', accent: false },
            { label: 'GMV', value: isLive ? formatMoney(cabine.gmv_atual) : '—', accent: isLive },
            { label: 'Pedidos', value: isLive ? asNumber(cabine.total_orders).toLocaleString('pt-BR') : '—', accent: false },
          ].map(({ label, value, accent }) => (
            <div key={label} className="bg-[var(--bg-elev-1)] p-[13px_15px] min-h-[66px]">
              <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.10em] font-medium">{label}</div>
              <div
                className={`mt-[5px] text-[20px] font-semibold tracking-[-0.015em] num leading-none ${accent ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* live strip — audio wave + REC timecode */}
        {isLive && (
          <div
            className="mt-[14px] flex items-center gap-3 px-[14px] py-[10px] rounded-[11px] border text-[12px] text-[var(--text-primary)]"
            style={{
              borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)',
              background: 'linear-gradient(90deg, color-mix(in srgb, var(--primary) 10%, transparent), transparent 80%)',
            }}
          >
            <span className="flex items-end gap-[2px]" style={{ height: 14 }}>
              {(['30%', '80%', '50%', '95%', '60%'] as const).map((h, i) => (
                <i key={i} className="cabine-wave-bar" style={{ height: h, animationDelay: `${[0, 0.15, 0.3, 0.45, 0.6][i]}s` }} />
              ))}
            </span>
            <span className="text-[var(--text-secondary)]">Transmissão ativa</span>
            {duracaoMin > 0 && (
              <span className="ml-auto font-mono text-[11px] text-[var(--text-muted)]">
                REC {String(Math.floor(duracaoMin / 60)).padStart(2, '0')}:{String(duracaoMin % 60).padStart(2, '0')}:00
              </span>
            )}
          </div>
        )}

        {/* action buttons */}
        <div className="mt-[16px] flex flex-wrap gap-2 items-center">
          {isLive ? <TikTokLiveButton username={record.tiktok_username} /> : null}
          {isLive ? (
            <Button variant="secondary" icon={MonitorPlay} onClick={onSelect}>
              Detalhes
            </Button>
          ) : isActive && canWriteLive ? (
            <Button icon={MonitorPlay} onClick={() => { onSelect(); onStartLive() }}>
              Iniciar live
            </Button>
          ) : null}
          {isActive && canWriteCabine ? (
            <Button variant="secondary" icon={CalendarClock} onClick={onSchedule}>
              Agendar
            </Button>
          ) : null}
          {!isLive ? (
            <Button variant="ghost" icon={MonitorPlay} onClick={onSelect}>
              Detalhes
            </Button>
          ) : null}
        </div>
      </div>

      {/* card footer */}
      <div
        className="relative z-[2] flex items-center justify-between px-6 py-[10px] border-t border-[var(--border)] text-[11px] font-mono text-[var(--text-faint)]"
        style={{ background: 'rgba(0,0,0,0.04)' }}
      >
        <span>C-{String(cabine.numero ?? '').padStart(2, '0')}</span>
        <span className="flex items-center gap-[6px]">
          <span
            className="w-[6px] h-[6px] rounded-full"
            style={
              isLive
                ? { background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }
                : { background: 'var(--text-faint)' }
            }
          />
          {isLive ? 'transmitindo · estável' : 'aguardando'}
        </span>
      </div>
    </article>
  )
}
