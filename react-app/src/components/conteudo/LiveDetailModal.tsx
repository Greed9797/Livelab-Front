import { useEffect, useRef, useState } from 'react'
import { Copy, Edit2, GitMerge, RotateCcw, Trash2, Users } from 'lucide-react'
import { useMutation, useQuery, type UseMutationResult } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { ModalSection } from '../ui/ModalSection'
import { Button } from '../ui/Button'
import { publicationStatusLabel } from '../../pages/conteudo-helpers'
import { asNumber, asString, formatDate, formatMoney } from '../../utils/format'
import { officialLiveGmv } from '../../utils/live-gmv'
import { extractErrorMessage } from '../../services/api'
import { calcDuration, fmtTime, livePresenterNames } from './live-helpers'
import { formatAudienceCount, liveImpressoes, liveVisualizacoes } from './live-resumo-dia'
import type { JsonRecord } from '../../types/models'
import { BotBadge } from '../ui/BotBadge'
import { getLiveUnion, undoLiveUnion } from '../../services/domain'

const ORIGEM_LABEL: Record<string, string> = { manual: 'Manual', api: 'API TikTok', bot: 'BOT (automação)' }

export function buildReport(live: JsonRecord): string {
  const nome = asString(live.marca_nome ?? live.cliente_nome, '')
  const inicio = live.iniciado_em ? new Date(live.iniciado_em as string) : null
  if (!inicio || Number.isNaN(inicio.getTime())) return ''
  const data = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(inicio)
  const hFim = fmtTime(live.encerrado_em)
  const { text: duracao } = calcDuration(live)
  const presenters = livePresenterNames(live)
  const views = liveVisualizacoes(live)
  const impressions = liveImpressoes(live)
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
    views != null ? `👁️ Visualizações: ${formatAudienceCount(views)}` : null,
    impressions != null ? `📣 Impressões: ${formatAudienceCount(impressions)}` : null,
  ]
  return lines.filter(Boolean).join('\n')
}

interface LiveDetailModalProps {
  open: boolean
  live: JsonRecord | null
  canWrite: boolean
  canManageUnion?: boolean
  reportCopied: boolean
  onClose: () => void
  onCopyReport: (report: string) => void
  onEdit: (live: JsonRecord) => void
  onSplitApresentadoras: (live: JsonRecord) => void
  onDelete: (live: JsonRecord) => void
  deleteLiveMutation: UseMutationResult<unknown, Error, string>
  onUnionChanged?: () => void
}

export function LiveDetailModal({
  open,
  live,
  canWrite,
  canManageUnion = false,
  reportCopied,
  onClose,
  onCopyReport,
  onEdit,
  onSplitApresentadoras,
  onDelete,
  deleteLiveMutation,
  onUnionChanged,
}: LiveDetailModalProps) {
  const presenterNames = live ? livePresenterNames(live) : []
  const report = live ? buildReport(live) : ''
  const liveId = live ? asString(live.id, '') : ''
  const [undoOpen, setUndoOpen] = useState(false)
  const [undoReason, setUndoReason] = useState('')
  const [undoSuccess, setUndoSuccess] = useState(false)
  const undoRequestIdRef = useRef('')
  useEffect(() => {
    setUndoOpen(false)
    setUndoReason('')
    setUndoSuccess(false)
  }, [liveId])
  const union = useQuery({
    queryKey: ['live-union', liveId],
    queryFn: () => getLiveUnion(liveId),
    enabled: open && canManageUnion && Boolean(liveId),
    retry: false,
  })
  const unionActive = Boolean(union.data && union.data.ativo !== false && !union.data.desfeito_em)
  const canEditLive = canWrite && !unionActive
  const undo = useMutation({
    mutationFn: () => undoLiveUnion(union.data!.id, { request_id: undoRequestIdRef.current, motivo: undoReason.trim() }),
    onSuccess: () => {
      setUndoOpen(false)
      setUndoReason('')
      setUndoSuccess(true)
      void union.refetch()
      onUnionChanged?.()
    },
  })
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
            <Button variant={canEditLive ? 'secondary' : 'primary'} icon={Copy} onClick={() => onCopyReport(report)}>
              {reportCopied ? 'Relatório copiado' : 'Copiar relatório'}
            </Button>
          ) : null}
          {canEditLive ? (
            <Button icon={Edit2} onClick={() => onEdit(live)}>Editar live</Button>
          ) : <Button variant="secondary" onClick={onClose}>Fechar</Button>}
        </>
      ) : undefined}
    >
      {live ? (
        <div className="space-y-5">
          {union.data ? (
            <div className="rounded-xl border border-[var(--primary-soft)] bg-[var(--primary-softer)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"><GitMerge aria-hidden="true" className="h-4 w-4" />{union.data.desfeito_em ? 'União desfeita' : `Unida de ${union.data.origens.length} registros`}</p>
                  <p className="mt-1 text-xs text-ink-muted">{union.data.motivo ? `Motivo: ${union.data.motivo}` : 'Os trechos originais continuam disponíveis no histórico.'}</p>
                </div>
                {canManageUnion && unionActive ? <Button variant="secondary" icon={RotateCcw} onClick={() => { setUndoSuccess(false); undoRequestIdRef.current = crypto.randomUUID(); setUndoOpen(true) }}>Desfazer união</Button> : null}
              </div>
              <ol className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-ink-muted">
                {union.data.origens.map((origin, index) => {
                  const source = origin.live
                  return <li key={asString(source.id, String(index))}>{index + 1}. {fmtTime(source.iniciado_em)}–{fmtTime(source.encerrado_em)}{source.marca_nome ? ` · ${asString(source.marca_nome)}` : ''}</li>
                })}
              </ol>
            </div>
          ) : undoSuccess ? <p className="rounded-xl bg-[var(--success-soft)] px-4 py-3 text-sm font-semibold text-[var(--success)]">União desfeita</p> : null}
          {union.isError ? <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">Não foi possível carregar o histórico desta união.</p> : null}
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

          {canEditLive ? (
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

      <Modal
        open={undoOpen}
        title="Desfazer união"
        subtitle="Os registros originais voltarão aos relatórios e a consolidada será arquivada."
        onClose={() => setUndoOpen(false)}
        closeDisabled={undo.isPending}
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setUndoOpen(false)} disabled={undo.isPending}>Cancelar</Button>
            <Button variant="danger" onClick={() => undo.mutate()} disabled={undoReason.trim().length < 3} isLoading={undo.isPending}>Confirmar reversão</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <label className="block text-sm font-medium text-ink">Motivo para desfazer
            <textarea aria-label="Motivo para desfazer" className="design-input mt-2 min-h-24 w-full resize-y p-3" value={undoReason} onChange={(event) => setUndoReason(event.target.value)} maxLength={500} />
          </label>
          {undo.isError ? <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(undo.error)}</p> : null}
        </div>
      </Modal>
    </Modal>
  )
}
