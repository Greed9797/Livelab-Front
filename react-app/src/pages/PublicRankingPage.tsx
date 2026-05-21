import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { ErrorState, LoadingState } from '../components/ui/States'
import { RankingPodium } from '../components/dashboard/RankingPodium'
import { getPublicRanking } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, formatMoney, formatPercent } from '../utils/format'
import type { JsonRecord } from '../types/models'

export function PublicRankingPage() {
  const query = useQuery({ queryKey: ['public-ranking'], queryFn: () => getPublicRanking() })

  if (query.isLoading) return <LoadingState label="Carregando ranking" />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const ranking = query.data ?? []
  const leader = ranking[0]

  return (
    <main className="min-h-screen bg-canvas px-4 py-6 text-ink md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">Livelab</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.02em]">Ranking comercial</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-muted">Top unidades por GMV do mês, lives realizadas e clientes ativos.</p>
          </div>
          <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-bold text-ink transition hover:bg-surface-muted" to="/login">
            Acessar painel
          </Link>
        </header>

        <RankingPodium
          data={ranking}
          subject="unidade"
          valueKey="gmv_mes"
          valueLabel="GMV do mês"
          metaKey="total_lives"
          metaLabel="Lives"
        />
        {leader ? (
          <p className="text-center text-xs text-ink-muted">
            Líder atual: <strong className="text-ink">{asString(leader.nome)}</strong> · {asNumber(leader.total_clientes_ativos).toLocaleString('pt-BR')} clientes ativos
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <p className="text-base font-bold text-ink">Demais unidades</p>
          </CardHeader>
          <CardBody>
            <DataTable<JsonRecord>
              data={ranking.slice(3)}
              columns={[
                { key: 'posicao', header: '#', align: 'center', render: (item) => asNumber(item.posicao).toLocaleString('pt-BR') },
                { key: 'nome', header: 'Unidade', render: (item) => asString(item.nome) },
                { key: 'gmv_mes', header: 'GMV mes', align: 'right', render: (item) => formatMoney(item.gmv_mes) },
                { key: 'crescimento_pct', header: 'Crescimento', align: 'right', render: (item) => formatPercent(item.crescimento_pct) },
                { key: 'total_lives', header: 'Lives', align: 'right', render: (item) => asNumber(item.total_lives).toLocaleString('pt-BR') },
                { key: 'total_clientes_ativos', header: 'Clientes ativos', align: 'right', render: (item) => asNumber(item.total_clientes_ativos).toLocaleString('pt-BR') },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </main>
  )
}
