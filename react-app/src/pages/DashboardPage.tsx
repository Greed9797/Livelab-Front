import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { ErrorState, LoadingState } from '../components/ui/States'
import { KpiStrip } from '../components/dashboard/KpiStrip'
import { GmvHeroPanel } from '../components/dashboard/GmvHeroPanel'
import { CabinesGantt } from '../components/dashboard/CabinesGantt'
import { AoVivoPanel } from '../components/dashboard/AoVivoPanel'
import { getHomeDashboard, getPublicRanking } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, formatMoney } from '../utils/format'
import type { Cabine, JsonRecord } from '../types/models'

function RankingNacional({ data }: { data: JsonRecord[] }) {
  return (
    <div
      className="flex flex-col rounded-[10px] overflow-hidden"
      style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)' }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
          Ranking nacional
        </span>
      </div>
      <div className="flex flex-col divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
        {data.length === 0 && (
          <p className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-faint)' }}>Sem dados</p>
        )}
        {data.slice(0, 8).map((item) => {
          const pos = asNumber(item.posicao)
          const gmv = asNumber(item.gmv_mes)
          return (
            <div
              key={String(item.id ?? item.posicao)}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{ borderColor: 'var(--border)' }}
            >
              <span
                className="w-6 shrink-0 text-right text-[11px] font-mono font-semibold"
                style={{ color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}
              >
                #{pos}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {asString(item.nome)}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                  {[asString(item.cidade, ''), asString(item.uf, '')].filter(Boolean).join('/') || '—'}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className="text-[12px] font-mono font-semibold"
                  style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatMoney(gmv, true)}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                  {asNumber(item.total_lives)} lives
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProximasLives({ agenda }: { agenda: JsonRecord[] }) {
  function fmtHora(v: unknown) {
    if (!v) return '—'
    const d = new Date(v as string)
    if (!isNaN(d.getTime())) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return String(v).slice(0, 5)
  }

  const proximas = agenda
    .filter(ev => {
      const s = asString(ev.status, '')
      const inicio = new Date(asString(ev.data_inicio, ''))
      return s !== 'ao_vivo' && !s.includes('encerr') && !s.includes('cancela') && inicio > new Date()
    })
    .slice(0, 5)

  return (
    <div
      className="flex flex-col rounded-[10px] overflow-hidden"
      style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)' }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
          Próximas lives — hoje
        </span>
      </div>
      <div className="flex flex-col divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
        {proximas.length === 0 && (
          <p className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-faint)' }}>Sem lives agendadas</p>
        )}
        {proximas.map((ev, i) => {
          const cabNum = asNumber(ev.cabine_numero ?? ev.numero)
          const cabLabel = cabNum > 0 ? `C-${String(cabNum).padStart(2, '0')}` : '—'
          return (
            <div
              key={String(ev.id ?? i)}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{ borderColor: 'var(--border)' }}
            >
              <span
                className="w-10 shrink-0 text-[12px] font-mono font-semibold"
                style={{ color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}
              >
                {fmtHora(ev.data_inicio ?? ev.hora_inicio)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {asString(ev.marca_nome ?? ev.cliente_nome ?? ev.titulo, '—')}
                </div>
                <div className="text-[11px] truncate" style={{ color: 'var(--text-faint)' }}>
                  {asString(ev.apresentadora_nome ?? ev.apresentador_nome, 'A definir')}
                </div>
              </div>
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono font-medium"
                style={{ background: 'var(--bg-elev-3)', color: 'var(--text-muted)' }}
              >
                {cabLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const query = useQuery({
    queryKey: ['home-dashboard'],
    queryFn: getHomeDashboard,
    refetchInterval: () => (document.hidden ? false : 30_000),
    refetchIntervalInBackground: false,
    staleTime: 15_000,
  })
  const rankingQuery = useQuery({
    queryKey: ['public-ranking', 'nacional'],
    queryFn: () => getPublicRanking({ limit: 8 }),
  })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const raw = (query.data ?? {}) as JsonRecord
  const cabines = (raw.cabines as Cabine[] | undefined) ?? []
  const agendaHoje = (raw.agenda_hoje as JsonRecord[] | undefined) ?? []
  const liveNow = cabines.filter(c => asString(c.status, '').includes('ao_vivo'))
  const rankingData = rankingQuery.data ?? []

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader
        accent="Visão"
        title="da unidade"
        subtitle="Resumo operacional de hoje e acumulado do mês."
      />

      <KpiStrip raw={raw} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 14 }}>
        <GmvHeroPanel raw={raw} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <RankingNacional data={rankingData} />
          <ProximasLives agenda={agendaHoje} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 14 }}>
        <div
          className="rounded-[10px] overflow-hidden"
          style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)', padding: 16 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
              Cabines — ocupação de hoje
            </span>
            <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--text-faint)' }}>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: 'oklch(0.66 0.22 25 / 0.5)', border: '1px solid oklch(0.66 0.22 25)' }} />
                Ao vivo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: 'oklch(0.74 0.11 235 / 0.3)', border: '1px solid oklch(0.74 0.11 235 / 0.6)' }} />
                Agendada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: 'var(--bg-elev-3)', border: '1px solid var(--border)' }} />
                Concluída
              </span>
            </div>
          </div>
          <CabinesGantt agenda={agendaHoje} cabines={liveNow as unknown as Cabine[]} />
        </div>
        <AoVivoPanel liveCabines={liveNow} />
      </div>
    </div>
  )
}
