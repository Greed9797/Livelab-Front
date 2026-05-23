import { asNumber } from '../../utils/format'
import type { JsonRecord } from '../../types/models'

interface GmvHeroCardProps {
  raw: JsonRecord
}

function fmtBRL(v: number, dec = 2): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function fmtCompact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
  if (v >= 1_000) return `${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

export function GmvHeroCard({ raw }: GmvHeroCardProps) {
  const gmvMes = asNumber(raw.gmv_lives_mes ?? raw.gmv_mes ?? raw.fat_bruto)
  const gmvPrev = asNumber(raw.gmv_mes_prev ?? raw.gmv_prev)
  const metaMes = asNumber(raw.meta_mes)
  const ritmo = asNumber(raw.ritmo_projetado)
  const diaUtil = asNumber(raw.dia_util ?? raw.dia_util_atual)
  const diasUteis = asNumber(raw.dias_uteis_total ?? raw.dias_uteis ?? 22)

  const delta = gmvPrev > 0 ? ((gmvMes - gmvPrev) / gmvPrev) * 100 : 0
  const pctMeta = metaMes > 0 ? (gmvMes / metaMes) * 100 : 0
  const pctRitmo = metaMes > 0 ? (ritmo / metaMes) * 100 : 0
  const falta = metaMes > gmvMes ? metaMes - gmvMes : 0

  return (
    <div
      className="flex flex-col gap-4 rounded-xl p-5"
      style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          GMV — desempenho do mês
        </h3>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: 'var(--primary)' }}
            />
            Acumulado
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-sm opacity-50"
              style={{ background: 'var(--text-muted)' }}
            />
            Mês anterior
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            GMV acumulado do mês
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>R$</span>
            <span
              className="text-[32px] font-semibold leading-none tracking-tight font-mono"
              style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {fmtBRL(gmvMes, 0)}
            </span>
          </div>
        </div>
        {delta !== 0 && (
          <div className="text-right">
            <div
              className="inline-flex items-center rounded-md px-2.5 py-1 text-sm font-semibold font-mono"
              style={{
                background: delta >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)',
                color: delta >= 0 ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
            </div>
            <div className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              vs. mesmo período do mês anterior
            </div>
          </div>
        )}
      </div>

      {metaMes > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-muted)' }}>
              Meta · <strong style={{ color: 'var(--text-secondary)' }}>R$ {fmtBRL(metaMes, 0)}</strong>
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)' }}>
                {pctMeta.toFixed(1)}%
              </strong>{' '}
              realizado
            </span>
          </div>

          <div className="relative h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-elev-3)' }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(pctMeta, 100)}%`,
                background: pctMeta >= 100 ? 'var(--success)' : 'var(--primary)',
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>
              {diaUtil > 0 ? (
                <>
                  Dia útil{' '}
                  <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {diaUtil}/{diasUteis}
                  </strong>
                  {falta > 0 && (
                    <> · faltam <strong style={{ color: 'var(--text-secondary)' }}>R$ {fmtCompact(falta)}</strong></>
                  )}
                </>
              ) : (
                falta > 0 && <>Faltam <strong style={{ color: 'var(--text-secondary)' }}>R$ {fmtCompact(falta)}</strong></>
              )}
            </span>
            {ritmo > 0 && (
              <span>
                Ritmo projetado{' '}
                <strong
                  style={{
                    color: pctRitmo >= 100 ? 'var(--success)' : 'var(--warning)',
                    fontFamily: 'var(--font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  R$ {fmtCompact(ritmo)}
                </strong>
                {' '}·{' '}
                <span style={{ color: pctRitmo >= 100 ? 'var(--success)' : 'var(--text-secondary)' }}>
                  {pctRitmo.toFixed(0)}% da meta
                </span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
