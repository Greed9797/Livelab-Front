import { BarChart3, CalendarClock, MonitorPlay, Presentation, Video } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { LoadingState, ErrorState } from '../components/ui/States'
import { RegistrarMetricasLiveModal, type RegistrarMetricasLiveMode } from '../components/forms/RegistrarMetricasLiveModal'
import { EditarLiveModal } from '../components/forms/EditarLiveModal'
import { AnalyticsPage } from './AnalyticsPage'
import { CabinesPage } from './CabinesPage'
import { AgendaTab } from '../components/conteudo/AgendaTab'
import { LivesTab } from '../components/conteudo/LivesTab'
import { VideosTab, emptyVideo, type VideoForm } from '../components/conteudo/VideosTab'
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
  getLivesDuplicatas,
  getMarcas,
  getVideos,
  updateAgendaEvento,
  updateLive,
  updateVideo,
} from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString } from '../utils/format'
import { parseBRMoneyToDecimal } from '../utils/money'
import type { JsonRecord } from '../types/models'
import type { AgendarLiveModalMode } from '../components/forms/AgendarLiveModal'

type ConteudoTab = 'agenda' | 'cabines' | 'lives' | 'videos' | 'analytics'

const today = () => new Date().toISOString().slice(0, 10)

function dayRange(date: string, days: number) {
  const start = new Date(`${date}T00:00:00`)
  const end = new Date(start)
  end.setDate(start.getDate() + days)
  return { start: start.toISOString(), end: end.toISOString() }
}

function normalizeConteudoTab(value: string | null): ConteudoTab {
  if (!value || value === 'calendario' || value === 'agenda') return 'agenda'
  if (['cabines', 'lives', 'videos', 'analytics'].includes(value)) return value as ConteudoTab
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
  const [params, setParams] = useSearchParams()
  const requestedTab = normalizeConteudoTab(params.get('tab'))
  const requestedCabineId = params.get('cabine') ?? ''
  const requestedDate = params.get('data') ?? ''
  const [tab, setTab] = useState<ConteudoTab>(requestedTab)
  const [agendaDate, setAgendaDate] = useState(requestedDate || today())
  const [agendaView, setAgendaView] = useState<'dia' | 'semana'>('dia')
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
  const client = useQueryClient()

  const range = dayRange(agendaDate, agendaView === 'semana' ? 7 : 1)
  const agenda = useQuery({ queryKey: ['agenda', agendaDate, agendaView], queryFn: () => getAgenda({ data_inicio: range.start, data_fim: range.end }) })
  const cabines = useQuery({ queryKey: ['cabines'], queryFn: getCabines })
  const lives = useQuery({ queryKey: ['lives', 'encerrada'], queryFn: () => getLives({ status: 'encerrada', limit: 200 }) })
  const duplicatas = useQuery({ queryKey: ['lives-duplicatas'], queryFn: getLivesDuplicatas, enabled: tab === 'lives', staleTime: 5 * 60_000 })
  const videos = useQuery({ queryKey: ['videos'], queryFn: () => getVideos() })
  const marcas = useQuery({ queryKey: ['marcas', 'ativas'], queryFn: () => getMarcas({ status: 'ativa' }) })
  const clientes = useQuery({ queryKey: ['clientes'], queryFn: getClientes })
  const apresentadoras = useQuery({ queryKey: ['apresentadoras'], queryFn: getApresentadoras })

  function invalidateOperational() {
    ;[
      ['agenda'], ['cabines'], ['lives'], ['home-dashboard'], ['ranking-apresentadoras'],
      ['comissoes-resumo'], ['comissoes-apresentadoras'], ['comissoes-marcas'],
      ['comissoes-pendentes'], ['public-ranking'], ['lives-duplicatas'],
    ].forEach((queryKey) => void client.invalidateQueries({ queryKey }))
  }

  function closeAgendaModal() { setAgendaModalMode(null); setSelectedAgendaEvent(null); invalidateOperational() }
  function closeVideoModal(resetForm = true) { if (resetForm) setVideoForm(emptyVideo); setSelectedVideo(null); setVideoModalOpen(false); invalidateOperational(); void client.invalidateQueries({ queryKey: ['videos'] }) }
  function closeMetrics() { setMetricsModalMode(null); setMetricsAgendaEvent(null); setSelectedLiveRecord(null); invalidateOperational() }
  function closeLiveRecord() { setLiveModalMode(null); setSelectedLiveRecord(null); invalidateOperational() }

  const createAgendaMutation = useMutation({ mutationFn: createAgendaEvento, onSuccess: closeAgendaModal })
  const updateAgendaMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateAgendaEvento(id, payload), onSuccess: closeAgendaModal })
  const deleteAgendaMutation = useMutation({ mutationFn: ({ id, modoRecorrencia }: { id: string; modoRecorrencia: string }) => deleteAgendaEvento(id, { modo_recorrencia: modoRecorrencia }), onSuccess: closeAgendaModal })
  const createVideoMutation = useMutation({ mutationFn: createVideo, onSuccess: () => closeVideoModal() })
  const updateVideoMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateVideo(id, payload), onSuccess: () => closeVideoModal() })
  const deleteVideoMutation = useMutation({ mutationFn: deleteVideo, onSuccess: () => { invalidateOperational(); void client.invalidateQueries({ queryKey: ['videos'] }) } })
  const createManualLiveMutation = useMutation({ mutationFn: criarLiveManual, onSuccess: closeMetrics })
  const updateLiveMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateLive(id, payload), onSuccess: () => { setMetricsModalMode(null); setSelectedLiveRecord(null); invalidateOperational() } })
  const encerrarLiveMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => encerrarLive(id, payload), onSuccess: () => { setMetricsModalMode(null); setMetricsAgendaEvent(null); invalidateOperational() } })
  const deleteLiveMutation = useMutation({ mutationFn: deleteLive, onSuccess: closeLiveRecord })

  useEffect(() => { setTab(requestedTab) }, [requestedTab])
  useEffect(() => {
    if (requestedDate) setAgendaDate(requestedDate)
    if (requestedCabineId) { setSelectedAgendaEvent(null); setAgendaModalMode('create') }
  }, [requestedCabineId, requestedDate])

  const selectedLiveId = params.get('live') ?? ''
  const selectedLive = useMemo(() => {
    const rows = lives.data ?? []
    if (!selectedLiveId) return null
    return rows.find((live) => asString(live.id, '') === selectedLiveId) ?? null
  }, [lives.data, selectedLiveId])

  useEffect(() => {
    if (!selectedLive || liveModalMode || metricsModalMode) return
    setSelectedLiveRecord(selectedLive)
    setLiveModalMode('detail')
  }, [liveModalMode, metricsModalMode, selectedLive])

  const isLoading = agenda.isLoading || cabines.isLoading || lives.isLoading || videos.isLoading || marcas.isLoading || clientes.isLoading || apresentadoras.isLoading
  const error = agenda.error ?? cabines.error ?? lives.error ?? videos.error ?? marcas.error ?? clientes.error ?? apresentadoras.error
  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={() => { void agenda.refetch(); void cabines.refetch(); void lives.refetch(); void videos.refetch(); void marcas.refetch(); void clientes.refetch(); void apresentadoras.refetch() }} />

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
      if (live) { setSelectedLiveRecord(live); setLiveModalMode('detail'); setParams({ tab: 'lives', live: asString(live.id, '') }, { replace: true }) }
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
        subtitle="Agenda por cabine, lives, vídeos e analytics em um fluxo único."
      />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-1">
        {([
          ['agenda', CalendarClock, 'Agenda'],
          ['cabines', Presentation, 'Cabines'],
          ['lives', MonitorPlay, 'Lives realizadas'],
          ['videos', Video, 'Vídeos gravados'],
          ['analytics', BarChart3, 'Analytics'],
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

      {tab === 'agenda' ? (
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
          onCloseAgendaModal={() => { setAgendaModalMode(null); setSelectedAgendaEvent(null) }}
          onCreateAgenda={(payload) => createAgendaMutation.mutate(payload)}
          onUpdateAgenda={(id, payload) => updateAgendaMutation.mutate({ id, payload })}
          onDeleteAgenda={(id, modoRecorrencia) => deleteAgendaMutation.mutate({ id, modoRecorrencia })}
        />
      ) : null}

      {tab === 'cabines' ? <CabinesPage title="Cabines de conteúdo" embedded /> : null}

      {tab === 'lives' ? (
        <LivesTab
          livesData={lives.data ?? []}
          liveModalMode={liveModalMode}
          selectedLiveRecord={selectedLiveRecord}
          reportCopied={reportCopied}
          deleteLiveMutation={deleteLiveMutation}
          onOpenCreateLiveModal={() => { setMetricsAgendaEvent(null); setSelectedLiveRecord(null); setMetricsModalMode('manual') }}
          onOpenLiveDetail={(live) => { setSelectedLiveRecord(live); setLiveModalMode('detail'); setParams({ tab: 'lives', live: asString(live.id, '') }, { replace: true }) }}
          onOpenEditLive={(live) => setEditLiveData(live)}
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
          onInlineSaveLive={(id, payload) => updateLiveMutation.mutateAsync({ id, payload })}
          duplicateLiveIds={duplicateLiveIds}
          duplicateClusterCount={dupClusters.length}
        />
      ) : null}

      <EditarLiveModal open={Boolean(editLiveData)} live={editLiveData} onClose={() => setEditLiveData(null)} />

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
        <VideosTab
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
      ) : null}

      {tab === 'analytics' ? <AnalyticsPage embedded /> : null}
    </div>
  )
}
