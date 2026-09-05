import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { GradeDiaView } from '../components/conteudo/GradeViews'
import { marcasPresentes, type GradeDia } from '../components/conteudo/gradeUtils'
import { resolveMarcaCor } from '../utils/brandColor'
import { ErrorState, LoadingState } from '../components/ui/States'
import { KpiStrip } from '../components/dashboard/KpiStrip'
import { PageHeader } from '../components/ui/PageHeader'
import { GmvHeroPanel } from '../components/dashboard/GmvHeroPanel'
import { PresenterLeaderboard } from '../components/dashboard/PresenterLeaderboard'
import { BrandLeaderboard } from '../components/dashboard/BrandLeaderboard'
import { AssiduidadeStrip } from '../components/dashboard/AssiduidadeStrip'
import { OperationsNow } from '../components/dashboard/OperationsNow'
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
    { label: 'Contratos em preparação', value: contratos, hint: 'Rascunhos ou em análise', tone: 'warning' as const },
    { label: 'Boletos vencidos', value: boletos, hint: 'Atenção financeira', tone: 'danger' as const },
    { label: 'Sobreposições na agenda', value: conflitos, hint: 'Agendamentos cadastrados', tone: 'neutral' as const },
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

/** Primeiro dia do mês 'YYYY-MM', como 'YYYY-MM-DD'. */
function primeiroDiaDoMes(mesISO: string): string {
  return `${mesISO}-01`
}

/**
 * Último dia que faz sentido mostrar do mês exibido.
 *
 * No mês corrente para em HOJE: os dias que ainda não aconteceram não são presença nem falta, e
 * desenhá-los sugeriria um mês inteiro medido. Em mês passado vai até o fim do mês.
 * O `new Date(y, m, 0)` devolve o último dia do mês m — inclusive 29/02 em ano bissexto.
 */
function ultimoDiaVisivel(mesISO: string, hoje: string): string {
  if (hoje.slice(0, 7) === mesISO) return hoje
  const [y, m] = mesISO.split('-').map(Number)
  const ultimo = new Date(y, m, 0).getDate()
  return `${mesISO}-${String(ultimo).padStart(2, '0')}`
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

      <OperationsNow cabines={cabines as unknown as JsonRecord[]} today={today} />

      {atualizacaoFalhou ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[color:color-mix(in_srgb,var(--warning)_32%,transparent)] bg-[var(--warning-soft)] px-4 py-2 text-sm text-ink">
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

      {/* O mês rege os indicadores; operação e grade são sempre de hoje. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-ink-muted">Indicadores do mês</span>
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
      <KpiStrip raw={raw} loading={homeQuery.isPending && !homeQuery.data} />

      {/* Alerts (only if any) */}
      <AlertsStrip raw={raw} />

      {/* Hero row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
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
      <div className="grid min-w-0 grid-cols-1 gap-4">
        <div
          className="flex min-w-0 flex-col gap-4 rounded-xl p-4"
          style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Grade de hoje · {today.split('-').reverse().slice(0, 2).join('/')}
            </h3>
            <Link to={`/agenda?data=${today}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-surface-muted">
              <CalendarDays className="h-4 w-4" aria-hidden="true" /> Abrir agenda
            </Link>
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
          ) : gradeQuery.isError && !gradeQuery.data ? (
            <div role="status" className="rounded-lg border border-line p-4 text-sm text-ink-muted">
              <p>Não foi possível carregar a grade de hoje.</p>
              <button type="button" className="mt-2 min-h-10 rounded-lg border border-line px-3 font-semibold text-ink hover:bg-surface-muted" onClick={() => void gradeQuery.refetch()}>Tentar novamente</button>
            </div>
          ) : (
            <div className="min-w-0">
              {gradeQuery.isError ? <p role="status" className="mb-3 text-sm text-ink-muted">A atualização da grade falhou. Exibindo a última versão carregada.</p> : null}
              {celulasHoje.length === 0 ? <p className="mb-3 text-sm text-ink-muted">Nenhuma programação encontrada para hoje. Abra a agenda para consultar outros dias.</p> : null}
              <GradeDiaView
                celulas={celulasHoje}
                cabines={cabinesOrdenadas}
                onCellClick={({ celula }) => navigate(`/agenda?${new URLSearchParams({ data: today, ...(celula?.marca_id ? { marca: celula.marca_id } : {}) })}`)}
              />
            </div>
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

      {/* Assiduidade fecha a página: é leitura de acompanhamento, não número de decisão — quem
          abre a Home quer primeiro o GMV do mês e a grade de hoje. E segue o MESMO seletor de mês
          do topo, como todo o resto da tela: um indicador que ignora o filtro da página faz o
          operador comparar dois períodos sem perceber. */}
      <AssiduidadeStrip
        inicio={primeiroDiaDoMes(mesExibido)}
        fim={ultimoDiaVisivel(mesExibido, today)}
        subtitulo={`${monthLabel(mesExibido)} · presença física, sem recorte por marca`}
      />
    </div>
  )
}
