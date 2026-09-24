import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Radio } from 'lucide-react'
import { useCompactChrome } from '../components/layout/compact-chrome'
import { type GradeDia } from '../components/conteudo/gradeUtils'
import { ErrorState, LoadingState } from '../components/ui/States'
import { KpiStrip } from '../components/dashboard/KpiStrip'
import { PendingMetricsNotice } from '../components/dashboard/PendingMetricsNotice'
import { PageHeader } from '../components/ui/PageHeader'
import { GmvHeroPanel } from '../components/dashboard/GmvHeroPanel'
import { PresenterLeaderboard } from '../components/dashboard/PresenterLeaderboard'
import { BrandLeaderboard } from '../components/dashboard/BrandLeaderboard'
import { AssiduidadeStrip } from '../components/dashboard/AssiduidadeStrip'
import { OperationsNow } from '../components/dashboard/OperationsNow'
import { getGrade, getHomeDashboard } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString } from '../utils/format'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { getSaoPauloDateInput } from '../utils/sao-paulo-date'
import type { JsonRecord } from '../types/models'

/* ── Page header ── */
function PageHead() {
  return (
    <PageHeader
      title="Visão da unidade"
      subtitle="Operação e desempenho do mês, em uma leitura rápida."
      actions={
        <div className="hidden flex-wrap gap-2 lg:flex">
          <Link to={`/agenda?data=${getSaoPauloDateInput()}`} className="inline-flex h-[42px] items-center gap-2 rounded-full bg-button-primary px-4 text-sm font-semibold text-button-primary-foreground shadow-[var(--primary-glow)] hover:bg-button-primary-hover">
            <CalendarDays className="h-[18px] w-[18px]" aria-hidden="true" /> Agenda de hoje
          </Link>
          <Link to="/lives?periodo=hoje&st=todas" className="inline-flex h-[42px] items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted">
            <Radio className="h-[18px] w-[18px]" aria-hidden="true" /> Lives de hoje
          </Link>
        </div>
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
    { label: 'Contratos em preparação', short: 'contratos em preparação', value: contratos, hint: 'Rascunhos ou em análise', tone: 'warning' as const, href: '/clientes' },
    { label: 'Boletos vencidos', short: 'boletos vencidos', value: boletos, hint: 'Atenção financeira', tone: 'danger' as const, href: '/financeiro?tab=boletos' },
    { label: 'Sobreposições na agenda', short: 'sobreposições na agenda', value: conflitos, hint: 'Agendamentos cadastrados', tone: 'neutral' as const, href: '/agenda' },
  ].filter((a) => a.value > 0)

  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:gap-3">
      {items.map((a) => {
        const toneColor = a.tone === 'danger' ? 'var(--danger)' : a.tone === 'warning' ? 'var(--warning)' : 'var(--text-muted)'
        return (
          <Link
            key={a.label}
            to={a.href}
            className="flex h-10 items-center gap-2 rounded-[12px] px-3 lg:h-auto lg:gap-3 lg:rounded-xl lg:px-4 lg:py-3"
            style={{
              background: a.tone === 'danger' ? 'var(--danger-soft)' : a.tone === 'warning' ? 'var(--warning-soft)' : 'var(--bg-elev-1)',
              border: `1px solid ${a.tone === 'danger' ? 'var(--danger)' : a.tone === 'warning' ? 'var(--warning)' : 'var(--border)'}`,
            }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full lg:hidden" style={{ background: toneColor }} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink lg:hidden">
              {a.value} {a.short}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted lg:hidden" aria-hidden="true" />
            <span
              className="hidden text-xl font-bold leading-none lg:inline"
              style={{ color: a.tone === 'danger' ? 'var(--danger)' : a.tone === 'warning' ? 'var(--warning)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {a.value}
            </span>
            <span className="hidden lg:block">
              <span className="block text-sm font-medium text-ink">{a.label}</span>
              <span className="block text-xs text-ink-muted">{a.hint}</span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}

function MonthSwitcher({
  mes,
  meses,
  onPrev,
  onNext,
  onChange,
  nextDisabled,
}: {
  mes: string
  meses: string[]
  onPrev: () => void
  onNext: () => void
  onChange: (mes: string) => void
  nextDisabled: boolean
}) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-0.5">
      <button type="button" aria-label="Mês anterior" onClick={onPrev} className="grid h-11 w-9 shrink-0 place-items-center text-ink-muted">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <select
        aria-label="Filtrar por mês"
        value={mes}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 max-w-[168px] appearance-none bg-transparent text-center text-[15px] font-bold text-ink focus:outline-none"
      >
        {meses.map((item) => <option key={item} value={item}>{monthLabel(item)}</option>)}
        {!meses.includes(mes) ? <option value={mes}>{monthLabel(mes)}</option> : null}
      </select>
      <button type="button" aria-label="Próximo mês" disabled={nextDisabled} onClick={onNext} className="grid h-11 w-9 shrink-0 place-items-center text-ink-muted disabled:opacity-35">
        <ChevronRight className="h-4 w-4" />
      </button>
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
  const setCenter = useCompactChrome()?.setCenter
  const compactChrome = useMediaQuery('(max-width: 1023px)')
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

  const raw = (homeQuery.data ?? {}) as JsonRecord
  const mesExibido = mesSelecionado ?? asString(raw.mes_referencia, currentMonth).slice(0, 7)

  useEffect(() => {
    if (!setCenter) return
    if (!compactChrome) {
      setCenter(null)
      return
    }
    setCenter(
      <MonthSwitcher
        mes={mesExibido}
        meses={last12Months(currentMonth)}
        onPrev={() => setMesSelecionado(shiftMonth(mesExibido, -1))}
        onNext={() => setMesSelecionado(shiftMonth(mesExibido, 1))}
        onChange={(mes) => setMesSelecionado(mes === currentMonth ? null : mes)}
        nextDisabled={mesExibido >= currentMonth}
      />,
    )
  }, [setCenter, compactChrome, mesExibido, currentMonth])

  useEffect(() => {
    return () => setCenter?.(null)
  }, [setCenter])

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

  const atualizacaoFalhou = homeQuery.isError && Boolean(homeQuery.data)
  const liveNow = asArray<JsonRecord>(
    raw.live_now
    ?? raw.lives_acontecendo_agora
    ?? asArray<JsonRecord>(raw.cabines).filter((row) => ['ao_vivo', 'live'].includes(asString(row.status)) && asString(row.live_atual_id ?? row.id, '')),
  )
  const rankingApresentadoras = asArray<JsonRecord>(raw.ranking_apresentadoras_mes)
  const rankingMarcas = asArray<JsonRecord>(raw.ranking_marcas_mes)

  // Grade de hoje (mesma fonte da aba Agenda) + legenda por marca
  const celulasHoje = ((gradeQuery.data?.dias ?? []) as unknown as GradeDia[])[0]?.celulas ?? []
  const gradeTemProgramacao = !gradeQuery.isError && celulasHoje.length > 0
  const programacaoHoje = [...celulasHoje].sort((a, b) => asString(a.hora_inicio).localeCompare(asString(b.hora_inicio)))

  return (
    <div className="flex flex-col gap-2.5 min-[600px]:gap-4 lg:gap-5">
      <div className="max-lg:order-1">
        <PageHead />
      </div>
      <div className="max-lg:order-2">
        <PendingMetricsNotice rows={[homeQuery.data ?? {}]} />
      </div>

      <div className="max-lg:order-3">
        <OperationsNow lives={liveNow} />
      </div>

      {atualizacaoFalhou ? (
        <div className="flex h-10 max-lg:order-4 items-center justify-between gap-2 rounded-[12px] border border-[color:color-mix(in_srgb,var(--warning)_32%,transparent)] bg-[var(--warning-soft)] px-3 text-[13px] text-ink lg:h-auto lg:rounded-2xl lg:px-4 lg:py-2 lg:text-sm">
          <span className="min-w-0 truncate">Não foi possível atualizar agora — os números abaixo são da última atualização.</span>
          <button
            type="button"
            onClick={() => void homeQuery.refetch()}
            className="rounded-full border border-line px-3 py-1 text-xs font-semibold hover:bg-surface-muted"
          >
            Tentar de novo
          </button>
        </div>
      ) : null}

      {/* KPI strip */}
      <div className="max-lg:order-6">
      <KpiStrip
        raw={raw}
        loading={homeQuery.isPending && !homeQuery.data}
        mesExibido={mesExibido}
        meses={last12Months(currentMonth)}
        onMesAnterior={() => setMesSelecionado(shiftMonth(mesExibido, -1))}
        onMesProximo={() => setMesSelecionado(shiftMonth(mesExibido, 1))}
        onMesChange={(mes) => setMesSelecionado(mes === currentMonth ? null : mes)}
        proximoDesabilitado={mesExibido >= currentMonth}
      />
      </div>

      {/* Alerts (only if any) */}
      <div className="max-lg:order-2">
        <AlertsStrip raw={raw} />
      </div>

      {/* Hero row. No tablet o herói ocupa a linha inteira e os dois rankings ficam lado a lado. */}
      <div className="grid grid-cols-1 gap-2.5 max-lg:order-5 min-[600px]:grid-cols-2 min-[600px]:gap-4 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)] lg:gap-5">
        <div className="min-[600px]:col-span-2 lg:col-span-1">
          <GmvHeroPanel raw={raw} />
        </div>
        <PresenterLeaderboard
          rows={rankingApresentadoras}
          title="Pódio de apresentadoras"
          subtitle="Top 5 do mês · GMV e comissão"
          limit={5}
          action={
            <Link className="text-xs font-semibold text-[var(--primary-text)] hover:underline" to="/ranking/apresentadoras">
              Ver ranking →
            </Link>
          }
        />

      {/* Ranking de marcas — largura total no desktop; no tablet divide a linha com o pódio. */}
      <div className="min-[600px]:col-span-1 lg:col-span-2">
      <BrandLeaderboard
        rows={rankingMarcas}
        title="Ranking de marcas"
        subtitle="Eficiência do mês · GMV por hora no ar"
        limit={3}
        action={
          <Link className="text-xs font-semibold text-[var(--primary-text)] hover:underline" to="/ranking/marcas">
            Ver as marcas →
          </Link>
        }
      />
      </div>
      </div>

      <div className="grid grid-cols-2 gap-2 max-lg:order-7 lg:hidden">
        <Link to={`/agenda?data=${today}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-button-primary px-3 text-sm font-semibold text-button-primary-foreground">
          <CalendarDays className="h-[18px] w-[18px]" aria-hidden="true" /> Agenda<span className="sr-only"> de hoje</span>
        </Link>
        <Link to="/lives?periodo=hoje&st=todas" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-line bg-surface px-3 text-sm font-semibold text-ink">
          <Radio className="h-[18px] w-[18px]" aria-hidden="true" /> Lives<span className="sr-only"> de hoje</span>
        </Link>
      </div>

      {/* Assiduidade fecha a página: é leitura de acompanhamento, não número de decisão — quem
          abre a Home quer primeiro o GMV do mês e a grade de hoje. E segue o MESMO seletor de mês
          do topo, como todo o resto da tela: um indicador que ignora o filtro da página faz o
          operador comparar dois períodos sem perceber. */}
      <div className="max-lg:order-8">
      <AssiduidadeStrip
        inicio={primeiroDiaDoMes(mesExibido)}
        fim={ultimoDiaVisivel(mesExibido, today)}
        limit={4}
        subtitulo={`${monthLabel(mesExibido)} · presença física, sem recorte por marca`}
      />
      </div>

      {/* A Home mostra somente cabines ocupadas. Falha de consulta nunca é lida como dia vazio. */}
      {gradeTemProgramacao ? <div role="region" aria-label="Agenda de hoje" className="grid min-w-0 grid-cols-1 gap-2.5 max-lg:order-9">
        <div className="flex min-w-0 flex-col gap-3 rounded-[var(--radius-panel)] p-6 max-lg:gap-0 max-lg:rounded-[18px] max-lg:p-0 max-lg:shadow-none" style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex h-16 items-center px-3.5 lg:h-auto lg:px-0">
            <div className="min-w-0"><h2 className="truncate text-sm font-bold text-ink lg:text-lg lg:tracking-[-0.015em]">Agenda de hoje</h2><p className="mt-1 hidden text-[13px] text-ink-muted lg:block">Lives programadas em {today.split('-').reverse().slice(0, 2).join('/')}.</p></div>
          </div>
          <div className="divide-y divide-[var(--divider)]">
            {programacaoHoje.map((celula) => {
              const marca = asString(celula.marca_nome, 'Marca a definir')
              const apresentadora = asString(celula.apresentadora_nome, 'Apresentadora a definir')
              const horario = `${celula.hora_inicio}–${celula.hora_fim}`
              const detalhe = `${horario} · ${marca}`
              return (
                <button
                  key={`${celula.cabine_id}:${celula.hora_inicio}:${celula.marca_id}`}
                  type="button"
                  title={detalhe}
                  onClick={() => navigate(`/agenda?${new URLSearchParams({ data: today, ...(celula.marca_id ? { marca: asString(celula.marca_id) } : {}) })}`)}
                  className="flex h-14 w-full items-center gap-2.5 px-3.5 text-left hover:bg-surface-muted lg:grid lg:h-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:gap-x-3 lg:px-0 lg:py-3"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink lg:flex-none" title={marca}>{marca}</span>
                  <span className="hidden truncate text-[13px] text-ink-muted lg:block" title={apresentadora}>{apresentadora}</span>
                  <span className="shrink-0 text-xs font-semibold text-ink-muted lg:hidden">{horario} · {apresentadora}</span>
                  <span className="hidden text-xs font-semibold text-ink-muted lg:inline">{horario}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div> : null}
    </div>
  )
}
