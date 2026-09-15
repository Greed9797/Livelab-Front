import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { AlertTriangle, GitMerge } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ModalSection } from '../ui/ModalSection'
import { createLiveUnion, previewLiveUnion, type LiveUnionPreview } from '../../services/domain'
import { extractErrorMessage } from '../../services/api'
import { formatMoney } from '../../utils/format'
import { fmtTime } from './live-helpers'

function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`
}

function mergeError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 404) {
    return 'A união de lives ainda não está habilitada para esta unidade.'
  }
  if (axios.isAxiosError(error) && error.response?.status === 409) {
    return 'Os registros mudaram desde a prévia. Feche esta janela e confira as lives novamente.'
  }
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { blockers?: Array<{ message?: unknown }> } | undefined
    const messages = data?.blockers?.map((item) => typeof item.message === 'string' ? item.message.trim() : '').filter(Boolean)
    if (messages?.length) return messages.join(' ')
  }
  return extractErrorMessage(error)
}

export function LiveMergeModal({
  open,
  liveIds,
  onClose,
  onMerged,
}: {
  open: boolean
  liveIds: string[]
  onClose: () => void
  onMerged: (liveId: string, unionId: string) => void
}) {
  const [preview, setPreview] = useState<LiveUnionPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [metricsConfirmed, setMetricsConfirmed] = useState(false)
  const requestIdRef = useRef('')

  useEffect(() => {
    if (!open) return
    let active = true
    setPreview(null)
    setError('')
    setReason('')
    setMetricsConfirmed(false)
    requestIdRef.current = crypto.randomUUID()
    setLoading(true)
    void previewLiveUnion(liveIds)
      .then((result) => { if (active) setPreview(result) })
      .catch((cause) => { if (active) setError(mergeError(cause)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [liveIds, open])

  async function confirm() {
    if (!preview?.eligible || !preview.preview_token || !metricsConfirmed || !reason.trim()) return
    setSaving(true)
    setError('')
    try {
      const result = await createLiveUnion({
        live_ids: liveIds,
        preview_token: preview.preview_token,
        request_id: requestIdRef.current,
        motivo: reason.trim(),
        metricas_por_trecho: true,
      })
      onMerged(result.live_id, result.uniao_id)
    } catch (cause) {
      setError(mergeError(cause))
    } finally {
      setSaving(false)
    }
  }

  const canConfirm = Boolean(preview?.eligible && preview.preview_token && metricsConfirmed && reason.trim().length >= 3)

  return (
    <Modal
      open={open}
      title="Unir lives"
      subtitle={`${liveIds.length} trechos da mesma transmissão`}
      onClose={onClose}
      closeDisabled={saving}
      size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button icon={GitMerge} onClick={() => void confirm()} disabled={!canConfirm} isLoading={saving}>Confirmar união</Button>
        </>
      )}
    >
      {loading ? <p className="py-8 text-center text-sm text-ink-muted">Calculando a prévia no servidor…</p> : null}
      {error ? <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{error}</p> : null}
      {preview ? (
        <div className="space-y-5">
          {preview.blockers.length ? (
            <div role="alert" className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
              <p className="font-semibold">Estas lives ainda não podem ser unidas:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">{preview.blockers.map((item, index) => <li key={`${item.code}:${item.live_id ?? index}`}>{item.message}</li>)}</ul>
            </div>
          ) : null}

          <ModalSection title="Sequência da transmissão">
            <ol className="space-y-2">
              {preview.origens.map((origin, index) => (
                <li key={origin.live_id} className="grid gap-2 rounded-xl border border-line bg-surface-muted px-3 py-2 text-sm sm:grid-cols-[28px_1fr_auto] sm:items-center">
                  <span className="font-sans text-xs font-semibold text-ink-muted">{index + 1}</span>
                  <span><strong>{origin.marca_nome ?? 'Live'}</strong>{origin.cabine_numero != null ? ` · Cabine ${origin.cabine_numero}` : ''}</span>
                  <span className="font-sans tabular-nums text-ink-muted">{fmtTime(origin.iniciado_em)}–{fmtTime(origin.encerrado_em)}</span>
                </li>
              ))}
            </ol>
          </ModalSection>

          <ModalSection title="Totais consolidados">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div><dt className="text-xs text-ink-muted">GMV</dt><dd className="mt-1 font-semibold">{formatMoney(preview.totais.gmv, true)}</dd></div>
              <div><dt className="text-xs text-ink-muted">Pedidos</dt><dd className="mt-1 font-semibold">{preview.totais.pedidos.toLocaleString('pt-BR')} pedidos</dd></div>
              <div><dt className="text-xs text-ink-muted">Duração</dt><dd className="mt-1 font-semibold">{formatDuration(preview.totais.segundos)}</dd></div>
              <div><dt className="text-xs text-ink-muted">Impressões</dt><dd className="mt-1 font-semibold">{preview.totais.live_impressions == null ? 'Pendente' : preview.totais.live_impressions.toLocaleString('pt-BR')}</dd></div>
              <div><dt className="text-xs text-ink-muted">Visualizações</dt><dd className="mt-1 font-semibold">{preview.totais.manual_views == null ? 'Pendente' : preview.totais.manual_views.toLocaleString('pt-BR')}</dd></div>
            </dl>
          </ModalSection>

          <ModalSection title="Divisão entre apresentadoras">
            <ul className="space-y-2">
              {preview.apresentadoras.map((presenter) => (
                <li key={presenter.apresentadora_id} className="rounded-xl bg-surface-muted px-3 py-2 text-sm font-medium">
                  <span>{presenter.nome ?? 'Apresentadora'} · {formatDuration(presenter.segundos)} · {formatMoney(presenter.gmv, true)}</span>
                  {presenter.pedidos != null ? <span className="text-ink-muted"> · {presenter.pedidos.toLocaleString('pt-BR')} pedidos</span> : null}
                </li>
              ))}
            </ul>
          </ModalSection>

          {preview.warnings.length ? (
            <div className="flex gap-3 rounded-xl bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning)]">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
              <ul className="space-y-1">{preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>
          ) : null}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4" checked={metricsConfirmed} onChange={(event) => setMetricsConfirmed(event.target.checked)} />
            <span><strong>Confirmo que as métricas pertencem a cada trecho</strong><span className="mt-1 block text-ink-muted">Elas serão somadas. Não confirme se cada registro contém o total acumulado da transmissão inteira.</span></span>
          </label>

          <label className="block text-sm font-medium text-ink">
            Motivo da união
            <textarea aria-label="Motivo da união" className="design-input mt-2 min-h-24 w-full resize-y p-3" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Ex.: troca de apresentadora durante a mesma transmissão" />
          </label>
        </div>
      ) : null}
    </Modal>
  )
}
