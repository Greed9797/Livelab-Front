import { Copy, Edit2, Trash2, Users } from 'lucide-react'
import type { UseMutationResult } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { ModalSection } from '../ui/ModalSection'
import { Button } from '../ui/Button'
import { publicationStatusLabel } from '../../pages/conteudo-helpers'
import { asNumber, asString, formatDate, formatMoney } from '../../utils/format'
import { officialLiveGmv } from '../../utils/live-gmv'
import { extractErrorMessage } from '../../services/api'
import { calcDuration, fmtTime, livePresenterNames } from './live-helpers'
import type { JsonRecord } from '../../types/models'
import { BotBadge } from '../ui/BotBadge'

const ORIGEM_LABEL: Record<string, string> = { manual: 'Manual', api: 'API TikTok', bot: 'BOT (automação)' }

function buildReport(live: JsonRecord): string {
  const nome = asString(live.marca_nome ?? live.cliente_nome, '')
  const inicio = live.iniciado_em ? new Date(live.iniciado_em as string) : null
  if (!inicio || Number.isNaN(inicio.getTime())) return ''
  const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(
    inicio,
  )
  const hFim = fmtTime(live.encerrado_em)
  const { text: duracao } = calcDuration(live)
  const presenters = livePresenterNames(live)
  const lines = [
    `📊 Relatório de Live${nome ? ` — ${nome}` : ''}`,
    '',
    `📅 Data: ${data}`,
    hFim !== '—'
      ? `⏰ Horário: ${fmtTime(live.iniciado_em)} às ${hFim}`
      : `⏰ Horário: ${fmtTime(live.iniciado_em)}`,
    duracao !== '—' ? `⏱️ Duração: ${duracao}` : null,
    presenters.length ? `🎤 Apresentadoras: ${presenters.join(' + ')}` : null,
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
  const presenterNames = live ? livePresenterNames(live) : []
  const report = live ? buildReport(live) : ''
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
      footer={live ? (
        <>
          {deleteLiveMutation.isError ? (
            <p role="alert" className="w-full rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
              {extractErrorMessage(deleteLiveMutation.error)}
            </p>
          ) : null}
          {report ? (
            <Button variant={canWrite ? 'secondary' : 'primary'} icon={Copy} onClick={() => onCopyReport(report)}>
              {reportCopied ? 'Relatório copiado' : 'Copiar relatório'}
            </Button>
          ) : null}
          {canWrite ? (
            <Button icon={Edit2} onClick={() => onEdit(live)}>Editar live</Button>
          ) : <Button variant="secondary" onClick={onClose}>Fechar</Button>}
        </>
      ) : undefined}
    >
      {live ? (
        <div className="space-y-5">
          <dl className="grid gap-4 rounded-xl bg-surface-muted p-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <dt className="text-xs font-medium text-ink-muted">GMV da live</dt>
              <dd className="mt-1 break-words font-sans text-2xl font-semibold tracking-tight text-ink [font-variant-numeric:tabular-nums]">
                {formatMoney(officialLiveGmv(live))}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-ink-muted">Pedidos</dt>
              <dd className="mt-1 font-sans text-2xl font-semibold tracking-tight text-ink [font-variant-numeric:tabular-nums]">
                {asNumber(live.manual_orders ?? live.final_orders_count).toLocaleString('pt-BR')}
              </dd>
            </div>
          </dl>

          <ModalSection title="Operação">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {([
                [
                  'Data e horário',
                  `${formatDate(asString(live.iniciado_em, ''))} ${fmtTime(live.iniciado_em)}–${fmtTime(live.encerrado_em)}`,
                ],
                ['Duração', calcDuration(live).text],
                [
                  presenterNames.length > 1 ? 'Apresentadoras' : 'Apresentadora',
                  presenterNames.join(' · ') || '—',
                ],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {live.resumo ? (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-xs text-ink-muted">Resumo</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{asString(live.resumo)}</p>
              </div>
            ) : null}
          </ModalSection>

          <ModalSection title="Publicação e origem" collapsible>
            <dl className="grid gap-4 sm:grid-cols-2">
              {([
                ['Publicação', publicationStatusLabel(live.status_publicacao)],
                ['Origem', ORIGEM_LABEL[asString(live.origem_dados, 'manual')] ?? asString(live.origem_dados)],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3"><BotBadge origem={live.origem_dados} /></div>
          </ModalSection>

          {report ? (
            <ModalSection title="Ver relatório para compartilhar" collapsible>
              <pre className="whitespace-pre-wrap text-xs leading-relaxed text-ink [overflow-wrap:anywhere]">{report}</pre>
            </ModalSection>
          ) : null}

          {canWrite ? (
            <ModalSection title="Outras ações" collapsible>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" icon={Users} onClick={() => onSplitApresentadoras(live)}>
                  Dividir entre apresentadoras
                </Button>
                <Button
                  variant="ghost"
                  className="text-[var(--danger)]"
                  icon={Trash2}
                  isLoading={deleteLiveMutation.isPending}
                  onClick={() => onDelete(live)}
                >
                  Excluir live
                </Button>
              </div>
            </ModalSection>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
