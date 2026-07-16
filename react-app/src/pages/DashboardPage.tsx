import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { GradeDiaView } from '../components/conteudo/GradeViews'
import { corDaMarca, marcasPresentes, type GradeDia } from '../components/conteudo/gradeUtils'
import { ErrorState, LoadingState } from '../components/ui/States'
import { KpiStrip } from '../components/dashboard/KpiStrip'
import { GmvHeroPanel } from '../components/dashboard/GmvHeroPanel'
import { AoVivoPanel } from '../components/dashboard/AoVivoPanel'
import { PresenterLeaderboard } from '../components/dashboard/PresenterLeaderboard'
import { getGrade, getHomeDashboard } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString } from '../utils/format'
import { getSaoPauloDateInput } from '../utils/sao-paulo-date'
import type { Cabine, JsonRecord } from '../types/models'

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
        <Link to="/conteudo?tab=agenda" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
          Agenda completa →
        </Link>
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

/* ── Month helpers ── */
function shiftMonth(mesISO: string, direction: 1 | -1): string {
  const [y, m] = mesISO.split('-').map(Number)
  const d = new Date(y, m - 1 + direction, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(mesISO: string): string {
  const [y, m] = mesISO.split('-').map(Number)
  // Capitaliza só a inicial ("julho de 2026" → "Julho de 2026"); CSS capitalize
  // deixaria "Julho De 2026" (De maiúsculo, errado em pt-BR).
  const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Últimos 12 meses (incluindo o corrente), mais recente primeiro. */
function last12Months(currentMonth: string): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    let mes = currentMonth
    for (let j = 0; j < i; j++) mes = shiftMonth(mes, -1)
    return mes
  })
}

/* ── Main page ── */
export function DashboardPage() {
  const today = getSaoPauloDateInput()
  const currentMonth = today.slice(0, 7)
  const navigate = useNavigate()
  // null = automático (backend escolhe o mês efetivo: atual se tem dados, senão o último com dados)
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null)
  // Intervalos calibrados pra reduzir requests background sem perder
  // real-time onde importa. A home já traz cabines, agenda e ranking inicial.
  const homeQuery = useQuery({
    queryKey: ['home-dashboard', mesSelecionado ?? 'auto'],
    queryFn: () => getHomeDashboard(mesSelecionado ? { mes: mesSelecionado } : {}),
    staleTime: 30_000,
    // Mês passado é histórico — não precisa de polling ao vivo
    refetchInterval: mesSelecionado && mesSelecionado !== currentMonth ? false : 30_000,
    refetchIntervalInBackground: false,
    placeholderData: (prev) => prev,
  })

  // Card de cabines = espelho da Grade (aba Agenda) para hoje.
  const gradeQuery = useQuery({
    queryKey: ['grade', today, today],
    queryFn: () => getGrade({ data_inicio: today, data_fim: today }),
    staleTime: 60_000,
  })

  if (homeQuery.isLoading) return <LoadingState />
  if (homeQuery.isError) return (
    <ErrorState
      message={extractErrorMessage(homeQuery.error)}
      onRetry={() => void homeQuery.refetch()}
    />
  )

  const raw = (homeQuery.data ?? {}) as JsonRecord
  // Mês exibido: seleção manual > mes_referencia do backend > mês corrente
  const mesExibido = mesSelecionado ?? asString(raw.mes_referencia, currentMonth).slice(0, 7)
  const agenda = asArray<JsonRecord>(raw.agenda_hoje ?? raw.proximas_lives_dia)
  const cabines = asArray<Cabine>(raw.cabines)
  const rankingApresentadoras = asArray<JsonRecord>(raw.ranking_apresentadoras_mes)

  const liveCabines = cabines.filter(
    (c) => asString(c.status, '').includes('ao_vivo') || asString(c.status, '') === 'live'
  )

  // Grade de hoje (mesma fonte da aba Agenda) + legenda por marca
  const celulasHoje = ((gradeQuery.data?.dias ?? []) as unknown as GradeDia[])[0]?.celulas ?? []
  const cabinesOrdenadas = [...(cabines as unknown as JsonRecord[])]
    .sort((a, b) => asNumber(a.numero) - asNumber(b.numero))
  const legendaMarcas = marcasPresentes(celulasHoje)

  return (
    <div className="flex flex-col gap-5">
      <PageHead liveCount={liveCabines.length} />

      {/* Seletor de mês — mesmo período rege todos os números da página */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => setMesSelecionado(shiftMonth(mesExibido, -1))}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink hover:bg-surface-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <select
          aria-label="Filtrar por mês"
          className="design-input h-9 min-w-[160px] px-3 text-sm font-bold"
          value={mesExibido}
          onChange={(e) => setMesSelecionado(e.target.value === currentMonth ? null : e.target.value)}
        >
          {last12Months(currentMonth).map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
          {/* mês exibido pode estar fora da janela de 12 meses (navegação por seta) */}
          {!last12Months(currentMonth).includes(mesExibido) ? (
            <option value={mesExibido}>{monthLabel(mesExibido)}</option>
          ) : null}
        </select>
        <button
          type="button"
          aria-label="Próximo mês"
          disabled={mesExibido >= currentMonth}
          onClick={() => setMesSelecionado(shiftMonth(mesExibido, 1))}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink hover:bg-surface-muted disabled:opacity-35"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {mesSelecionado ? (
          <button
            type="button"
            onClick={() => setMesSelecionado(null)}
            className="h-9 rounded-lg border border-line px-3 text-sm font-bold text-ink-muted hover:text-ink"
          >
            Mês atual
          </button>
        ) : null}
        {homeQuery.isFetching ? <span className="text-xs text-ink-muted">atualizando…</span> : null}
      </div>

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
        <GmvHeroPanel raw={raw} />
        <div className="flex flex-col gap-4">
          <PresenterLeaderboard
            rows={rankingApresentadoras}
            title="Pódio de apresentadoras"
            subtitle="Top 3 do mês · GMV e comissão"
            limit={3}
            action={
              <Link className="text-xs font-semibold text-brand hover:underline" to="/ranking/apresentadoras">
                Ver ranking →
              </Link>
            }
          />
          <AgendaCard agenda={agenda} />
        </div>
      </div>

      {/* Operations row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 340px' }}>
        <div
          className="flex flex-col gap-4 rounded-xl p-4"
          style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Grade de hoje
            </h3>
            {/* Legenda por marca — espelha a aba Agenda (cor determinística por marca_id) */}
            <div className="flex flex-wrap items-center justify-end gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {legendaMarcas.slice(0, 5).map((m) => (
                <span key={m.id} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ background: corDaMarca(m.id).solid }} />
                  {m.nome}
                </span>
              ))}
            </div>
          </div>
          {gradeQuery.isLoading ? (
            <p className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Carregando grade…</p>
          ) : (
            <GradeDiaView
              celulas={celulasHoje}
              cabines={cabinesOrdenadas}
              onCellClick={() => navigate('/conteudo')}
            />
          )}
        </div>

        <AoVivoPanel liveCabines={liveCabines} />
      </div>

      {/* Ranking apresentadoras */}
      <PresenterLeaderboard
        rows={rankingApresentadoras}
        title="Ranking de apresentadoras"
        subtitle="Progresso vs. líder do mês"
        variant="full"
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
