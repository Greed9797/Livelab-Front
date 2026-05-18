import { Activity, CircleDollarSign, Radio, Video } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { ErrorState, LoadingState } from '../components/ui/States'
import { GmvHeroCard } from '../components/dashboard/GmvHeroCard'
import { LiveNowTable } from '../components/dashboard/LiveNowTable'
import { TodayScheduleTable } from '../components/dashboard/TodayScheduleTable'
import { OperationalAlerts } from '../components/dashboard/OperationalAlerts'
import { RankingTable } from '../components/dashboard/RankingTable'
import { getHomeDashboard } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { normalizeHome } from './page-helpers'

const icons = [CircleDollarSign, Radio, Video, Activity]

export function DashboardPage() {
  const query = useQuery({ queryKey: ['home-dashboard'], queryFn: getHomeDashboard, refetchInterval: 30_000 })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const data = normalizeHome(query.data ?? {})

  return (
    <div className="space-y-6">
      <PageHeader
        accent="Home"
        title="da Unidade"
        subtitle="Resumo operacional de hoje e GMV do mês."
      />

      <GmvHeroCard
        gmvMes={data.hero.gmvMes}
        livesMes={data.hero.livesMes}
        ticketMedio={data.hero.ticketMedio}
        variacaoMesAnterior={data.hero.variacaoMesAnterior}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((item, index) => (
          <MetricCard key={item.label} metric={item} icon={icons[index]} />
        ))}
      </section>

      <LiveNowTable liveNow={data.liveNow} upcoming={data.upcoming} />

      <TodayScheduleTable agenda={data.agendaHoje} />

      <section className="grid gap-4 xl:grid-cols-2">
        <RankingTable title="Ranking de GMV do dia" data={data.rankingGmvDia} subject="marca" />
        <RankingTable title="Ranking de apresentadoras" data={data.rankingApresentadoras} subject="apresentadora" />
      </section>

      <OperationalAlerts alerts={data.operationalAlerts} />
    </div>
  )
}
