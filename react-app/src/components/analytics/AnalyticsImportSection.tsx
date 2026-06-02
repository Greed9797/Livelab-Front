import { AlertTriangle, CheckCircle2, Upload } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { extractErrorMessage } from '../../services/api'
import { applyAnalyticsImport, previewAnalyticsImport } from '../../services/domain'
import { QK } from '../../services/query-keys'
import { asArray, asNumber, asString, formatMoney, getRecord } from '../../utils/format'
import { useToast } from '../ui/Toast'
import type { JsonRecord } from '../../types/models'

interface AnalyticsImportSectionProps {
  mesAno: string
}

function statusLabel(status: string) {
  if (status === 'matched') return 'OK'
  if (status === 'ambiguous') return 'Ambíguo'
  if (status === 'skipped_short') return '<5min'
  if (status === 'invalid') return 'Inválido'
  return 'Sem match'
}

function statusClass(status: string) {
  if (status === 'matched') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
  if (status === 'ambiguous') return 'border-amber-500/40 bg-amber-500/10 text-amber-700'
  return 'border-red-500/40 bg-red-500/10 text-red-700'
}

export function AnalyticsImportSection({ mesAno }: AnalyticsImportSectionProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<JsonRecord | null>(null)

  const previewMutation = useMutation({
    mutationFn: previewAnalyticsImport,
    onSuccess: (data) => {
      setPreview(data)
      const summary = getRecord(data.summary)
      toast.push(
        `Preview pronto: ${asNumber(summary.matched_rows)} linhas casadas, ${asNumber(summary.unmatched_rows)} sem match.`,
        'success',
      )
    },
    onError: (err) => toast.push(extractErrorMessage(err), 'error'),
  })

  const applyMutation = useMutation({
    mutationFn: applyAnalyticsImport,
    onSuccess: async (data) => {
      toast.push(`${asNumber(data.applied_rows)} linhas aplicadas nas lives.`, 'success')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QK.analyticsDashboard() }),
        queryClient.invalidateQueries({ queryKey: QK.homeDashboard }),
        queryClient.invalidateQueries({ queryKey: ['funil-analytics', mesAno] }),
        queryClient.invalidateQueries({ queryKey: QK.lives }),
      ])
    },
    onError: (err) => toast.push(extractErrorMessage(err), 'error'),
  })

  const rows = asArray<JsonRecord>(preview?.rows)
  const summary = getRecord(preview?.summary)
  const matchedRows = asNumber(summary.matched_rows)
  const canApply = Boolean(preview?.batch_id) && matchedRows > 0 && !applyMutation.isSuccess

  function handlePreview() {
    if (!file) {
      toast.push('Selecione um CSV ou XLSX antes de importar.', 'error')
      return
    }
    previewMutation.mutate(file)
  }

  function handleApply() {
    const batchId = asString(preview?.batch_id)
    if (!batchId || !window.confirm(`Aplicar ${matchedRows} linhas casadas nas lives?`)) return
    applyMutation.mutate(batchId)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-bold tracking-[-0.01em] text-ink">Importar métricas TikTok Ads</p>
            <p className="mt-1 text-xs text-ink-muted">
              Cruza marca + data + sobreposição de horário. Ads GMV vira o GMV oficial da live nos dashboards.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-10 cursor-pointer items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink-muted hover:bg-surface-muted">
              <input
                className="sr-only"
                type="file"
                accept=".csv,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null)
                  setPreview(null)
                  applyMutation.reset()
                }}
              />
              {file ? file.name : 'Selecionar CSV/XLSX'}
            </label>
            <Button type="button" icon={Upload} onClick={handlePreview} isLoading={previewMutation.isPending}>
              Pré-visualizar
            </Button>
            <Button
              type="button"
              icon={CheckCircle2}
              disabled={!canApply}
              isLoading={applyMutation.isPending}
              onClick={handleApply}
            >
              Aplicar matches
            </Button>
          </div>
        </div>
      </CardHeader>
      {preview ? (
        <CardBody>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              ['Linhas', summary.total_rows],
              ['Casadas', summary.matched_rows],
              ['Ambíguas', summary.ambiguous_rows],
              ['Sem match', summary.unmatched_rows],
              ['Ignoradas', asNumber(summary.skipped_rows) + asNumber(summary.invalid_rows)],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-line bg-surface-muted p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{String(label)}</p>
                <p className="mt-1 text-xl font-black text-ink">{asNumber(value).toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>

          {asNumber(summary.ambiguous_rows) + asNumber(summary.unmatched_rows) > 0 ? (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>Linhas ambíguas ou sem match não são aplicadas automaticamente. Ajuste a live/agenda e importe novamente.</span>
            </div>
          ) : null}

          <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
            <table className="min-w-[980px] w-full divide-y divide-line text-sm">
              <thead className="bg-surface-muted text-left text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Marca</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Início</th>
                  <th className="px-3 py-2 text-right">Duração</th>
                  <th className="px-3 py-2 text-right">Ads GMV</th>
                  <th className="px-3 py-2 text-right">Verba</th>
                  <th className="px-3 py-2">Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {rows.slice(0, 80).map((row) => {
                  const status = asString(row.match_status)
                  return (
                    <tr key={asNumber(row.row_index)} className="hover:bg-surface-muted/60">
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClass(status)}`}>
                          {statusLabel(status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold text-ink">{asString(row.marca_nome, '—')}</td>
                      <td className="px-3 py-2 text-ink-muted">{asString(row.live_date, '—')}</td>
                      <td className="px-3 py-2 text-ink-muted">{asString(row.start_time, '—')}</td>
                      <td className="px-3 py-2 text-right text-ink-muted">{(asNumber(row.duration_seconds) / 3600).toFixed(1)}h</td>
                      <td className="px-3 py-2 text-right font-semibold text-ink">{formatMoney(row.ads_gmv)}</td>
                      <td className="px-3 py-2 text-right text-ink-muted">{formatMoney(row.ads_cost)}</td>
                      <td className="px-3 py-2 text-xs text-ink-muted">{asString(row.match_reason, '—')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {rows.length > 80 ? (
            <p className="mt-2 text-xs text-ink-muted">Mostrando 80 de {rows.length} linhas para manter a tela leve.</p>
          ) : null}
        </CardBody>
      ) : null}
    </Card>
  )
}
