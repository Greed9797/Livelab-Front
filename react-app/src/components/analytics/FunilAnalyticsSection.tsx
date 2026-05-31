import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { LoadingState, ErrorState } from '../ui/States'
import { extractErrorMessage } from '../../services/api'
import { getFunilAnalytics } from '../../services/domain'
import { QK } from '../../services/query-keys'
import { asNumber, asString, formatMoney } from '../../utils/format'
import type { JsonRecord } from '../../types/models'

// ── Thresholds calibrados (distribuição 4 marcas, 18-28/05/2026) ──
const THRESHOLDS = {
  entrada:  [0.10, 0.15] as const,
  retencao: [22,   26  ] as const,
  clique:   [0.05, 0.06] as const,
  fecha:    [0.012, 0.018] as const,
  coment:   [0.02, 0.035] as const,
} as const

type MetricKey = keyof typeof THRESHOLDS
type Light = 'green' | 'yellow' | 'red' | 'none'

function trafficLight(v: number | null, key: MetricKey): Light {
  if (v === null || v === 0) return 'none'
  const [r, g] = THRESHOLDS[key]
  if (v >= g) return 'green'
  if (v >= r) return 'yellow'
  return 'red'
}

const LIGHT_TEXT: Record<Light, string> = {
  green:  'text-[var(--success)] font-semibold',
  yellow: 'text-[var(--warning)] font-semibold',
  red:    'text-[var(--danger)] font-semibold',
  none:   'text-[var(--text-muted)]',
}

const LIGHT_DOT: Record<Light, string> = {
  green:  'bg-[var(--success)]',
  yellow: 'bg-[var(--warning)]',
  red:    'bg-[var(--danger)]',
  none:   '',
}

function FunilCell({
  value,
  metricKey,
  fmt,
}: {
  value: number | null
  metricKey: MetricKey
  fmt: (v: number) => string
}) {
  if (value === null || value === 0) {
    return <span className="text-xs text-[var(--text-faint)]">—</span>
  }
  const light = trafficLight(value, metricKey)
  return (
    <span className={`inline-flex items-center gap-1 ${LIGHT_TEXT[light]}`}>
      {light !== 'none' && (
        <span className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${LIGHT_DOT[light]}`} />
      )}
      {fmt(value)}
    </span>
  )
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`
}

function sec(v: number) {
  return `${Math.round(v)}s`
}

function nullable(raw: JsonRecord, key: string): number | null {
  const v = raw[key]
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

interface Props {
  mesAno: string
}

export function FunilAnalyticsSection({ mesAno }: Props) {
  const [groupBy, setGroupBy] = useState<'marca' | 'apresentadora'>('marca')

  const query = useQuery({
    queryKey: QK.funilAnalytics(mesAno, groupBy),
    queryFn: () => getFunilAnalytics(mesAno, groupBy),
    staleTime: 5 * 60_000,
  })

  const label = groupBy === 'marca' ? 'Marca' : 'Apresentadora'

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-bold tracking-[-0.01em] text-ink">Funil de Lives</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Lives ≥ 5 min · semáforo calibrado por faixa · dados do TikTok Ads Manager
            </p>
          </div>
          <div className="flex rounded-lg border border-line bg-surface-muted p-0.5">
            {(['marca', 'apresentadora'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setGroupBy(opt)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                  groupBy === opt
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {opt === 'marca' ? 'Por Marca' : 'Por Apresentadora'}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardBody>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : !query.data?.length ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            Nenhuma live encerrada com dados de funil no período.
          </p>
        ) : (
          <FunilTable rows={query.data as JsonRecord[]} label={label} />
        )}
      </CardBody>
    </Card>
  )
}

function FunilTable({ rows, label }: { rows: JsonRecord[]; label: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wide text-ink-muted">
            <th className="pb-2 pr-4">{label}</th>
            <th className="pb-2 pr-4 text-right">Lives</th>
            <th className="pb-2 pr-4 text-right">GMV (Ads)</th>
            <th className="pb-2 pr-4 text-right">Verba</th>
            <th className="pb-2 pr-4 text-right">ROI</th>
            <th className="pb-2 pr-4 text-right">GMV/h</th>
            <th className="pb-2 pr-4 text-right">Ticket</th>
            <th className="pb-2 pr-4 text-right">Pedidos</th>
            <th className="pb-2 pr-4 text-right" title="Views / Impressões do live">Entrada</th>
            <th className="pb-2 pr-4 text-right" title="Retenção média em segundos">Retenção</th>
            <th className="pb-2 pr-4 text-right" title="Cliques / Impressões de produto">Clique</th>
            <th className="pb-2 pr-4 text-right" title="Pedidos / Cliques">Fecha</th>
            <th className="pb-2 text-right" title="Comentários / Views">Coment.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const gmv    = nullable(row, 'gmv')
            const verba  = nullable(row, 'verba')
            const roi    = nullable(row, 'roi')
            const gmvH   = nullable(row, 'gmv_hora')
            const ticket = nullable(row, 'ticket')
            const entrada  = nullable(row, 'entrada')
            const retencao = nullable(row, 'retencao')
            const clique   = nullable(row, 'clique')
            const fecha    = nullable(row, 'fecha')
            const coment   = nullable(row, 'coment')
            return (
              <tr
                key={asString(row.grupo_id) || idx.toString()}
                className="border-b border-line/50 hover:bg-surface-muted/50"
              >
                <td className="py-2.5 pr-4 font-medium text-ink">
                  <div className="flex items-center gap-2">
                    {row.logo_url ? (
                      <img
                        src={asString(row.logo_url)}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted text-[10px] font-bold text-ink-muted">
                        {asString(row.grupo_nome, '?').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate max-w-[140px]">
                      {asString(row.grupo_nome, '—')}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-ink">
                  {asNumber(row.total_lives)}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums font-semibold text-ink">
                  {gmv !== null && gmv > 0 ? formatMoney(gmv) : <Dash />}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-ink-muted">
                  {verba !== null && verba > 0 ? formatMoney(verba) : <Dash />}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-ink">
                  {roi !== null ? `${roi.toFixed(1)}x` : <Dash />}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-ink-muted">
                  {gmvH !== null && gmvH > 0 ? `R$ ${Math.round(gmvH)}` : <Dash />}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-ink-muted">
                  {ticket !== null && ticket > 0 ? formatMoney(ticket) : <Dash />}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-ink">
                  {asNumber(row.pedidos)}
                </td>
                <td className="py-2.5 pr-4 text-right">
                  <FunilCell value={entrada} metricKey="entrada" fmt={pct} />
                </td>
                <td className="py-2.5 pr-4 text-right">
                  <FunilCell value={retencao} metricKey="retencao" fmt={sec} />
                </td>
                <td className="py-2.5 pr-4 text-right">
                  <FunilCell value={clique} metricKey="clique" fmt={pct} />
                </td>
                <td className="py-2.5 pr-4 text-right">
                  <FunilCell value={fecha} metricKey="fecha" fmt={pct} />
                </td>
                <td className="py-2.5 text-right">
                  <FunilCell value={coment} metricKey="coment" fmt={pct} />
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-line">
            <td colSpan={13} className="pt-3">
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-ink-muted">
                <LegendItem color="var(--danger)"  label="Gargalo" />
                <LegendItem color="var(--warning)" label="Médio" />
                <LegendItem color="var(--success)" label="Forte" />
                <span>·</span>
                <span>Entrada: Views / Impressões</span>
                <span>·</span>
                <span>Retenção: média (s)</span>
                <span>·</span>
                <span>Clique: Cliques / Impressões produto</span>
                <span>·</span>
                <span>Fecha: Pedidos / Cliques</span>
                <span>·</span>
                <span>Coment.: Comentários / Views</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function Dash() {
  return <span className="text-ink-faint">—</span>
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}
