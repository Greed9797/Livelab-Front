import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { LoadingState } from '../ui/States'
import { getApresentadoras, getDailyAnalytics, getMarcas } from '../../services/domain'
import { QK } from '../../services/query-keys'
import { asArray, asNumber, asString, formatMoney } from '../../utils/format'
import type { JsonRecord } from '../../types/models'

interface Props {
  mesAno: string
}

function formatDay(value: unknown) {
  const raw = asString(value, '')
  if (!raw) return '—'
  const date = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    weekday: 'short',
  }).format(date)
}

function sum(rows: JsonRecord[], key: string) {
  return rows.reduce((acc, row) => acc + asNumber(row[key]), 0)
}

export function DailyAnalyticsSection({ mesAno }: Props) {
  const [marcaId, setMarcaId] = useState('')
  const [apresentadoraId, setApresentadoraId] = useState('')
  const filters = useMemo(() => ({
    mesAno,
    marca_id: marcaId || undefined,
    apresentadora_id: apresentadoraId || undefined,
  }), [apresentadoraId, marcaId, mesAno])

  const query = useQuery({
    queryKey: QK.dailyAnalytics(mesAno, marcaId, apresentadoraId),
    queryFn: () => getDailyAnalytics(filters),
    staleTime: 5 * 60_000,
  })
  const marcasQuery = useQuery({ queryKey: QK.marcas('analytics-daily-filter'), queryFn: () => getMarcas({ status: 'ativa' }) })
  const apresentadorasQuery = useQuery({ queryKey: QK.apresentadoras('analytics-daily-filter'), queryFn: () => getApresentadoras() })

  const rows = asArray<JsonRecord>(query.data?.rows)
  const rowsWithData = rows.filter((row) => (
    asNumber(row.gmv_total) > 0 ||
    asNumber(row.pedidos) > 0 ||
    asNumber(row.total_lives) > 0 ||
    asNumber(row.total_videos) > 0 ||
    asNumber(row.horas_live) > 0
  ))
  const visibleRows = rowsWithData
  const hasFilter = Boolean(marcaId || apresentadoraId)
  const selectedMarcaLabel = useMemo(() => {
    if (!marcaId) return 'Todas'
    const marca = asArray<JsonRecord>(marcasQuery.data).find((item) => asString(item.id) === marcaId)
    return asString(marca?.nome, 'Selecionada')
  }, [marcaId, marcasQuery.data])
  const selectedApresentadoraLabel = useMemo(() => {
    if (!apresentadoraId) return 'Todas'
    const apresentadora = asArray<JsonRecord>(apresentadorasQuery.data).find((item) => asString(item.id) === apresentadoraId)
    return asString(apresentadora?.nome, 'Selecionada')
  }, [apresentadoraId, apresentadorasQuery.data])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-base font-bold tracking-[-0.01em] text-ink">Análise diária</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Linha por dia · filtra marca/apresentadora · GMV live usa Ads GMV quando disponível.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Marca</span>
              <select
                className="design-input h-10 min-w-[170px] px-3 text-sm"
                value={marcaId}
                onChange={(event) => setMarcaId(event.target.value)}
              >
                <option value="">Todas</option>
                {asArray<JsonRecord>(marcasQuery.data).map((marca) => (
                  <option key={asString(marca.id)} value={asString(marca.id)}>
                    {asString(marca.nome, 'Sem nome')}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Apresentadora</span>
              <select
                className="design-input h-10 min-w-[190px] px-3 text-sm"
                value={apresentadoraId}
                onChange={(event) => setApresentadoraId(event.target.value)}
              >
                <option value="">Todas</option>
                {asArray<JsonRecord>(apresentadorasQuery.data).map((apresentadora) => (
                  <option key={asString(apresentadora.id)} value={asString(apresentadora.id)}>
                    {asString(apresentadora.nome, 'Sem nome')}
                  </option>
                ))}
              </select>
            </label>
            {hasFilter ? (
              <button
                type="button"
                className="h-10 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink-muted transition hover:bg-surface-muted hover:text-ink"
                onClick={() => {
                  setMarcaId('')
                  setApresentadoraId('')
                }}
              >
                Limpar
              </button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5 text-center">
            <p className="text-sm font-bold text-ink">Análise diária temporariamente indisponível.</p>
            <p className="mt-1 text-xs text-ink-muted">
              O restante do Analytics continua usando os dados consolidados de lives realizadas.
            </p>
            <button
              type="button"
              className="mt-3 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-muted"
              onClick={() => void query.refetch()}
            >
              Tentar novamente
            </button>
          </div>
        ) : visibleRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            {hasFilter ? 'Sem dados para esta combinação no período.' : 'Nenhum dado diário no período.'}
          </p>
        ) : (
          <DailyTable
            rows={visibleRows}
            marcaLabel={selectedMarcaLabel}
            apresentadoraLabel={selectedApresentadoraLabel}
          />
        )}
      </CardBody>
    </Card>
  )
}

function DailyTable({
  rows,
  marcaLabel,
  apresentadoraLabel,
}: {
  rows: JsonRecord[]
  marcaLabel: string
  apresentadoraLabel: string
}) {
  const totals = {
    gmvTotal: sum(rows, 'gmv_total'),
    gmvLives: sum(rows, 'gmv_lives'),
    gmvVideos: sum(rows, 'gmv_videos'),
    lives: sum(rows, 'total_lives'),
    videos: sum(rows, 'total_videos'),
    horas: sum(rows, 'horas_live'),
    pedidos: sum(rows, 'pedidos'),
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wide text-ink-muted">
            <th className="pb-2 pr-4">Dia</th>
            <th className="pb-2 pr-4">Marca</th>
            <th className="pb-2 pr-4">Apresentadora</th>
            <th className="pb-2 pr-4 text-right">GMV total</th>
            <th className="pb-2 pr-4 text-right">GMV live</th>
            <th className="pb-2 pr-4 text-right">GMV vídeo</th>
            <th className="pb-2 pr-4 text-right">Lives</th>
            <th className="pb-2 pr-4 text-right">Vídeos</th>
            <th className="pb-2 pr-4 text-right">Horas live</th>
            <th className="pb-2 pr-4 text-right">GMV/live</th>
            <th className="pb-2 pr-4 text-right">GMV/hora</th>
            <th className="pb-2 pr-4 text-right">Pedidos</th>
            <th className="pb-2 text-right">Ticket</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={asString(row.dia)} className="border-b border-line/50 hover:bg-surface-muted/50">
              <td className="py-2.5 pr-4 font-semibold text-ink">{formatDay(row.dia)}</td>
              <td className="py-2.5 pr-4 text-ink-muted">{marcaLabel}</td>
              <td className="py-2.5 pr-4 text-ink-muted">{apresentadoraLabel}</td>
              <td className="py-2.5 pr-4 text-right font-bold tabular-nums text-ink">{formatMoney(row.gmv_total)}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-ink-muted">{formatMoney(row.gmv_lives)}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-ink-muted">{formatMoney(row.gmv_videos)}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-ink">{asNumber(row.total_lives).toLocaleString('pt-BR')}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-ink-muted">{asNumber(row.total_videos).toLocaleString('pt-BR')}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-ink">{asNumber(row.horas_live).toFixed(1)}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-ink-muted">{formatMoney(row.gmv_por_live)}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-ink-muted">{formatMoney(row.gmv_por_hora)}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-ink">{asNumber(row.pedidos).toLocaleString('pt-BR')}</td>
              <td className="py-2.5 text-right tabular-nums text-ink-muted">{formatMoney(row.ticket_medio)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line bg-surface-muted text-sm font-bold text-ink">
            <td className="py-3 pr-4">Total</td>
            <td className="py-3 pr-4 text-ink-muted">—</td>
            <td className="py-3 pr-4 text-ink-muted">—</td>
            <td className="py-3 pr-4 text-right tabular-nums">{formatMoney(totals.gmvTotal)}</td>
            <td className="py-3 pr-4 text-right tabular-nums">{formatMoney(totals.gmvLives)}</td>
            <td className="py-3 pr-4 text-right tabular-nums">{formatMoney(totals.gmvVideos)}</td>
            <td className="py-3 pr-4 text-right tabular-nums">{totals.lives.toLocaleString('pt-BR')}</td>
            <td className="py-3 pr-4 text-right tabular-nums">{totals.videos.toLocaleString('pt-BR')}</td>
            <td className="py-3 pr-4 text-right tabular-nums">{totals.horas.toFixed(1)}</td>
            <td className="py-3 pr-4 text-right tabular-nums">{formatMoney(totals.lives > 0 ? totals.gmvLives / totals.lives : 0)}</td>
            <td className="py-3 pr-4 text-right tabular-nums">{formatMoney(totals.horas > 0 ? totals.gmvLives / totals.horas : 0)}</td>
            <td className="py-3 pr-4 text-right tabular-nums">{totals.pedidos.toLocaleString('pt-BR')}</td>
            <td className="py-3 text-right tabular-nums">{formatMoney(totals.pedidos > 0 ? totals.gmvTotal / totals.pedidos : 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
