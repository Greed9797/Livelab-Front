import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, BarChart3, Minus, X } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/States'
import { formatMoney } from '../../utils/format'
import {
  aggregateBrandComparison,
  brandComparisonReference,
  brandMetric,
  comparisonMetricMaximum,
  comparisonMetricWidth,
  formatCalendarDate,
  metricVariation,
  sortBrandComparison,
  type BrandComparisonRow,
  type BrandComparisonSort,
} from '../../utils/brandComparison'
import type { JsonRecord, TableColumn } from '../../types/models'

interface BrandComparisonSectionProps {
  rows: JsonRecord[]
  marcaId: string
  apresentadoraId: string
  onSelectMarca: (marcaId: string) => void
  onClearMarca: () => void
  onClearApresentadora: () => void
  previousRows?: JsonRecord[]
  previousPeriod?: { from: string; to: string } | null
  previousStatus?: 'loading' | 'error' | 'ready'
  currentPeriodEndsToday?: boolean
}

const SORT_OPTIONS: { key: BrandComparisonSort; label: string }[] = [
  { key: 'gmvLives', label: 'GMV lives' },
  { key: 'gmvTotal', label: 'GMV total' },
  { key: 'gmvHora', label: 'GMV/h' },
]

function gmvHora(value: number | null) {
  return value === null ? '—' : `${formatMoney(value)}/h`
}

function metricLabel(value: number | null, sort: BrandComparisonSort) {
  return sort === 'gmvHora' ? gmvHora(value) : formatMoney(value ?? 0)
}

function Variation({ current, previous, enabled }: { current: number | null; previous: number | null | undefined; enabled: boolean }) {
  if (!enabled) return null
  if (current === null) return <span className="text-xs text-ink-muted">Indisponível</span>
  const variation = metricVariation(current, previous)
  if (variation.direction === 'none') return <span className="text-xs text-ink-muted">Sem base</span>
  if (variation.direction === 'new') return <span className="text-xs text-ink-muted">Novo valor</span>
  if (variation.direction === 'flat') return <span className="inline-flex items-center gap-0.5 text-xs text-ink-muted" aria-label="Sem variação em relação ao período anterior"><Minus className="h-3 w-3" aria-hidden="true" />0% · Sem variação</span>
  if (variation.direction !== 'up' && variation.direction !== 'down') return null
  const Icon = variation.direction === 'up' ? ArrowUp : ArrowDown
  const percent = variation.percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return <span className="inline-flex items-center gap-0.5 text-xs text-ink-muted" aria-label={`${percent}% ${variation.direction === 'up' ? 'acima' : 'abaixo'} do período anterior`}><Icon className="h-3 w-3" aria-hidden="true" />{percent}%</span>
}

export function BrandComparisonSection({ rows, marcaId, apresentadoraId, onSelectMarca, onClearMarca, onClearApresentadora, previousRows, previousPeriod, previousStatus = 'ready', currentPeriodEndsToday = false }: BrandComparisonSectionProps) {
  const [sort, setSort] = useState<BrandComparisonSort>('gmvLives')
  const brands = useMemo(() => sortBrandComparison(aggregateBrandComparison(rows), sort), [rows, sort])
  const previousByBrand = useMemo(() => new Map(aggregateBrandComparison(previousRows ?? []).map((row) => [row.key, row])), [previousRows])
  const reference = useMemo(() => brandComparisonReference(brands), [brands])
  const maximum = useMemo(() => comparisonMetricMaximum(brands, sort), [brands, sort])
  const filteredBrandName = brands[0]?.marcaNome ?? 'marca selecionada'
  const columns = useMemo<TableColumn<BrandComparisonRow>[]>(() => [
    {
      key: 'marcaNome', header: 'Marca', render: (row) => (
        <div className="w-28 sm:w-auto sm:min-w-36">
          {row.marcaId ? (
            <button type="button" className="rounded text-left text-sm font-semibold text-ink underline-offset-4 hover:underline" onClick={() => onSelectMarca(row.marcaId!)}>
              {row.marcaNome}
            </button>
          ) : <p className="font-semibold text-ink">{row.marcaNome}</p>}
          {row.gmvVideos > 0 ? <p className="mt-0.5 text-xs text-ink-muted">Vídeos: {formatMoney(row.gmvVideos)}</p> : null}
        </div>
      ),
    },
    {
      key: 'gmvLives', header: 'GMV lives', align: 'right', render: (row) => {
        const value = brandMetric(row, sort)
        const previous = previousByBrand.get(row.key)
        return <div className="min-w-28 text-right">
          <div className="font-semibold tabular-nums text-ink">{formatMoney(row.gmvLives)}</div>
          {sort === 'gmvLives' ? <><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${comparisonMetricWidth(value, maximum)}%` }} /></div><div className="mt-1"><Variation enabled={previousStatus === 'ready'} current={value} previous={previous ? brandMetric(previous, sort) : undefined} /></div></> : null}
        </div>
      },
    },
    {
      key: 'gmvTotal', header: 'GMV total', align: 'right', render: (row) => {
        const value = brandMetric(row, sort)
        const previous = previousByBrand.get(row.key)
        return <div className="min-w-28 text-right">
          <div className="font-semibold tabular-nums text-ink">{formatMoney(row.gmvTotal)}</div>
          {sort === 'gmvTotal' ? <><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${comparisonMetricWidth(value, maximum)}%` }} /></div><div className="mt-1"><Variation enabled={previousStatus === 'ready'} current={value} previous={previous ? brandMetric(previous, sort) : undefined} /></div></> : null}
        </div>
      },
    },
    {
      key: 'gmvHora', header: 'GMV/h', align: 'right', render: (row) => {
        const value = brandMetric(row, sort)
        const previous = previousByBrand.get(row.key)
        return <div className="min-w-28 text-right">
          <div className="font-semibold tabular-nums text-ink">{gmvHora(row.gmvHora)}</div>
          {sort === 'gmvHora' ? <><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${comparisonMetricWidth(value, maximum)}%` }} /></div><div className="mt-1"><Variation enabled={previousStatus === 'ready'} current={value} previous={previous ? brandMetric(previous, sort) : undefined} /></div></> : null}
        </div>
      },
    },
    { key: 'horasLive', header: 'Horas no ar', align: 'right', render: (row) => `${row.horasLive.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h` },
    { key: 'pedidos', header: 'Pedidos', align: 'right', render: (row) => row.pedidos.toLocaleString('pt-BR') },
    { key: 'totalLives', header: 'Lives', align: 'right', render: (row) => row.totalLives.toLocaleString('pt-BR') },
  ], [maximum, onSelectMarca, previousByBrand, previousStatus, sort])

  if (apresentadoraId) {
    return (
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">A comparação por marca fica disponível sem filtro de apresentadora: as horas desse recorte seguem o rateio da live e não representam horas operacionais da marca.</p>
          <Button type="button" variant="secondary" onClick={onClearApresentadora}>Comparar marcas</Button>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[var(--primary)]" />
              <h2 className="text-base font-bold text-ink">Comparativo de marcas</h2>
            </div>
            <p className="mt-1 text-xs text-ink-muted">Mesmo período do filtro. GMV/h considera apenas GMV de lives ÷ horas de live; vídeos aparecem separados.</p>
          </div>
          {marcaId ? <Button type="button" variant="secondary" icon={X} onClick={onClearMarca}>Comparar todas</Button> : null}
        </div>
        {marcaId ? <p className="mt-3 text-sm text-ink-muted">Exibindo <span className="font-semibold text-ink">{filteredBrandName}</span>. Limpe o filtro para comparar todas as marcas no mesmo período.</p> : null}
      </CardHeader>
      <CardBody>
        {brands.length === 0 ? (
          <EmptyState title="Sem atividade de marcas no período" description="Não há lives encerradas ou vendas atribuídas para comparar neste recorte." />
        ) : (
          <>
            <div className="mb-4 grid gap-3 rounded-xl border border-line bg-surface-muted/40 px-3 py-3 text-sm sm:grid-cols-3">
              <div><p className="text-xs text-ink-muted">GMV/h da operação</p><p className="mt-0.5 text-2xl font-semibold leading-tight tabular-nums text-ink">{gmvHora(reference.gmvHora)}</p><p className="mt-0.5 text-xs text-ink-muted">GMV de lives ÷ horas no ar</p></div>
              <div><p className="text-xs text-ink-muted">GMV de lives</p><p className="mt-0.5 text-xl font-semibold leading-tight tabular-nums text-ink">{formatMoney(reference.gmvLives)}</p></div>
              <div><p className="text-xs text-ink-muted">Contexto</p><p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{reference.marcas} marcas · {reference.lives} lives · {reference.horasLive.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h</p></div>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Ordenar comparação de marcas">
              <ArrowUpDown className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              {SORT_OPTIONS.map((option) => (
                <Button
                  key={option.key}
                  type="button"
                  variant={sort === option.key ? 'primary' : 'secondary'}
                  className="h-8 px-3 text-xs"
                  aria-pressed={sort === option.key}
                  onClick={() => setSort(option.key)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <p className="mb-3 text-xs text-ink-muted">Escala relativa ao maior {SORT_OPTIONS.find((option) => option.key === sort)?.label.toLowerCase()}: <span className="font-semibold text-ink">{metricLabel(maximum, sort)}</span>{previousPeriod ? ` · variação em relação a ${formatCalendarDate(previousPeriod.from)}–${formatCalendarDate(previousPeriod.to)}` : ''}{currentPeriodEndsToday ? ' · período atual inclui o dia em andamento' : ''}</p>
            {previousStatus === 'loading' ? <p className="mb-3 text-xs text-ink-muted">Carregando a comparação com o intervalo anterior. Os números deste período continuam disponíveis.</p> : null}
            {previousStatus === 'error' ? <p className="mb-3 text-xs text-ink-muted">A comparação com o intervalo anterior está indisponível. Os números deste período continuam disponíveis.</p> : null}
            <p className="mb-2 text-xs text-ink-muted sm:hidden">Deslize a tabela para ver todas as métricas.</p>
            <DataTable
              columns={[columns[0], ...columns.filter((column) => column.key === sort), ...columns.filter((column) => column.key !== 'marcaNome' && column.key !== sort)]}
              data={brands}
              rowKey={(row) => row.key}
              footer={<p className="text-xs text-ink-muted">Selecione uma marca para abrir o relatório e Audiência e interação no mesmo período. “—” em GMV/h indica que não houve horas de live para formar o denominador.</p>}
            />
          </>
        )}
      </CardBody>
    </Card>
  )
}
