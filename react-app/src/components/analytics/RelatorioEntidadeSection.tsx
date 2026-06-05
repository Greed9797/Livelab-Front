import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CircleDollarSign, Clock, FileDown, Film, Radio, ReceiptText, ShoppingBag, TrendingUp } from 'lucide-react'
import { MetricCard } from '../ui/MetricCard'
import { DataTable } from '../ui/DataTable'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { getDailyAnalytics } from '../../services/domain'
import { QK } from '../../services/query-keys'
import { extractErrorMessage } from '../../services/api'
import { asArray, asNumber, asString, formatMoney } from '../../utils/format'
import { metric, moneyMetric, sumDailyTotals } from '../../pages/page-helpers'
import type { JsonRecord, Metric } from '../../types/models'

interface RelatorioEntidadeSectionProps {
  mes: string
  marcaId: string
  apresentadoraId: string
  nomeEntidade: string
  comissaoRow?: JsonRecord
}

function diaCurto(value: unknown): string {
  const raw = asString(value, '')
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}` : raw || '—'
}

export function RelatorioEntidadeSection({ mes, marcaId, apresentadoraId, nomeEntidade, comissaoRow }: RelatorioEntidadeSectionProps) {
  const toast = useToast()
  const [exporting, setExporting] = useState(false)
  const tipo: 'marca' | 'apresentadora' = marcaId ? 'marca' : 'apresentadora'

  const query = useQuery({
    queryKey: QK.dailyAnalytics(mes, marcaId, apresentadoraId),
    queryFn: () => getDailyAnalytics({ mesAno: mes, marca_id: marcaId || undefined, apresentadora_id: apresentadoraId || undefined }),
    enabled: Boolean(marcaId || apresentadoraId),
    staleTime: 5 * 60_000,
  })

  const rows = asArray<JsonRecord>(query.data)
    .slice()
    .sort((a, b) => asString(a.dia).localeCompare(asString(b.dia)))
  const totals = sumDailyTotals(rows)

  const comissaoMetrics: Metric[] = tipo === 'marca'
    ? [
        moneyMetric('Comissão franquia', comissaoRow?.comissao_franquia ?? 0, 'no período', 'success'),
        moneyMetric('Comissão franqueadora', comissaoRow?.comissao_franqueadora ?? 0, 'no período', 'info'),
      ]
    : [moneyMetric('Comissão', comissaoRow?.comissao_apresentadora ?? 0, 'no período', 'success')]

  const metrics: Metric[] = [
    moneyMetric('GMV total (faturamento)', totals.gmv_total, 'lives + vídeos', 'brand'),
    moneyMetric('GMV lives', totals.gmv_lives, 'vendas em live', 'info'),
    moneyMetric('GMV vídeos', totals.gmv_videos, 'vendas em vídeo', 'info'),
    metric('Horas de live', totals.horas_live.toFixed(1), 'lives encerradas', 'neutral'),
    metric('Lives realizadas', totals.total_lives.toLocaleString('pt-BR'), 'no mês', 'neutral'),
    metric('Vídeos', totals.total_videos.toLocaleString('pt-BR'), 'no mês', 'neutral'),
    metric('Pedidos', totals.pedidos.toLocaleString('pt-BR'), 'atribuídos', 'success'),
    moneyMetric('Ticket médio', totals.ticket_medio, 'GMV / pedidos', 'neutral'),
    moneyMetric('GMV / hora', totals.gmv_por_hora, 'GMV total / horas', 'success'),
    moneyMetric('GMV / live', totals.gmv_por_live, 'GMV total / lives', 'info'),
    ...comissaoMetrics,
  ]

  const icons = [CircleDollarSign, Radio, Film, Clock, Radio, Film, ShoppingBag, ReceiptText, TrendingUp, TrendingUp, CircleDollarSign, CircleDollarSign]

  async function exportPdf() {
    if (rows.length === 0) {
      toast.push('Sem dados para exportar neste período.', 'error')
      return
    }
    setExporting(true)
    try {
      const { buildRelatorioPdf } = await import('../../utils/pdfReport')
      buildRelatorioPdf({
        titulo: nomeEntidade || (tipo === 'marca' ? 'Marca' : 'Apresentadora'),
        subtitulo: tipo === 'marca' ? 'Relatório por marca' : 'Relatório por apresentadora',
        mes,
        metrics: metrics.map((m) => ({ label: m.label, value: m.value })),
        dailyRows: rows.map((r) => ({
          dia: diaCurto(r.dia),
          gmvLives: formatMoney(r.gmv_lives ?? r.gmv),
          gmvVideos: formatMoney(r.gmv_videos),
          horas: asNumber(r.horas_live).toFixed(1),
          pedidos: asNumber(r.pedidos ?? r.total_pedidos).toLocaleString('pt-BR'),
        })),
        geradoEm: new Date().toLocaleString('pt-BR'),
      })
      toast.push('PDF gerado', 'success')
    } catch (err) {
      toast.push(extractErrorMessage(err), 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-muted">
                Relatório do mês · {tipo === 'marca' ? 'marca' : 'apresentadora'}
              </p>
              <h3 className="mt-0.5 text-lg font-extrabold tracking-[-0.01em] text-ink">{nomeEntidade || '—'}</h3>
              <p className="mt-0.5 text-sm text-ink-muted">{mes} · consolidado a partir do dia-a-dia atribuído.</p>
            </div>
            <Button type="button" icon={FileDown} onClick={exportPdf} isLoading={exporting} disabled={query.isLoading || rows.length === 0}>
              Exportar PDF
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {query.isLoading ? (
            <p className="py-6 text-center text-sm text-ink-muted">Carregando relatório...</p>
          ) : query.isError ? (
            <p className="py-6 text-center text-sm text-[var(--danger)]">{extractErrorMessage(query.error)}</p>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">Sem dados atribuídos para esta seleção no mês.</p>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((item, index) => (
                  <MetricCard key={item.label} metric={item} icon={icons[index]} />
                ))}
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-ink">Detalhamento diário</p>
                <DataTable<JsonRecord>
                  data={rows}
                  columns={[
                    { key: 'dia', header: 'Dia', render: (r) => diaCurto(r.dia) },
                    { key: 'gmv_lives', header: 'GMV lives', align: 'right', render: (r) => formatMoney(r.gmv_lives ?? r.gmv) },
                    { key: 'gmv_videos', header: 'GMV vídeos', align: 'right', render: (r) => formatMoney(r.gmv_videos) },
                    { key: 'horas_live', header: 'Horas', align: 'right', render: (r) => asNumber(r.horas_live).toFixed(1) },
                    { key: 'pedidos', header: 'Pedidos', align: 'right', render: (r) => asNumber(r.pedidos ?? r.total_pedidos).toLocaleString('pt-BR') },
                  ]}
                />
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  )
}
