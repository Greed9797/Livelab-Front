import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { GradeDiaView } from '../components/conteudo/GradeViews'
import { marcasPresentes, type GradeDia } from '../components/conteudo/gradeUtils'
import { resolveMarcaCor } from '../utils/brandColor'
import { ErrorState, LoadingState } from '../components/ui/States'
import { KpiStrip } from '../components/dashboard/KpiStrip'
import { PageHeader } from '../components/ui/PageHeader'
import { GmvHeroPanel } from '../components/dashboard/GmvHeroPanel'
import { PresenterLeaderboard } from '../components/dashboard/PresenterLeaderboard'
import { BrandLeaderboard } from '../components/dashboard/BrandLeaderboard'
import { getGrade, getHomeDashboard } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString } from '../utils/format'
import { getSaoPauloDateInput } from '../utils/sao-paulo-date'
import type { Cabine, JsonRecord } from '../types/models'

/* ── Page header ── */
function PageHead({ liveCount }: { liveCount: number }) {
  return (
    <PageHeader
      accent="Visão"
      title="da unidade"
      subtitle="Pulso operacional, comercial e financeiro — atualizado em tempo real."
      actions={
        liveCount > 0 ? (
          <span
            className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: 'var(--live-soft)', color: 'var(--live)', border: '1px solid var(--live)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--live)' }} />
            {liveCount} {liveCount === 1 ? 'live' : 'lives'} ao vivo agora
          </span>
        ) : null
      }
    />
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
  // Só troca a tela inteira por erro quando não há NADA para mostrar. A home refaz a
  // cada 30s; uma falha de rede num refetch de background não pode apagar os dados que
  // já estão na tela — era isso que fazia o painel sumir e só voltar no ciclo seguinte.
  if (homeQuery.isError && !homeQuery.data) return (
    <ErrorState
      message={extractErrorMessage(homeQuery.error)}
      onRetry={() => void homeQuery.refetch()}
    />
  )

  const raw = (homeQuery.data ?? {}) as JsonRecord
  const atualizacaoFalhou = homeQuery.isError && Boolean(homeQuery.data)
  // Mês exibido: seleção manual > mes_referencia do backend > mês corrente
  const mesExibido = mesSelecionado ?? asString(raw.mes_referencia, currentMonth).slice(0, 7)
  const cabines = asArray<Cabine>(raw.cabines)
  const rankingApresentadoras = asArray<JsonRecord>(raw.ranking_apresentadoras_mes)
  const rankingMarcas = asArray<JsonRecord>(raw.ranking_marcas_mes)

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

      {atualizacaoFalhou ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-ink">
          <span>Não foi possível atualizar agora — os números abaixo são da última atualização.</span>
          <button
            type="button"
            onClick={() => void homeQuery.refetch()}
            className="rounded-full border border-line px-3 py-1 text-xs font-semibold hover:bg-surface-muted"
          >
            Tentar de novo
          </button>
        </div>
      ) : null}

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
        <PresenterLeaderboard
          rows={rankingApresentadoras}
          title="Pódio de apresentadoras"
          subtitle="Top 5 do mês · GMV e comissão"
          limit={5}
          action={
            <Link className="text-xs font-semibold text-brand hover:underline" to="/ranking/apresentadoras">
              Ver ranking →
            </Link>
          }
        />
      </div>

      {/* Grade de hoje — largura total */}
      <div className="grid gap-4">
        <div
          className="flex flex-col gap-4 rounded-xl p-4"
          style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Grade de hoje
            </h3>
            {/* Legenda por marca — espelha a aba Agenda. Mostra TODAS as marcas da grade:
                cortar a lista escondia marcas sem avisar, e a legenda existe justamente
                para dizer de quem é cada cor. */}
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {legendaMarcas.map((m) => (
                <span key={m.id} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ background: resolveMarcaCor(m.cor, m.id) }} />
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
      </div>

      {/* Ranking de marcas — largura total, ordenado por GMV/h */}
      <BrandLeaderboard
        rows={rankingMarcas}
        title="Ranking de marcas"
        subtitle="Eficiência do mês · GMV por hora no ar"
        limit={6}
        action={
          <Link className="text-xs font-semibold text-brand hover:underline" to="/ranking/marcas">
            Ver ranking de marcas →
          </Link>
        }
      />
    </div>
  )
}
