import { Crown, DollarSign, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody } from '../components/ui/Card'
import { ErrorState, LoadingState } from '../components/ui/States'
import {
  PresenterLeaderboard,
  getPresenterLeaderboardName,
} from '../components/dashboard/PresenterLeaderboard'
import { getRankingApresentadoras } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { formatMoney } from '../utils/format'
import { rankingCommission, rankingGmv, rankingLives } from '../utils/ranking'
import type { JsonRecord } from '../types/models'

function currentMes() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

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

  const query = useQuery({
    queryKey: ['ranking-apresentadoras', mes],
    queryFn: () => getRankingApresentadoras({ mes }),
  })

  if (query.isLoading) return <LoadingState label="Carregando ranking..." />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const ranking = query.data ?? []
  const leader = ranking[0] as JsonRecord | undefined
  const totalGmv = ranking.reduce((sum, row) => sum + getGmv(row), 0)
  const totalCommission = ranking.reduce((sum, row) => sum + getCommission(row), 0)
  const totalLives = ranking.reduce((sum, row) => sum + rankingLives(row), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacional"
        accent="Ranking"
        title="de apresentadoras"
        subtitle="Leaderboard mensal com GMV, progresso vs. líder e comissão consolidada registrada no sistema."
        actions={
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-ink-muted">Mês</label>
            <input
              type="month"
              className="design-input h-10 px-3 text-sm"
              value={mes}
              onChange={(event) => setMes(event.target.value)}
            />
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
