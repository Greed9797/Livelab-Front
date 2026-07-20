import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileDown, Info } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Badge, statusTone } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { ErrorState, LoadingState } from '../components/ui/States'
import type { PdfTable } from '../utils/pdfReport'
import { HistoricoGmvModal } from './HistoricoGmvModal'
import { getApresentadoras, getComissaoMemoria, getComissoesApresentadoras, getComissoesPorApresentadora, getLives } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, formatMoney, getRecord, unwrapList } from '../utils/format'
import { officialLiveGmv } from '../utils/live-gmv'
import type { JsonRecord } from '../types/models'

type DateRange = 'hoje' | '7d' | '30d' | 'mes'

const RANGES: { value: DateRange; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'mes', label: 'Mês' },
]

// Preset de período → janela de datas (YYYY-MM-DD) para o servidor.
function dateRangeToWindow(range: DateRange): { data_inicio: string; data_fim: string } {
  const now = new Date()
  const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const fim = toISO(now)
  if (range === 'hoje') return { data_inicio: fim, data_fim: fim }
  if (range === 'mes') return { data_inicio: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), data_fim: fim }
  const start = new Date(now)
  start.setDate(now.getDate() - (range === '7d' ? 6 : 29))
  return { data_inicio: toISO(start), data_fim: fim }
}

function liveOrders(live: JsonRecord): number {
  return asNumber(live.manual_orders ?? live.qtd_pedidos ?? live.final_orders_count ?? live.pedidos)
}
function liveDurationMins(live: JsonRecord): number {
  const start = live.iniciado_em ? new Date(asString(live.iniciado_em)) : null
  const end = live.encerrado_em ? new Date(asString(live.encerrado_em)) : null
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000))
}
function fmtDurationMins(mins: number): string {
  if (mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}m`
}
function fmtDay(value: unknown): string {
  const raw = asString(value, '')
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}`
  const d = value ? new Date(raw) : null
  if (!d || Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d)
}
function pctLabel(value: unknown): string {
  const n = asNumber(value)
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className="num mt-1 text-2xl font-black leading-none tracking-[-0.02em] text-ink sm:text-3xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  )
}

// Rótulo da regra aplicada na linha da memória: 2% de fim de semana, faixa da escada
// ou o pct cru gravado (fallback) — explica de onde veio o percentual.
function regraLabel(linha: JsonRecord): string {
  if (linha.fim_de_semana) return '2% · fim de semana'
  const faixa = getRecord(linha.faixa)
  if (faixa.comissao_pct != null) {
    const ini = asNumber(faixa.gmv_inicio)
    const fim = faixa.gmv_fim == null ? null : asNumber(faixa.gmv_fim)
    const faixaTxt = fim == null ? `≥ ${formatMoney(ini)}` : `${formatMoney(ini)}–${formatMoney(fim)}`
    return `${pctLabel(faixa.comissao_pct)} · faixa ${faixaTxt}`
  }
  return `${pctLabel(linha.pct_aplicado)} · escada padrão`
}

export function ApresentadoraDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [range, setRange] = useState<DateRange>('mes')
  const [liveDetailId, setLiveDetailId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const periodWindow = dateRangeToWindow(range)

  // Fonte única dos KPIs e da comissão: o mesmo /comissoes/apresentadoras do
  // Financeiro, filtrado pela apresentadora (a engine já suporta apresentadora_id).
  const comissaoQ = useQuery({
    queryKey: ['apresentadora-detalhe-comissao', id, range],
    queryFn: () => getComissoesApresentadoras({ ...periodWindow, apresentadora_id: id }),
    enabled: Boolean(id),
  })
  // Histórico live-a-live: /v1/lives já filtra por apresentadora e inclui lives
  // sem venda atribuída (ao contrário do operacional por marca).
  const livesQ = useQuery({
    queryKey: ['apresentadora-detalhe-lives', id, range],
    queryFn: () => getLives({ apresentadora_id: id, status: 'encerrada', limit: 200, ...periodWindow }),
    enabled: Boolean(id),
  })
  // Onda 1 — comissão por live (coluna "Comissão" do histórico, sem N+1).
  const comissaoLivesQ = useQuery({
    queryKey: ['apresentadora-detalhe-comissao-lives', id, range],
    queryFn: () => getComissoesPorApresentadora(id, periodWindow),
    enabled: Boolean(id),
  })
  // Onda 1 — memória de cálculo detalhada (faixa, base do mês, 2% fds).
  const memoriaQ = useQuery({
    queryKey: ['apresentadora-detalhe-memoria', id, range],
    queryFn: () => getComissaoMemoria({ apresentadora_id: id, ...periodWindow }),
    enabled: Boolean(id),
  })
  const apresentadorasQ = useQuery({ queryKey: ['apresentadoras', 'detalhe-fallback'], queryFn: getApresentadoras })

  const row = asArray<JsonRecord>(comissaoQ.data)[0] ?? {}
  const lives = unwrapList<JsonRecord>(livesQ.data)
  const apFallback = unwrapList<JsonRecord>(apresentadorasQ.data).find((a) => asString(a.id) === id)
  const memoriaLinhas = asArray<JsonRecord>(getRecord(memoriaQ.data).linhas)

  // Mapa live_id → comissão da apresentadora naquela live (merge no histórico).
  const comissaoPorLive = useMemo(() => {
    const map = new Map<string, number>()
    for (const l of asArray<JsonRecord>(getRecord(comissaoLivesQ.data).lives)) {
      map.set(asString(l.live_id), asNumber(l.comissao_apresentadora))
    }
    return map
  }, [comissaoLivesQ.data])

  const nome = asString(row.apresentadora_nome ?? apFallback?.nome, 'Apresentadora')
  const foto = asString(row.foto_url ?? row.apresentadora_foto_url ?? apFallback?.foto_url, '')
  const gmv = asNumber(row.gmv_total ?? row.gmv)
  const gmvHora = asNumber(row.gmv_por_hora)
  const comissaoVar = asNumber(row.comissao_apresentadora)
  const fixo = asNumber(row.fixo)
  const totalRecebido = asNumber(row.total_recebido)
  const totalLives = asNumber(row.total_lives ?? row.lives)
  const horas = asNumber(row.horas_live)

  const isLoading = comissaoQ.isLoading || livesQ.isLoading
  const isError = comissaoQ.isError || livesQ.isError

  // PDF do fechamento: KPIs + memória de cálculo (regra aplicada em cada venda)
  // + histórico live-a-live — o documento que justifica a comissão do período.
  async function exportPdf() {
    setExporting(true)
    try {
      const { buildRelatorioPdf } = await import('../utils/pdfReport')
      const { data_inicio, data_fim } = periodWindow
      const tables: PdfTable[] = []
      if (memoriaLinhas.length > 0) {
        tables.push({
          title: 'Memória de cálculo — detalhamento por venda',
          head: ['Data', 'Origem', 'Marca', 'GMV', 'Base do mês', 'Regra aplicada', 'Comissão'],
          rightAlign: [3, 4, 6],
          body: memoriaLinhas.map((l) => [
            fmtDay(l.data),
            asString(l.origem, '—'),
            asString(l.marca_nome, '—'),
            formatMoney(l.gmv),
            formatMoney(l.base_gmv_mes),
            regraLabel(l),
            formatMoney(l.comissao_apresentadora),
          ]),
        })
      }
      if (lives.length > 0) {
        tables.push({
          title: 'Histórico de lives',
          head: ['Data', 'Marca', 'Cabine', 'Duração', 'GMV', 'Pedidos', 'Comissão'],
          rightAlign: [3, 4, 5, 6],
          body: lives.map((live) => {
            const c = comissaoPorLive.get(asString(live.id ?? live.live_id))
            return [
              fmtDay(live.iniciado_em ?? live.data_inicio ?? live.encerrado_em),
              asString(live.marca_nome ?? live.cliente_nome, '—'),
              asString(live.cabine_nome ?? (asNumber(live.cabine_numero) > 0 ? `Cabine ${asNumber(live.cabine_numero)}` : ''), '—'),
              fmtDurationMins(liveDurationMins(live)),
              formatMoney(officialLiveGmv(live)),
              liveOrders(live).toLocaleString('pt-BR'),
              c == null ? '—' : formatMoney(c),
            ]
          }),
        })
      }
      buildRelatorioPdf({
        titulo: nome,
        subtitulo: 'Relatório da apresentadora',
        mes: data_inicio === data_fim ? data_inicio : `${data_inicio}_a_${data_fim}`,
        metrics: [
          { label: 'GMV total', value: formatMoney(gmv) },
          { label: 'GMV / hora', value: formatMoney(gmvHora) },
          { label: 'Lives no período', value: `${totalLives.toLocaleString('pt-BR')} · ${horas.toFixed(1)}h no ar` },
          { label: 'Fixo mensal', value: formatMoney(fixo) },
          { label: 'Comissão variável', value: formatMoney(comissaoVar) },
          { label: 'Total recebido', value: formatMoney(totalRecebido) },
        ],
        tables,
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
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-soft text-lg font-black text-brand">
            {foto ? <img src={foto} alt="" className="h-full w-full object-cover" loading="lazy" /> : initials(nome)}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">Apresentadora</p>
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink sm:text-3xl">{nome}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
                range === r.value ? 'bg-brand text-white' : 'border border-line text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              {r.label}
            </button>
          ))}
          <Button
            type="button"
            icon={FileDown}
            onClick={exportPdf}
            isLoading={exporting}
            // memoriaQ/comissaoLivesQ também: sem elas o PDF sairia sem a memória
            // de cálculo e com '—' nas comissões por live, silenciosamente.
            disabled={isLoading || isError || memoriaQ.isLoading || comissaoLivesQ.isLoading}
          >
            Exportar PDF
          </Button>
        </div>
      </div>

      {isError ? (
        <ErrorState
          message={extractErrorMessage(comissaoQ.error ?? livesQ.error)}
          onRetry={() => {
            void comissaoQ.refetch()
            void livesQ.refetch()
          }}
        />
      ) : isLoading ? (
        <LoadingState />
      ) : (
        <>
          {/* KpiHero */}
          <Card>
            <CardBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="GMV total" value={formatMoney(gmv)} hint={`${totalLives.toLocaleString('pt-BR')} lives · ${horas.toFixed(1)}h`} />
              <Stat label="GMV / hora" value={formatMoney(gmvHora)} hint="GMV de live ÷ horas no ar" />
              <Stat label="Comissão variável" value={formatMoney(comissaoVar)} hint="escada × GMV no período" />
              <Stat label="Total recebido" value={formatMoney(totalRecebido)} hint={`fixo ${formatMoney(fixo)} + variável`} />
            </CardBody>
          </Card>

          {/* Memória de cálculo — detalhada (Onda 1) */}
          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Memória de cálculo da comissão</p>
              <p className="mt-1 text-xs text-ink-muted">Como cada centavo da comissão variável foi formado no período.</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-3"><span className="text-ink-muted">Fixo mensal</span><span className="num font-semibold text-ink">{formatMoney(fixo)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-ink-muted">Comissão variável (escada × GMV)</span><span className="num font-semibold text-ink">{formatMoney(comissaoVar)}</span></div>
                <div className="flex justify-between gap-3 border-t border-line pt-1.5"><span className="font-bold text-ink">Total recebido</span><span className="num font-bold text-ink">{formatMoney(totalRecebido)}</span></div>
              </div>

              {memoriaQ.isLoading ? (
                <p className="py-3 text-center text-sm text-ink-muted">Carregando detalhamento…</p>
              ) : memoriaLinhas.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Detalhamento por venda</p>
                  <DataTable<JsonRecord>
                    data={memoriaLinhas}
                    columns={[
                      { key: 'data', header: 'Data', render: (l) => fmtDay(l.data) },
                      { key: 'origem', header: 'Origem', render: (l) => asString(l.origem, '—') },
                      { key: 'marca', header: 'Marca', render: (l) => asString(l.marca_nome, '—') },
                      { key: 'gmv', header: 'GMV', align: 'right', render: (l) => <span className="num">{formatMoney(l.gmv)}</span> },
                      { key: 'base', header: 'Base do mês', align: 'right', render: (l) => <span className="num">{formatMoney(l.base_gmv_mes)}</span> },
                      { key: 'regra', header: 'Regra aplicada', render: (l) => regraLabel(l) },
                      { key: 'comissao', header: 'Comissão', align: 'right', render: (l) => <span className="num font-semibold text-ink">{formatMoney(l.comissao_apresentadora)}</span> },
                    ]}
                  />
                </div>
              ) : (
                <p className="flex items-start gap-2 rounded-xl border border-dashed border-line bg-surface-muted/50 p-3 text-xs text-ink-muted">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Sem vendas atribuídas no período — a comissão variável vem de lives com marca/apresentadora resolvidas. O <strong>fixo é mensal</strong>: períodos menores que o mês cheio mostram o fixo somado uma vez, sem rateio.
                </p>
              )}
            </CardBody>
          </Card>

          {/* Histórico de lives */}
          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Histórico de lives</p>
              <p className="mt-1 text-xs text-ink-muted">Lives encerradas no período. Clique numa linha para ver o histórico de revisões de GMV.</p>
            </CardHeader>
            <CardBody>
              <DataTable<JsonRecord>
                data={lives}
                onRowClick={(live) => {
                  const liveId = asString(live.id ?? live.live_id, '')
                  if (liveId) setLiveDetailId(liveId)
                }}
                columns={[
                  { key: 'data', header: 'Data', render: (live) => fmtDay(live.iniciado_em ?? live.data_inicio ?? live.encerrado_em) },
                  { key: 'marca', header: 'Marca', render: (live) => asString(live.marca_nome ?? live.cliente_nome, '—') },
                  { key: 'cabine', header: 'Cabine', render: (live) => asString(live.cabine_nome ?? (asNumber(live.cabine_numero) > 0 ? `Cabine ${asNumber(live.cabine_numero)}` : ''), '—') },
                  { key: 'duracao', header: 'Duração', align: 'right', render: (live) => fmtDurationMins(liveDurationMins(live)) },
                  { key: 'gmv', header: 'GMV', align: 'right', render: (live) => <span className="num">{formatMoney(officialLiveGmv(live))}</span> },
                  { key: 'pedidos', header: 'Pedidos', align: 'right', render: (live) => <span className="num">{liveOrders(live).toLocaleString('pt-BR')}</span> },
                  {
                    key: 'comissao',
                    header: 'Comissão',
                    align: 'right',
                    render: (live) => {
                      const c = comissaoPorLive.get(asString(live.id ?? live.live_id))
                      return <span className="num">{c == null ? '—' : formatMoney(c)}</span>
                    },
                  },
                  { key: 'status', header: 'Status', render: (live) => <Badge tone={statusTone(asString(live.status))}>{asString(live.status, '—')}</Badge> },
                ]}
              />
            </CardBody>
          </Card>
        </>
      )}

      <HistoricoGmvModal liveId={liveDetailId} onClose={() => setLiveDetailId(null)} />
    </div>
  )
}
