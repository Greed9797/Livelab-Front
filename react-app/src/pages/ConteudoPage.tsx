import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { useToast } from '../components/ui/Toast'
import { ImportRateioModal } from '../components/analytics/ImportRateioModal'
import { calcDuration, type LivePendingKind } from '../components/conteudo/live-helpers'
import { officialLiveGmv } from '../utils/live-gmv'
import { LoadingState, ErrorState } from '../components/ui/States'
import { RegistrarMetricasLiveModal, type RegistrarMetricasLiveMode } from '../components/forms/RegistrarMetricasLiveModal'
import { EditarLiveModal } from '../components/forms/EditarLiveModal'
import { AgendaTab } from '../components/conteudo/AgendaTab'
import { GradeTab } from '../components/conteudo/GradeTab'
import { agendaContextQueryParams, agendaFetchRange, parseConteudoLivesDeepLink } from './conteudo-helpers'
import { invalidateOperational as invalidateOperationalQueries, QK } from '../services/query-keys'
// Helpers pequenos ficam fora da lista lazy de Lives.
import { dateRangeToWindow, isValidCustomDateRange, type DateRange } from '../components/conteudo/live-date-range'

// Abas pesadas carregadas sob demanda — só baixam o chunk quando a aba é aberta.
const LivesTab = lazy(() => import('../components/conteudo/LivesTab').then((m) => ({ default: m.LivesTab })))
import {
  createAgendaEvento,
  criarLiveManual,
  deleteAgendaEvento,
  deleteLive,
  encerrarLive,
  getAgenda,
  getApresentadoras,
  getCabines,
  getClientes,
  getLivePorId,
  getLives,
  getLivesPaginado,
  getLivesDuplicatas,
  type ImportApresentadoraRateio,
  getMarcas,
  getMarca,
  updateAgendaEvento,
  updateLive,
} from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asString } from '../utils/format'
import { canWrite } from '../utils/access'
import { useCurrentUser } from '../stores/auth-store'
import type { JsonRecord } from '../types/models'
import type { AgendarLiveModalMode } from '../components/forms/AgendarLiveModal'

export function shouldOpenLiveDetail({
  selectedLiveId,
  hasSelectedLive,
  liveModalMode,
  metricsModalMode,
  dismissedLiveId,
}: {
  selectedLiveId: string
  hasSelectedLive: boolean
  liveModalMode: string | null
  metricsModalMode: string | null
  dismissedLiveId: string | null
}) {
  return Boolean(selectedLiveId && hasSelectedLive && !liveModalMode && !metricsModalMode && dismissedLiveId !== selectedLiveId)
}

export function isLatestLiveEditRequest(request: number, latestRequest: number): boolean {
  return request === latestRequest
}

type ConteudoTab = 'agenda' | 'lives'

// Rollback rápido da Grade visual: true volta a renderizar a AgendaTab antiga.
// Remover junto com a AgendaTab na fase 4 (pós-validação em produção).
const USE_LEGACY_AGENDA = false

const today = () => new Date().toISOString().slice(0, 10)

function parseLiveDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function liveStartDate(live: JsonRecord): Date | null {
  return parseLiveDate(live.iniciado_em ?? live.agenda_data_inicio)
}

function liveEndDate(live: JsonRecord): Date | null {
  return parseLiveDate(live.encerrado_em ?? live.agenda_data_fim ?? live.previsto_fim)
}

export function isSyntheticLiveEvent(item: JsonRecord) {
  return item._source === 'live_orphan'
}

function buildLiveAgendaFallback(live: JsonRecord, cabines: JsonRecord[]): JsonRecord | null {
  const inicio = liveStartDate(live)
  const fim = liveEndDate(live)
  const liveId = asString(live.id, '')
  if (!liveId || !inicio || !fim || fim <= inicio) return null
  const cabineId = asString(live.cabine_id, '')
  const cabine = cabines.find((item) => asString(item.id, '') === cabineId)
  return {
    _source: 'live_orphan',
    id: `live:${liveId}`,
    live_id: liveId,
    tipo: 'live',
    status: 'concluido',
    data_inicio: inicio.toISOString(),
    data_fim: fim.toISOString(),
    marca_id: live.marca_id,
    marca_nome: live.marca_nome ?? live.cliente_nome,
    marca_cor: live.marca_cor,
    marca_logo_url: live.marca_logo_url,
    marca_site: live.marca_site,
    cliente_nome: live.cliente_nome,
    cabine_id: cabineId,
    cabine_numero: live.cabine_numero ?? cabine?.numero,
    cabine_nome: live.cabine_nome ?? (cabine ? `Cabine ${asString(cabine.numero, '')}` : undefined),
    apresentadora_nome: live.apresentadora_nome ?? live.apresentador_nome,
    tiktok_username: live.tiktok_username,
    observacoes: 'Live registrada sem evento de agenda vinculado.',
  }
}

function mergeAgendaWithLiveFallbacks(
  agendaRows: JsonRecord[],
  livesRows: JsonRecord[],
  cabines: JsonRecord[],
  range: { start: string; end: string },
) {
  const linkedLiveIds = new Set(agendaRows.map((e) => asString(e.live_id, '')).filter(Boolean))
  const linkedAgendaIds = new Set(agendaRows.map((e) => asString(e.id, '')).filter(Boolean))
  const rangeStart = new Date(range.start)
  const rangeEnd = new Date(range.end)
  const fallbacks = livesRows
    .filter((live) => {
      const liveId = asString(live.id, '')
      const agendaId = asString(live.agenda_evento_id, '')
      if (!liveId || linkedLiveIds.has(liveId) || (agendaId && linkedAgendaIds.has(agendaId))) return false
      const start = liveStartDate(live)
      const end = liveEndDate(live)
      return Boolean(start && end && start < rangeEnd && end > rangeStart)
    })
    .map((live) => buildLiveAgendaFallback(live, cabines))
    .filter((event): event is JsonRecord => Boolean(event))
  return [...agendaRows, ...fallbacks]
}

export function ConteudoPage({ view = 'agenda' }: { view?: ConteudoTab }) {
  // Papéis read-only (auditor, suporte, marketing, comercial_readonly, …) chegam nesta
  // página para consultar; escondemos as ações de escrita em vez de deixar o backend 403.
  const podeEscrever = canWrite(useCurrentUser())
  const [params, setParams] = useSearchParams()
  const livesDeepLink = parseConteudoLivesDeepLink(params)
  const requestedTab = view
  const requestedCabineId = livesDeepLink.cabineId
  const requestedDate = params.get('data') ?? ''
  const tab = requestedTab
  const [agendaDate, setAgendaDate] = useState(requestedDate || livesDeepLink.dateFrom || today())
  const [agendaView, setAgendaView] = useState<'dia' | 'semana' | 'mes'>('semana')
  const [agendaModalMode, setAgendaModalMode] = useState<AgendarLiveModalMode | null>(null)
  const [selectedAgendaEvent, setSelectedAgendaEvent] = useState<JsonRecord | null>(null)
  const [fetchingAgendaLive, setFetchingAgendaLive] = useState(false)
  const [metricsModalMode, setMetricsModalMode] = useState<RegistrarMetricasLiveMode | null>(null)
  const [editLiveData, setEditLiveData] = useState<JsonRecord | null>(null)
  const editLiveRequestRef = useRef(0)
  const [metricsAgendaEvent, setMetricsAgendaEvent] = useState<JsonRecord | null>(null)
  const [liveModalMode, setLiveModalMode] = useState<'detail' | null>(null)
  const [selectedLiveRecord, setSelectedLiveRecord] = useState<JsonRecord | null>(null)
  const dismissedLiveIdRef = useRef<string | null>(null)
  const [reportCopied, setReportCopied] = useState(false)
  // Live aberta no modal de rateio, já hidratada por getLivePorId (a linha da tabela não traz
  // o array `apresentadoras`, e abrir sem ele apagaria a divisão anterior ao salvar).
  const [rateioLive, setRateioLive] = useState<JsonRecord | null>(null)
  const client = useQueryClient()
  const toast = useToast()

  // Um único ponto de entrada do rateio: o modal de detalhe e o de edição chamam o MESMO
  // caminho, então a live sempre chega hidratada por getLivePorId. Duas portas com regras
  // próprias para o mesmo dinheiro é como a divisão anterior era apagada ao salvar.
  function abrirRateio(live: JsonRecord) {
    const id = asString(live.id, '')
    if (!id) return
    void getLivePorId(id)
      .then((fullLive) => setRateioLive(fullLive as unknown as JsonRecord))
      .catch((err) => toast.push(extractErrorMessage(err), 'error'))
  }

  function openLiveForEditing(live: JsonRecord, options?: { onError?: () => void; onSettled?: () => void }) {
    const request = ++editLiveRequestRef.current
    // Uma abertura pela lista também invalida qualquer carregamento visual da Agenda que
    // tenha ficado para trás. Sem isso, a resposta antiga é descartada mas o spinner segue.
    if (!options?.onSettled) setFetchingAgendaLive(false)
    const id = asString(live.id, '')
    const isCurrent = () => isLatestLiveEditRequest(request, editLiveRequestRef.current)
    if (!id) {
      if (isCurrent()) setEditLiveData(live)
      options?.onSettled?.()
      return
    }
    void getLivePorId(id)
      .then((fullLive) => { if (isCurrent()) setEditLiveData(fullLive as unknown as JsonRecord) })
      .catch(() => {
        if (!isCurrent()) return
        if (options?.onError) options.onError()
        else setEditLiveData(live)
      })
      .finally(() => { if (isCurrent()) options?.onSettled?.() })
  }

  // Filtros/busca/página da aba "Lives realizadas" vivem na URL (searchParams) —
  // sobrevivem a navegação, abrir/fechar do modal ?live= e deep-links.
  const rawRange = params.get('periodo') ?? (livesDeepLink.dateFrom && livesDeepLink.dateTo ? 'custom' : 'todos')
  const livesDateRange: DateRange = (['todos', 'hoje', '7d', '30d', 'mes', 'custom'] as const).includes(rawRange as DateRange)
    ? (rawRange as DateRange)
    : 'todos'
  const livesCustomFrom = livesDeepLink.dateFrom
  const livesCustomTo = livesDeepLink.dateTo
  const livesCustomRangeValid = isValidCustomDateRange(livesCustomFrom, livesCustomTo, today())
  const livesCustomRangeError = livesDateRange === 'custom' && !livesCustomRangeValid
    ? 'Selecione uma data inicial e final válidas.'
    : undefined
  const livesMarcaId = livesDeepLink.marcaId
  const livesCabineId = livesDeepLink.cabineId
  const livesPending: LivePendingKind | '' = livesDeepLink.pending
  const livesApresentadoraId = params.get('apres') ?? ''
  const livesQ = params.get('q') ?? ''
  const livesStatus = params.get('st') ?? 'encerrada' // 'todas' = sem filtro de status
  const livesPage = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
  const rawPp = Number.parseInt(params.get('pp') ?? '', 10)
  const livesLimit = [10, 25, 50, 100].includes(rawPp) ? rawPp : 25

  // Aplica um patch nos searchParams das lives; mudança de filtro/busca reseta a página.
  function setLivesParams(patch: Record<string, string | null>, { resetPage = true } = {}) {
    const next = new URLSearchParams(params)
    if (resetPage) next.delete('page')
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  const legacyAgendaEnabled = USE_LEGACY_AGENDA && tab === 'agenda'
  const range = agendaFetchRange(agendaDate, agendaView)
  // A Grade tem consultas próprias. AgendaTab e os fallbacks de lives só existem no
  // rollback legado; deixá-los ativos atrasava a Grade e baixava até 200 lives inúteis.
  const agenda = useQuery({
    queryKey: ['agenda', agendaDate, agendaView],
    queryFn: () => getAgenda({ data_inicio: range.start, data_fim: range.end }),
    enabled: legacyAgendaEnabled,
    placeholderData: (prev) => prev,
  })
  // O formulário de métricas pode abrir a partir da lista de Lives; mantemos as
  // cabines pré-carregadas para ele nunca parecer sem opções em rede lenta.
  const cabines = useQuery({ queryKey: ['cabines'], queryFn: getCabines })
  const legacyLives = useQuery({
    queryKey: ['lives', 'encerrada'],
    queryFn: () => getLives({ status: 'encerrada', limit: 200 }),
    enabled: legacyAgendaEnabled,
    placeholderData: (prev) => prev,
  })
  // Lista da aba "Lives realizadas" — paginada e filtrada server-side (separada da
  // query `lives` acima, que segue completa para alimentar a Agenda e o lookup por ?live=).
  const livesWindow = dateRangeToWindow(livesDateRange, livesCustomFrom, livesCustomTo)
  const livesList = useQuery({
    queryKey: ['lives', 'list', livesStatus, livesDateRange, livesCustomFrom, livesCustomTo, livesMarcaId, livesApresentadoraId, livesCabineId, livesQ, livesPage, livesLimit],
    queryFn: () => getLivesPaginado({
      status: livesStatus === 'todas' ? undefined : livesStatus,
      page: livesPage,
      limit: livesLimit,
      q: livesQ || undefined,
      ...livesWindow,
      marca_id: livesMarcaId || undefined,
      apresentadora_id: livesApresentadoraId || undefined,
      cabine_id: livesCabineId || undefined,
    }),
    enabled: tab === 'lives' && (livesDateRange !== 'custom' || livesCustomRangeValid),
    placeholderData: (prev) => prev,
  })
  const livesItems = livesList.data?.items ?? []
  const livesTotal = livesList.data?.total ?? 0

  // Página fora do alcance (deep-link antigo, filtro que encolheu o total) → volta à primeira.
  useEffect(() => {
    if (!livesList.data || livesList.isPlaceholderData) return
    if (livesList.data.items.length === 0 && livesPage > 0) setLivesParams({}, { resetPage: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livesList.data, livesList.isPlaceholderData, livesPage])
  const duplicatas = useQuery({ queryKey: ['lives-duplicatas'], queryFn: getLivesDuplicatas, enabled: tab === 'lives', staleTime: 5 * 60_000 })
  const marcas = useQuery({ queryKey: ['marcas', 'ativas'], queryFn: () => getMarcas({ status: 'ativa' }) })
  // Uma reserva existente pode pertencer a uma marca inativa, ausente do seletor de novas lives.
  const metricsMarcaId = metricsModalMode === 'result' ? asString(metricsAgendaEvent?.marca_id, '') : ''
  const metricsMarcaMissing = Boolean(metricsMarcaId) && !(marcas.data ?? []).some((item) => asString(item.id, '') === metricsMarcaId)
  const metricsMarca = useQuery({
    queryKey: ['marcas', 'detalhe', metricsMarcaId],
    queryFn: () => getMarca(metricsMarcaId),
    enabled: metricsMarcaMissing && !marcas.isPending,
  })
  const clientes = useQuery({ queryKey: ['clientes'], queryFn: () => getClientes() })
  const apresentadoras = useQuery({ queryKey: ['apresentadoras'], queryFn: getApresentadoras })

  // O link da Grade pode pedir o resultado de uma reserva. Esta leitura é pontual e
  // conserva o fluxo mesmo com a Agenda legada desligada, sem reativar o range inteiro.
  const contextAgenda = useQuery({
    queryKey: ['agenda', 'context', livesDeepLink.agendaId, livesDeepLink.dateFrom, livesDeepLink.dateTo, livesDeepLink.cabineId],
    queryFn: () => getAgenda(agendaContextQueryParams(livesDeepLink)),
    enabled: tab === 'lives' && Boolean(livesDeepLink.agendaId),
  })

  function invalidateOperational() {
    invalidateOperationalQueries(client)
  }

  function closeAgendaModal() { setAgendaModalMode(null); setSelectedAgendaEvent(null); invalidateOperational() }
  function closeMetrics() { setMetricsModalMode(null); setMetricsAgendaEvent(null); setSelectedLiveRecord(null); invalidateOperational() }
  function closeLiveRecord() { setLiveModalMode(null); setSelectedLiveRecord(null); invalidateOperational() }

  // Estas duas NÃO fecham o modal: quem fecha é o próprio AgendarLiveModal, e só
  // depois de gravar os turnos do revezamento (PUT em segundo passo). Fechar aqui
  // descartava o revezamento com toast de sucesso — mesmo contrato da GradeTab.
  const createAgendaMutation = useMutation({ mutationFn: createAgendaEvento, onSuccess: invalidateOperational })
  const updateAgendaMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateAgendaEvento(id, payload), onSuccess: invalidateOperational })
  const deleteAgendaMutation = useMutation({ mutationFn: ({ id, modoRecorrencia }: { id: string; modoRecorrencia: string }) => deleteAgendaEvento(id, { modo_recorrencia: modoRecorrencia }), onSuccess: closeAgendaModal })
  const createManualLiveMutation = useMutation({ mutationFn: criarLiveManual, onSuccess: closeMetrics })
  const updateLiveMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateLive(id, payload), onSuccess: () => { setMetricsModalMode(null); setSelectedLiveRecord(null); invalidateOperational() } })
  const encerrarLiveMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => encerrarLive(id, payload), onSuccess: () => { setMetricsModalMode(null); setMetricsAgendaEvent(null); invalidateOperational() } })
  const deleteLiveMutation = useMutation({ mutationFn: deleteLive, onSuccess: closeLiveRecord })
  // Rateio da live entre apresentadoras. O backend salva rateio e atribuições/comissões na
  // mesma transação, então a invalidação abaixo nunca expõe uma leitura híbrida.
  const rateioMutation = useMutation({
    mutationFn: ({ id, lista }: { id: string; lista: ImportApresentadoraRateio[] }) =>
      updateLive(id, { apresentadoras: lista }),
    onSuccess: () => {
      setRateioLive(null)
      invalidateOperational()
      toast.push('Divisão salva. As comissões foram recalculadas.', 'success')
    },
    onError: (err) => toast.push(extractErrorMessage(err), 'error'),
  })

  useEffect(() => {
    if (requestedDate || livesDeepLink.dateFrom) setAgendaDate(requestedDate || livesDeepLink.dateFrom)
    if (requestedCabineId && requestedTab === 'agenda') { setSelectedAgendaEvent(null); setAgendaModalMode('create') }
  }, [livesDeepLink.dateFrom, requestedCabineId, requestedDate, requestedTab])

  // Aceita os aliases antigos usados por atalhos externos e estabiliza a URL no contrato
  // atual sem apagar contexto (cabine/live/agenda/origem) recebido da tela anterior.
  useEffect(() => {
    if (requestedTab !== 'lives') return
    const next = new URLSearchParams(params)
    let changed = false
    if (!next.get('marca') && next.get('marca_id')) {
      next.set('marca', next.get('marca_id')!)
      next.delete('marca_id')
      changed = true
    }
    if (next.get('data') && !next.get('data_inicio') && !next.get('data_fim')) {
      next.set('periodo', 'custom')
      next.set('data_inicio', next.get('data')!)
      next.set('data_fim', next.get('data')!)
      changed = true
    } else if (!next.get('periodo') && next.get('data_inicio') && next.get('data_fim')) {
      next.set('periodo', 'custom')
      changed = true
    }
    if (changed) setParams(next, { replace: true })
  }, [params, requestedTab, setParams])

  const selectedLiveId = livesDeepLink.liveId
  const selectedLiveLocal = useMemo(() => {
    if (!selectedLiveId) return null
    const rows = (legacyLives.data ?? []) as unknown as JsonRecord[]
    return rows.find((live) => asString(live.id, '') === selectedLiveId)
      ?? livesItems.find((live) => asString(live.id, '') === selectedLiveId)
      ?? null
  }, [legacyLives.data, livesItems, selectedLiveId])

  // A live do ?live= pode não estar em NENHUMA das duas listas: `lives.data` é o top-200 de
  // encerradas (medido em produção, esse corte começa em 11/08 e anda sozinho conforme lives
  // novas entram) e `livesItems` é só a página aberta. Clicar na tabela funcionava porque o
  // handler passa a linha inteira, mas abrir por link ou dar F5 numa live mais antiga que o
  // corte não abria nada — a tela ficava na listagem, sem erro nenhum. Buscar por id cobre o
  // caso sem endpoint novo.
  const selectedLiveRemota = useQuery({
    queryKey: QK.live(selectedLiveId),
    queryFn: () => getLivePorId(selectedLiveId),
    enabled: Boolean(selectedLiveId),
  })
  const selectedLive = ((selectedLiveRemota.data ?? null) as JsonRecord | null) ?? selectedLiveLocal

  useEffect(() => {
    if (!selectedLiveId) {
      dismissedLiveIdRef.current = null
      return
    }
    if (dismissedLiveIdRef.current && dismissedLiveIdRef.current !== selectedLiveId) dismissedLiveIdRef.current = null
    if (!shouldOpenLiveDetail({ selectedLiveId, hasSelectedLive: Boolean(selectedLive), liveModalMode, metricsModalMode, dismissedLiveId: dismissedLiveIdRef.current })) return
    setSelectedLiveRecord(selectedLive)
    setLiveModalMode('detail')
  }, [liveModalMode, metricsModalMode, selectedLive, selectedLiveId])

  // O modal de detalhe lia direto de selectedLiveRecord, que é uma CÓPIA da linha tirada no
  // momento da abertura. Depois de salvar, invalidateOperational atualiza a tabela atrás do
  // modal, mas a cópia continua com o valor antigo — e era ela que alimentava o prefill da
  // edição. Aqui a live é re-derivada da lista já atualizada, caindo na cópia só como fallback.
  //
  // Deriva de livesItems (a lista paginada realmente exibida) e não de lives.data, que é um
  // top-200 de encerradas: uma live de 33 dias pode estar fora dele e o detalhe abriria vazio.
  const selectedLiveFresco = useMemo(() => {
    if (!selectedLiveRecord) return null
    const id = asString(selectedLiveRecord.id, '')
    if (!id) return selectedLiveRecord
    const remote = (selectedLiveRemota.data ?? null) as JsonRecord | null
    if (remote && asString(remote.id, '') === id) return remote
    return livesItems.find((live) => asString(live.id, '') === id) ?? selectedLiveRecord
  }, [livesItems, selectedLiveRecord, selectedLiveRemota.data])

  // As cabines definem a matriz visível da Grade; aguardá-las evita uma tela vazia
  // que parece não haver cabines. Agenda e o top-200 seguem exclusivos do rollback.
  const isLoading = tab === 'agenda' && (cabines.isLoading || (legacyAgendaEnabled && agenda.isLoading))
  const error = tab === 'agenda' ? (cabines.error ?? (legacyAgendaEnabled ? agenda.error : null)) : null
  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={() => {
    void cabines.refetch()
    if (legacyAgendaEnabled) void agenda.refetch()
  }} />

  const cabineRows = cabines.data ?? []
  const activeCabines = cabineRows.filter((c) => (c as unknown as JsonRecord).ativo !== false && asString(c.status, '') !== 'inativa')
  const agendaRows = legacyAgendaEnabled
    ? mergeAgendaWithLiveFallbacks(agenda.data ?? [], legacyLives.data ?? [], cabineRows as unknown as JsonRecord[], range)
    : []
  const marcaRows = marcas.data ?? []
  const clienteRows = clientes.data ?? []
  const apresentadoraRows = apresentadoras.data ?? []
  const dupClusters = Array.isArray((duplicatas.data as JsonRecord | undefined)?.clusters)
    ? ((duplicatas.data as JsonRecord).clusters as JsonRecord[])
    : []
  const duplicateLiveIds = Array.from(new Set(
    dupClusters.flatMap((cluster) => {
      const lives = Array.isArray((cluster as JsonRecord).lives) ? ((cluster as JsonRecord).lives as JsonRecord[]) : []
      return lives.map((live) => asString(live.id, '')).filter(Boolean)
    }),
  ))
  const marcaFilterOptions = marcaRows.map((m) => ({ id: asString(m.id, ''), nome: asString(m.nome, 'Sem nome') })).filter((m) => m.id)
  const apresentadoraFilterOptions = apresentadoraRows.map((a) => ({ id: asString(a.id, ''), nome: asString(a.nome, 'Sem nome') })).filter((a) => a.id)
  const contextAgendaEvent = livesDeepLink.agendaId
    ? (contextAgenda.data ?? []).find((event) => asString(event.id, '') === livesDeepLink.agendaId) ?? null
    : null

  function openEditAgendaModal(event: JsonRecord) {
    if (isSyntheticLiveEvent(event)) {
      const live = (legacyLives.data ?? []).find((item) => asString(item.id, '') === asString(event.live_id, ''))
      if (live) { setSelectedLiveRecord(live); setLiveModalMode('detail'); setLivesParams({ live: asString(live.id, '') }, { resetPage: false }) }
      return
    }
    if (asString(event.status) === 'ao_vivo' && event.live_id) {
      setFetchingAgendaLive(true)
      openLiveForEditing({ ...event, id: asString(event.live_id, '') }, {
        onError: () => { setSelectedAgendaEvent(event); setAgendaModalMode('edit') },
        onSettled: () => setFetchingAgendaLive(false),
      })
      return
    }
    setSelectedAgendaEvent(event)
    setAgendaModalMode('edit')
  }

  const metricError = createManualLiveMutation.error ?? updateLiveMutation.error ?? encerrarLiveMutation.error

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação"
        title={tab === 'agenda' ? 'Agenda' : 'Lives'}
        subtitle={tab === 'agenda' ? 'Programação das cabines e apresentadoras.' : 'Resultados, registros e métricas das lives.'}
      />

      {tab === 'agenda' && !USE_LEGACY_AGENDA ? (
        <GradeTab
          key={`${requestedDate}:${livesMarcaId}`}
          initialDate={requestedDate}
          initialMarcaId={livesMarcaId}
          activeCabines={activeCabines as unknown as JsonRecord[]}
          marcaRows={marcaRows}
          apresentadoraRows={apresentadoraRows}
          canWrite={podeEscrever}
        />
      ) : null}

      {tab === 'agenda' && USE_LEGACY_AGENDA ? (
        <AgendaTab
          agendaDate={agendaDate}
          agendaView={agendaView}
          agendaRows={agendaRows}
          activeCabines={activeCabines}
          marcaRows={marcaRows}
          clienteRows={clienteRows}
          apresentadoraRows={apresentadoraRows}
          agendaModalMode={agendaModalMode}
          selectedAgendaEvent={selectedAgendaEvent}
          fetchingAgendaLive={fetchingAgendaLive}
          requestedDate={requestedDate}
          requestedCabineId={requestedCabineId}
          createAgendaMutation={createAgendaMutation}
          updateAgendaMutation={updateAgendaMutation}
          deleteAgendaMutation={deleteAgendaMutation}
          onAgendaDateChange={setAgendaDate}
          onAgendaViewChange={setAgendaView}
          onOpenCreateAgendaModal={() => { setSelectedAgendaEvent(null); setAgendaModalMode('create') }}
          onOpenEditAgendaModal={openEditAgendaModal}
          onOpenRegisterResult={(event) => { setMetricsAgendaEvent(event); setSelectedLiveRecord(null); setMetricsModalMode('result') }}
          onCloseAgendaModal={closeAgendaModal}
          // mutateAsync (não mutate): é a Promise que habilita o segundo passo do
          // revezamento dentro do modal. Com mutate o turno era descartado calado.
          onCreateAgenda={(payload) => createAgendaMutation.mutateAsync(payload)}
          onUpdateAgenda={(id, payload) => updateAgendaMutation.mutateAsync({ id, payload })}
          onDeleteAgenda={(id, modoRecorrencia) => deleteAgendaMutation.mutate({ id, modoRecorrencia })}
        />
      ) : null}

      {tab === 'lives' ? (
        <Suspense fallback={<LoadingState />}>
        <LivesTab
          canWrite={podeEscrever}
          livesData={livesItems}
          dateRange={livesDateRange}
          onDateRangeChange={(range) => {
            if (range === 'custom') {
              const currentToday = today()
              setLivesParams({ periodo: range, data_inicio: currentToday, data_fim: currentToday })
              return
            }
            setLivesParams({ periodo: range === 'todos' ? null : range, data_inicio: null, data_fim: null })
          }}
          customDateFrom={livesCustomFrom}
          customDateTo={livesCustomTo}
          customDateError={livesCustomRangeError}
          onCustomDateFromChange={(value) => setLivesParams({ data_inicio: value || null })}
          onCustomDateToChange={(value) => setLivesParams({ data_fim: value || null })}
          marcaFilterId={livesMarcaId}
          cabineFilterId={livesCabineId}
          apresentadoraFilterId={livesApresentadoraId}
          onMarcaFilterChange={(id) => setLivesParams({ marca: id })}
          onApresentadoraFilterChange={(id) => setLivesParams({ apres: id })}
          marcaFilterOptions={marcaFilterOptions}
          apresentadoraFilterOptions={apresentadoraFilterOptions}
          onClearFilters={() => setLivesParams({ periodo: null, data: null, data_inicio: null, data_fim: null, marca: null, marca_id: null, cabine: null, apres: null, q: null, st: null, pendencia: null, agenda: null, origem: null })}
          searchQuery={livesQ}
          onSearchChange={(q) => setLivesParams({ q })}
          statusFilter={livesStatus}
          onStatusFilterChange={(st) => setLivesParams({ st: st === 'encerrada' ? null : st })}
          pendingFilter={livesPending}
          onPendingFilterChange={(pending) => setLivesParams({ pendencia: pending || null })}
          page={livesPage}
          pageSize={livesLimit}
          total={livesTotal}
          onPageChange={(page) => setLivesParams({ page: page > 0 ? String(page) : null }, { resetPage: false })}
          onPageSizeChange={(size) => setLivesParams({ pp: size === 25 ? null : String(size) })}
          liveModalMode={liveModalMode}
          selectedLiveRecord={selectedLiveFresco}
          reportCopied={reportCopied}
          deleteLiveMutation={deleteLiveMutation}
          onOpenCreateLiveModal={() => { setMetricsAgendaEvent(null); setSelectedLiveRecord(null); setMetricsModalMode('manual') }}
          // setLivesParams, não setParams com objeto literal: o literal reescrevia a query
          // string inteira e apagava periodo/marca/apres/q/st/page/pp — que é onde os filtros
          // moram. O usuário só percebia ao fechar o modal, porque ele cobre a tabela.
          onOpenLiveDetail={(live) => { setSelectedLiveRecord(live); setLiveModalMode('detail'); setLivesParams({ live: asString(live.id, '') }, { resetPage: false }) }}
          // Busca a live fresca por id em vez de reusar a linha da tabela. A cópia da linha
          // envelhece: depois de um save ela ainda carrega o GMV antigo, e como o modal de
          // edição é prefillado a partir dela, o save seguinte REGRAVA o valor velho por cima.
          // Aconteceu 3x em produção (ex.: 1817 → 2419 e, 378s depois, de volta para 1817).
          // Mesmo padrão já usado no caminho da Agenda logo acima.
          onOpenEditLive={(live) => {
            openLiveForEditing(live) // sem rede, editar com a linha disponível é melhor que travar
          }}
          onDeleteLive={(live) => {
            const label = asString(live.marca_nome ?? live.cliente_nome ?? live.id, 'live')
            if (!window.confirm(`Excluir a live "${label}"?`)) return
            deleteLiveMutation.mutate(asString(live.id, ''))
          }}
          onCloseLiveModal={() => {
            dismissedLiveIdRef.current = selectedLiveId
            setLiveModalMode(null); setSelectedLiveRecord(null); setReportCopied(false)
            const nextParams = new URLSearchParams(params); nextParams.delete('live'); setParams(nextParams, { replace: true })
          }}
          onCopyLiveReport={(text) => void navigator.clipboard.writeText(text).then(() => { setReportCopied(true); setTimeout(() => setReportCopied(false), 2000) })}
          onInlineSaveLive={podeEscrever ? (id, payload) => updateLiveMutation.mutateAsync({ id, payload }) : undefined}
          onSplitApresentadoras={abrirRateio}
          duplicateLiveIds={duplicateLiveIds}
          duplicateClusterCount={dupClusters.length}
          isLoading={livesList.isLoading || livesList.isPlaceholderData || (livesPending === 'duplicata' && duplicatas.isLoading)}
          errorMessage={livesList.error
            ? extractErrorMessage(livesList.error)
            : livesPending === 'duplicata' && duplicatas.error
              ? extractErrorMessage(duplicatas.error)
              : undefined}
          onRetry={() => { void livesList.refetch(); void duplicatas.refetch() }}
          contextSource={livesDeepLink.source}
          contextAgendaId={livesDeepLink.agendaId}
          contextAgendaLoading={Boolean(livesDeepLink.agendaId) && contextAgenda.isLoading}
          duplicateStatus={duplicatas.isLoading ? 'loading' : duplicatas.error ? 'error' : 'ready'}
          onRegisterAgendaResult={podeEscrever && livesDeepLink.agendaId ? () => {
            if (!contextAgendaEvent) {
              toast.push('Evento da agenda não encontrado neste recorte.', 'error')
              return
            }
            setMetricsAgendaEvent(contextAgendaEvent)
            setSelectedLiveRecord(null)
            setMetricsModalMode('result')
          } : undefined}
          onBackContext={livesDeepLink.source ? () => window.history.back() : undefined}
          onClearContext={livesDeepLink.source ? () => setLivesParams({ periodo: null, data: null, data_inicio: null, data_fim: null, marca: null, marca_id: null, cabine: null, apres: null, q: null, st: null, pendencia: null, agenda: null, origem: null }) : undefined}
        />
        </Suspense>
      ) : null}

      {/* Fecha a edição antes de abrir o rateio: os dois mexem na mesma live, e deixar os
          dois abertos deixaria um salvar por cima do outro sem o operador ver. */}
      <EditarLiveModal
        open={Boolean(editLiveData)}
        live={editLiveData}
        onClose={() => setEditLiveData(null)}
        onDividir={(live) => { setEditLiveData(null); abrirRateio(live) }}
      />

      {/* Mesma tela de rateio da revisão do import — o contrato é o mesmo (R$ e tempo por
          apresentadora, fechando o total da live), então não existe um segundo componente
          com uma segunda regra para o mesmo dinheiro. */}
      {rateioLive ? (
        <ImportRateioModal
          row={{
            duration_seconds: calcDuration(rateioLive).mins * 60,
            attributed_gmv: officialLiveGmv(rateioLive),
            apresentadoras: rateioLive.apresentadoras,
          }}
          apresentadoras={apresentadoraRows as unknown as JsonRecord[]}
          onClose={() => setRateioLive(null)}
          onSave={(lista) => rateioMutation.mutate({ id: asString(rateioLive.id, ''), lista })}
          isSaving={rateioMutation.isPending}
        />
      ) : null}

      <RegistrarMetricasLiveModal
        open={metricsModalMode !== null}
        mode={metricsModalMode ?? 'manual'}
        live={selectedLiveRecord}
        agendaEvent={metricsAgendaEvent}
        cabines={activeCabines}
        marcas={metricsMarcaMissing && metricsMarca.data ? [...marcaRows, metricsMarca.data] : marcaRows}
        marcaLoading={marcas.isPending || (metricsMarcaMissing && metricsMarca.isFetching)}
        marcaError={metricsMarcaMissing && metricsMarca.isError}
        onRetryMarca={() => { void metricsMarca.refetch() }}
        clientes={clienteRows}
        apresentadoras={apresentadoraRows}
        isSaving={createManualLiveMutation.isPending || updateLiveMutation.isPending || encerrarLiveMutation.isPending}
        error={metricError}
        onClose={() => { setMetricsModalMode(null); setMetricsAgendaEvent(null); setSelectedLiveRecord(null) }}
        onCreateManual={(payload) => createManualLiveMutation.mutate(payload)}
        onCreateResultFromAgenda={(payload) => createManualLiveMutation.mutate(payload)}
        onUpdateLive={(id, payload) => updateLiveMutation.mutate({ id, payload })}
        onCloseLive={(id, payload) => encerrarLiveMutation.mutate({ id, payload })}
      />


    </div>
  )
}
