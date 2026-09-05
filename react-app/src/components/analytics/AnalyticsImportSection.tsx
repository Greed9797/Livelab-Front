import { AlertTriangle, CheckCircle2, Link2, Upload, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { BotBadge } from '../ui/BotBadge'
import { Modal } from '../ui/Modal'
import { MarcaSelect } from '../forms/MarcaSelect'
import { PresenterSelect } from '../forms/PresenterSelect'
import { extractErrorMessage } from '../../services/api'
import {
  applyAnalyticsImport,
  cancelAnalyticsImport,
  getAnalyticsImport,
  getApresentadoras,
  getCabines,
  getLivesPaginado,
  getMarcas,
  previewAnalyticsImport,
  updateAnalyticsImportRow,
} from '../../services/domain'
import type { ImportDecisao } from '../../services/domain'
import { QK } from '../../services/query-keys'
import { asArray, asNumber, asString, formatMoney, getRecord } from '../../utils/format'
import { formatDuracao } from '../../utils/duracao'
import { importedGmvPresence, summarizeImportedGmv } from '../../utils/analyticsImportCoverage'
import { useToast } from '../ui/Toast'
import { ImportRateioModal } from './ImportRateioModal'
import { ImportVincularLiveModal } from './ImportVincularLiveModal'
import type { JsonRecord } from '../../types/models'

interface AnalyticsImportSectionProps {
  /** Mês do funil a invalidar depois do apply. Opcional: fora da Analytics não há filtro de mês. */
  mesAno?: string
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

export function AnalyticsImportSection({ mesAno }: AnalyticsImportSectionProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [marcaId, setMarcaId] = useState('')
  const [apresentadoraId, setApresentadoraId] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [rateioRow, setRateioRow] = useState<JsonRecord | null>(null)
  const [vincularRow, setVincularRow] = useState<JsonRecord | null>(null)

  const marcasQuery = useQuery({
    queryKey: QK.marcas('analytics-import'),
    queryFn: () => getMarcas({ status: 'ativa' }),
  })
  const apresentadorasQuery = useQuery({
    queryKey: QK.apresentadoras('analytics-import'),
    queryFn: () => getApresentadoras(),
  })
  const cabinesQuery = useQuery({
    queryKey: QK.cabines,
    queryFn: () => getCabines(),
  })
  /**
   * TODAS as lives do tenant, para a vinculação escolher entre elas.
   *
   * GET /v1/lives limita cada resposta a 200 (src/routes/lives.js), então uma chamada só
   * devolvia as 200 encerradas mais recentes — num tenant com 445 lives, 245 simplesmente não
   * existiam na tela nem na busca, e procurar por elas devolvia "Nenhuma live encontrada",
   * indistinguível de "essa live não existe". Aqui pagina até acabar.
   *
   * Sem filtro de status de propósito: o matcher casa contra qualquer live que não seja
   * cancelada (src/services/analytics-import.js), incluindo em_andamento e faturada — filtrar
   * por 'encerrada' escondia justamente as lives mais recentes, que são as mais prováveis.
   */
  const livesQuery = useQuery({
    queryKey: ['lives', 'todas-para-vincular'],
    queryFn: async () => {
      const todas: JsonRecord[] = []
      // Teto de segurança: 25 páginas ≅ 5.000 lives. Acima disso a busca por texto é o caminho,
      // não a lista inteira — mas nenhum tenant chega perto hoje.
      for (let page = 0; page < 25; page += 1) {
        const res = await getLivesPaginado({ page, limit: 200 })
        const itens = asArray<JsonRecord>(res?.items)
        todas.push(...itens)
        if (itens.length < 200 || todas.length >= asNumber(res?.total)) break
      }
      return todas.filter((live) => asString(live.status) !== 'cancelada')
    },
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
  const cabinesLista = asArray<JsonRecord>(cabinesQuery.data)
  const livesLista = asArray<JsonRecord>(livesQuery.data)

  const decisionCounts = useMemo(() => {
    const counts = { vincular: 0, criar: 0, ignorar: 0, pendente: 0 }
    for (const row of rows) {
      const decisao = asString(row.decisao, 'pendente') as keyof typeof counts
      if (decisao in counts) counts[decisao] += 1
    }
    return counts
  }, [rows])
  const gmvCoverage = useMemo(() => summarizeImportedGmv(rows), [rows])

  // Uma live só pode receber uma linha do arquivo — o backend devolve 409, então a tela já
  // mostra qual linha reservou cada live em vez de deixar o usuário descobrir no erro.
  const livesReservadas = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const row of rows) {
      const liveId = asString(row.matched_live_id, '')
      if (liveId && asString(row.decisao) === 'vincular') mapa.set(liveId, asNumber(row.row_index))
    }
    return mapa
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
      // Live com GMV corrigido à mão mantém o valor corrigido: o da planilha é descartado.
      // Dizer quantas foram é obrigatório — preservar em silêncio esconde que o número do
      // arquivo não entrou.
      const preservadas = asNumber(data.gmv_preservado_rows)
      const nota = preservadas > 0
        ? ` ${preservadas} manteve${preservadas > 1 ? 'ram' : ''} o GMV corrigido à mão.`
        : ''
      if (falhas.length > 0) {
        toast.push(`${asNumber(data.applied_rows)} linhas aplicadas, ${falhas.length} com erro.${nota}`, 'error')
      } else {
        toast.push(`${asNumber(data.applied_rows)} linhas aplicadas nas lives.${nota}`, 'success')
      }
      setConfirmOpen(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['analytics-import', batchId] }),
        queryClient.invalidateQueries({ queryKey: QK.analyticsDashboard() }),
        queryClient.invalidateQueries({ queryKey: QK.homeDashboard }),
        // Sem mês definido o prefixo invalida o funil de qualquer período.
        queryClient.invalidateQueries({ queryKey: mesAno ? ['funil-analytics', mesAno] : ['funil-analytics'] }),
        queryClient.invalidateQueries({ queryKey: QK.lives }),
      ])
    },
    // O navegador desistir NÃO quer dizer que a importação falhou: o servidor não é
    // interrompido e costuma terminar depois. Antes, a tela mostrava erro, mantinha o
    // lote como pendente e devolvia o botão — convidando a clicar de novo enquanto o
    // trabalho ainda corria. Agora perguntamos ao servidor como o lote realmente ficou.
    onError: async (err) => {
      setConfirmOpen(false)
      const lote = await queryClient
        .fetchQuery({
          queryKey: ['analytics-import', batchId],
          queryFn: () => getAnalyticsImport(batchId as string),
        })
        .catch(() => null)

      if (lote && asString(getRecord(lote).status) === 'applied') {
        toast.push('A importação foi concluída no servidor — a tela é que demorou a responder.', 'success')
      } else {
        const gravadas = asArray<JsonRecord>(getRecord(lote ?? {}).rows).filter((r) => r.applied_at).length
        toast.push(
          gravadas > 0
            ? `${extractErrorMessage(err)} ${gravadas} linha(s) já gravadas — reaplicar continua de onde parou.`
            : extractErrorMessage(err),
          'error',
        )
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QK.analyticsDashboard() }),
        queryClient.invalidateQueries({ queryKey: QK.homeDashboard }),
        queryClient.invalidateQueries({ queryKey: QK.lives }),
      ])
    },
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
    // "Vincular" sem live escolhida é rejeitado pelo backend ('Escolha a live antes de marcar a
    // linha como vincular'), e o botão que abre a lista só aparecia DEPOIS da linha estar em
    // 'vincular' — uma coisa dependia da outra e o fluxo nunca saía do lugar. Escolher
    // "Vincular" agora abre a lista; a decisão é gravada junto com a live, num PATCH só.
    if (decisao === 'vincular' && !asString(row.matched_live_id, '')) {
      setVincularRow(row)
      return
    }
    rowMutation.mutate({ rowId: asString(row.id), patch: { decisao } })
  }

  function setMatchedLive(row: JsonRecord, liveId: string) {
    rowMutation.mutate(
      {
        rowId: asString(row.id),
        patch: { matched_live_id: liveId || null, decisao: liveId ? 'vincular' : 'pendente' },
      },
      { onSuccess: () => setVincularRow(null) },
    )
  }

  function setCabine(row: JsonRecord, cabineId: string) {
    rowMutation.mutate({ rowId: asString(row.id), patch: { cabine_id: cabineId || null } })
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
          <BotBadge origem={batch?.origem_dados} className="mb-3" />

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

          <section className="mt-3 rounded-2xl border border-line bg-surface-muted/40 p-3" aria-labelledby="cobertura-importacao">
            <h3 id="cobertura-importacao" className="text-sm font-semibold text-ink">Dados informados no arquivo</h3>
            <p className="mt-1 text-sm text-ink-muted">
              GMV informado em <span className="font-semibold tabular-nums text-ink">{gmvCoverage.provided + gmvCoverage.zero} de {gmvCoverage.total}</span> linhas.
              {gmvCoverage.zero > 0 ? ` ${gmvCoverage.zero} ${gmvCoverage.zero === 1 ? 'linha trouxe' : 'linhas trouxeram'} GMV zero, mantido como informado.` : ''}
              {gmvCoverage.missing > 0 ? ` ${gmvCoverage.missing} ${gmvCoverage.missing === 1 ? 'linha não informou' : 'linhas não informaram'} GMV.` : ''}
            </p>
            <p className="mt-1 text-xs text-ink-muted">Pedidos e audiência zerados precisam ser conferidos no arquivo, pois exportações antigas podem omitir essas colunas.</p>
          </section>

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
                  const rateio = asArray<JsonRecord>(row.apresentadoras)
                  const gmv = row.attributed_gmv ?? row.ads_gmv
                  const gmvPresence = importedGmvPresence(row)
                  const erro = asString(row.error, '')
                  // O rótulo do botão precisa dizer QUAL live está vinculada. A lista completa
                  // resolve o caso normal; os candidatos que a própria linha carrega cobrem a
                  // live que, por qualquer motivo, não esteja na lista — sem esse fallback o
                  // botão dizia "Escolher live…" numa linha já vinculada, e o operador
                  // desvinculava achando que tinha se perdido.
                  const matchedId = asString(row.matched_live_id, '')
                  const liveVinculada = matchedId
                    ? livesLista.find((live) => asString(live.id) === matchedId)
                      ?? asArray<JsonRecord>(row.candidates).find((c) => asString(c.live_id) === matchedId)
                    : undefined

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
                      <td className="px-3 py-2 text-right font-semibold text-ink">{gmvPresence === 'missing' ? <span className="text-xs font-medium text-ink-muted">Não informado</span> : <><span>{formatMoney(gmv)}</span>{gmvPresence === 'zero' ? <span className="mt-0.5 block text-[10px] font-medium text-ink-muted">Zero informado</span> : null}</>}</td>
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
                        {/* Também em 'pendente': é o estado em que nascem as linhas sem match,
                            justamente as que precisam de vinculação manual — e é para onde
                            "Desvincular" devolve a linha. Escondê-lo aqui trancava as duas. */}
                        {decisao === 'vincular' || decisao === 'pendente' ? (
                          <button
                            type="button"
                            className="mt-1 flex w-full items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-left text-[11px] font-semibold text-ink-muted hover:bg-surface-muted disabled:opacity-50"
                            disabled={isApplied || rowMutation.isPending}
                            onClick={() => setVincularRow(row)}
                          >
                            <Link2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {liveVinculada
                                ? `${asString(liveVinculada.marca_nome, 'Live')} · ${new Date(asString(liveVinculada.iniciado_em)).toLocaleDateString('pt-BR')}`
                                : matchedId ? 'Live selecionada' : 'Escolher live…'}
                            </span>
                          </button>
                        ) : null}
                        {/* Também em 'pendente', pelo mesmo motivo do botão de vincular acima: é o
                            estado em que as linhas nascem. Preso a 'criar', o seletor só existia
                            depois de uma escolha que o usuário ainda não tinha feito — a confirmação
                            de cabine ficava invisível na tela em que ela deveria ser óbvia.
                            Em 'vincular' fica escondido de propósito: ali a live já existe e tem
                            cabine própria; o apply ignora este campo (resolveTargetLive só usa
                            cabine_id quando cria a live). Mostrá-lo prometeria algo que não acontece. */}
                        {decisao === 'criar' || decisao === 'pendente' ? (
                          <select
                            className="design-input mt-1 h-9 w-full px-2 text-xs"
                            value={asString(row.cabine_id, '')}
                            disabled={isApplied || rowMutation.isPending}
                            onChange={(event) => setCabine(row, event.target.value)}
                          >
                            <option value="">Cabine: automática</option>
                            {cabinesLista.map((cabine) => (
                              <option key={asString(cabine.id)} value={asString(cabine.id)}>
                                Cabine {asString(cabine.numero, '—')}
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
                          {rateio.length > 1
                            ? `${rateio.length} · dividido`
                            : rateio.length === 1 ? '1 apresentadora' : 'Definir'}
                        </button>
                        {rateio.length > 1 ? (
                          <p className="mt-1 text-[10px] leading-tight text-ink-muted">
                            {rateio.map((item) => formatDuracao(asNumber(item.segundos))).join(' · ')}
                          </p>
                        ) : null}
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
        <ImportRateioModal
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

      {vincularRow ? (
        <ImportVincularLiveModal
          row={vincularRow}
          lives={livesLista}
          // A própria linha não conta como conflito: reescolher a mesma live é permitido.
          usadas={new Map([...livesReservadas].filter(([, index]) => index !== asNumber(vincularRow.row_index)))}
          onClose={() => setVincularRow(null)}
          onSelect={(liveId) => setMatchedLive(vincularRow, liveId)}
          isSaving={rowMutation.isPending}
        />
      ) : null}
    </Card>
  )
}
