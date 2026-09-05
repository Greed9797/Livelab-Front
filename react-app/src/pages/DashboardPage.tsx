import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Radio } from 'lucide-react'
import { type GradeDia } from '../components/conteudo/gradeUtils'
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
function PageHead() {
  return (
    <PageHeader
      title="Visão da unidade"
      subtitle="Operação e desempenho do mês, em uma leitura rápida."
      actions={
        <div className="flex flex-wrap gap-2">
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
            className="text-xl font-bold leading-none"
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

  // Grade de hoje (mesma fonte da aba Agenda) + legenda por marca
  const celulasHoje = ((gradeQuery.data?.dias ?? []) as unknown as GradeDia[])[0]?.celulas ?? []
  const gradeTemProgramacao = !gradeQuery.isError && celulasHoje.length > 0
  const cabinesHoje = new Map<string, typeof celulasHoje>()
  for (const celula of celulasHoje) {
    const horarios = cabinesHoje.get(celula.cabine_id) ?? []
    horarios.push(celula)
    cabinesHoje.set(celula.cabine_id, horarios)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHead />

      <OperationsNow cabines={cabines as unknown as JsonRecord[]} today={today} gradeVazia={!gradeQuery.isError && Boolean(gradeQuery.data) && celulasHoje.length === 0} />

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

      {/* A Home mostra somente cabines ocupadas. Falha de consulta nunca é lida como dia vazio. */}
      {gradeTemProgramacao ? <div role="region" aria-label="Agenda de hoje" className="grid min-w-0 grid-cols-1 gap-4">
        <div className="flex min-w-0 flex-col gap-3 rounded-[var(--radius-panel)] p-6" style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-bold tracking-[-0.015em]" style={{ color: 'var(--text-primary)' }}>Agenda de hoje</h2><p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>Cabines ocupadas em {today.split('-').reverse().slice(0, 2).join('/')}.</p></div>
            <Link to={`/agenda?data=${today}`} className="inline-flex h-[42px] items-center gap-2 rounded-full border border-line px-4 text-xs font-semibold text-ink hover:bg-surface-muted"><CalendarDays className="h-4 w-4" aria-hidden="true" /> Abrir agenda</Link>
          </div>
          <div className="divide-y divide-[var(--divider)]">
            {Array.from(cabinesHoje, ([cabineId, horarios]) => {
              const marcas = Array.from(new Set(horarios.map(celula => celula.marca_nome)))
              const apresentadoras = Array.from(new Set(horarios.map(celula => celula.apresentadora_nome ?? 'Apresentadora a definir')))
              const detalhe = horarios.map(celula => `${celula.hora_inicio}–${celula.hora_fim} · ${celula.marca_nome}`).join(' / ')
              return <button key={cabineId} type="button" title={detalhe} onClick={() => navigate(`/agenda?${new URLSearchParams({ data: today, ...(marcas.length === 1 ? { marca: horarios[0].marca_id } : {}) })}`)} className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 py-3 text-left hover:bg-surface-muted sm:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <span className="text-sm font-semibold text-ink">Cabine {horarios[0].cabine_numero ?? '—'}</span>
                <span className="truncate text-sm font-semibold text-ink" title={marcas.join(' · ')}>{marcas.join(' · ')}</span>
                <span className="truncate text-[13px] text-ink-muted" title={apresentadoras.join(' · ')}>{apresentadoras.join(' · ')}</span>
                <span className="text-xs font-semibold text-ink-muted">{horarios.length === 1 ? `${horarios[0].hora_inicio}–${horarios[0].hora_fim}` : `${horarios.length} horários`}</span>
              </button>
            })}
          </div>
        </div>
      </div> : null}

      {/* KPI strip */}
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

      {/* Alerts (only if any) */}
      <AlertsStrip raw={raw} />

      {/* Hero row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
        <GmvHeroPanel raw={raw} />
        <PresenterLeaderboard
          rows={rankingApresentadoras}
          title="Pódio de apresentadoras"
          subtitle="Top 3 do mês · GMV e comissão"
          limit={3}
          action={
            <Link className="text-xs font-semibold text-[var(--primary-text)] hover:underline" to="/ranking/apresentadoras">
              Ver ranking →
            </Link>
          }
        />
      </div>

      {/* Ranking de marcas — largura total, ordenado por GMV/h */}
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

      {/* Assiduidade fecha a página: é leitura de acompanhamento, não número de decisão — quem
          abre a Home quer primeiro o GMV do mês e a grade de hoje. E segue o MESMO seletor de mês
          do topo, como todo o resto da tela: um indicador que ignora o filtro da página faz o
          operador comparar dois períodos sem perceber. */}
      <AssiduidadeStrip
        inicio={primeiroDiaDoMes(mesExibido)}
        fim={ultimoDiaVisivel(mesExibido, today)}
        limit={4}
        subtitulo={`${monthLabel(mesExibido)} · presença física, sem recorte por marca`}
      />
    </div>
  )
}
