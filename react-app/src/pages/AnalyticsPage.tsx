import { Clock, CircleDollarSign, Film, Radio, ReceiptText, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { PeriodControl } from '../components/forms/PeriodControl'
import { MetricCard } from '../components/ui/MetricCard'
import { BarPanel, LinePanel } from '../components/charts/Charts'
import { ErrorState, LoadingState } from '../components/ui/States'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { getAnalyticsDashboard, getComissoesPorLive } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, currentPeriod, formatMoney, getRecord } from '../utils/format'
import { historyPoints, metric, moneyMetric } from './page-helpers'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'

const icons = [CircleDollarSign, ShoppingBag, Radio, Film, Clock, ReceiptText]

function periodToMesAno(period: { mes: number; ano: number }) {
  return `${period.ano}-${String(period.mes).padStart(2, '0')}`
}

export function AnalyticsPage({ embedded = false }: { embedded?: boolean }) {
  const [period, setPeriod] = useState(currentPeriod())
  const mes = periodToMesAno(period)
  const query = useQuery({ queryKey: QK.analyticsDashboard(period), queryFn: () => getAnalyticsDashboard({ mesAno: mes }) })
  const comissoesQuery = useQuery({ queryKey: QK.comissoesPorLive(mes), queryFn: () => getComissoesPorLive({ mes }) })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const raw = query.data ?? {}
  const kpis = getRecord(raw.kpis)

  // Comissões do mês — agrupamento por apresentadora e por marca (Livelab = franquia + franqueadora)
  const comissoesRows = asArray<JsonRecord>(comissoesQuery.data)
  const comissoesPorApresentadora = Object.values(
    comissoesRows.reduce<Record<string, { apresentadora_nome: string; total: number }>>((acc, row) => {
      const nome = asString(row.apresentadora_nome, 'Sem apresentadora')
      const prev = acc[nome] ?? { apresentadora_nome: nome, total: 0 }
      return { ...acc, [nome]: { ...prev, total: prev.total + asNumber(row.comissao_apresentadora) } }
    }, {}),
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const comissoesPorMarca = Object.values(
    comissoesRows.reduce<Record<string, { marca_nome: string; total: number }>>((acc, row) => {
      const nome = asString(row.marca_nome, 'Sem marca')
      const comissaoLivelab = asNumber(row.comissao_franquia) + asNumber(row.comissao_franqueadora)
      const prev = acc[nome] ?? { marca_nome: nome, total: 0 }
      return { ...acc, [nome]: { ...prev, total: prev.total + comissaoLivelab } }
    }, {}),
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
  const totalLives = asNumber(kpis.total_lives ?? raw.total_lives)
  const totalVideos = asNumber(kpis.total_videos ?? raw.total_videos)
  const totalConteudos = asNumber(kpis.total_conteudos ?? totalLives + totalVideos)
  const rankingApresentadoras = asArray<JsonRecord>(raw.ranking_apresentadoras ?? raw.ranking_apresentadores)
  const rankingMarcas = asArray<JsonRecord>(raw.ranking_marcas)
  const metrics = [
    moneyMetric('GMV atribuído', kpis.gmv_total ?? raw.gmv_total ?? raw.gmv_mes, 'lives + vídeos', 'brand'),
    metric('Pedidos', asNumber(kpis.pedidos_total ?? raw.pedidos_total ?? kpis.total_vendas).toLocaleString('pt-BR'), 'pedidos atribuídos', 'success'),
    metric('Lives realizadas', totalLives.toLocaleString('pt-BR'), 'período selecionado', 'neutral'),
    metric('Vídeos gravados', totalVideos.toLocaleString('pt-BR'), 'período selecionado', 'info'),
    metric('Horas de live', asNumber(kpis.horas_live ?? raw.horas_live).toFixed(1), 'lives encerradas', 'neutral'),
    metric('Ticket médio', formatMoney(kpis.ticket_medio ?? raw.ticket_medio), 'GMV / pedidos', 'success'),
  ]

  return (
    <div className="space-y-6">
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-bold text-ink">Analytics</p>
          <PeriodControl period={period} onChange={setPeriod} />
        </div>
      ) : (
        <PageHeader
          eyebrow="Analytics"
          accent="Dashboard"
          title="de métricas"
          subtitle="GMV, horas, lives e desempenho por período."
          actions={<PeriodControl period={period} onChange={setPeriod} />}
        />
      )}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item, index) => (
          <MetricCard key={item.label} metric={item} icon={icons[index]} />
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <LinePanel title="GMV mensal" data={historyPoints(raw.gmv_mensal ?? raw.faturamento_mensal ?? raw.history)} />
        <BarPanel title="Pedidos mensais" data={historyPoints(raw.pedidos_mensal ?? raw.vendas_mensal, ['mes', 'label'], ['pedidos', 'total_vendas', 'value'])} />
        <BarPanel title="Horas de live" data={historyPoints(raw.horas_live_por_dia ?? raw.horas_por_dia, ['dia', 'label'], ['horas', 'value'])} />
        <BarPanel
          title="Conteúdos no período"
          data={[
            { label: 'Lives', value: totalLives },
            { label: 'Vídeos', value: totalVideos },
            { label: 'Total', value: totalConteudos },
          ]}
        />
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-base font-bold tracking-[-0.01em] text-ink">Ranking de apresentadoras</p>
          </CardHeader>
          <CardBody>
            <DataTable<JsonRecord>
              data={rankingApresentadoras}
              columns={[
                { key: 'apresentadora_nome', header: 'Apresentadora', render: (item) => asString(item.apresentadora_nome ?? item.apresentador_nome, 'Sem apresentadora') },
                { key: 'gmv_total', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv_total) },
                { key: 'pedidos', header: 'Pedidos', align: 'right', render: (item) => asNumber(item.pedidos).toLocaleString('pt-BR') },
                { key: 'total_lives', header: 'Lives', align: 'right', render: (item) => asNumber(item.total_lives).toLocaleString('pt-BR') },
                { key: 'total_videos', header: 'Vídeos', align: 'right', render: (item) => asNumber(item.total_videos).toLocaleString('pt-BR') },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-base font-bold tracking-[-0.01em] text-ink">Ranking de marcas</p>
          </CardHeader>
          <CardBody>
            <DataTable<JsonRecord>
              data={rankingMarcas}
              columns={[
                { key: 'marca_nome', header: 'Marca', render: (item) => asString(item.marca_nome ?? item.nome, 'Marca') },
                { key: 'gmv_total', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv_total) },
                { key: 'pedidos', header: 'Pedidos', align: 'right', render: (item) => asNumber(item.pedidos).toLocaleString('pt-BR') },
                { key: 'total_lives', header: 'Lives', align: 'right', render: (item) => asNumber(item.total_lives).toLocaleString('pt-BR') },
                { key: 'total_videos', header: 'Vídeos', align: 'right', render: (item) => asNumber(item.total_videos).toLocaleString('pt-BR') },
              ]}
            />
          </CardBody>
        </Card>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-base font-bold tracking-[-0.01em] text-ink">Comissões do mês — por apresentadora</p>
          </CardHeader>
          <CardBody>
            {comissoesQuery.isLoading ? (
              <p className="py-4 text-center text-sm text-muted">Carregando...</p>
            ) : comissoesPorApresentadora.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Nenhuma comissão registrada no período.</p>
            ) : (
              <DataTable<{ apresentadora_nome: string; total: number }>
                data={comissoesPorApresentadora}
                columns={[
                  { key: 'apresentadora_nome', header: 'Apresentadora', render: (item) => item.apresentadora_nome },
                  { key: 'total', header: 'Total comissão', align: 'right', render: (item) => formatMoney(item.total) },
                ]}
              />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-base font-bold tracking-[-0.01em] text-ink">Comissões do mês — Livelab por marca</p>
          </CardHeader>
          <CardBody>
            {comissoesQuery.isLoading ? (
              <p className="py-4 text-center text-sm text-muted">Carregando...</p>
            ) : comissoesPorMarca.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Nenhuma comissão registrada no período.</p>
            ) : (
              <DataTable<{ marca_nome: string; total: number }>
                data={comissoesPorMarca}
                columns={[
                  { key: 'marca_nome', header: 'Marca', render: (item) => item.marca_nome },
                  { key: 'total', header: 'Comissão Livelab', align: 'right', render: (item) => formatMoney(item.total) },
                ]}
              />
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  )
}
