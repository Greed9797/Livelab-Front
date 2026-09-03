import { useQuery } from '@tanstack/react-query'
import { getHistoricoGmv } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asString, formatDate } from '../utils/format'
import { Modal } from '../components/ui/Modal'
import { DataTable } from '../components/ui/DataTable'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'
import { isBot } from '../components/ui/BotBadge'

interface HistoricoGmvModalProps {
  liveId: string | null
  onClose: () => void
}

export function HistoricoGmvModal({ liveId, onClose }: HistoricoGmvModalProps) {
  const query = useQuery({
    queryKey: QK.historicoGmv(liveId!),
    queryFn: () => getHistoricoGmv(liveId!),
    enabled: Boolean(liveId),
  })

  const rows = query.data ?? []

  return (
    <Modal
      open={Boolean(liveId)}
      title="Histórico de revisões de GMV"
      subtitle="Toda alteração de GMV/pedidos desta live, com autor e motivo."
      size="lg"
      onClose={onClose}
    >
      {query.isLoading ? (
        <LoadingState label="Carregando histórico..." />
      ) : query.isError ? (
        <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhuma revisão encontrada" description="Esta live não possui histórico de revisões de GMV." />
      ) : (
        <DataTable<JsonRecord>
          data={rows}
          columns={[
            { key: 'revisado_em', header: 'Data/Hora', render: (item) => formatDate(asString(item.revisado_em ?? item.created_at, '')) },
            { key: 'campo', header: 'Campo', render: (item) => asString(item.campo, '—') },
            { key: 'valor_anterior', header: 'Valor anterior', align: 'right', render: (item) => <span className="text-ink-muted">{asString(item.valor_anterior, '—')}</span> },
            { key: 'valor_novo', header: 'Valor novo', align: 'right', render: (item) => <span className="font-semibold text-ink">{asString(item.valor_novo, '—')}</span> },
            { key: 'alterado_por', header: 'Alterado por', render: (item) => (isBot(item.origem_dados) ? 'BOT' : asString(item.alterado_por_nome ?? item.alterado_por ?? item.usuario_nome, '—')) },
            { key: 'motivo', header: 'Motivo', render: (item) => asString(item.motivo, '—') },
          ]}
        />
      )}
    </Modal>
  )
}
