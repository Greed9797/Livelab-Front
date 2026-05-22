import { BarChart3, CalendarClock, CheckCircle2, Clock3, Edit2, Eye, MonitorPlay, Plus, Presentation, Trash2, Video } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, statusTone } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { LoadingState, ErrorState } from '../components/ui/States'
import { Modal } from '../components/ui/Modal'
import { MoneyInput } from '../components/ui/MoneyInput'
import { TikTokLiveButton } from '../components/ui/TikTokLiveButton'
import { AgendarLiveModal, type AgendarLiveModalMode } from '../components/forms/AgendarLiveModal'
import { RegistrarMetricasLiveModal, type RegistrarMetricasLiveMode } from '../components/forms/RegistrarMetricasLiveModal'
import { EditarLiveModal } from '../components/forms/EditarLiveModal'
import { PresenterSelect } from '../components/forms/PresenterSelect'
import { AnalyticsPage } from './AnalyticsPage'
import { CabinesPage } from './CabinesPage'
import { assignAgendaLanes, getAgendaEventLayout, publicationStatusLabel } from './conteudo-helpers'
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
  getMarcas,
  getVideos,
  updateAgendaEvento,
  updateLive,
  updateVideo,
} from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, compactNumber, formatDate, formatMoney } from '../utils/format'
import { getBrandImage } from '../utils/favicon'
import { parseBRMoneyToDecimal } from '../utils/money'
import type { JsonRecord } from '../types/models'

type ConteudoTab = 'agenda' | 'cabines' | 'lives' | 'videos' | 'analytics'

const today = () => new Date().toISOString().slice(0, 10)
const SP_TIME_ZONE = 'America/Sao_Paulo'

const liveDayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const liveDayHeadingFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SP_TIME_ZONE,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
})

const emptyVideo = {
  marca_id: '',
  apresentadora_id: '',
  data: today(),
  quantidade: '1',
  plataforma: 'tiktok',
  campanha: '',
  gmv_atribuido: '0',
  pedidos_atribuidos: '0',
  observacoes: '',
}

function dayRange(date: string, days: number) {
  const start = new Date(`${date}T00:00:00`)
  const end = new Date(start)
  end.setDate(start.getDate() + days)
  return { start: start.toISOString(), end: end.toISOString() }
}

function formatTime(value: unknown) {
  const date = typeof value === 'string' ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: SP_TIME_ZONE, hour: '2-digit', minute: '2-digit' }).format(date)
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

function firstPositiveNumber(...values: unknown[]): number {
  for (const value of values) {
    const n = asNumber(value)
    if (n > 0) return n
  }
  return 0
}

function liveGmv(live: JsonRecord): number {
  return firstPositiveNumber(live.fat_gerado, live.manual_gmv, live.gmv_atual, live.gmv)
}

function liveOrders(live: JsonRecord): number {
  return firstPositiveNumber(live.final_orders_count, live.manual_orders, live.total_orders, live.qtd_pedidos, live.pedidos)
}

function liveViews(live: JsonRecord): number {
  return firstPositiveNumber(live.manual_views, live.total_viewers, live.viewer_count, live.final_peak_viewers)
}

function livePeakViewers(live: JsonRecord): number {
  return firstPositiveNumber(live.final_peak_viewers, live.viewer_count)
}

function liveEngagement(live: JsonRecord): number {
  return firstPositiveNumber(live.final_total_likes, live.manual_likes, live.likes_count)
    + firstPositiveNumber(live.final_total_comments, live.manual_comments, live.comments_count)
    + firstPositiveNumber(live.final_total_shares, live.manual_shares, live.shares_count)
}

function liveDurationMinutes(live: JsonRecord): number {
  const start = liveStartDate(live)
  const end = liveEndDate(live)
  if (!start || !end) return 0
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000))
}

function formatDuration(minutes: number): string {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h <= 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${String(m).padStart(2, '0')}min`
}

function dayKeyFromLive(live: JsonRecord): string {
  const start = liveStartDate(live)
  if (!start) return 'sem-data'
  const parts = liveDayKeyFormatter.formatToParts(start)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function dayLabelFromKey(key: string): string {
  if (key === 'sem-data') return 'Sem data'
  const date = new Date(`${key}T12:00:00`)
  const label = liveDayHeadingFormatter.format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function groupLivesByDay(rows: JsonRecord[]) {
  const sorted = [...rows].sort((a, b) => (liveStartDate(b)?.getTime() ?? 0) - (liveStartDate(a)?.getTime() ?? 0))
  const groups = new Map<string, JsonRecord[]>()
  for (const row of sorted) {
    const key = dayKeyFromLive(row)
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  return [...groups.entries()].map(([key, items]) => {
    const starts = items.map(liveStartDate).filter((date): date is Date => Boolean(date)).sort((a, b) => a.getTime() - b.getTime())
    const ends = items.map(liveEndDate).filter((date): date is Date => Boolean(date)).sort((a, b) => a.getTime() - b.getTime())
    return {
      key,
      label: dayLabelFromKey(key),
      items,
      totalGmv: items.reduce((sum, live) => sum + liveGmv(live), 0),
      totalOrders: items.reduce((sum, live) => sum + liveOrders(live), 0),
      totalMinutes: items.reduce((sum, live) => sum + liveDurationMinutes(live), 0),
      firstStart: starts[0] ?? null,
      lastEnd: ends[ends.length - 1] ?? null,
    }
  })
}

function summarizeLives(rows: JsonRecord[]) {
  return {
    totalLives: rows.length,
    totalGmv: rows.reduce((sum, live) => sum + liveGmv(live), 0),
    totalOrders: rows.reduce((sum, live) => sum + liveOrders(live), 0),
    totalMinutes: rows.reduce((sum, live) => sum + liveDurationMinutes(live), 0),
  }
}

function buildLiveReport(live: JsonRecord): string {
  const nome = asString(live.marca_nome ?? live.cliente_nome, '')
  const inicio = live.iniciado_em ? new Date(live.iniciado_em as string) : null
  const fim = live.encerrado_em ? new Date(live.encerrado_em as string) : null
  if (!inicio || Number.isNaN(inicio.getTime())) return ''

  const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(inicio)
  const hInicio = formatTime(live.iniciado_em)
  const hFim = fim && !Number.isNaN(fim.getTime()) ? formatTime(live.encerrado_em) : null

  let duracao = ''
  if (inicio && fim && !Number.isNaN(fim.getTime())) {
    const mins = Math.floor((fim.getTime() - inicio.getTime()) / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    duracao = h > 0 ? `${h}:${String(m).padStart(2, '0')}h` : `${m}min`
  }

  const gmv = formatMoney(liveGmv(live))
  const pedidos = liveOrders(live).toLocaleString('pt-BR')
  const espectadores = compactNumber.format(livePeakViewers(live))
  const visualizacoes = compactNumber.format(liveViews(live))

  const lines = [
    `📊 Relatório de Live${nome ? ` — ${nome}` : ''}`,
    '',
    `📅 Data: ${data}`,
    hFim ? `⏰ Horário analisado: ${hInicio} às ${hFim}` : `⏰ Horário: ${hInicio}`,
    duracao ? `⏱️ Duração: ${duracao}` : null,
    '',
    `💰 GMV gerado: ${gmv}`,
    `🛒 Pedidos/itens atribuídos: ${pedidos}`,
    `👥 Espectadores: ${espectadores}`,
    `👀 Visualizações: ${visualizacoes}`,
  ]
  return lines.filter((l) => l !== null).join('\n')
}

function eventIntersectsLocalDate(event: JsonRecord, date: string) {
  const start = typeof event.data_inicio === 'string' ? new Date(event.data_inicio) : null
  const end = typeof event.data_fim === 'string' ? new Date(event.data_fim) : null
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false
  const dayStart = new Date(`${date}T00:00:00`)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayStart.getDate() + 1)
  return start < dayEnd && end > dayStart
}

function isPastRegisterable(event: JsonRecord) {
  const end = typeof event.data_fim === 'string' ? new Date(event.data_fim) : null
  if (!end || Number.isNaN(end.getTime())) return false
  return asString(event.tipo, '') === 'live'
    && end.getTime() <= Date.now()
    && !['concluido', 'cancelado'].includes(asString(event.status, ''))
}

function isLiveOnAir(item: JsonRecord) {
  return ['ao_vivo', 'em_andamento'].includes(asString(item.status, ''))
}

function typeLabel(tipo: unknown) {
  const value = asString(tipo, '')
  if (value === 'gravacao_video') return 'Gravação'
  if (value === 'bloqueio_manutencao') return 'Bloqueio'
  if (value === 'live') return 'Live'
  return value || '—'
}

function normalizeConteudoTab(value: string | null): ConteudoTab {
  if (!value || value === 'calendario' || value === 'agenda') return 'agenda'
  if (['cabines', 'lives', 'videos', 'analytics'].includes(value)) return value as ConteudoTab
  return 'agenda'
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
  const [videoForm, setVideoForm] = useState(emptyVideo)
  const [selectedVideo, setSelectedVideo] = useState<JsonRecord | null>(null)
  const [liveModalMode, setLiveModalMode] = useState<'detail' | null>(null)
  const [selectedLiveRecord, setSelectedLiveRecord] = useState<JsonRecord | null>(null)
  const [reportCopied, setReportCopied] = useState(false)
  const client = useQueryClient()

  const range = dayRange(agendaDate, agendaView === 'semana' ? 7 : 1)
  const agenda = useQuery({ queryKey: ['agenda', agendaDate, agendaView], queryFn: () => getAgenda({ data_inicio: range.start, data_fim: range.end }) })
  const cabines = useQuery({ queryKey: ['cabines'], queryFn: getCabines })
  const lives = useQuery({ queryKey: ['lives', 'encerrada'], queryFn: () => getLives({ status: 'encerrada' }) })
  const videos = useQuery({ queryKey: ['videos'], queryFn: () => getVideos() })
  const marcas = useQuery({ queryKey: ['marcas', 'ativas'], queryFn: () => getMarcas({ status: 'ativa' }) })
  const clientes = useQuery({ queryKey: ['clientes'], queryFn: getClientes })
  const apresentadoras = useQuery({ queryKey: ['apresentadoras'], queryFn: getApresentadoras })

  function invalidateOperational() {
    ;[
      ['agenda'],
      ['cabines'],
      ['lives'],
      ['home-dashboard'],
      ['ranking-apresentadoras'],
      ['comissoes-resumo'],
      ['comissoes-apresentadoras'],
      ['comissoes-marcas'],
      ['comissoes-pendentes'],
      ['public-ranking'],
    ].forEach((queryKey) => {
      void client.invalidateQueries({ queryKey })
    })
  }

  const createAgendaMutation = useMutation({
    mutationFn: createAgendaEvento,
    onSuccess: () => {
      setAgendaModalMode(null)
      setSelectedAgendaEvent(null)
      invalidateOperational()
    },
  })
  const updateAgendaMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateAgendaEvento(id, payload),
    onSuccess: () => {
      setAgendaModalMode(null)
      setSelectedAgendaEvent(null)
      invalidateOperational()
    },
  })
  const deleteAgendaMutation = useMutation({
    mutationFn: ({ id, modoRecorrencia }: { id: string; modoRecorrencia: string }) => deleteAgendaEvento(id, { modo_recorrencia: modoRecorrencia }),
    onSuccess: () => {
      setAgendaModalMode(null)
      setSelectedAgendaEvent(null)
      invalidateOperational()
    },
  })
  const createVideoMutation = useMutation({
    mutationFn: createVideo,
    onSuccess: () => {
      setVideoForm(emptyVideo)
      setSelectedVideo(null)
      setVideoModalOpen(false)
      invalidateOperational()
      void client.invalidateQueries({ queryKey: ['videos'] })
    },
  })
  const updateVideoMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateVideo(id, payload),
    onSuccess: () => {
      setVideoForm(emptyVideo)
      setSelectedVideo(null)
      setVideoModalOpen(false)
      invalidateOperational()
      void client.invalidateQueries({ queryKey: ['videos'] })
    },
  })
  const deleteVideoMutation = useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => {
      invalidateOperational()
      void client.invalidateQueries({ queryKey: ['videos'] })
    },
  })
  const createManualLiveMutation = useMutation({
    mutationFn: criarLiveManual,
    onSuccess: () => {
      setMetricsModalMode(null)
      setMetricsAgendaEvent(null)
      setSelectedLiveRecord(null)
      invalidateOperational()
    },
  })
  const updateLiveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateLive(id, payload),
    onSuccess: () => {
      setMetricsModalMode(null)
      setSelectedLiveRecord(null)
      invalidateOperational()
    },
  })
  const encerrarLiveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => encerrarLive(id, payload),
    onSuccess: () => {
      setMetricsModalMode(null)
      setMetricsAgendaEvent(null)
      invalidateOperational()
    },
  })
  const deleteLiveMutation = useMutation({
    mutationFn: deleteLive,
    onSuccess: () => {
      setLiveModalMode(null)
      setSelectedLiveRecord(null)
      invalidateOperational()
    },
  })

  useEffect(() => {
    setTab(requestedTab)
  }, [requestedTab])

  useEffect(() => {
    if (requestedDate) setAgendaDate(requestedDate)
    if (requestedCabineId) {
      setSelectedAgendaEvent(null)
      setAgendaModalMode('create')
    }
  }, [requestedCabineId, requestedDate])

  const selectedLiveId = params.get('live') ?? ''
  const selectedLive = useMemo(() => {
    const rows = lives.data ?? []
    if (!selectedLiveId) return null
    return rows.find((live) => asString(live.id, '') === selectedLiveId) ?? null
  }, [lives.data, selectedLiveId])
  const liveGroups = useMemo(() => groupLivesByDay(lives.data ?? []), [lives.data])
  const liveSummary = useMemo(() => summarizeLives(lives.data ?? []), [lives.data])

  useEffect(() => {
    if (!selectedLive || liveModalMode || metricsModalMode) return
    setSelectedLiveRecord(selectedLive)
    setLiveModalMode('detail')
  }, [liveModalMode, metricsModalMode, selectedLive])

  const isLoading = agenda.isLoading || cabines.isLoading || lives.isLoading || videos.isLoading || marcas.isLoading || clientes.isLoading || apresentadoras.isLoading
  const error = agenda.error ?? cabines.error ?? lives.error ?? videos.error ?? marcas.error ?? clientes.error ?? apresentadoras.error
  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={() => {
    void agenda.refetch()
    void cabines.refetch()
    void lives.refetch()
    void videos.refetch()
    void marcas.refetch()
    void clientes.refetch()
    void apresentadoras.refetch()
  }} />

  const agendaRows = agenda.data ?? []
  const cabineRows = cabines.data ?? []
  const activeCabines = cabineRows.filter((cabine) => (cabine as unknown as JsonRecord).ativo !== false && asString(cabine.status, '') !== 'inativa')
  const marcaRows = marcas.data ?? []
  const clienteRows = clientes.data ?? []
  const apresentadoraRows = apresentadoras.data ?? []

  function switchTab(next: ConteudoTab) {
    setTab(next)
    const nextParams = new URLSearchParams(params)
    if (next === 'agenda') nextParams.delete('tab')
    else nextParams.set('tab', next)
    setParams(nextParams, { replace: true })
  }

  function openCreateAgendaModal() {
    setSelectedAgendaEvent(null)
    setAgendaModalMode('create')
  }

  function openEditAgendaModal(event: JsonRecord) {
    // ao_vivo events with a linked live → open live edit modal for consistency with CabinesPage
    if (asString(event.status) === 'ao_vivo' && event.live_id) {
      setFetchingAgendaLive(true)
      getLivePorId(asString(event.live_id, '')).then((fullLive) => {
        setEditLiveData(fullLive as unknown as JsonRecord)
      }).catch(() => {
        // fallback: open agenda modal if fetch fails
        setSelectedAgendaEvent(event)
        setAgendaModalMode('edit')
      }).finally(() => setFetchingAgendaLive(false))
      return
    }
    setSelectedAgendaEvent(event)
    setAgendaModalMode('edit')
  }

  function openRegisterResult(event: JsonRecord) {
    setMetricsAgendaEvent(event)
    setSelectedLiveRecord(null)
    setMetricsModalMode('result')
  }

  function openCreateLiveModal() {
    setMetricsAgendaEvent(null)
    setSelectedLiveRecord(null)
    setMetricsModalMode('manual')
  }

  function openLiveDetail(live: JsonRecord) {
    setSelectedLiveRecord(live)
    setLiveModalMode('detail')
    setParams({ tab: 'lives', live: asString(live.id, '') }, { replace: true })
  }

  function openEditLive(live: JsonRecord) {
    setEditLiveData(live)
  }

  function closeLiveModal() {
    setLiveModalMode(null)
    setSelectedLiveRecord(null)
    setReportCopied(false)
    const nextParams = new URLSearchParams(params)
    nextParams.delete('live')
    setParams(nextParams, { replace: true })
  }

  function copyLiveReport(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setReportCopied(true)
      setTimeout(() => setReportCopied(false), 2000)
    })
  }

  function closeMetricsModal() {
    setMetricsModalMode(null)
    setMetricsAgendaEvent(null)
    setSelectedLiveRecord(null)
  }

  function onDeleteLive(live: JsonRecord) {
    const label = asString(live.marca_nome ?? live.cliente_nome ?? live.id, 'live')
    if (!window.confirm(`Excluir a live "${label}"?`)) return
    deleteLiveMutation.mutate(asString(live.id, ''))
  }

  function setVideoField(key: keyof typeof emptyVideo, value: string) {
    setVideoForm((current) => ({ ...current, [key]: value }))
  }

  function openCreateVideoModal() {
    setSelectedVideo(null)
    setVideoForm(emptyVideo)
    setVideoModalOpen(true)
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
    if (selectedVideo) {
      updateVideoMutation.mutate({ id: asString(selectedVideo.id, ''), payload })
      return
    }
    createVideoMutation.mutate(payload)
  }

  function onDeleteVideo(video: JsonRecord) {
    const label = asString(video.campanha ?? video.marca_nome ?? video.id, 'vídeo')
    if (!window.confirm(`Excluir o vídeo "${label}"?`)) return
    deleteVideoMutation.mutate(asString(video.id, ''))
  }

  const hours = Array.from({ length: 14 }, (_, index) => index + 8)
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
        {[
          ['agenda', CalendarClock, 'Agenda'],
          ['cabines', Presentation, 'Cabines'],
          ['lives', MonitorPlay, 'Lives realizadas'],
          ['videos', Video, 'Vídeos gravados'],
          ['analytics', BarChart3, 'Analytics'],
        ].map(([key, Icon, label]) => (
          <button key={String(key)} type="button" className={tab === key ? 'inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white' : 'inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-ink-muted hover:bg-surface-muted'} onClick={() => switchTab(key as ConteudoTab)}>
            <Icon className="h-4 w-4" />
            {label as string}
          </button>
        ))}
      </div>

      {tab === 'agenda' ? (
        <section>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base font-bold text-ink">Agenda por cabine</p>
                <div className="flex flex-wrap gap-2">
                  <input className="design-input h-10 px-3 text-sm" type="date" value={agendaDate} onChange={(event) => setAgendaDate(event.target.value)} />
                  <select className="design-input h-10 px-3 text-sm" value={agendaView} onChange={(event) => setAgendaView(event.target.value as 'dia' | 'semana')}>
                    <option value="dia">Dia</option>
                    <option value="semana">Semana</option>
                  </select>
                  <Button icon={Plus} onClick={openCreateAgendaModal}>Agendar</Button>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {agendaView === 'dia' ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[920px]">
                    <div className="grid border-b border-line pb-2" style={{ gridTemplateColumns: `90px repeat(${Math.max(activeCabines.length, 1)}, minmax(160px, 1fr))` }}>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Horário</p>
                      {activeCabines.map((cabine) => (
                        <p key={cabine.id} className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Cabine {asString(cabine.numero)}</p>
                      ))}
                    </div>
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `90px repeat(${Math.max(activeCabines.length, 1)}, minmax(160px, 1fr))`,
                        height: `${hours.length * 72}px`,
                      }}
                    >
                      <div className="relative border-r border-line">
                        {hours.map((hour, index) => (
                          <div key={hour} className="absolute left-0 right-3 border-t border-line pt-2 text-sm font-bold text-ink-muted" style={{ top: `${index * 72}px` }}>
                            {String(hour).padStart(2, '0')}:00
                          </div>
                        ))}
                      </div>
                      {activeCabines.map((cabine) => {
                        const rawEvents = agendaRows.filter((event) => asString(event.cabine_id) === cabine.id && eventIntersectsLocalDate(event, agendaDate))
                        // Dedup defensivo por id (backend pode mandar duplicata)
                        const events = Array.from(new Map(rawEvents.map((e) => [asString(e.id), e])).values())
                        // Lane assignment: eventos concorrentes ficam lado a lado
                        const lanes = assignAgendaLanes(events)
                        return (
                          <div key={cabine.id} className="relative border-r border-line">
                            {hours.map((hour, index) => (
                              <div key={hour} className="absolute left-0 right-0 border-t border-line" style={{ top: `${index * 72}px` }} />
                            ))}
                            {events.map((event) => {
                              const layout = getAgendaEventLayout(event, { startHour: hours[0], endHour: hours[hours.length - 1] + 1, rowHeight: 72 })
                              const canRegister = isPastRegisterable(event)
                              const lane = lanes.get(asString(event.id)) ?? { index: 0, total: 1 }
                              const widthPct = 100 / lane.total
                              const leftPct = widthPct * lane.index
                              return (
                                <div
                                  role="button"
                                  tabIndex={0}
                                  key={asString(event.id)}
                                  className="absolute overflow-hidden rounded-xl border border-brand/35 bg-brand-soft p-2 text-left text-xs shadow-sm transition hover:border-brand"
                                  style={{ top: `${layout.top + 4}px`, height: `${Math.max(44, layout.height - 8)}px`, left: `calc(${leftPct}% + 4px)`, width: `calc(${widthPct}% - 8px)` }}
                                  onClick={() => openEditAgendaModal(event)}
                                  onKeyDown={(keyEvent) => {
                                    if (keyEvent.key === 'Enter' || keyEvent.key === ' ') openEditAgendaModal(event)
                                  }}
                                >
                                  {isLiveOnAir(event) ? (
                                    <div className="absolute right-2 top-2">
                                      <TikTokLiveButton username={event.tiktok_username} compact />
                                    </div>
                                  ) : null}
                                  <p className="font-bold text-brand">{typeLabel(event.tipo)} · {formatTime(event.data_inicio)}-{formatTime(event.data_fim)}</p>
                                  <div className="mt-1 flex items-center gap-2">
                                    {(() => {
                                      const img = getBrandImage({ logo_url: event.marca_logo_url, site: event.marca_site })
                                      return img ? <img src={img} alt="" loading="lazy" decoding="async" className="h-5 w-5 rounded object-cover" /> : null
                                    })()}
                                    <p className="truncate text-ink">{asString(event.marca_nome ?? event.cliente_nome ?? event.observacoes, 'Bloqueio')}</p>
                                  </div>
                                  <p className="mt-1 truncate text-ink-muted">{asString(event.apresentadora_nome ?? event.responsavel_marketing, 'Sem apresentadora')}</p>
                                  {canRegister && layout.height >= 92 ? (
                                    <button
                                      type="button"
                                      className="mt-2 inline-flex h-8 items-center rounded-full bg-brand px-3 text-xs font-bold text-white"
                                      onClick={(clickEvent) => {
                                        clickEvent.stopPropagation()
                                        openRegisterResult(event)
                                      }}
                                    >
                                      Registrar resultado
                                    </button>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <DataTable<JsonRecord>
                  data={agendaRows}
                  columns={[
                    { key: 'data_inicio', header: 'Horário', render: (item) => `${formatDate(asString(item.data_inicio, ''))} ${formatTime(item.data_inicio)}` },
                    { key: 'cabine_numero', header: 'Cabine', render: (item) => asString(item.cabine_nome ?? item.cabine_numero, 'Sem cabine') },
                    { key: 'tipo', header: 'Tipo', render: (item) => typeLabel(item.tipo) },
                    { key: 'marca_nome', header: 'Marca/cliente', render: (item) => asString(item.marca_nome ?? item.cliente_nome, '—') },
                    { key: 'apresentadora_nome', header: 'Apresentadora', render: (item) => asString(item.apresentadora_nome) },
                    { key: 'status', header: 'Status', render: (item) => <Badge tone={statusTone(asString(item.status))}>{asString(item.status)}</Badge> },
                    {
                      key: 'acoes',
                      header: 'Ações',
                      align: 'right',
                      render: (item) => (
                        <div className="flex justify-end gap-2">
                          {isLiveOnAir(item) ? <TikTokLiveButton username={item.tiktok_username} compact /> : null}
                          {isPastRegisterable(item) ? <Button variant="secondary" icon={CheckCircle2} onClick={() => openRegisterResult(item)}>Registrar resultado</Button> : null}
                          <Button variant="ghost" icon={Edit2} isLoading={fetchingAgendaLive && asString(item.status) === 'ao_vivo' && Boolean(item.live_id)} onClick={() => openEditAgendaModal(item)}>Editar</Button>
                        </div>
                      ),
                    },
                  ]}
                />
              )}
            </CardBody>
          </Card>

          <AgendarLiveModal
            open={agendaModalMode === 'create' || agendaModalMode === 'edit'}
            mode={agendaModalMode ?? 'create'}
            event={selectedAgendaEvent}
            defaultDate={requestedDate || agendaDate}
            defaultCabineId={requestedCabineId}
            cabines={activeCabines}
            marcas={marcaRows}
            clientes={clienteRows}
            apresentadoras={apresentadoraRows}
            isSaving={createAgendaMutation.isPending || updateAgendaMutation.isPending || deleteAgendaMutation.isPending}
            error={createAgendaMutation.error ?? updateAgendaMutation.error ?? deleteAgendaMutation.error}
            onClose={() => {
              setAgendaModalMode(null)
              setSelectedAgendaEvent(null)
            }}
            onCreate={(payload) => createAgendaMutation.mutate(payload)}
            onUpdate={(id, payload) => updateAgendaMutation.mutate({ id, payload })}
            onDelete={(id, modoRecorrencia) => {
              if (!window.confirm('Cancelar este agendamento?')) return
              deleteAgendaMutation.mutate({ id, modoRecorrencia })
            }}
          />
        </section>
      ) : null}

      {tab === 'cabines' ? <CabinesPage title="Cabines de conteúdo" embedded /> : null}

      {tab === 'lives' ? (
        <section>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base font-bold text-ink">Lives realizadas</p>
                <Button icon={Plus} onClick={openCreateLiveModal}>Cadastrar live manual</Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-4">
                  {[
                    ['Lives', liveSummary.totalLives.toLocaleString('pt-BR'), 'registros encerrados'],
                    ['Horas totais', formatDuration(liveSummary.totalMinutes), 'tempo em live'],
                    ['GMV total', formatMoney(liveSummary.totalGmv), 'período carregado'],
                    ['Pedidos', liveSummary.totalOrders.toLocaleString('pt-BR'), 'atribuídos às lives'],
                  ].map(([label, value, hint]) => (
                    <div key={label} className="rounded-xl border border-line bg-surface-muted px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
                      <p className="mt-1 text-xl font-extrabold text-ink">{value}</p>
                      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
                    </div>
                  ))}
                </div>

                {liveGroups.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-muted">Nenhuma live encerrada encontrada.</p>
                ) : null}

                <div className="space-y-4">
                  {liveGroups.map((group) => (
                    <section key={group.key} className="overflow-hidden rounded-2xl border border-line bg-surface">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-muted px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-ink">{group.label}</p>
                          <p className="mt-1 text-xs text-ink-muted">
                            {group.items.length.toLocaleString('pt-BR')} lives · {formatDuration(group.totalMinutes)} · {group.firstStart ? formatTime(group.firstStart.toISOString()) : '—'} até {group.lastEnd ? formatTime(group.lastEnd.toISOString()) : '—'}
                          </p>
                        </div>
                        <div className="grid w-full grid-cols-3 gap-2 text-right sm:w-auto sm:min-w-[360px]">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">GMV</p>
                            <p className="num text-sm font-extrabold text-brand">{formatMoney(group.totalGmv)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Pedidos</p>
                            <p className="num text-sm font-extrabold text-ink">{group.totalOrders.toLocaleString('pt-BR')}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Média/h</p>
                            <p className="num text-sm font-extrabold text-ink">{group.totalMinutes > 0 ? formatMoney(group.totalGmv / (group.totalMinutes / 60)) : '—'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="divide-y divide-line">
                        {group.items.map((item) => {
                          const duration = liveDurationMinutes(item)
                          const views = liveViews(item)
                          const peak = livePeakViewers(item)
                          const engagement = liveEngagement(item)
                          return (
                            <div key={asString(item.id)} className="grid gap-3 px-4 py-4 lg:grid-cols-[140px_1fr_360px_auto] lg:items-center">
                              <div className="flex items-center gap-3 lg:block">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand lg:mb-2">
                                  <Clock3 className="h-4 w-4" />
                                </span>
                                <div>
                                  <p className="num text-sm font-extrabold text-ink">{formatTime(item.iniciado_em)} - {formatTime(item.encerrado_em)}</p>
                                  <p className="mt-1 text-xs font-semibold text-ink-muted">{formatDuration(duration)}</p>
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button type="button" className="min-w-0 truncate text-left text-base font-extrabold text-ink hover:text-brand" onClick={() => openLiveDetail(item)}>
                                    {asString(item.marca_nome ?? item.cliente_nome, 'Sem marca')}
                                  </button>
                                  <Badge tone={statusTone(asString(item.status_publicacao, 'rascunho'))}>{publicationStatusLabel(item.status_publicacao)}</Badge>
                                  {asString(item.origem_dados, '') === 'manual' ? <Badge tone="neutral">Manual</Badge> : null}
                                </div>
                                <p className="mt-1 truncate text-sm text-ink-muted">
                                  Cabine {asString(item.cabine_numero)} · {asString(item.apresentadora_nome ?? item.apresentador_nome, 'Sem apresentadora')}
                                </p>
                                {item.resumo ? <p className="mt-2 line-clamp-2 text-xs text-ink-muted">{asString(item.resumo, '')}</p> : null}
                              </div>

                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4">
                                {[
                                  ['GMV', formatMoney(liveGmv(item)), 'brand'],
                                  ['Pedidos', liveOrders(item).toLocaleString('pt-BR'), 'ink'],
                                  ['Views', views > 0 ? compactNumber.format(views) : '—', 'ink'],
                                  ['Pico/eng.', peak > 0 ? compactNumber.format(peak) : engagement > 0 ? compactNumber.format(engagement) : '—', 'ink'],
                                ].map(([label, value, tone]) => (
                                  <div key={label} className="rounded-xl border border-line bg-surface-muted px-3 py-2">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
                                    <p className={tone === 'brand' ? 'num mt-1 text-sm font-extrabold text-brand' : 'num mt-1 text-sm font-extrabold text-ink'}>{value}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="flex flex-wrap justify-end gap-2">
                                <Button variant="ghost" icon={Eye} onClick={() => openLiveDetail(item)}>Abrir</Button>
                                <Button variant="secondary" icon={Edit2} onClick={() => openEditLive(item)}>Editar</Button>
                                <Button variant="danger" icon={Trash2} disabled={deleteLiveMutation.isPending} onClick={() => onDeleteLive(item)}>Excluir</Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>

          <Modal
            open={liveModalMode === 'detail' && !!selectedLiveRecord}
            title="Live realizada"
            subtitle={selectedLiveRecord ? `${asString(selectedLiveRecord.marca_nome ?? selectedLiveRecord.cliente_nome, 'Sem marca')} · Cabine ${asString(selectedLiveRecord.cabine_numero)}` : undefined}
            onClose={closeLiveModal}
            size="md"
          >
            {selectedLiveRecord ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ['Data', formatDate(asString(selectedLiveRecord.iniciado_em, ''))],
                    ['Horário', `${formatTime(selectedLiveRecord.iniciado_em)} - ${formatTime(selectedLiveRecord.encerrado_em)}`],
                    ['Duração', formatDuration(liveDurationMinutes(selectedLiveRecord))],
                    ['Apresentadora', asString(selectedLiveRecord.apresentadora_nome ?? selectedLiveRecord.apresentador_nome, '—')],
                    ['GMV', formatMoney(liveGmv(selectedLiveRecord))],
                    ['Pedidos', liveOrders(selectedLiveRecord).toLocaleString('pt-BR')],
                    ['Views', liveViews(selectedLiveRecord) > 0 ? compactNumber.format(liveViews(selectedLiveRecord)) : '—'],
                    ['Pico/engajamento', livePeakViewers(selectedLiveRecord) > 0 ? compactNumber.format(livePeakViewers(selectedLiveRecord)) : liveEngagement(selectedLiveRecord) > 0 ? compactNumber.format(liveEngagement(selectedLiveRecord)) : '—'],
                    ['Publicação', publicationStatusLabel(selectedLiveRecord.status_publicacao)],
                    ['Origem', asString(selectedLiveRecord.origem_dados, 'manual')],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-line bg-surface-muted p-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
                    </div>
                  ))}
                </div>
                {selectedLiveRecord.resumo ? <p className="rounded-2xl border border-line bg-surface-muted p-3 text-sm text-ink">{asString(selectedLiveRecord.resumo)}</p> : null}
                {(() => {
                  const report = buildLiveReport(selectedLiveRecord)
                  if (!report) return null
                  return (
                    <div className="rounded-2xl border border-line bg-surface-muted p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">Relatório para copiar</p>
                        <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => copyLiveReport(report)}>
                          {reportCopied ? 'Copiado!' : 'Copiar'}
                        </Button>
                      </div>
                      <pre className="whitespace-pre-wrap text-xs text-ink">{report}</pre>
                    </div>
                  )
                })()}
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" icon={Edit2} onClick={() => openEditLive(selectedLiveRecord)}>Editar</Button>
                  <Button variant="danger" icon={Trash2} isLoading={deleteLiveMutation.isPending} onClick={() => onDeleteLive(selectedLiveRecord)}>Excluir</Button>
                </div>
                {deleteLiveMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(deleteLiveMutation.error)}</p> : null}
              </div>
            ) : null}
          </Modal>
        </section>
      ) : null}

      <EditarLiveModal
        open={Boolean(editLiveData)}
        live={editLiveData}
        onClose={() => setEditLiveData(null)}
      />

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
        onClose={closeMetricsModal}
        onCreateManual={(payload) => createManualLiveMutation.mutate(payload)}
        onCreateResultFromAgenda={(payload) => createManualLiveMutation.mutate(payload)}
        onUpdateLive={(id, payload) => updateLiveMutation.mutate({ id, payload })}
        onCloseLive={(id, payload) => encerrarLiveMutation.mutate({ id, payload })}
      />

      {tab === 'videos' ? (
        <section>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base font-bold text-ink">Vídeos gravados</p>
                <Button icon={Plus} onClick={openCreateVideoModal}>Registrar vídeo</Button>
              </div>
            </CardHeader>
            <CardBody>
              <DataTable<JsonRecord>
                data={videos.data ?? []}
                columns={[
                  { key: 'data', header: 'Data', render: (item) => formatDate(asString(item.data, '')) },
                  { key: 'marca_nome', header: 'Marca', render: (item) => asString(item.marca_nome) },
                  { key: 'apresentadora_nome', header: 'Apresentadora', render: (item) => asString(item.apresentadora_nome) },
                  { key: 'quantidade', header: 'Qtd', align: 'right', render: (item) => asNumber(item.quantidade).toLocaleString('pt-BR') },
                  { key: 'gmv_atribuido', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv_atribuido) },
                  { key: 'pedidos_atribuidos', header: 'Pedidos', align: 'right', render: (item) => asNumber(item.pedidos_atribuidos).toLocaleString('pt-BR') },
                  {
                    key: 'acoes',
                    header: 'Ações',
                    align: 'right',
                    render: (item) => (
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" icon={Edit2} onClick={() => openEditVideoModal(item)}>Editar</Button>
                        <Button variant="danger" icon={Trash2} disabled={deleteVideoMutation.isPending} onClick={() => onDeleteVideo(item)}>Excluir</Button>
                      </div>
                    ),
                  },
                ]}
              />
            </CardBody>
          </Card>
          <Modal
            open={videoModalOpen}
            title={selectedVideo ? 'Editar vídeo' : 'Registrar vídeo'}
            subtitle="Registro operacional de vídeos, GMV e pedidos atribuídos."
            size="lg"
            onClose={() => {
              setVideoModalOpen(false)
              setSelectedVideo(null)
              setVideoForm(emptyVideo)
            }}
          >
            <form className="space-y-3" onSubmit={onVideoSubmit}>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Marca</span>
                <select className="design-input mt-2 h-11 w-full px-4" value={videoForm.marca_id} onChange={(event) => setVideoField('marca_id', event.target.value)} required>
                  <option value="">Selecione uma marca</option>
                  {marcaRows.map((item) => <option key={asString(item.id, '')} value={asString(item.id, '')}>{asString(item.nome)}</option>)}
                </select>
              </label>
              <PresenterSelect
                rows={apresentadoraRows}
                value={videoForm.apresentadora_id}
                onChange={(value) => setVideoField('apresentadora_id', value)}
                placeholder="Sem apresentadora definida"
              />
              <label className="block">
                <span className="text-sm font-semibold text-ink">Data da gravação</span>
                <input className="design-input mt-2 h-11 w-full px-4" type="date" value={videoForm.data} onChange={(event) => setVideoField('data', event.target.value)} required />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Quantidade</span>
                  <input className="design-input mt-2 h-11 w-full px-4" type="text" inputMode="numeric" pattern="[0-9.,]*" value={videoForm.quantidade} onChange={(event) => setVideoField('quantidade', event.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Plataforma</span>
                  <input className="design-input mt-2 h-11 w-full px-4" value={videoForm.plataforma} onChange={(event) => setVideoField('plataforma', event.target.value)} />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Campanha</span>
                <input className="design-input mt-2 h-11 w-full px-4" value={videoForm.campanha} onChange={(event) => setVideoField('campanha', event.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-semibold text-ink">GMV atribuído</span>
                  <MoneyInput className="design-input mt-2 h-11 w-full px-4" value={videoForm.gmv_atribuido} onChange={(raw) => setVideoField('gmv_atribuido', raw)} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Pedidos atribuídos</span>
                  <input className="design-input mt-2 h-11 w-full px-4" type="text" inputMode="numeric" pattern="[0-9.,]*" value={videoForm.pedidos_atribuidos} onChange={(event) => setVideoField('pedidos_atribuidos', event.target.value)} />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Observações</span>
                <textarea className="design-input mt-2 min-h-24 w-full px-4 py-3" value={videoForm.observacoes} onChange={(event) => setVideoField('observacoes', event.target.value)} />
              </label>
              {createVideoMutation.isError || updateVideoMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(createVideoMutation.error ?? updateVideoMutation.error)}</p> : null}
              <Button type="submit" icon={selectedVideo ? CheckCircle2 : Plus} isLoading={createVideoMutation.isPending || updateVideoMutation.isPending}>{selectedVideo ? 'Salvar vídeo' : 'Registrar vídeo'}</Button>
            </form>
          </Modal>
        </section>
      ) : null}

      {tab === 'analytics' ? <AnalyticsPage embedded /> : null}
    </div>
  )
}
