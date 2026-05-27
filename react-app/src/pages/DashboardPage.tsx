import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/ui/States'
import { KpiStrip } from '../components/dashboard/KpiStrip'
import { GmvHeroCard } from '../components/dashboard/GmvHeroCard'
import { CabinesGantt } from '../components/dashboard/CabinesGantt'
import { AoVivoPanel } from '../components/dashboard/AoVivoPanel'
import { PresenterLeaderboard } from '../components/dashboard/PresenterLeaderboard'
import { getAgenda, getCabines, getComissoesApresentadoras, getHomeDashboard } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString } from '../utils/format'
import { getSaoPauloDateInput, getSaoPauloDayAgendaParams } from '../utils/sao-paulo-date'
import type { JsonRecord } from '../types/models'

function fmtCompact(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
  return `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

/* ── Page header ── */
function PageHead({ liveCount }: { liveCount: number }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="m-0 text-2xl font-bold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>
          <span className="font-serif italic font-normal" style={{ color: 'var(--primary)' }}>Visão</span>{' '}
          da unidade
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Pulso operacional, comercial e financeiro — atualizado em tempo real.
        </p>
      </div>
      {liveCount > 0 && (
        <span
          className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ background: 'var(--live-soft)', color: 'var(--live)', border: '1px solid var(--live)' }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: 'var(--live)' }}
          />
          {liveCount} {liveCount === 1 ? 'live' : 'lives'} ao vivo agora
        </span>
      )}
    </div>
  )
}

/* ── Ranking nacional ── */
function RankingNacionalCard({ ranking }: { ranking: JsonRecord[] }) {
  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Ranking nacional
        </h3>
        <a href="#" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
          Ver rede →
        </a>
      </div>
      <div className="flex flex-col divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
        {ranking.length === 0 && (
          <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>—</p>
        )}
        {ranking.slice(0, 8).map((r, i) => {
          const isSelf = Boolean(r.self ?? r.is_self ?? r.tenant_id === 'self')
          const pos = asNumber(r.rk ?? r.posicao ?? i + 1)
          const nome = asString(r.nome ?? r.tenant_nome ?? r.cliente_nome)
          const gmv = asNumber(r.gmv ?? r.valor)
          const d = asNumber(r.d ?? r.delta ?? r.variacao)
          return (
            <div
              key={i}
              className="flex items-center gap-2 px-4 py-2 text-sm"
              style={{
                background: isSelf ? 'var(--primary-softer)' : 'transparent',
                borderLeft: isSelf ? '2px solid var(--primary)' : '2px solid transparent',
              }}
            >
              <span
                className="w-7 shrink-0 text-[11px] font-mono font-medium"
                style={{ color: isSelf ? 'var(--primary)' : 'var(--text-muted)' }}
              >
                #{String(pos).padStart(2, '0')}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                {nome}
              </span>
              <span className="shrink-0 font-mono text-[12px]" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                {fmtCompact(gmv)}
              </span>
              {d !== 0 && (
                <span
                  className="shrink-0 text-[11px] font-mono"
                  style={{ color: d >= 0 ? 'var(--success)' : 'var(--danger)' }}
                >
                  {d >= 0 ? '+' : ''}{d.toFixed(1)}%
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Agenda card ── */
function AgendaCard({ agenda }: { agenda: JsonRecord[] }) {
  function parseHora(dt: string | undefined): string {
    if (!dt) return '—'
    const d = new Date(dt)
    if (isNaN(d.getTime())) return dt.slice(0, 5)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const upcoming = agenda
    .filter((ev) => {
      const status = asString(ev.status, '')
      return !status.includes('conclu') && !status.includes('cancel') && !status.includes('encerr')
    })
    .slice(0, 6)

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Próximas lives · hoje
        </h3>
        <a href="#" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
          Agenda completa →
        </a>
      </div>
      <div className="flex flex-col divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
        {upcoming.length === 0 && (
          <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhuma live agendada para hoje
          </p>
        )}
        {upcoming.map((ev, i) => {
          const hora = parseHora(asString(ev.data_inicio ?? ev.hora_inicio, ''))
          const nome = asString(ev.cliente_nome ?? ev.marca_nome ?? ev.titulo)
          const cabNum = asNumber(ev.cabine_numero ?? ev.numero)
          const cab = cabNum > 0 ? `C-${String(cabNum).padStart(2, '0')}` : ''
          const isLive = asString(ev.status, '').includes('ao_vivo') || asString(ev.status, '').includes('live')

          return (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-14 shrink-0">
                <div
                  className="text-[13px] font-semibold font-mono leading-none"
                  style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {hora}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {isLive && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--live)' }} />}
                  <span className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {nome}
                  </span>
                </div>
                {asString(ev.apresentadora_nome ?? ev.apresentador_nome, '') && (
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {asString(ev.apresentadora_nome ?? ev.apresentador_nome)}
                  </div>
                )}
              </div>
              {cab && (
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium font-mono"
                  style={{ background: 'var(--bg-elev-3)', color: 'var(--text-muted)' }}
                >
                  {cab}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Alerts strip ── */
function AlertsStrip({ raw }: { raw: JsonRecord }) {
  const alertas = (raw.alertas ?? {}) as JsonRecord
  const contratos = asNumber(alertas.contratos_aguardando_assinatura ?? raw.contratos_aguardando_assinatura)
  const boletos = asNumber(alertas.boletos_vencidos ?? raw.boletos_vencidos)
  const conflitos = asNumber(alertas.conflitos_agenda ?? raw.conflitos_agenda)

  const items = [
    { label: 'Contratos aguardando', value: contratos, hint: 'assinatura pendente', tone: 'warning' as const },
    { label: 'Boletos vencidos', value: boletos, hint: 'atenção financeira', tone: 'danger' as const },
    { label: 'Conflitos de agenda', value: conflitos, hint: 'próximas 48h', tone: 'neutral' as const },
  ].filter((a) => a.value > 0)

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((a) => (
        <div
          key={a.label}
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            background: a.tone === 'danger' ? 'var(--danger-soft)' : a.tone === 'warning' ? 'var(--warning-soft)' : 'var(--bg-elev-1)',
            border: `1px solid ${a.tone === 'danger' ? 'var(--danger)' : a.tone === 'warning' ? 'var(--warning)' : 'var(--border)'}`,
          }}
        >
          <span
            className="text-xl font-bold font-mono leading-none"
            style={{ color: a.tone === 'danger' ? 'var(--danger)' : a.tone === 'warning' ? 'var(--warning)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
          >
            {a.value}
          </span>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {a.label}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {a.hint}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Main page ── */
export function DashboardPage() {
  const today = getSaoPauloDateInput()
  const agendaTodayParams = getSaoPauloDayAgendaParams(today)
  const homeQuery = useQuery({
    queryKey: ['home-dashboard'],
    queryFn: getHomeDashboard,
    refetchInterval: 30_000,
  })
  const agendaQuery = useQuery({
    queryKey: ['agenda-today', today],
    queryFn: () => getAgenda(agendaTodayParams),
    refetchInterval: 60_000,
  })
  const cabinesQuery = useQuery({
    queryKey: ['cabines'],
    queryFn: getCabines,
    refetchInterval: 30_000,
  })
  const rankingQuery = useQuery({
    queryKey: ['comissoes-apresentadoras'],
    queryFn: () => getComissoesApresentadoras(),
    refetchInterval: 60_000,
  })

  if (homeQuery.isLoading) return <LoadingState />
  if (homeQuery.isError) return (
    <ErrorState
      message={extractErrorMessage(homeQuery.error)}
      onRetry={() => void homeQuery.refetch()}
    />
  )

  const raw = (homeQuery.data ?? {}) as JsonRecord
  const agenda = asArray<JsonRecord>(agendaQuery.data)
  const cabines = cabinesQuery.data ?? []
  const rankingApresentadoras = asArray<JsonRecord>(raw.ranking_apresentadoras_mes ?? rankingQuery.data)

  const liveCabines = cabines.filter(
    (c) => asString(c.status, '').includes('ao_vivo') || asString(c.status, '') === 'live'
  )
  const rankingNacional = asArray<JsonRecord>(raw.ranking ?? raw.ranking_clientes ?? raw.top_clientes)

  return (
    <div className="flex flex-col gap-5">
      <PageHead liveCount={liveCabines.length} />

      {/* KPI strip */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 720 }}>
          <KpiStrip raw={raw} />
        </div>
      </div>

      {/* Alerts (only if any) */}
      <AlertsStrip raw={raw} />

      {/* Hero row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 340px' }}>
        <GmvHeroCard raw={raw} />
        <div className="flex flex-col gap-4">
          <RankingNacionalCard ranking={rankingNacional} />
          <AgendaCard agenda={agenda} />
        </div>
      </div>

      {/* Operations row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 340px' }}>
        <div
          className="flex flex-col gap-4 rounded-xl p-4"
          style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Cabines — ocupação de hoje
            </h3>
            <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: 'oklch(0.66 0.22 25 / 0.5)', border: '1px solid oklch(0.66 0.22 25)' }} />
                Ao vivo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: 'oklch(0.74 0.11 235 / 0.3)', border: '1px solid oklch(0.74 0.11 235 / 0.6)' }} />
                Agendada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: 'var(--bg-elev-3)', border: '1px solid var(--border)' }} />
                Concluída
              </span>
            </div>
          </div>
          <CabinesGantt agenda={agenda} cabines={cabines} date={today} />
        </div>

        <AoVivoPanel liveCabines={liveCabines} />
      </div>

      {/* Ranking apresentadoras */}
      <PresenterLeaderboard
        rows={rankingApresentadoras}
        title="Ranking de apresentadoras"
        subtitle="Progresso vs. líder do mês"
        limit={6}
        action={
          <Link className="text-xs font-semibold text-brand hover:underline" to="/ranking-apresentadoras">
            Ver ranking completo →
          </Link>
        }
      />
    </div>
  )
}
