import { useMemo, useState } from 'react'
import { ArrowUpDown, BarChart3, X } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/States'
import { formatMoney } from '../../utils/format'
import { aggregateBrandComparison, sortBrandComparison, type BrandComparisonRow, type BrandComparisonSort } from '../../utils/brandComparison'
import type { JsonRecord, TableColumn } from '../../types/models'

interface BrandComparisonSectionProps {
  rows: JsonRecord[]
  marcaId: string
  apresentadoraId: string
  onSelectMarca: (marcaId: string) => void
  onClearMarca: () => void
  onClearApresentadora: () => void
}

const SORT_OPTIONS: { key: BrandComparisonSort; label: string }[] = [
  { key: 'gmvLives', label: 'GMV lives' },
  { key: 'gmvTotal', label: 'GMV total' },
  { key: 'gmvHora', label: 'GMV/h' },
]

function gmvHora(value: number | null) {
  return value === null ? '—' : `${formatMoney(value)}/h`
}

export function BrandComparisonSection({ rows, marcaId, apresentadoraId, onSelectMarca, onClearMarca, onClearApresentadora }: BrandComparisonSectionProps) {
  const [sort, setSort] = useState<BrandComparisonSort>('gmvLives')
  const brands = useMemo(() => sortBrandComparison(aggregateBrandComparison(rows), sort), [rows, sort])
  const filteredBrandName = brands[0]?.marcaNome ?? 'marca selecionada'
  const columns = useMemo<TableColumn<BrandComparisonRow>[]>(() => [
    {
      key: 'marcaNome', header: 'Marca', render: (row) => (
        <div className="min-w-36">
          {row.marcaId ? (
            <Button type="button" variant="ghost" className="h-auto min-h-0 px-0 py-0 font-semibold" onClick={() => onSelectMarca(row.marcaId!)}>
              {row.marcaNome}
            </Button>
          ) : <p className="font-semibold text-ink">{row.marcaNome}</p>}
          {row.gmvVideos > 0 ? <p className="mt-0.5 text-xs text-ink-muted">Vídeos: {formatMoney(row.gmvVideos)}</p> : null}
        </div>
      ),
    },
    { key: 'gmvLives', header: 'GMV lives', align: 'right', render: (row) => formatMoney(row.gmvLives) },
    { key: 'gmvTotal', header: 'GMV total', align: 'right', render: (row) => formatMoney(row.gmvTotal) },
    { key: 'gmvHora', header: 'GMV/h', align: 'right', render: (row) => gmvHora(row.gmvHora) },
    { key: 'horasLive', header: 'Horas no ar', align: 'right', render: (row) => `${row.horasLive.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h` },
    { key: 'pedidos', header: 'Pedidos', align: 'right', render: (row) => row.pedidos.toLocaleString('pt-BR') },
    { key: 'totalLives', header: 'Lives', align: 'right', render: (row) => row.totalLives.toLocaleString('pt-BR') },
  ], [onSelectMarca])

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
            <p className="mb-2 text-xs text-ink-muted sm:hidden">Deslize a tabela para ver todas as métricas.</p>
            <DataTable
              columns={columns}
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
