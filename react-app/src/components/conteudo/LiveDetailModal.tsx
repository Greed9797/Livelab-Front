import { Edit2, Trash2, Users } from 'lucide-react'
import type { UseMutationResult } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { publicationStatusLabel } from '../../pages/conteudo-helpers'
import { asNumber, asString, formatDate, formatMoney } from '../../utils/format'
import { officialLiveGmv } from '../../utils/live-gmv'
import { extractErrorMessage } from '../../services/api'
import { calcDuration, fmtTime } from './live-helpers'
import type { JsonRecord } from '../../types/models'

function buildReport(live: JsonRecord): string {
  const nome = asString(live.marca_nome ?? live.cliente_nome, '')
  const inicio = live.iniciado_em ? new Date(live.iniciado_em as string) : null
  if (!inicio || Number.isNaN(inicio.getTime())) return ''
  const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(
    inicio,
  )
  const hFim = fmtTime(live.encerrado_em)
  const { text: duracao } = calcDuration(live)
  const lines = [
    `📊 Relatório de Live${nome ? ` — ${nome}` : ''}`,
    '',
    `📅 Data: ${data}`,
    hFim !== '—'
      ? `⏰ Horário: ${fmtTime(live.iniciado_em)} às ${hFim}`
      : `⏰ Horário: ${fmtTime(live.iniciado_em)}`,
    duracao !== '—' ? `⏱️ Duração: ${duracao}` : null,
    '',
    `💰 GMV: ${formatMoney(officialLiveGmv(live))}`,
    `🛒 Pedidos: ${asNumber(live.manual_orders ?? live.final_orders_count).toLocaleString('pt-BR')}`,
  ]
  return lines.filter(Boolean).join('\n')
}

interface LiveDetailModalProps {
  open: boolean
  live: JsonRecord | null
  canWrite: boolean
  reportCopied: boolean
  onClose: () => void
  onCopyReport: (report: string) => void
  onEdit: (live: JsonRecord) => void
  onSplitApresentadoras: (live: JsonRecord) => void
  onDelete: (live: JsonRecord) => void
  deleteLiveMutation: UseMutationResult<unknown, Error, string>
}

export function LiveDetailModal({
  open,
  live,
  canWrite,
  reportCopied,
  onClose,
  onCopyReport,
  onEdit,
  onSplitApresentadoras,
  onDelete,
  deleteLiveMutation,
}: LiveDetailModalProps) {
  return (
    <Modal
      open={open && !!live}
      title="Live realizada"
      subtitle={
        live
          ? `${asString(live.marca_nome ?? live.cliente_nome, 'Sem marca')} · Cabine ${asString(live.cabine_numero)}`
          : undefined
      }
      onClose={onClose}
      size="md"
    >
      {live ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {(
              [
                [
                  'Data / Horário',
                  `${formatDate(asString(live.iniciado_em, ''))} ${fmtTime(live.iniciado_em)}–${fmtTime(live.encerrado_em)}`,
                ],
                ['Duração', calcDuration(live).text],
                [
                  'Apresentadora',
                  asString(live.apresentadora_nome ?? live.apresentador_nome, '—'),
                ],
                ['GMV', formatMoney(officialLiveGmv(live))],
                [
                  'Pedidos',
                  asNumber(live.manual_orders ?? live.final_orders_count).toLocaleString('pt-BR'),
                ],
                ['Publicação', publicationStatusLabel(live.status_publicacao)],
                ['Origem', asString(live.origem_dados, 'manual')],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-line bg-surface-muted p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>

          {live.resumo ? (
            <p className="rounded-2xl border border-line bg-surface-muted p-3 text-sm text-ink">
              {asString(live.resumo)}
            </p>
          ) : null}

          {(() => {
            const report = buildReport(live)
            if (!report) return null
            return (
              <div className="rounded-2xl border border-line bg-surface-muted p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                    Relatório para copiar
                  </p>
                  <Button
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => onCopyReport(report)}
                  >
                    {reportCopied ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap text-xs text-ink">{report}</pre>
              </div>
            )
          })()}

          {canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={Edit2} onClick={() => onEdit(live)}>
                Editar
              </Button>
              {/* Lives em sequência de apresentadoras: sem esta ação a comissão inteira ia
                  para uma só, e o operador não tinha por onde separar quem fez o quê. */}
              <Button variant="secondary" icon={Users} onClick={() => onSplitApresentadoras(live)}>
                Dividir entre apresentadoras
              </Button>
              <Button
                variant="danger"
                icon={Trash2}
                isLoading={deleteLiveMutation.isPending}
                onClick={() => onDelete(live)}
              >
                Excluir
              </Button>
            </div>
          ) : null}

          {deleteLiveMutation.isError ? (
            <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
              {extractErrorMessage(deleteLiveMutation.error)}
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
