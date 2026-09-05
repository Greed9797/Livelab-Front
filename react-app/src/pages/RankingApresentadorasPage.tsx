import { Crown, DollarSign, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody } from '../components/ui/Card'
import { ErrorState, LoadingState } from '../components/ui/States'
import {
  PresenterLeaderboard,
  getPresenterLeaderboardName,
  isRealPresenter,
} from '../components/dashboard/PresenterLeaderboard'
import { RankingNavTabs } from '../components/dashboard/RankingNavTabs'
import { getRankingApresentadoras } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { formatMoney } from '../utils/format'
import { rankingCommission, rankingGmv, rankingLives } from '../utils/ranking'
import type { JsonRecord } from '../types/models'

function currentMes() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function prevMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Quantos meses 'mes' está atrás do mês corrente (guarda do auto-fallback).
function mesesAtras(mes: string): number {
  const [cy, cm] = currentMes().split('-').map(Number)
  const [y, m] = mes.split('-').map(Number)
  return (cy - y) * 12 + (cm - m)
}

const MAX_FALLBACK_MESES = 11

function getGmv(row: JsonRecord): number {
  return rankingGmv(row)
}

function getCommission(row: JsonRecord): number {
  return rankingCommission(row)
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  accent = false,
}: {
  icon: ReactNode
  label: string
  value: string
  hint: string
  accent?: boolean
}) {
  return (
    <Card className={accent ? 'border-brand/30' : undefined}>
      <CardBody className="p-5">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-xl"
            style={{
              background: accent ? 'var(--primary-soft)' : 'var(--bg-elev-3)',
              color: accent ? 'var(--primary)' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">{label}</p>
            <p className="mt-1 truncate text-2xl font-black tracking-[-0.02em] text-ink">{value}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-ink-muted">{hint}</p>
      </CardBody>
    </Card>
  )
}

export function RankingApresentadorasPage() {
  const [mes, setMes] = useState(currentMes())
  // true assim que o usuário escolhe um mês manualmente — desliga o auto-fallback.
  const [mesEscolhido, setMesEscolhido] = useState(false)

  const query = useQuery({
    queryKey: ['ranking-apresentadoras', mes],
    queryFn: () => getRankingApresentadoras({ mes }),
  })

  // Abre no último mês com dados (espelha Home/Analytics): se o mês atual vier
  // vazio e o usuário ainda não escolheu, recua um mês até achar registros.
  useEffect(() => {
    if (mesEscolhido || query.isLoading || query.isError) return
    const vazio = (query.data ?? []).filter(isRealPresenter).length === 0
    if (vazio && mesesAtras(mes) < MAX_FALLBACK_MESES) {
      setMes((m) => prevMes(m))
    }
  }, [query.data, query.isLoading, query.isError, mesEscolhido, mes])

  if (query.isLoading) return <LoadingState label="Carregando ranking..." />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const ranking = (query.data ?? []).filter(isRealPresenter)
  const leader = ranking[0] as JsonRecord | undefined
  const totalGmv = ranking.reduce((sum, row) => sum + getGmv(row), 0)
  const totalCommission = ranking.reduce((sum, row) => sum + getCommission(row), 0)
  const totalLives = ranking.reduce((sum, row) => sum + rankingLives(row), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ranking de apresentadoras"
        subtitle="Leaderboard mensal com GMV, progresso vs. líder e comissão consolidada registrada no sistema."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <RankingNavTabs />
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-ink-muted">Mês</label>
              <input
                type="month"
                className="design-input h-10 px-3 text-sm"
                value={mes}
                onChange={(event) => {
                  setMesEscolhido(true)
                  setMes(event.target.value)
                }}
              />
            </div>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={<Crown className="h-5 w-5" />}
          label="Líder do mês"
          value={leader ? getPresenterLeaderboardName(leader) : '—'}
          hint={leader ? `${formatMoney(getGmv(leader), true)} em GMV atribuído` : 'Sem GMV registrado no período'}
          accent
        />
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="GMV total"
          value={formatMoney(totalGmv, true)}
          hint={`${totalLives.toLocaleString('pt-BR')} live${totalLives !== 1 ? 's' : ''} com atribuição no mês`}
        />
        <SummaryCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Comissão total"
          value={formatMoney(totalCommission, true)}
          hint="Soma consolidada dos registros retornados pelo ranking"
        />
      </section>

      <PresenterLeaderboard
        rows={ranking}
        title={`Ranking completo · ${mes}`}
        subtitle="Mesmo padrão visual da Home, expandido para todos os registros do mês."
        variant="full"
      />
    </div>
  )
}
