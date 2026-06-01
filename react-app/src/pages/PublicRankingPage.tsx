import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { ErrorState, LoadingState } from '../components/ui/States'
import { RankingPodium } from '../components/dashboard/RankingPodium'
import { PresenterLeaderboard } from '../components/dashboard/PresenterLeaderboard'
import { getPublicRanking, getPublicRankingApresentadoras } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, formatMoney, formatPercent } from '../utils/format'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'

export function PublicRankingPage() {
  const [params] = useSearchParams()
  const unidadeId = params.get('unidade') ?? ''
  const query = useQuery({ queryKey: QK.publicRanking, queryFn: () => getPublicRanking() })
  const apresentadorasQuery = useQuery({
    queryKey: QK.publicRankingApresentadoras(unidadeId),
    queryFn: () => getPublicRankingApresentadoras({ tenant: unidadeId }),
    enabled: Boolean(unidadeId),
  })

  if (query.isLoading) return <LoadingState label="Carregando ranking" />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const ranking = query.data ?? []
  const leader = ranking[0]
  const apresentadoras = asArray<JsonRecord>(apresentadorasQuery.data?.apresentadoras)

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
          <div className="flex flex-wrap items-center justify-center gap-3 text-center text-xs text-ink-muted">
            <span>
              Líder atual: <strong className="text-ink">{asString(leader.nome)}</strong> · {asNumber(leader.total_clientes_ativos).toLocaleString('pt-BR')} clientes ativos
            </span>
            {asString(leader.id, '') ? (
              <Link className="font-bold text-brand hover:underline" to={`/ranking?unidade=${asString(leader.id)}`}>
                Ver apresentadoras da líder →
              </Link>
            ) : null}
          </div>
        ) : null}

        {ranking.length > 3 ? (
          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Demais unidades</p>
            </CardHeader>
            <CardBody>
              <DataTable<JsonRecord>
                data={ranking.slice(3)}
                rowKey={(item, index) => asString(item.id) || String(index)}
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
        ) : ranking.length > 0 ? (
          <Card>
            <CardBody className="py-6 text-center text-sm text-ink-muted">
              Ranking comercial com {ranking.length} unidade{ranking.length !== 1 ? 's' : ''} ativa{ranking.length !== 1 ? 's' : ''} no período. Sem demais unidades para listar.
            </CardBody>
          </Card>
        ) : null}

        {unidadeId ? (
          apresentadorasQuery.isLoading ? (
            <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-muted">Carregando ranking de apresentadoras…</p>
          ) : apresentadorasQuery.isError ? (
            <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-muted">Ranking de apresentadoras indisponível para esta unidade.</p>
          ) : (
            <PresenterLeaderboard
              rows={apresentadoras}
              title={`Ranking de apresentadoras${apresentadorasQuery.data?.unidade ? ` · ${asString(apresentadorasQuery.data.unidade)}` : ''}`}
              subtitle="Progresso vs. líder do mês"
              limit={6}
            />
          )
        ) : null}
      </div>
    </main>
  )
}
