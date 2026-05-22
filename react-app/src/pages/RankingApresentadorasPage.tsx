import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { ErrorState, LoadingState } from '../components/ui/States'
import { RankingPodium } from '../components/dashboard/RankingPodium'
import { getRankingApresentadoras } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, formatMoney } from '../utils/format'
import type { JsonRecord } from '../types/models'

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export function RankingApresentadorasPage() {
  const [mes, setMes] = useState(currentMonth())
  const query = useQuery({
    queryKey: ['ranking-apresentadoras', mes],
    queryFn: () => getRankingApresentadoras({ mes }),
  })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const rows = query.data ?? []
  const presenterName = (item: JsonRecord) => asString(item.nome ?? item.apresentadora_nome, '—')

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comissões"
        accent="Ranking"
        title="de apresentadoras"
        subtitle="Total consolidado registrado no sistema: fixo + comissão variável."
        actions={
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            Mês
            <input className="design-input h-10 px-3" type="month" value={mes} onChange={(event) => setMes(event.target.value)} />
          </label>
        }
      />

      <RankingPodium
        data={rows}
        subject="apresentadora"
        valueKey="total_recebido"
        valueLabel="Total recebido"
        metaKey="lives"
        metaLabel="Lives"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-brand" />
            <p className="text-base font-bold text-ink">Demais apresentadoras</p>
          </div>
        </CardHeader>
        <CardBody>
          <DataTable<JsonRecord>
            data={rows.slice(3)}
            columns={[
              {
                key: 'nome',
                header: 'Apresentadora',
                render: (item) => {
                  const name = presenterName(item)
                  const photo = asString(item.foto_url ?? item.apresentadora_foto_url, '')
                  return (
                    <span className="inline-flex min-w-48 items-center gap-3 font-semibold">
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-soft text-xs font-black text-brand">
                        {photo ? <img src={photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : name.slice(0, 2).toUpperCase()}
                      </span>
                      {name}
                    </span>
                  )
                },
              },
              { key: 'gmv', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv) },
              { key: 'lives', header: 'Lives', align: 'right', render: (item) => asNumber(item.lives).toLocaleString('pt-BR') },
              { key: 'fixo', header: 'Fixo', align: 'right', render: (item) => formatMoney(item.fixo) },
              { key: 'comissao_variavel', header: 'Variável', align: 'right', render: (item) => formatMoney(item.comissao_variavel) },
              { key: 'total_recebido', header: 'Total recebido', align: 'right', render: (item) => formatMoney(item.total_recebido) },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  )
}
