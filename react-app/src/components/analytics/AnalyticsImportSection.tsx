import { AlertTriangle, CheckCircle2, Upload, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { MarcaSelect } from '../forms/MarcaSelect'
import { PresenterSelect } from '../forms/PresenterSelect'
import { extractErrorMessage } from '../../services/api'
import {
  applyAnalyticsImport,
  cancelAnalyticsImport,
  getAnalyticsImport,
  getApresentadoras,
  getMarcas,
  previewAnalyticsImport,
  updateAnalyticsImportRow,
} from '../../services/domain'
import type { ImportApresentadoraRateio, ImportDecisao } from '../../services/domain'
import { QK } from '../../services/query-keys'
import { asArray, asNumber, asString, formatMoney, getRecord } from '../../utils/format'
import { useToast } from '../ui/Toast'
import type { JsonRecord } from '../../types/models'

interface AnalyticsImportSectionProps {
  mesAno: string
}

const DECISOES: Array<{ value: ImportDecisao; label: string }> = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'vincular', label: 'Vincular a uma live' },
  { value: 'criar', label: 'Criar live nova' },
  { value: 'ignorar', label: 'Ignorar' },
]

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

function decisaoClass(decisao: string) {
  if (decisao === 'criar') return 'border-sky-500/40 bg-sky-500/10'
  if (decisao === 'ignorar') return 'border-line bg-surface-muted opacity-70'
  if (decisao === 'pendente') return 'border-amber-500/40 bg-amber-500/10'
  return 'border-line bg-surface'
}

function candidateLabel(candidate: JsonRecord) {
  const inicio = asString(candidate.iniciado_em, '')
  const hora = inicio ? new Date(inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
  const score = Math.round(asNumber(candidate.score) * 100)
  return `${asString(candidate.marca_nome, 'Live')} · ${hora} · ${score}%`
}

export function AnalyticsImportSection({ mesAno }: AnalyticsImportSectionProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [marcaId, setMarcaId] = useState('')
  const [apresentadoraId, setApresentadoraId] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [rateioRow, setRateioRow] = useState<JsonRecord | null>(null)

  const marcasQuery = useQuery({
    queryKey: QK.marcas('analytics-import'),
    queryFn: () => getMarcas({ status: 'ativa' }),
  })
  const apresentadorasQuery = useQuery({
    queryKey: QK.apresentadoras('analytics-import'),
    queryFn: () => getApresentadoras(),
  })

  // Relê o lote do backend: o preview sobrevive a recarregar a página.
  const batchQuery = useQuery({
    queryKey: ['analytics-import', batchId],
    queryFn: () => getAnalyticsImport(batchId as string),
    enabled: Boolean(batchId),
  })

  const batch = batchQuery.data ?? null
  const rows = asArray<JsonRecord>(batch?.rows)
  const summary = getRecord(batch?.summary)
  const isApplied = asString(batch?.status) === 'applied'

  const decisionCounts = useMemo(() => {
    const counts = { vincular: 0, criar: 0, ignorar: 0, pendente: 0 }
    for (const row of rows) {
      const decisao = asString(row.decisao, 'pendente') as keyof typeof counts
      if (decisao in counts) counts[decisao] += 1
    }
    return counts
  }, [rows])

  const aplicaveis = decisionCounts.vincular + decisionCounts.criar
  const canApply = Boolean(batchId) && aplicaveis > 0 && !isApplied

  const previewMutation = useMutation({
    mutationFn: (selected: File) => previewAnalyticsImport(selected, {
      marca_id: marcaId || undefined,
      apresentadora_id: apresentadoraId || undefined,
    }),
    onSuccess: (data) => {
      setBatchId(asString(data.batch_id) || null)
      const resumo = getRecord(data.summary)
      toast.push(
        `Revisão pronta: ${asNumber(resumo.matched_rows)} casadas, ${asNumber(resumo.unmatched_rows)} sem match. Nada foi gravado ainda.`,
        'success',
      )
    },
    onError: (err) => toast.push(extractErrorMessage(err), 'error'),
  })

  const rowMutation = useMutation({
    mutationFn: ({ rowId, patch }: { rowId: string; patch: Parameters<typeof updateAnalyticsImportRow>[2] }) =>
      updateAnalyticsImportRow(batchId as string, rowId, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['analytics-import', batchId] }),
    onError: (err) => toast.push(extractErrorMessage(err), 'error'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelAnalyticsImport(batchId as string),
    onSuccess: () => {
      toast.push('Importação descartada. Nada foi gravado.', 'info')
      setBatchId(null)
      setFile(null)
    },
    onError: (err) => toast.push(extractErrorMessage(err), 'error'),
  })

  const applyMutation = useMutation({
    mutationFn: () => applyAnalyticsImport(batchId as string),
    onSuccess: async (data) => {
      const falhas = asArray<JsonRecord>(data.failed_rows)
      if (falhas.length > 0) {
        toast.push(`${asNumber(data.applied_rows)} linhas aplicadas, ${falhas.length} com erro.`, 'error')
      } else {
        toast.push(`${asNumber(data.applied_rows)} linhas aplicadas nas lives.`, 'success')
      }
      setConfirmOpen(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['analytics-import', batchId] }),
        queryClient.invalidateQueries({ queryKey: QK.analyticsDashboard() }),
        queryClient.invalidateQueries({ queryKey: QK.homeDashboard }),
        queryClient.invalidateQueries({ queryKey: ['funil-analytics', mesAno] }),
        queryClient.invalidateQueries({ queryKey: QK.lives }),
      ])
    },
    onError: (err) => toast.push(extractErrorMessage(err), 'error'),
  })

  function handlePreview() {
    if (!file) {
      toast.push('Selecione um CSV ou XLSX antes de importar.', 'error')
      return
    }
    if (!marcaId || !apresentadoraId) {
      toast.push('Escolha a marca e a apresentadora — o relatório do TikTok não traz essa informação.', 'error')
      return
    }
    previewMutation.mutate(file)
  }

  function setDecisao(row: JsonRecord, decisao: ImportDecisao) {
    rowMutation.mutate({ rowId: asString(row.id), patch: { decisao } })
  }

  function setMatchedLive(row: JsonRecord, liveId: string) {
    rowMutation.mutate({
      rowId: asString(row.id),
      patch: { matched_live_id: liveId || null, decisao: liveId ? 'vincular' : 'pendente' },
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-bold tracking-[-0.01em] text-ink">Importar relatório do TikTok</p>
            <p className="mt-1 text-xs text-ink-muted">
              Aceita o Creator Live Performance (TikTok Studio) e o relatório de Ads. Nada é gravado até você
              revisar e confirmar. O GMV importado vira o GMV oficial da live nos dashboards.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MarcaSelect
            value={marcaId}
            onChange={(value) => { setMarcaId(value); setBatchId(null) }}
            rows={marcasQuery.data ?? []}
            label="Marca *"
            disabled={Boolean(batchId)}
          />
          <PresenterSelect
            value={apresentadoraId}
            onChange={(value) => { setApresentadoraId(value); setBatchId(null) }}
            rows={apresentadorasQuery.data ?? []}
            label="Apresentadora *"
            disabled={Boolean(batchId)}
          />
          <div className="flex flex-col justify-end gap-2">
            <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink-muted hover:bg-surface-muted">
              <input
                className="sr-only"
                type="file"
                accept=".csv,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null)
                  setBatchId(null)
                  applyMutation.reset()
                }}
              />
              <span className="truncate">{file ? file.name : 'Selecionar CSV/XLSX'}</span>
            </label>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" icon={Upload} onClick={handlePreview} isLoading={previewMutation.isPending}>
            Revisar antes de importar
          </Button>
          <Button
            type="button"
            icon={CheckCircle2}
            disabled={!canApply}
            isLoading={applyMutation.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            {`Confirmar ${aplicaveis} ${aplicaveis === 1 ? 'linha' : 'linhas'}`}
          </Button>
          {batchId && !isApplied ? (
            <Button type="button" variant="ghost" icon={X} onClick={() => cancelMutation.mutate()} isLoading={cancelMutation.isPending}>
              Descartar
            </Button>
          ) : null}
        </div>
      </CardHeader>

      {batchId ? (
        <CardBody>
          {batchQuery.isLoading ? <p className="text-sm text-ink-muted">Carregando revisão…</p> : null}

          <div className="grid gap-3 md:grid-cols-5">
            {[
              ['Linhas', asNumber(summary.total_rows)],
              ['Vincular', decisionCounts.vincular],
              ['Criar', decisionCounts.criar],
              ['Pendentes', decisionCounts.pendente],
              ['Ignorar', decisionCounts.ignorar],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-line bg-surface-muted p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{String(label)}</p>
                <p className="mt-1 text-xl font-black text-ink">{Number(value).toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>

          {isApplied ? (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-ink">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>Importação aplicada. Para corrigir algo, edite a live direto na tela de Conteúdo.</span>
            </div>
          ) : decisionCounts.pendente > 0 ? (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                {decisionCounts.pendente} {decisionCounts.pendente === 1 ? 'linha pendente' : 'linhas pendentes'}: escolha
                vincular a uma live existente, criar uma live nova ou ignorar. Linhas pendentes não são importadas.
              </span>
            </div>
          ) : null}

          <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[1180px] divide-y divide-line text-sm">
              <thead className="bg-surface-muted text-left text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Live (planilha)</th>
                  <th className="px-3 py-2">Início</th>
                  <th className="px-3 py-2 text-right">Duração</th>
                  <th className="px-3 py-2 text-right">GMV</th>
                  <th className="px-3 py-2 text-right">Pedidos</th>
                  <th className="px-3 py-2 text-right">Likes</th>
                  <th className="px-3 py-2">O que fazer</th>
                  <th className="px-3 py-2">Apresentadoras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {rows.map((row) => {
                  const status = asString(row.match_status)
                  const decisao = asString(row.decisao, 'pendente')
                  const candidates = asArray<JsonRecord>(row.candidates)
                  const rateio = asArray<JsonRecord>(row.apresentadoras)
                  const gmv = row.attributed_gmv ?? row.ads_gmv
                  const erro = asString(row.error, '')

                  return (
                    <tr key={asString(row.id) || asNumber(row.row_index)} className={decisaoClass(decisao)}>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClass(status)}`}>
                          {statusLabel(status)}
                        </span>
                        {erro ? <p className="mt-1 text-[11px] text-red-600">{erro}</p> : null}
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-ink">{asString(row.room_title, asString(row.marca_nome, '—'))}</p>
                        <p className="text-[11px] text-ink-muted">{asString(row.live_date, '—')}</p>
                      </td>
                      <td className="px-3 py-2 text-ink-muted">{asString(row.start_time, '—')}</td>
                      <td className="px-3 py-2 text-right text-ink-muted">{(asNumber(row.duration_seconds) / 3600).toFixed(1)}h</td>
                      <td className="px-3 py-2 text-right font-semibold text-ink">{formatMoney(gmv)}</td>
                      <td className="px-3 py-2 text-right text-ink-muted">{asNumber(row.attributed_orders).toLocaleString('pt-BR')}</td>
                      <td className="px-3 py-2 text-right text-ink-muted">{asNumber(row.likes).toLocaleString('pt-BR')}</td>
                      <td className="px-3 py-2">
                        <select
                          className="design-input h-9 w-full px-2 text-xs"
                          value={decisao}
                          disabled={isApplied || rowMutation.isPending}
                          onChange={(event) => setDecisao(row, event.target.value as ImportDecisao)}
                        >
                          {DECISOES.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        {decisao === 'vincular' ? (
                          <select
                            className="design-input mt-1 h-9 w-full px-2 text-xs"
                            value={asString(row.matched_live_id, '')}
                            disabled={isApplied || rowMutation.isPending}
                            onChange={(event) => setMatchedLive(row, event.target.value)}
                          >
                            <option value="">Escolher live…</option>
                            {candidates.map((candidate) => (
                              <option key={asString(candidate.live_id)} value={asString(candidate.live_id)}>
                                {candidateLabel(candidate)}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-1 text-[11px] font-semibold text-ink-muted hover:bg-surface-muted disabled:opacity-50"
                          disabled={isApplied}
                          onClick={() => setRateioRow(row)}
                        >
                          <Users className="h-3 w-3" />
                          {rateio.length > 1 ? `${rateio.length} · rateio` : '1 apresentadora'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      ) : null}

      <Modal
        open={confirmOpen}
        title="Confirmar importação"
        subtitle={`${aplicaveis} ${aplicaveis === 1 ? 'linha será gravada' : 'linhas serão gravadas'} nas lives.`}
        onClose={() => setConfirmOpen(false)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button type="button" icon={CheckCircle2} isLoading={applyMutation.isPending} onClick={() => applyMutation.mutate()}>
              Importar agora
            </Button>
          </div>
        )}
      >
        <p className="text-sm text-ink-muted">
          {decisionCounts.vincular > 0 ? `${decisionCounts.vincular} atualizam lives já cadastradas. ` : ''}
          {decisionCounts.criar > 0 ? `${decisionCounts.criar} criam lives novas. ` : ''}
          O GMV do TikTok passa a valer nos dashboards e no cálculo de comissão dessas lives.
        </p>
      </Modal>

      {rateioRow ? (
        <RateioModal
          row={rateioRow}
          apresentadoras={apresentadorasQuery.data ?? []}
          onClose={() => setRateioRow(null)}
          onSave={(lista) => {
            rowMutation.mutate(
              { rowId: asString(rateioRow.id), patch: { apresentadoras: lista } },
              { onSuccess: () => { setRateioRow(null); toast.push('Rateio salvo.', 'success') } },
            )
          }}
          isSaving={rowMutation.isPending}
        />
      ) : null}
    </Card>
  )
}

interface RateioModalProps {
  row: JsonRecord
  apresentadoras: JsonRecord[]
  onClose: () => void
  onSave: (lista: ImportApresentadoraRateio[]) => void
  isSaving: boolean
}

/**
 * Desmembra a live entre apresentadoras. Horas e GMV saem do percentual, e a soma tem que
 * fechar 100% — o backend recusa qualquer outra coisa.
 */
function RateioModal({ row, apresentadoras, onClose, onSave, isSaving }: RateioModalProps) {
  const [lista, setLista] = useState<ImportApresentadoraRateio[]>(() => {
    const atual = asArray<JsonRecord>(row.apresentadoras)
      .map((item) => ({
        apresentadora_id: asString(item.apresentadora_id, ''),
        percentual: asNumber(item.percentual),
      }))
      .filter((item) => item.apresentadora_id)
    return atual.length > 0 ? atual : []
  })

  const totalSegundos = asNumber(row.duration_seconds)
  const gmvTotal = asNumber(row.attributed_gmv ?? row.ads_gmv)
  const soma = lista.reduce((acc, item) => acc + Number(item.percentual || 0), 0)
  const fecha = Math.abs(soma - 100) <= 0.01
  const semVazio = lista.length > 0 && lista.every((item) => item.apresentadora_id)
  const semRepetida = new Set(lista.map((item) => item.apresentadora_id)).size === lista.length

  function update(index: number, patch: Partial<ImportApresentadoraRateio>) {
    setLista((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function distribuirIgual(base: ImportApresentadoraRateio[]) {
    if (base.length === 0) return base
    const fatia = Math.floor((100 / base.length) * 100) / 100
    return base.map((item, index) => ({
      ...item,
      // A última absorve o arredondamento para a soma fechar exatamente 100.
      percentual: index === base.length - 1
        ? Number((100 - fatia * (base.length - 1)).toFixed(2))
        : fatia,
    }))
  }

  return (
    <Modal
      open
      title="Apresentadoras da live"
      subtitle={`${(totalSegundos / 3600).toFixed(1)}h · ${formatMoney(gmvTotal)} a dividir`}
      onClose={onClose}
      footer={(
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-semibold ${fecha ? 'text-emerald-600' : 'text-red-600'}`}>
            Soma: {soma.toFixed(2)}%
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button
              type="button"
              disabled={!fecha || !semVazio || !semRepetida}
              isLoading={isSaving}
              onClick={() => onSave(lista)}
            >
              Salvar rateio
            </Button>
          </div>
        </div>
      )}
    >
      <div className="space-y-3">
        {lista.map((item, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2 rounded-2xl border border-line p-3">
            <PresenterSelect
              className="min-w-[220px] flex-1"
              label={index === 0 ? 'Principal' : 'Apoio'}
              value={item.apresentadora_id}
              rows={apresentadoras}
              onChange={(value) => update(index, { apresentadora_id: value })}
            />
            <label className="block w-28">
              <span className="text-sm font-semibold text-ink">%</span>
              <input
                className="design-input mt-2 h-11 w-full px-3 text-right"
                type="number"
                min={0.01}
                max={100}
                step={0.01}
                value={item.percentual}
                onChange={(event) => update(index, { percentual: Number(event.target.value) })}
              />
            </label>
            <div className="w-32 pb-1 text-xs text-ink-muted">
              <p>{((totalSegundos * (Number(item.percentual) || 0)) / 100 / 3600).toFixed(1)}h</p>
              <p>{formatMoney((gmvTotal * (Number(item.percentual) || 0)) / 100)}</p>
            </div>
            <button
              type="button"
              className="mb-1 rounded-full border border-line p-2 text-ink-muted hover:bg-surface-muted"
              aria-label="Remover apresentadora"
              onClick={() => setLista((prev) => distribuirIgual(prev.filter((_, i) => i !== index)))}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {!semRepetida ? <p className="text-sm text-red-600">Há apresentadora repetida no rateio.</p> : null}

        <Button
          type="button"
          variant="secondary"
          icon={Users}
          onClick={() => setLista((prev) => distribuirIgual([...prev, { apresentadora_id: '', percentual: 0 }]))}
        >
          Adicionar apresentadora
        </Button>
      </div>
    </Modal>
  )
}
