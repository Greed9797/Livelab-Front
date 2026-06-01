import { useQuery } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { LoadingState, ErrorState } from '../ui/States'
import { getAuditLog } from '../../services/domain'
import { extractErrorMessage } from '../../services/api'
import { asString } from '../../utils/format'
import type { JsonRecord } from '../../types/models'

interface Props {
  open: boolean
  onClose: () => void
  entityType: string
  entityId: string
  titulo?: string
}

function formatDate(value: unknown): string {
  const s = asString(value, '')
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ActionLabel({ action }: { action: string }) {
  const parts = action.split('.')
  const verb = parts[parts.length - 1] ?? action
  const verbMap: Record<string, string> = {
    create: 'Criou',
    update: 'Atualizou',
    delete: 'Excluiu',
    read: 'Consultou',
    toggle: 'Alterou status',
  }
  return <span className="font-semibold text-ink">{verbMap[verb] ?? verb}</span>
}

function MetadataView({ metadata }: { metadata: unknown }) {
  if (!metadata || (typeof metadata === 'object' && Object.keys(metadata as object).length === 0)) {
    return <span className="text-ink-muted">—</span>
  }
  return (
    <pre className="mt-1 max-h-32 overflow-auto rounded-xl bg-surface-muted px-3 py-2 text-[10px] leading-relaxed text-ink-muted whitespace-pre-wrap break-all">
      {JSON.stringify(metadata, null, 2)}
    </pre>
  )
}

export function HistoricoAuditModal({ open, onClose, entityType, entityId, titulo }: Props) {
  const query = useQuery({
    queryKey: ['audit-log', entityType, entityId],
    queryFn: () => getAuditLog({ entity_type: entityType, entity_id: entityId, limit: 50 }),
    enabled: open && Boolean(entityId),
  })

  const itens = (query.data?.itens ?? []) as JsonRecord[]

  return (
    <Modal
      open={open}
      title={titulo ?? 'Histórico de alterações'}
      subtitle={`${entityType} · ${entityId}`}
      onClose={onClose}
      size="lg"
    >
      {query.isLoading ? (
        <LoadingState label="Carregando histórico..." />
      ) : query.isError ? (
        <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : itens.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">Nenhum evento registrado.</p>
      ) : (
        <div className="divide-y divide-line">
          {itens.map((item) => (
            <div key={asString(item.id)} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <ActionLabel action={asString(item.action)} />
                <span className="text-xs text-ink-muted">{asString(item.action)}</span>
                <span className="ml-auto text-xs text-ink-muted">{formatDate(item.criado_em)}</span>
              </div>
              <p className="mt-0.5 text-xs text-ink-muted">
                Por{' '}
                <span className="font-medium text-ink">
                  {asString(item.autor_nome ?? item.autor_email, 'Sistema')}
                </span>
                {item.autor_papel ? ` (${asString(item.autor_papel)})` : ''}
              </p>
              <MetadataView metadata={item.metadata} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
