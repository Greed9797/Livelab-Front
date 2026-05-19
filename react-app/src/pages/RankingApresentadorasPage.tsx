import { Medal, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { ErrorState, LoadingState } from '../components/ui/States'
import { getRankingApresentadoras } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, formatMoney, formatPercent } from '../utils/format'
import type { JsonRecord } from '../types/models'

function currentMes() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function medalColor(pos: number) {
  if (pos === 1) return 'text-yellow-500 bg-yellow-50'
  if (pos === 2) return 'text-slate-400 bg-slate-50'
  if (pos === 3) return 'text-amber-600 bg-amber-50'
  return 'text-ink-muted bg-surface-muted'
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacional"
        accent="Ranking"
        title="de apresentadoras"
        subtitle="Ganho total por apresentadora no mês: fixo garantido ou comissão variável, o maior dos dois."
        actions={
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-ink-muted">Mês</label>
            <input
              type="month"
              className="design-input h-10 px-3 text-sm"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            />
          </div>
        }
      />

      {leader ? (
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-yellow-200">
            <CardBody className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-yellow-50 text-yellow-500">
                  <Medal className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Líder do mês</p>
                  <p className="mt-1 text-xl font-extrabold text-ink">{asString(leader.nome)}</p>
                </div>
              </div>
              <p className="mt-4 text-2xl font-extrabold text-ink">{formatMoney(leader.ganho_total)}</p>
              <p className="text-xs text-ink-muted">GMV gerado: {formatMoney(leader.gmv_total)}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand"><TrendingUp className="h-5 w-5" /></span>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Total GMV do mês</p>
              <p className="mt-2 text-2xl font-extrabold text-ink">{formatMoney(ranking.reduce((s, r) => s + asNumber(r.gmv_total), 0))}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]"><Medal className="h-5 w-5" /></span>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Total comissões</p>
              <p className="mt-2 text-2xl font-extrabold text-ink">{formatMoney(ranking.reduce((s, r) => s + asNumber(r.ganho_total), 0))}</p>
            </CardBody>
          </Card>
        </section>
      ) : null}

      <Card>
        <CardHeader>
          <p className="text-sm font-bold text-ink">Ranking completo — {mes}</p>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-line">
            {ranking.map((item, index) => {
              const pos = asNumber(item.posicao) || index + 1
              const ganho = asNumber(item.ganho_total)
              const gmv = asNumber(item.gmv_total)
              const fixo = asNumber(item.valor_fixo_mensal)
              const variavel = asNumber(item.comissao_variavel)
              const pctMeta = item.pct_meta !== null ? asNumber(item.pct_meta) : null

              return (
                <div key={asString(item.id, String(index))} className="flex items-center gap-5 px-5 py-4">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${medalColor(pos)}`}>
                    {pos}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">{asString(item.nome)}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {asNumber(item.total_lives)} live{asNumber(item.total_lives) !== 1 ? 's' : ''} · GMV {formatMoney(gmv)}
                    </p>
                  </div>
                  <div className="hidden grid-cols-3 gap-6 text-sm md:grid">
                    <div className="text-right">
                      <p className="text-xs text-ink-muted">Fixo garantido</p>
                      <p className="font-semibold text-ink">{formatMoney(fixo)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-ink-muted">Variável</p>
                      <p className="font-semibold text-ink">{formatMoney(variavel)}</p>
                    </div>
                    {pctMeta !== null ? (
                      <div className="text-right">
                        <p className="text-xs text-ink-muted">% meta</p>
                        <p className={`font-semibold ${pctMeta >= 100 ? 'text-[var(--success)]' : 'text-ink'}`}>{formatPercent(pctMeta)}</p>
                      </div>
                    ) : <div />}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-muted">Ganho total</p>
                    <p className="text-lg font-extrabold text-brand">{formatMoney(ganho)}</p>
                    <p className="text-xs text-ink-muted">{ganho > fixo ? 'variável aplicado' : 'fixo aplicado'}</p>
                  </div>
                </div>
              )
            })}
            {ranking.length === 0 ? (
              <div className="py-12 text-center text-sm text-ink-muted">Nenhuma apresentadora com GMV registrado neste mês.</div>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
