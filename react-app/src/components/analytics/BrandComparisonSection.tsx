import { useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, BarChart3, Minus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/States'
import { formatMoney } from '../../utils/format'
import {
  aggregateBrandComparison,
  brandComparisonReference,
  brandLivesDrilldownUrl,
  brandMetric,
  brandPeriodDiagnostic,
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
  currentPeriod: { from: string; to: string }
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
  const variation = metricVariation(current, previous)
  if (variation.direction === 'unavailable') return <span className="text-xs text-ink-muted">Sem horas</span>
  if (variation.direction === 'missing') return <span className="text-xs text-ink-muted">Sem dado anterior</span>
  if (variation.direction === 'unavailable-base') return <span className="text-xs text-ink-muted">Sem horas anteriores</span>
  if (variation.direction === 'new') return <span className="text-xs text-ink-muted">Base anterior zero</span>
  if (variation.direction === 'flat') return <span className="inline-flex items-center gap-0.5 text-xs text-ink-muted" aria-label="Sem variação em relação ao período anterior"><Minus className="h-3 w-3" aria-hidden="true" />0% · Sem variação</span>
  if (variation.direction !== 'up' && variation.direction !== 'down') return null
  const Icon = variation.direction === 'up' ? ArrowUp : ArrowDown
  const percent = variation.percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return <span className="inline-flex items-center gap-0.5 text-xs text-ink-muted" aria-label={`${percent}% ${variation.direction === 'up' ? 'acima' : 'abaixo'} do período anterior`}><Icon className="h-3 w-3" aria-hidden="true" />{percent}%</span>
}

function diagnosticLabel(current: number | null, variation: ReturnType<typeof metricVariation>, unavailableLabel = 'sem taxa') {
  if (current === null) return unavailableLabel
  if (variation.direction === 'unavailable') return unavailableLabel
  if (variation.direction === 'missing') return 'sem dado anterior'
  if (variation.direction === 'unavailable-base') return 'sem horas anteriores'
  if (variation.direction === 'new') return 'base anterior zero'
  if (variation.direction === 'flat') return '0%'
  if (variation.direction !== 'up' && variation.direction !== 'down') return 'sem dado anterior'
  const sign = variation.direction === 'up' ? '+' : '−'
  return `${sign}${variation.percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

function PeriodBars({ current, previous }: { current: number | null; previous?: number | null }) {
  if (current === null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) return null
  const maximum = Math.max(current, previous)
  if (maximum <= 0) return null
  return <dd aria-hidden="true" className="mt-2 space-y-1">
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${comparisonMetricWidth(current, maximum)}%` }} /></div>
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-[var(--text-muted)]" style={{ width: `${comparisonMetricWidth(previous, maximum)}%` }} /></div>
  </dd>
}

function signedMoney(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatMoney(Math.abs(value))}`
}

function BrandPeriodDiagnostic({ label, current, previous, currentPeriod, previousPeriod, currentPeriodEndsToday, marcaId }: {
  label: string
  current: Pick<BrandComparisonRow, 'gmvLives' | 'horasLive' | 'gmvHora' | 'totalLives'>
  previous?: Pick<BrandComparisonRow, 'gmvLives' | 'horasLive' | 'gmvHora' | 'totalLives'>
  currentPeriod: { from: string; to: string }
  previousPeriod?: { from: string; to: string } | null
  currentPeriodEndsToday: boolean
  marcaId: string | null
}) {
  const diagnostic = brandPeriodDiagnostic(current, previous)
  const baseMessage = diagnostic.base.state === 'no-current-lives'
    ? 'Sem lives no período atual: GMV/h fica indisponível porque não há horas para o denominador.'
    : diagnostic.base.state === 'missing-previous'
      ? 'Sem dado da marca no período anterior. A ausência não foi convertida em zero.'
      : diagnostic.base.state === 'zero-previous-lives'
        ? 'A marca aparece no período anterior, mas sem lives; zero e ausência continuam separados.'
        : diagnostic.base.state === 'small'
          ? `Base pequena: ${diagnostic.base.currentLives} live(s) no atual e ${diagnostic.base.previousLives} no anterior. Uma única live pode mover bastante o percentual.`
          : `${diagnostic.base.currentLives} lives no período atual e ${diagnostic.base.previousLives} no anterior.`
  return (
    <section className="mb-4 rounded-xl border border-line bg-surface-muted/40 px-3 py-3" aria-label={`Diagnóstico do período: ${label}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-ink">Análise do período · {label}</p>
        <p className="text-xs text-ink-muted">Atual versus período anterior de mesma duração</p>
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <p className="rounded-lg border border-line bg-surface px-2.5 py-2 text-ink-muted"><span className="font-semibold text-ink">{currentPeriodEndsToday ? 'Período em andamento.' : 'Período encerrado.'}</span> {currentPeriodEndsToday ? 'Inclui hoje; horas e GMV ainda podem crescer.' : 'Todos os dias do recorte já terminaram.'}</p>
        <p className="rounded-lg border border-line bg-surface px-2.5 py-2 text-ink-muted"><span className="font-semibold text-ink">Base da comparação.</span> {baseMessage}</p>
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-ink-muted">GMV de lives</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-ink">{formatMoney(current.gmvLives)}</dd>
          <dd className="mt-1 text-xs text-ink-muted">Anterior: {previous ? formatMoney(previous.gmvLives) : 'sem base'} · {diagnosticLabel(current.gmvLives, diagnostic.gmvLives, '—')}</dd>
          <PeriodBars current={current.gmvLives} previous={previous?.gmvLives} />
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Horas de live</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-ink">{current.horasLive.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h</dd>
          <dd className="mt-1 text-xs text-ink-muted">Anterior: {previous ? `${previous.horasLive.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h` : 'sem base'} · {diagnosticLabel(current.horasLive, diagnostic.horasLive, '—')}</dd>
          <PeriodBars current={current.horasLive} previous={previous?.horasLive} />
        </div>
        <div>
          <dt className="text-xs text-ink-muted">GMV/h</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-ink">{gmvHora(current.gmvHora)}</dd>
          <dd className="mt-1 text-xs text-ink-muted">Anterior: {previous ? gmvHora(previous.gmvHora) : 'sem base'} · {diagnosticLabel(current.gmvHora, diagnostic.gmvHora)}</dd>
          <PeriodBars current={current.gmvHora} previous={previous?.gmvHora} />
        </div>
      </dl>
      {diagnostic.gmvChange != null && diagnostic.hoursEffect != null && diagnostic.productivityEffect != null ? (
        <div className="mt-3 rounded-lg border border-line bg-surface px-3 py-2.5">
          <p className="text-xs font-semibold text-ink">Como o GMV variou: {signedMoney(diagnostic.gmvChange)}</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">Efeito associado às horas: <span className="font-semibold text-ink">{signedMoney(diagnostic.hoursEffect)}</span> · efeito associado ao GMV/h: <span className="font-semibold text-ink">{signedMoney(diagnostic.productivityEffect)}</span>. A soma fecha a variação; ela descreve os números, sem atribuir causa comercial.</p>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link className="inline-flex min-h-9 items-center rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-surface-muted" to={brandLivesDrilldownUrl(marcaId, currentPeriod)}>Ver lives atuais</Link>
        {previousPeriod ? <Link className="inline-flex min-h-9 items-center rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-surface-muted" to={brandLivesDrilldownUrl(marcaId, previousPeriod)}>Ver lives anteriores</Link> : null}
        <a className="inline-flex min-h-9 items-center rounded-lg px-2 text-xs font-semibold text-ink underline-offset-4 hover:underline" href="#analytics-audience-coverage">Ver cobertura de audiência</a>
      </div>
      {previous ? <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted"><span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-4 rounded-full bg-[var(--primary)]" />Atual</span><span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-4 rounded-full bg-[var(--text-muted)]" />Anterior</span><span>Escala própria em cada métrica.</span></p> : null}
    </section>
  )
}

export function BrandComparisonSection({ rows, marcaId, apresentadoraId, onSelectMarca, onClearMarca, onClearApresentadora, previousRows, currentPeriod, previousPeriod, previousStatus = 'ready', currentPeriodEndsToday = false }: BrandComparisonSectionProps) {
  const [sort, setSort] = useState<BrandComparisonSort>('gmvLives')
  const [diagnosticBrandKey, setDiagnosticBrandKey] = useState<string>('operacao')
  const diagnosticPanel = useRef<HTMLDivElement>(null)
  const brands = useMemo(() => sortBrandComparison(aggregateBrandComparison(rows), sort), [rows, sort])
  const previousByBrand = useMemo(() => new Map(aggregateBrandComparison(previousRows ?? []).map((row) => [row.key, row])), [previousRows])
  const reference = useMemo(() => brandComparisonReference(brands), [brands])
  const previousReference = useMemo(() => previousByBrand.size > 0 ? brandComparisonReference([...previousByBrand.values()]) : undefined, [previousByBrand])
  const diagnosticBrand = marcaId ? brands.find((row) => row.marcaId === marcaId) ?? brands[0] : brands.find((row) => row.key === diagnosticBrandKey)
  const diagnosticCurrent = diagnosticBrand ?? { ...reference, totalLives: reference.lives }
  const diagnosticPrevious = diagnosticBrand
    ? previousByBrand.get(diagnosticBrand.key)
    : previousReference ? { ...previousReference, totalLives: previousReference.lives } : undefined
  const diagnosticLabelName = diagnosticBrand?.marcaNome ?? 'Operação'
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
          {previousStatus === 'ready' && previousPeriod ? <button type="button" aria-label={`Analisar ${row.marcaNome}`} className="mt-1 flex min-h-9 items-center rounded-lg border border-line px-2 text-xs font-semibold text-ink hover:bg-surface-muted" onClick={() => { setDiagnosticBrandKey(row.key); requestAnimationFrame(() => diagnosticPanel.current?.focus()) }}>Analisar</button> : null}
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
  ], [maximum, onSelectMarca, previousByBrand, previousPeriod, previousStatus, sort])

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
              <div><p className="text-xs text-ink-muted">{marcaId ? 'GMV/h da marca' : 'GMV/h da operação'}</p><p className="mt-0.5 text-2xl font-semibold leading-tight tabular-nums text-ink">{gmvHora(reference.gmvHora)}</p><p className="mt-0.5 text-xs text-ink-muted">GMV de lives ÷ horas no ar</p></div>
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
            <p className="mb-3 text-xs text-ink-muted">Escala relativa ao maior {SORT_OPTIONS.find((option) => option.key === sort)?.label.toLowerCase()}: <span className="font-semibold text-ink">{metricLabel(maximum, sort)}</span>{previousPeriod ? ` · variações por marca em relação a ${formatCalendarDate(previousPeriod.from)}–${formatCalendarDate(previousPeriod.to)}` : ''}{currentPeriodEndsToday ? ' · período atual inclui o dia em andamento' : ''}</p>
            {previousStatus === 'ready' && previousPeriod ? <div ref={diagnosticPanel} tabIndex={-1} className="rounded-xl focus:outline-2 focus:outline-offset-4 focus:outline-[var(--text-primary)]">
              {diagnosticBrand && !marcaId ? <button type="button" onClick={() => setDiagnosticBrandKey('operacao')} className="mb-2 min-h-9 rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-surface-muted">Ver operação completa</button> : null}
              <BrandPeriodDiagnostic label={diagnosticLabelName} current={diagnosticCurrent} previous={diagnosticPrevious} currentPeriod={currentPeriod} previousPeriod={previousPeriod} currentPeriodEndsToday={currentPeriodEndsToday} marcaId={diagnosticBrand?.marcaId ?? null} />
              <p className="mb-3 text-xs leading-5 text-ink-muted">Leia as três métricas juntas: o GMV varia com o tempo no ar e com o valor vendido por hora. Esses números descrevem a mudança; não determinam sua causa.</p>
            </div> : null}
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
