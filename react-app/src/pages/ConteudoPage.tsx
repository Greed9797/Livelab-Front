import { CalendarClock, MonitorPlay, Video } from 'lucide-react'
import { FormEvent, Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { useToast } from '../components/ui/Toast'
import { ImportRateioModal } from '../components/analytics/ImportRateioModal'
import { calcDuration } from '../components/conteudo/live-helpers'
import { officialLiveGmv } from '../utils/live-gmv'
import { LoadingState, ErrorState } from '../components/ui/States'
import { RegistrarMetricasLiveModal, type RegistrarMetricasLiveMode } from '../components/forms/RegistrarMetricasLiveModal'
import { EditarLiveModal } from '../components/forms/EditarLiveModal'
import { AgendaTab } from '../components/conteudo/AgendaTab'
import { GradeTab } from '../components/conteudo/GradeTab'
import { agendaFetchRange } from './conteudo-helpers'
import { invalidateOperational as invalidateOperationalQueries, QK } from '../services/query-keys'
// Tipos/helpers leves importados estaticamente; os componentes pesados das abas
// são carregados sob demanda via React.lazy (ver abaixo) para reduzir o chunk inicial.
import { dateRangeToWindow, isValidCustomDateRange, type DateRange } from '../components/conteudo/LivesTab'
import { emptyVideo, type VideoForm } from '../components/conteudo/VideosTab'

// Abas pesadas carregadas sob demanda — só baixam o chunk quando a aba é aberta.
const LivesTab = lazy(() => import('../components/conteudo/LivesTab').then((m) => ({ default: m.LivesTab })))
const VideosTab = lazy(() => import('../components/conteudo/VideosTab').then((m) => ({ default: m.VideosTab })))
import {
  createAgendaEvento,
  createVideo,
  criarLiveManual,
  deleteAgendaEvento,
  deleteLive,
  deleteVideo,
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
  getVideos,
  updateAgendaEvento,
  updateLive,
  updateVideo,
} from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString } from '../utils/format'
import { canWrite } from '../utils/access'
import { useCurrentUser } from '../stores/auth-store'
import { parseBRMoneyToDecimal } from '../utils/money'
import type { JsonRecord } from '../types/models'
import type { AgendarLiveModalMode } from '../components/forms/AgendarLiveModal'

type ConteudoTab = 'agenda' | 'lives' | 'videos'

// Rollback rápido da Grade visual: true volta a renderizar a AgendaTab antiga.
// Remover junto com a AgendaTab na fase 4 (pós-validação em produção).
const USE_LEGACY_AGENDA = false

const today = () => new Date().toISOString().slice(0, 10)

function normalizeConteudoTab(value: string | null): ConteudoTab {
  // 'cabines'/'analytics' (abas removidas) e 'calendario' são deep links antigos → caem na Grade.
  if (['lives', 'videos'].includes(value ?? '')) return value as ConteudoTab
  return 'agenda'
}

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

export function ConteudoPage() {
  // Papéis read-only (auditor, suporte, marketing, comercial_readonly, …) chegam nesta
  // página para consultar; escondemos as ações de escrita em vez de deixar o backend 403.
  const podeEscrever = canWrite(useCurrentUser())
  const [params, setParams] = useSearchParams()
  const requestedTab = normalizeConteudoTab(params.get('tab'))
  const requestedCabineId = params.get('cabine') ?? ''
  const requestedDate = params.get('data') ?? ''
  const [tab, setTab] = useState<ConteudoTab>(requestedTab)
  const [agendaDate, setAgendaDate] = useState(requestedDate || today())
  const [agendaView, setAgendaView] = useState<'dia' | 'semana' | 'mes'>('semana')
  const [agendaModalMode, setAgendaModalMode] = useState<AgendarLiveModalMode | null>(null)
  const [selectedAgendaEvent, setSelectedAgendaEvent] = useState<JsonRecord | null>(null)
  const [fetchingAgendaLive, setFetchingAgendaLive] = useState(false)
  const [metricsModalMode, setMetricsModalMode] = useState<RegistrarMetricasLiveMode | null>(null)
  const [editLiveData, setEditLiveData] = useState<JsonRecord | null>(null)
  const [metricsAgendaEvent, setMetricsAgendaEvent] = useState<JsonRecord | null>(null)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [videoForm, setVideoForm] = useState<VideoForm>(emptyVideo)
  const [selectedVideo, setSelectedVideo] = useState<JsonRecord | null>(null)
  const [liveModalMode, setLiveModalMode] = useState<'detail' | null>(null)
  const [selectedLiveRecord, setSelectedLiveRecord] = useState<JsonRecord | null>(null)
  const [reportCopied, setReportCopied] = useState(false)
  // Live aberta no modal de rateio, já hidratada por getLivePorId (a linha da tabela não traz
  // o array `apresentadoras`, e abrir sem ele apagaria a divisão anterior ao salvar).
  const [rateioLive, setRateioLive] = useState<JsonRecord | null>(null)
  const client = useQueryClient()
  const toast = useToast()

  // Filtros/busca/página da aba "Lives realizadas" vivem na URL (searchParams) —
  // sobrevivem a navegação, abrir/fechar do modal ?live= e deep-links.
  const rawRange = params.get('periodo') ?? 'todos'
  const livesDateRange: DateRange = (['todos', 'hoje', '7d', '30d', 'mes', 'custom'] as const).includes(rawRange as DateRange)
    ? (rawRange as DateRange)
    : 'todos'
  const livesCustomFrom = params.get('data_inicio') ?? ''
  const livesCustomTo = params.get('data_fim') ?? ''
  const livesCustomRangeValid = isValidCustomDateRange(livesCustomFrom, livesCustomTo, today())
  const livesCustomRangeError = livesDateRange === 'custom' && !livesCustomRangeValid
    ? 'Selecione uma data inicial e final válidas.'
    : undefined
  const livesMarcaId = params.get('marca') ?? ''
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

  const range = agendaFetchRange(agendaDate, agendaView)
  const agenda = useQuery({ queryKey: ['agenda', agendaDate, agendaView], queryFn: () => getAgenda({ data_inicio: range.start, data_fim: range.end }), placeholderData: (prev) => prev })
  const cabines = useQuery({ queryKey: ['cabines'], queryFn: getCabines })
  const lives = useQuery({ queryKey: ['lives', 'encerrada'], queryFn: () => getLives({ status: 'encerrada', limit: 200 }), placeholderData: (prev) => prev })
  // Lista da aba "Lives realizadas" — paginada e filtrada server-side (separada da
  // query `lives` acima, que segue completa para alimentar a Agenda e o lookup por ?live=).
  const livesWindow = dateRangeToWindow(livesDateRange, livesCustomFrom, livesCustomTo)
  const livesList = useQuery({
    queryKey: ['lives', 'list', livesStatus, livesDateRange, livesCustomFrom, livesCustomTo, livesMarcaId, livesApresentadoraId, livesQ, livesPage, livesLimit],
    queryFn: () => getLivesPaginado({
      status: livesStatus === 'todas' ? undefined : livesStatus,
      page: livesPage,
      limit: livesLimit,
      q: livesQ || undefined,
      ...livesWindow,
      marca_id: livesMarcaId || undefined,
      apresentadora_id: livesApresentadoraId || undefined,
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
  const videos = useQuery({ queryKey: ['videos'], queryFn: () => getVideos(), enabled: tab === 'videos' })
  const marcas = useQuery({ queryKey: ['marcas', 'ativas'], queryFn: () => getMarcas({ status: 'ativa' }) })
  const clientes = useQuery({ queryKey: ['clientes'], queryFn: () => getClientes() })
  const apresentadoras = useQuery({ queryKey: ['apresentadoras'], queryFn: getApresentadoras })

  function invalidateOperational() {
    invalidateOperationalQueries(client)
  }

  function closeAgendaModal() { setAgendaModalMode(null); setSelectedAgendaEvent(null); invalidateOperational() }
  function closeVideoModal(resetForm = true) { if (resetForm) setVideoForm(emptyVideo); setSelectedVideo(null); setVideoModalOpen(false); invalidateOperational(); void client.invalidateQueries({ queryKey: ['videos'] }) }
  function closeMetrics() { setMetricsModalMode(null); setMetricsAgendaEvent(null); setSelectedLiveRecord(null); invalidateOperational() }
  function closeLiveRecord() { setLiveModalMode(null); setSelectedLiveRecord(null); invalidateOperational() }

  // Estas duas NÃO fecham o modal: quem fecha é o próprio AgendarLiveModal, e só
  // depois de gravar os turnos do revezamento (PUT em segundo passo). Fechar aqui
  // descartava o revezamento com toast de sucesso — mesmo contrato da GradeTab.
  const createAgendaMutation = useMutation({ mutationFn: createAgendaEvento, onSuccess: invalidateOperational })
  const updateAgendaMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateAgendaEvento(id, payload), onSuccess: invalidateOperational })
  const deleteAgendaMutation = useMutation({ mutationFn: ({ id, modoRecorrencia }: { id: string; modoRecorrencia: string }) => deleteAgendaEvento(id, { modo_recorrencia: modoRecorrencia }), onSuccess: closeAgendaModal })
  const createVideoMutation = useMutation({ mutationFn: createVideo, onSuccess: () => closeVideoModal() })
  const updateVideoMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateVideo(id, payload), onSuccess: () => closeVideoModal() })
  const deleteVideoMutation = useMutation({ mutationFn: deleteVideo, onSuccess: () => { invalidateOperational(); void client.invalidateQueries({ queryKey: ['videos'] }) } })
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

  useEffect(() => { setTab(requestedTab) }, [requestedTab])
  useEffect(() => {
    if (requestedDate) setAgendaDate(requestedDate)
    if (requestedCabineId) { setSelectedAgendaEvent(null); setAgendaModalMode('create') }
  }, [requestedCabineId, requestedDate])

  const selectedLiveId = params.get('live') ?? ''
  const selectedLiveLocal = useMemo(() => {
    if (!selectedLiveId) return null
    const rows = (lives.data ?? []) as unknown as JsonRecord[]
    return rows.find((live) => asString(live.id, '') === selectedLiveId)
      ?? livesItems.find((live) => asString(live.id, '') === selectedLiveId)
      ?? null
  }, [lives.data, livesItems, selectedLiveId])

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
    if (!selectedLive || liveModalMode || metricsModalMode) return
    setSelectedLiveRecord(selectedLive)
    setLiveModalMode('detail')
  }, [liveModalMode, metricsModalMode, selectedLive])

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

  // Bloqueia o primeiro paint apenas no que a aba ATUAL precisa.
  // Agenda (default) só precisa de agenda + cabines; marcas/clientes/apresentadoras/
  // videos/lives seguem buscando em background sem segurar o spinner de página inteira.
  // As demais abas (lives/videos/analytics) carregam o próprio chunk lazy + dados em background,
  // exibindo o fallback do <Suspense> — não há query bloqueante de página inteira para elas.
  const isLoading = tab === 'agenda' ? (agenda.isLoading || cabines.isLoading) : false
  const error = tab === 'agenda' ? (agenda.error ?? cabines.error) : null
  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={() => { void agenda.refetch(); void cabines.refetch() }} />

  const cabineRows = cabines.data ?? []
  const activeCabines = cabineRows.filter((c) => (c as unknown as JsonRecord).ativo !== false && asString(c.status, '') !== 'inativa')
  const agendaRows = mergeAgendaWithLiveFallbacks(agenda.data ?? [], lives.data ?? [], cabineRows as unknown as JsonRecord[], range)
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

  function switchTab(next: ConteudoTab) {
    setTab(next)
    const nextParams = new URLSearchParams(params)
    if (next === 'agenda') nextParams.delete('tab')
    else nextParams.set('tab', next)
    setParams(nextParams, { replace: true })
  }

  function openEditAgendaModal(event: JsonRecord) {
    if (isSyntheticLiveEvent(event)) {
      const live = (lives.data ?? []).find((item) => asString(item.id, '') === asString(event.live_id, ''))
      if (live) { setSelectedLiveRecord(live); setLiveModalMode('detail'); setLivesParams({ live: asString(live.id, '') }, { resetPage: false }) }
      return
    }
    if (asString(event.status) === 'ao_vivo' && event.live_id) {
      setFetchingAgendaLive(true)
      getLivePorId(asString(event.live_id, '')).then((fullLive) => {
        setEditLiveData(fullLive as unknown as JsonRecord)
      }).catch(() => { setSelectedAgendaEvent(event); setAgendaModalMode('edit') }).finally(() => setFetchingAgendaLive(false))
      return
    }
    setSelectedAgendaEvent(event)
    setAgendaModalMode('edit')
  }

  function openEditVideoModal(video: JsonRecord) {
    setSelectedVideo(video)
    setVideoForm({
      marca_id: asString(video.marca_id, ''),
      apresentadora_id: asString(video.apresentadora_id, ''),
      data: asString(video.data, today()).slice(0, 10),
      quantidade: asString(video.quantidade ?? 1, '1'),
      plataforma: asString(video.plataforma, 'tiktok'),
      campanha: asString(video.campanha, ''),
      gmv_atribuido: asString(video.gmv_atribuido ?? 0, '0'),
      pedidos_atribuidos: asString(video.pedidos_atribuidos ?? 0, '0'),
      observacoes: asString(video.observacoes, ''),
    })
    setVideoModalOpen(true)
  }

  function onVideoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = {
      ...videoForm,
      quantidade: asNumber(videoForm.quantidade),
      gmv_atribuido: parseBRMoneyToDecimal(videoForm.gmv_atribuido),
      pedidos_atribuidos: asNumber(videoForm.pedidos_atribuidos),
      apresentadora_id: videoForm.apresentadora_id || null,
      campanha: videoForm.campanha || null,
      observacoes: videoForm.observacoes || null,
    }
    if (selectedVideo) { updateVideoMutation.mutate({ id: asString(selectedVideo.id, ''), payload }); return }
    createVideoMutation.mutate(payload)
  }

  const metricError = createManualLiveMutation.error ?? updateLiveMutation.error ?? encerrarLiveMutation.error

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conteúdo"
        accent="Produção"
        title="operacional"
        subtitle="Grade por cabine, lives e vídeos em um fluxo único."
      />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-1">
        {([
          ['agenda', CalendarClock, 'Agenda'],
          ['lives', MonitorPlay, 'Lives realizadas'],
          ['videos', Video, 'Vídeos gravados'],
        ] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key
              ? 'inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface-muted px-4 text-sm font-semibold text-ink'
              : 'inline-flex h-10 items-center gap-2 rounded-xl border border-transparent px-4 text-sm font-semibold text-ink-muted hover:text-ink hover:bg-surface-muted'}
            onClick={() => switchTab(key)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'agenda' && !USE_LEGACY_AGENDA ? (
        <GradeTab
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
          apresentadoraFilterId={livesApresentadoraId}
          onMarcaFilterChange={(id) => setLivesParams({ marca: id })}
          onApresentadoraFilterChange={(id) => setLivesParams({ apres: id })}
          marcaFilterOptions={marcaFilterOptions}
          apresentadoraFilterOptions={apresentadoraFilterOptions}
          onClearFilters={() => setLivesParams({ periodo: null, data_inicio: null, data_fim: null, marca: null, apres: null, q: null, st: null })}
          searchQuery={livesQ}
          onSearchChange={(q) => setLivesParams({ q })}
          statusFilter={livesStatus}
          onStatusFilterChange={(st) => setLivesParams({ st: st === 'encerrada' ? null : st })}
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
            const id = asString(live.id, '')
            if (!id) { setEditLiveData(live); return }
            getLivePorId(id)
              .then((fullLive) => setEditLiveData(fullLive as unknown as JsonRecord))
              .catch(() => setEditLiveData(live)) // sem rede, editar com o que temos é melhor que travar
          }}
          onDeleteLive={(live) => {
            const label = asString(live.marca_nome ?? live.cliente_nome ?? live.id, 'live')
            if (!window.confirm(`Excluir a live "${label}"?`)) return
            deleteLiveMutation.mutate(asString(live.id, ''))
          }}
          onCloseLiveModal={() => {
            setLiveModalMode(null); setSelectedLiveRecord(null); setReportCopied(false)
            const nextParams = new URLSearchParams(params); nextParams.delete('live'); setParams(nextParams, { replace: true })
          }}
          onCopyLiveReport={(text) => void navigator.clipboard.writeText(text).then(() => { setReportCopied(true); setTimeout(() => setReportCopied(false), 2000) })}
          onInlineSaveLive={podeEscrever ? (id, payload) => updateLiveMutation.mutateAsync({ id, payload }) : undefined}
          onSplitApresentadoras={(live) => {
            const id = asString(live.id, '')
            if (!id) return
            void getLivePorId(id)
              .then((fullLive) => setRateioLive(fullLive as unknown as JsonRecord))
              .catch((err) => toast.push(extractErrorMessage(err), 'error'))
          }}
          duplicateLiveIds={duplicateLiveIds}
          duplicateClusterCount={dupClusters.length}
        />
        </Suspense>
      ) : null}

      <EditarLiveModal open={Boolean(editLiveData)} live={editLiveData} onClose={() => setEditLiveData(null)} />

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
        marcas={marcaRows}
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

      {tab === 'videos' ? (
        <Suspense fallback={<LoadingState />}>
        <VideosTab
          canWrite={podeEscrever}
          videosData={videos.data ?? []}
          marcaRows={marcaRows}
          apresentadoraRows={apresentadoraRows}
          videoModalOpen={videoModalOpen}
          videoForm={videoForm}
          selectedVideo={selectedVideo}
          createVideoMutation={createVideoMutation}
          updateVideoMutation={updateVideoMutation}
          deleteVideoMutation={deleteVideoMutation}
          onOpenCreateVideoModal={() => { setSelectedVideo(null); setVideoForm(emptyVideo); setVideoModalOpen(true) }}
          onOpenEditVideoModal={openEditVideoModal}
          onDeleteVideo={(video) => {
            const label = asString(video.campanha ?? video.marca_nome ?? video.id, 'vídeo')
            if (!window.confirm(`Excluir o vídeo "${label}"?`)) return
            deleteVideoMutation.mutate(asString(video.id, ''))
          }}
          onCloseVideoModal={() => { setVideoModalOpen(false); setSelectedVideo(null); setVideoForm(emptyVideo) }}
          onVideoFieldChange={(key, value) => setVideoForm((cur) => ({ ...cur, [key]: value }))}
          onVideoSubmit={onVideoSubmit}
        />
        </Suspense>
      ) : null}
    </div>
  )
}
