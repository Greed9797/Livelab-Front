import { Activity, CalendarClock, Radio, Video } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { ErrorState, LoadingState } from '../components/ui/States'
import { GmvHeroCard } from '../components/dashboard/GmvHeroCard'
import { LiveNowTable } from '../components/dashboard/LiveNowTable'
import { TodayScheduleTable } from '../components/dashboard/TodayScheduleTable'
import { RankingTable } from '../components/dashboard/RankingTable'
import { getHomeDashboard, getPublicRanking, getRankingApresentadoras } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { normalizeHome } from './page-helpers'
import { asNumber, asString, formatMoney } from '../utils/format'
import type { JsonRecord } from '../types/models'

const icons = [CalendarClock, Radio, Video, Activity]

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export function DashboardPage() {
  const query = useQuery({ queryKey: ['home-dashboard'], queryFn: getHomeDashboard, refetchInterval: 30_000 })
  const rankingPublicoQuery = useQuery({ queryKey: ['public-ranking', 'home'], queryFn: () => getPublicRanking({ limit: 5 }) })
  const rankingApresentadorasQuery = useQuery({
    queryKey: ['ranking-apresentadoras', currentMonth(), 'home'],
    queryFn: () => getRankingApresentadoras({ mes: currentMonth(), limit: 5 }),
  })

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
        gmvLivesMes={data.hero.gmvLivesMes}
        gmvVideosMes={data.hero.gmvVideosMes}
        livesMes={data.hero.livesMes}
        videosMes={data.hero.videosMes}
        ticketMedio={data.hero.ticketMedio}
        variacaoMesAnterior={data.hero.variacaoMesAnterior}
        comparacaoLabel={data.hero.comparacaoLabel}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((item, index) => (
          <MetricCard key={item.label} metric={item} icon={icons[index]} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <LiveNowTable liveNow={data.liveNow} upcoming={data.upcoming} />
        <TodayScheduleTable agenda={data.agendaHoje} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <RankingTable title="Ranking de marcas no mês" data={data.rankingMarcasMes} subject="marca" />
        <RankingTable
          title="Ranking de apresentadoras"
          data={rankingApresentadorasQuery.data ?? data.rankingApresentadoras}
          subject="apresentadora"
        />
      </section>

      <Card>
        <CardHeader>
          <p className="text-base font-bold text-ink">Ranking público</p>
          <p className="mt-1 text-xs text-ink-muted">Visão compacta da rede, abaixo da operação da unidade.</p>
        </CardHeader>
        <CardBody>
          {rankingPublicoQuery.isLoading ? (
            <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-muted">Carregando ranking.</p>
          ) : rankingPublicoQuery.isError || !rankingPublicoQuery.data?.length ? (
            <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-muted">Ranking público ainda sem dados publicados.</p>
          ) : (
            <DataTable<JsonRecord>
              data={rankingPublicoQuery.data}
              columns={[
                { key: 'posicao', header: '#', render: (item) => asNumber(item.posicao).toLocaleString('pt-BR') },
                { key: 'nome', header: 'Unidade', render: (item) => asString(item.nome) },
                { key: 'cidade', header: 'Cidade', render: (item) => [asString(item.cidade, ''), asString(item.uf, '')].filter(Boolean).join('/') || '—' },
                { key: 'gmv_mes', header: 'GMV mês', align: 'right', render: (item) => formatMoney(item.gmv_mes) },
                { key: 'total_lives', header: 'Lives', align: 'right', render: (item) => asNumber(item.total_lives).toLocaleString('pt-BR') },
              ]}
            />
          )}
        </CardBody>
      </Card>
    </div>
  )
}
