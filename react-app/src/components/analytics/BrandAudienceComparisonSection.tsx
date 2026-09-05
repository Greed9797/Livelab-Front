import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpDown } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { ErrorState, LoadingState } from '../ui/States'
import { Button } from '../ui/Button'
import { getBrandAudienceAnalytics } from '../../services/domain'
import { extractErrorMessage } from '../../services/api'
import { asArray, getRecord } from '../../utils/format'
import { buildBrandAudienceRows, coveragePercent, sortBrandAudienceRows, type BrandAudienceRow } from '../../utils/brandAudience'
import type { JsonRecord, TableColumn } from '../../types/models'

const count = (value: number | null) => value == null ? '—' : value.toLocaleString('pt-BR')
const metric = (value: number | null, coverage: number, total: number) => {
  const percent = Math.round(coveragePercent(coverage, total))
  const coverageText = `${coverage} de ${total} lives com registro (${percent}%)`
  return <div className="min-w-28 text-right"><div className="font-semibold tabular-nums text-ink">{count(value)}</div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-label="Cobertura de registros" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={coverageText}><div className="h-full rounded-full bg-ink-muted" style={{ width: `${percent}%` }} /></div><div className="mt-1 text-xs font-normal text-ink-muted">{coverage}/{total} lives com registro</div></div>
}
const columns: TableColumn<BrandAudienceRow>[] = [
  { key: 'marcaNome', header: 'Marca' },
  { key: 'impressoesLive', header: 'Impressões live', align: 'right', render: (row) => metric(row.impressoesLive, row.livesComImpressoesRegistradas, row.livesTotal) },
  { key: 'visualizacoesManuais', header: 'Visualizações registradas', align: 'right', render: (row) => metric(row.visualizacoesManuais, row.livesComVisualizacoesRegistradas, row.livesTotal) },
  { key: 'impressoesProduto', header: 'Impressões produto', align: 'right', render: (row) => metric(row.impressoesProduto, row.livesComImpressoesProdutoRegistradas, row.livesTotal) },
  { key: 'cliquesProduto', header: 'Cliques produto', align: 'right', render: (row) => metric(row.cliquesProduto, row.livesComCliquesProdutoRegistrados, row.livesTotal) },
  { key: 'livesTotal', header: 'Lives', align: 'right' },
]

export function BrandAudienceComparisonSection({ from, to, marcaId }: { from: string; to: string; marcaId: string }) {
  const [sort, setSort] = useState<'impressoesLive' | 'visualizacoesManuais' | 'cliquesProduto'>('impressoesLive')
  const query = useQuery({
    queryKey: ['audiencia-marcas', from, to, marcaId],
    queryFn: () => getBrandAudienceAnalytics({ from, to, marca_id: marcaId || undefined }),
    staleTime: 60_000,
  })
  const rows = useMemo(() => sortBrandAudienceRows(buildBrandAudienceRows(asArray<JsonRecord>(getRecord(query.data).rows)), sort), [query.data, sort])
  const apiIsNotFound = (query.error as { response?: { status?: number } } | null)?.response?.status === 404
  return <Card id="analytics-audience-coverage">
    <CardHeader>
      <h2 className="text-base font-semibold text-ink">Audiência e cobertura por marca</h2>
      <p className="mt-1 text-sm text-ink-muted">Mesmo período do filtro; base: lives encerradas com pelo menos 5 minutos. Impressões contam exibições, não pessoas únicas.</p>
    </CardHeader>
    <CardBody>
      {query.isLoading ? <LoadingState /> : query.isError ? (
        <ErrorState message={apiIsNotFound ? 'Comparação de audiência indisponível nesta versão da API.' : extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : <>
        <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Ordenar audiência por marca">
          <ArrowUpDown className="h-4 w-4 text-ink-muted" aria-hidden="true" />
          {[['impressoesLive', 'Impressões'], ['visualizacoesManuais', 'Visualizações'], ['cliquesProduto', 'Cliques']].map(([key, label]) => (
            <Button key={key} type="button" variant={sort === key ? 'primary' : 'secondary'} aria-pressed={sort === key} className="h-8 px-3 text-xs" onClick={() => setSort(key as typeof sort)}>{label}</Button>
          ))}
        </div>
        <p className="mb-3 text-xs text-ink-muted">Barras mostram cobertura de registros, não volume.</p>
        {rows.length > 0 ? <p className="mb-2 text-xs text-ink-muted sm:hidden">Deslize a tabela para ver todas as métricas.</p> : null}
        <DataTable columns={columns} data={rows} rowKey={(row) => row.key} footer={<p className="text-xs text-ink-muted">Cada valor traz sua própria contagem de lives com campo registrado. Importações antigas podem gravar zero quando a coluna não existia no arquivo; confira relatórios zerados antes de comparar.</p>} />
      </>}
    </CardBody>
  </Card>
}
