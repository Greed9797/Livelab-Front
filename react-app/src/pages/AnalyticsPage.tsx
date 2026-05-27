import { Clock, CircleDollarSign, Download, Film, Radio, ReceiptText, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { PeriodControl } from '../components/forms/PeriodControl'
import { MetricCard } from '../components/ui/MetricCard'
import { BarPanel, LinePanel } from '../components/charts/Charts'
import { ErrorState, LoadingState } from '../components/ui/States'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Button } from '../components/ui/Button'
import {
  exportarComissoesCSV,
  getAnalyticsDashboard,
  getApresentadoras,
  getComissoesApresentadoras,
  getComissoesMarcas,
  getMarcas,
} from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, currentPeriod, formatMoney, getRecord } from '../utils/format'
import { historyPoints, metric, moneyMetric } from './page-helpers'
import { QK } from '../services/query-keys'
import { useToast } from '../components/ui/Toast'
import type { JsonRecord } from '../types/models'

const icons = [CircleDollarSign, ShoppingBag, Radio, Film, Clock, ReceiptText]

function periodToMesAno(period: { mes: number; ano: number }) {
  return `${period.ano}-${String(period.mes).padStart(2, '0')}`
}

export function AnalyticsPage({ embedded = false }: { embedded?: boolean }) {
  const toast = useToast()
  const [period, setPeriod] = useState(currentPeriod())
  const [marcaId, setMarcaId] = useState<string>('')
  const [apresentadoraId, setApresentadoraId] = useState<string>('')
  const [exporting, setExporting] = useState(false)

  const mes = periodToMesAno(period)
  const filtros = { mes, marca_id: marcaId || undefined, apresentadora_id: apresentadoraId || undefined }

  const query = useQuery({ queryKey: QK.analyticsDashboard(period), queryFn: () => getAnalyticsDashboard({ mesAno: mes }) })

  const comissoesApresentadorasQ = useQuery({
    queryKey: QK.comissoesApresentadorasBy(mes, marcaId, apresentadoraId),
    queryFn: () => getComissoesApresentadoras(filtros),
  })
  const comissoesMarcasQ = useQuery({
    queryKey: QK.comissoesMarcasBy(mes, marcaId, apresentadoraId),
    queryFn: () => getComissoesMarcas(filtros),
  })

  const marcasOpts = useQuery({ queryKey: QK.marcas('analytics-filter'), queryFn: () => getMarcas({ status: 'ativa' }) })
  const apresentadorasOpts = useQuery({ queryKey: QK.apresentadoras('analytics-filter'), queryFn: () => getApresentadoras() })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const raw = query.data ?? {}
  const kpis = getRecord(raw.kpis)

  const apresentadorasRows = asArray<JsonRecord>(comissoesApresentadorasQ.data)
  const marcasRows = asArray<JsonRecord>(comissoesMarcasQ.data)

  const totalGMVApresentadoras = apresentadorasRows.reduce((sum, r) => sum + asNumber(r.gmv_total), 0)
  const totalComissaoApresentadoras = apresentadorasRows.reduce((sum, r) => sum + asNumber(r.comissao_apresentadora), 0)
  const totalGMVMarcas = marcasRows.reduce((sum, r) => sum + asNumber(r.gmv_total), 0)
  const totalComissaoFranquia = marcasRows.reduce((sum, r) => sum + asNumber(r.comissao_franquia), 0)
  const totalComissaoFranqueadora = marcasRows.reduce((sum, r) => sum + asNumber(r.comissao_franqueadora), 0)

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

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await exportarComissoesCSV(filtros)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comissoes-${mes}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.push('Relatório CSV gerado', 'success')
    } catch (err) {
      toast.push(extractErrorMessage(err), 'error')
    } finally {
      setExporting(false)
    }
  }

  const filtrosBar = (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Marca</span>
        <select
          className="design-input h-10 min-w-[180px] px-3 text-sm"
          value={marcaId}
          onChange={(e) => setMarcaId(e.target.value)}
        >
          <option value="">Todas as marcas</option>
          {asArray<JsonRecord>(marcasOpts.data).map((m) => (
            <option key={asString(m.id)} value={asString(m.id)}>{asString(m.nome, 'Sem nome')}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Apresentadora</span>
        <select
          className="design-input h-10 min-w-[180px] px-3 text-sm"
          value={apresentadoraId}
          onChange={(e) => setApresentadoraId(e.target.value)}
        >
          <option value="">Todas as apresentadoras</option>
          {asArray<JsonRecord>(apresentadorasOpts.data).map((a) => (
            <option key={asString(a.id)} value={asString(a.id)}>{asString(a.nome, 'Sem nome')}</option>
          ))}
        </select>
      </label>
      <PeriodControl period={period} onChange={setPeriod} />
      <Button type="button" icon={Download} variant="secondary" onClick={handleExport} isLoading={exporting}>
        Exportar CSV
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-bold text-ink">Analytics</p>
          {filtrosBar}
        </div>
      ) : (
        <PageHeader
          eyebrow="Analytics"
          accent="Dashboard"
          title="de métricas"
          subtitle="GMV, horas, lives e desempenho por período."
          actions={filtrosBar}
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
            <p className="text-base font-bold tracking-[-0.01em] text-ink">Comissões — por apresentadora</p>
            <p className="mt-1 text-xs text-ink-muted">Filtra por marca / apresentadora / mês. Use Exportar CSV pra gerar relatório.</p>
          </CardHeader>
          <CardBody>
            {comissoesApresentadorasQ.isLoading ? (
              <p className="py-4 text-center text-sm text-muted">Carregando...</p>
            ) : apresentadorasRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Nenhuma comissão no período/filtros.</p>
            ) : (
              <>
                <DataTable<JsonRecord>
                  data={apresentadorasRows}
                  columns={[
                    { key: 'apresentadora_nome', header: 'Apresentadora', render: (item) => asString(item.apresentadora_nome, 'Sem apresentadora') },
                    { key: 'gmv_total', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv_total) },
                    { key: 'pedidos_total', header: 'Pedidos', align: 'right', render: (item) => asNumber(item.pedidos_total).toLocaleString('pt-BR') },
                    { key: 'comissao_apresentadora', header: 'Comissão', align: 'right', render: (item) => formatMoney(item.comissao_apresentadora) },
                  ]}
                />
                <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm font-bold text-ink">
                  <span>Total ({apresentadorasRows.length})</span>
                  <span>GMV {formatMoney(totalGMVApresentadoras)} · Comissão {formatMoney(totalComissaoApresentadoras)}</span>
                </div>
              </>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-base font-bold tracking-[-0.01em] text-ink">Comissões — por marca (Livelab)</p>
            <p className="mt-1 text-xs text-ink-muted">Franquia + franqueadora. Filtra por marca / apresentadora / mês.</p>
          </CardHeader>
          <CardBody>
            {comissoesMarcasQ.isLoading ? (
              <p className="py-4 text-center text-sm text-muted">Carregando...</p>
            ) : marcasRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Nenhuma comissão no período/filtros.</p>
            ) : (
              <>
                <DataTable<JsonRecord>
                  data={marcasRows}
                  columns={[
                    { key: 'marca_nome', header: 'Marca', render: (item) => asString(item.marca_nome, 'Sem marca') },
                    { key: 'gmv_total', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv_total) },
                    { key: 'comissao_franquia', header: 'Franquia', align: 'right', render: (item) => formatMoney(item.comissao_franquia) },
                    { key: 'comissao_franqueadora', header: 'Franqueadora', align: 'right', render: (item) => formatMoney(item.comissao_franqueadora) },
                  ]}
                />
                <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-line pt-3 text-sm font-bold text-ink">
                  <span>Total ({marcasRows.length})</span>
                  <span>GMV {formatMoney(totalGMVMarcas)} · Franquia {formatMoney(totalComissaoFranquia)} · Franqueadora {formatMoney(totalComissaoFranqueadora)}</span>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  )
}
