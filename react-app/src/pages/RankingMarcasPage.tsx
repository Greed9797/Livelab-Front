import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { ErrorState, LoadingState } from '../components/ui/States'
import { RankingPodium } from '../components/dashboard/RankingPodium'
import { RankingBars } from '../components/dashboard/RankingBars'
import { getComissoesMarcas } from '../services/domain'
import { extractErrorMessage } from '../services/api'

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export function RankingMarcasPage() {
  const [mes, setMes] = useState(currentMonth())
  const query = useQuery({
    queryKey: ['ranking-marcas', mes],
    queryFn: () => getComissoesMarcas({ mes }),
  })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const rows = query.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comissões"
        accent="Ranking"
        title="de marcas"
        subtitle="Marcas com maior GMV no mês. Logo via favicon do site quando não configurado."
        actions={
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            Mês
            <input className="design-input h-10 px-3" type="month" value={mes} onChange={(event) => setMes(event.target.value)} />
          </label>
        }
      />

      <RankingPodium
        data={rows}
        subject="marca"
        valueKey="gmv_total"
        valueLabel="GMV do mês"
        metaKey="total_lives"
        metaLabel="Lives"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-brand" />
            <p className="text-base font-bold text-ink">Top 10 marcas — GMV</p>
          </div>
        </CardHeader>
        <CardBody>
          <RankingBars data={rows} valueKey="gmv_total" nameKey="marca_nome" imageKey="marca" limit={10} />
        </CardBody>
      </Card>
    </div>
  )
}
