import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { useToast } from '../ui/Toast'
import { getClienteRelatorioBlob, getClienteSessoes } from '../../services/domain'
import { extractErrorMessage } from '../../services/api'
import { QK } from '../../services/query-keys'
import { asArray, asNumber, asString, formatMoney, getRecord } from '../../utils/format'
import { formatMoneyOrNI, operacionalStatusTone } from '../../utils/operacional'
import type { JsonRecord, Period, TableColumn } from '../../types/models'

const PAGE_SIZE = 10

interface Props {
  period: Period
}

function statusOperacionalLabel(status: unknown): string {
  switch (status) {
    case 'ok':
      return 'OK'
    case 'atencao':
      return 'Atenção'
    case 'critico':
      return 'Crítico'
    default:
      return asString(status, '—')
  }
}

function formatHorasOrNI(value: unknown): string {
  if (value === null || value === undefined) return 'não informado'
  const n = asNumber(value)
  return `${n.toFixed(1)}h`
}

function formatNumberOrNI(value: unknown): string {
  if (value === null || value === undefined) return 'não informado'
  return asNumber(value).toLocaleString('pt-BR')
}

function formatTime(iso: unknown): string {
  const raw = asString(iso, '')
  const m = raw.match(/T(\d{2}:\d{2})/)
  return m ? m[1] : asString(iso, '—')
}

export function SessoesLiveTable({ period }: Props) {
  const toast = useToast()
  const [offset, setOffset] = useState(0)
  const [allSessoes, setAllSessoes] = useState<JsonRecord[]>([])
  const [pdfLoading, setPdfLoading] = useState(false)

  const query = useQuery({
    queryKey: QK.clienteSessoes(period, offset),
    queryFn: async () => {
      const result = await getClienteSessoes(period, { limit: PAGE_SIZE, offset })
      return result
    },
    placeholderData: (prev) => prev,
  })

  const raw = getRecord(query.data)
  const total = asNumber(raw.total, 0)
  const newSessoes = asArray<JsonRecord>(raw.sessoes)

  // Accumulate pages: merge new page into accumulated list via useEffect
  useEffect(() => {
    if (!query.isSuccess) return
    if (offset === 0) {
      setAllSessoes(newSessoes)
      return
    }
    setAllSessoes((prev) => {
      const existingIds = new Set(prev.map((s) => asString(s.live_id, '')))
      const fresh = newSessoes.filter((s) => !existingIds.has(asString(s.live_id, '')))
      if (fresh.length === 0) return prev
      return [...prev, ...fresh]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isSuccess, query.dataUpdatedAt, offset])

  const sessoes = allSessoes
  const hasMore = total > 0 && sessoes.length < total

  const columns: TableColumn<JsonRecord>[] = [
    {
      key: 'data',
      header: 'Data',
      render: (item) => asString(item.data, '—'),
    },
    {
      key: 'inicio',
      header: 'Início',
      render: (item) => formatTime(item.inicio),
    },
    {
      key: 'fim',
      header: 'Fim',
      render: (item) => formatTime(item.fim),
    },
    {
      key: 'apresentadora',
      header: 'Apresentadora',
      render: (item) => asString(item.apresentadora, 'não informado'),
    },
    {
      key: 'horas',
      header: 'Horas',
      align: 'right',
      render: (item) => formatHorasOrNI(item.horas),
    },
    {
      key: 'gmv',
      header: 'GMV',
      align: 'right',
      render: (item) => formatMoneyOrNI(item.gmv !== undefined ? item.gmv : null),
    },
    {
      key: 'pedidos',
      header: 'Pedidos',
      align: 'right',
      render: (item) => formatNumberOrNI(item.pedidos !== undefined ? item.pedidos : null),
    },
    {
      key: 'gmv_por_hora',
      header: 'GMV/h',
      align: 'right',
      render: (item) =>
        item.gmv_por_hora !== null && item.gmv_por_hora !== undefined
          ? formatMoney(item.gmv_por_hora)
          : 'não informado',
    },
    {
      key: 'comissao_livelab',
      header: 'Com. Livelab',
      align: 'right',
      render: (item) => formatMoneyOrNI(item.comissao_livelab !== undefined ? item.comissao_livelab : null),
    },
    {
      key: 'comissao_apresentadora',
      header: 'Com. Apresent.',
      align: 'right',
      render: (item) => formatMoneyOrNI(item.comissao_apresentadora !== undefined ? item.comissao_apresentadora : null),
    },
    {
      key: 'status_operacional',
      header: 'Status',
      render: (item) => {
        const s = item.status_operacional
        if (!s) return <span className="text-ink-muted">—</span>
        return (
          <Badge tone={operacionalStatusTone(s)}>
            {statusOperacionalLabel(s)}
          </Badge>
        )
      },
    },
  ]

  async function handleExportPdf() {
    setPdfLoading(true)
    try {
      const blob = await getClienteRelatorioBlob(period)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const mm = String(period.mes).padStart(2, '0')
      a.href = url
      a.download = `relatorio-operacional-${period.ano}-${mm}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.push('Relatório exportado com sucesso.', 'success')
    } catch (err) {
      toast.push(extractErrorMessage(err), 'error')
    } finally {
      setPdfLoading(false)
    }
  }

  function handleLoadMore() {
    setOffset((prev) => prev + PAGE_SIZE)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-ink">Sessões de live</p>
            {total > 0 ? (
              <p className="mt-0.5 text-xs text-ink-muted">
                {sessoes.length} de {total} sessão{total !== 1 ? 'ões' : ''}
              </p>
            ) : null}
          </div>
          <Button
            variant="secondary"
            icon={pdfLoading ? undefined : Download}
            isLoading={pdfLoading}
            onClick={() => void handleExportPdf()}
          >
            Exportar PDF
          </Button>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {query.isLoading && offset === 0 ? (
          <div className="p-6">
            <LoadingState label="Carregando sessões" />
          </div>
        ) : query.isError && offset === 0 ? (
          <div className="p-6">
            <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
          </div>
        ) : sessoes.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Nenhuma sessão no período" description="As lives realizadas aparecerão aqui após processamento." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable<JsonRecord>
              data={sessoes}
              columns={columns}
              rowKey={(item) => asString(item.live_id, String(Math.random()))}
            />
            {hasMore ? (
              <div className="border-t border-line p-4 text-center">
                <Button
                  variant="secondary"
                  onClick={handleLoadMore}
                  isLoading={query.isFetching}
                >
                  Carregar mais
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
