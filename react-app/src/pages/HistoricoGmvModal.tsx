import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getHistoricoGmv } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asString, formatDate, formatMoney } from '../utils/format'
import { Button } from '../components/ui/Button'
import { ErrorState, EmptyState, LoadingState } from '../components/ui/States'
import type { JsonRecord } from '../types/models'

interface HistoricoGmvModalProps {
  liveId: string | null
  onClose: () => void
}

export function HistoricoGmvModal({ liveId, onClose }: HistoricoGmvModalProps) {
  const query = useQuery({
    queryKey: ['historico-gmv', liveId],
    queryFn: () => getHistoricoGmv(liveId!),
    enabled: Boolean(liveId),
  })

  if (!liveId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-bold text-ink">Histórico de Revisões de GMV</h2>
          <Button
            variant="ghost"
            icon={X}
            onClick={onClose}
            className="h-10 w-10"
          />
        </div>

        <div className="p-6">
          {query.isLoading ? (
            <LoadingState label="Carregando histórico..." />
          ) : query.isError ? (
            <ErrorState
              message={extractErrorMessage(query.error)}
              onRetry={() => void query.refetch()}
            />
          ) : (
            <div>
              {(!query.data || query.data.length === 0) ? (
                <EmptyState
                  title="Nenhuma revisão encontrada"
                  description="Esta live não possui histórico de revisões de GMV."
                />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-line bg-surface scrollbar-thin">
                  <table className="min-w-full divide-y divide-line text-left text-sm">
                    <thead className="bg-surface-muted/70 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-3.5">Data/Hora</th>
                        <th className="whitespace-nowrap px-4 py-3.5">Campo</th>
                        <th className="text-right whitespace-nowrap px-4 py-3.5">Valor Anterior</th>
                        <th className="text-right whitespace-nowrap px-4 py-3.5">Valor Novo</th>
                        <th className="whitespace-nowrap px-4 py-3.5">Alterado Por</th>
                        <th className="whitespace-nowrap px-4 py-3.5">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {query.data.map((item: JsonRecord, index: number) => (
                        <tr key={index} className="transition hover:bg-surface-muted/70">
                          <td className="px-4 py-4 text-ink">
                            {formatDate(asString(item.revisado_em ?? item.created_at, ''))}
                          </td>
                          <td className="px-4 py-4 text-ink">
                            {asString(item.campo, '—')}
                          </td>
                          <td className="px-4 py-4 text-right text-ink-muted">
                            {asString(item.valor_anterior, '—')}
                          </td>
                          <td className="px-4 py-4 text-right font-semibold text-ink">
                            {asString(item.valor_novo, '—')}
                          </td>
                          <td className="px-4 py-4 text-ink">
                            {asString(item.alterado_por ?? item.usuario_nome, '—')}
                          </td>
                          <td className="px-4 py-4 text-ink-muted">
                            {asString(item.motivo, '—')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
