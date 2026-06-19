import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Info } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Badge, statusTone } from '../components/ui/Badge'
import { ErrorState, LoadingState } from '../components/ui/States'
import { HistoricoGmvModal } from './HistoricoGmvModal'
import { getApresentadoras, getComissoesApresentadoras, getLives } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, formatMoney, unwrapList } from '../utils/format'
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

// Mesmas regras de resolução de campo que a tabela de lives realizadas (LivesTab).
function officialLiveGmv(live: JsonRecord): number {
  return asNumber(live.gmv ?? live.ads_gmv ?? live.manual_gmv ?? live.fat_gerado)
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
  const d = value ? new Date(asString(value)) : null
  if (!d || Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' }).format(d)
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

export function ApresentadoraDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [range, setRange] = useState<DateRange>('mes')
  const [liveDetailId, setLiveDetailId] = useState<string | null>(null)
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
  const apresentadorasQ = useQuery({ queryKey: ['apresentadoras', 'detalhe-fallback'], queryFn: getApresentadoras })

  const row = asArray<JsonRecord>(comissaoQ.data)[0] ?? {}
  const lives = unwrapList<JsonRecord>(livesQ.data)
  const apFallback = unwrapList<JsonRecord>(apresentadorasQ.data).find((a) => asString(a.id) === id)

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

          {/* Memória de cálculo — parcial; detalhamento completo precisa da Onda 1 */}
          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Memória de cálculo da comissão</p>
              <p className="mt-1 text-xs text-ink-muted">Composição do total recebido no período selecionado.</p>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-3"><span className="text-ink-muted">Fixo mensal</span><span className="num font-semibold text-ink">{formatMoney(fixo)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-ink-muted">Comissão variável (escada × GMV)</span><span className="num font-semibold text-ink">{formatMoney(comissaoVar)}</span></div>
                <div className="flex justify-between gap-3 border-t border-line pt-1.5"><span className="font-bold text-ink">Total recebido</span><span className="num font-bold text-ink">{formatMoney(totalRecebido)}</span></div>
              </div>
              <p className="flex items-start gap-2 rounded-xl border border-dashed border-line bg-surface-muted/50 p-3 text-xs text-ink-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                O detalhamento da escada (qual faixa de GMV foi aplicada, override de 2% em fim de semana, rateio entre co-apresentadoras) precisa de um endpoint dedicado — entra na próxima onda. O <strong>fixo é mensal</strong>: em períodos menores que o mês cheio ele aparece somado uma vez, sem rateio.
              </p>
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
