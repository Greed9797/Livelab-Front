import { BarChart3, CalendarClock, MonitorPlay, Plus, Presentation, RefreshCcw, Video } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, statusTone } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { LoadingState, ErrorState } from '../components/ui/States'
import { AnalyticsPage } from './AnalyticsPage'
import { CabinesPage } from './CabinesPage'
import { getAgendaEventLayout, publicationStatusLabel } from './conteudo-helpers'
import {
  createAgendaEvento,
  createVideo,
  criarLiveManual,
  getAgenda,
  getAgendaConflitos,
  getApresentadoras,
  getCabines,
  getClientes,
  getLives,
  getMarcas,
  getVideos,
  iniciarLive,
} from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, formatDate, formatMoney } from '../utils/format'
import type { JsonRecord } from '../types/models'

type ConteudoTab = 'agenda' | 'cabines' | 'lives' | 'videos' | 'analytics'

const today = () => new Date().toISOString().slice(0, 10)

const emptyAgendaEvent = {
  tipo: 'live',
  cabine_id: '',
  marca_id: '',
  cliente_id: '',
  apresentadora_id: '',
  data: today(),
  hora_inicio: '09:00',
  hora_fim: '10:00',
  status: 'planejado',
  responsavel_marketing: '',
  observacoes: '',
}

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

const emptyManualLive = {
  cabine_id: '',
  cliente_id: '',
  marca_id: '',
  apresentador_id: '',
  data: today(),
  hora_inicio: '09:00',
  hora_fim: '10:00',
  fat_gerado: '0',
  qtd_pedidos: '0',
  manual_views: '',
  manual_likes: '',
  resumo: '',
  status_publicacao: 'rascunho',
  tipo: 'cliente',
}

function dayRange(date: string, days: number) {
  const start = new Date(`${date}T00:00:00`)
  const end = new Date(start)
  end.setDate(start.getDate() + days)
  return { start: start.toISOString(), end: end.toISOString() }
}

function makeDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString()
}

function formatTime(value: unknown) {
  const date = typeof value === 'string' ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
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

function typeLabel(tipo: unknown) {
  const value = asString(tipo, '')
  if (value === 'gravacao_video') return 'Gravação'
  if (value === 'bloqueio_manutencao') return 'Bloqueio'
  if (value === 'live') return 'Live'
  return value || '—'
}

function liveTypeFromMarca(marca?: JsonRecord): 'cliente' | 'afiliado' | 'teste' {
  const tipo = asString(marca?.tipo, '')
  if (tipo === 'afiliada') return 'afiliado'
  if (tipo === 'cliente') return 'cliente'
  return 'teste'
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
  const [agendaDate, setAgendaDate] = useState(today())
  const [agendaView, setAgendaView] = useState<'dia' | 'semana'>('dia')
  const [agendaForm, setAgendaForm] = useState(emptyAgendaEvent)
  const [videoForm, setVideoForm] = useState(emptyVideo)
  const [manualLiveForm, setManualLiveForm] = useState(emptyManualLive)
  const [showManualLive, setShowManualLive] = useState(false)
  const client = useQueryClient()

  const range = dayRange(agendaDate, agendaView === 'semana' ? 7 : 1)
  const agenda = useQuery({ queryKey: ['agenda', agendaDate, agendaView], queryFn: () => getAgenda({ data_inicio: range.start, data_fim: range.end }) })
  const cabines = useQuery({ queryKey: ['cabines'], queryFn: getCabines })
  const lives = useQuery({ queryKey: ['lives'], queryFn: getLives })
  const videos = useQuery({ queryKey: ['videos'], queryFn: () => getVideos() })
  const marcas = useQuery({ queryKey: ['marcas', 'ativas'], queryFn: () => getMarcas({ status: 'ativa' }) })
  const clientes = useQuery({ queryKey: ['clientes'], queryFn: getClientes })
  const apresentadoras = useQuery({ queryKey: ['apresentadoras'], queryFn: getApresentadoras })

  const createAgendaMutation = useMutation({
    mutationFn: async (payload: JsonRecord) => {
      if (payload.cabine_id) {
        const conflitos = await getAgendaConflitos(asString(payload.cabine_id), asString(payload.data_inicio), asString(payload.data_fim))
        if (asNumber(conflitos.total) > 0) {
          throw new Error('Esta cabine já possui evento nesse horário. Escolha outro horário ou edite o evento existente.')
        }
      }
      return createAgendaEvento(payload)
    },
    onSuccess: () => {
      setAgendaForm((current) => ({ ...emptyAgendaEvent, data: agendaDate, cabine_id: current.cabine_id }))
      void client.invalidateQueries({ queryKey: ['agenda'] })
      void client.invalidateQueries({ queryKey: ['marcas'] })
    },
  })
  const createVideoMutation = useMutation({
    mutationFn: createVideo,
    onSuccess: () => {
      setVideoForm(emptyVideo)
      void client.invalidateQueries({ queryKey: ['videos'] })
      void client.invalidateQueries({ queryKey: ['comissoes-resumo'] })
    },
  })
  const createManualLiveMutation = useMutation({
    mutationFn: criarLiveManual,
    onSuccess: () => {
      setManualLiveForm(emptyManualLive)
      setShowManualLive(false)
      void client.invalidateQueries({ queryKey: ['lives'] })
      void client.invalidateQueries({ queryKey: ['cabines'] })
    },
  })
  const startLiveMutation = useMutation({
    mutationFn: iniciarLive,
    onSuccess: (live) => {
      const nextParams = new URLSearchParams(params)
      nextParams.set('live', asString(live.id, ''))
      setParams(nextParams, { replace: true })
      void client.invalidateQueries({ queryKey: ['agenda'] })
      void client.invalidateQueries({ queryKey: ['cabines'] })
      void client.invalidateQueries({ queryKey: ['lives'] })
    },
  })

  useEffect(() => {
    setTab(requestedTab)
  }, [requestedTab])

  useEffect(() => {
    if (!requestedCabineId && !requestedDate) return
    setAgendaForm((current) => ({
      ...current,
      cabine_id: requestedCabineId || current.cabine_id,
      data: requestedDate || current.data,
    }))
  }, [requestedCabineId, requestedDate])

  const selectedLiveId = params.get('live') ?? ''
  const selectedLive = useMemo(() => {
    const rows = lives.data ?? []
    if (!selectedLiveId) return null
    return rows.find((live) => asString(live.id, '') === selectedLiveId) ?? null
  }, [lives.data, selectedLiveId])

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
  const clientesComMarca = new Set(marcaRows.map((marca) => asString(marca.cliente_id, '')).filter(Boolean))
  const agendaAccountValue = agendaForm.marca_id ? `marca:${agendaForm.marca_id}` : agendaForm.cliente_id ? `cliente:${agendaForm.cliente_id}` : ''
  const agendaAccountOptions = [
    ...marcaRows.map((marca) => ({
      value: `marca:${asString(marca.id, '')}`,
      label: asString(marca.nome ?? marca.cliente_nome, 'Marca'),
    })),
    ...clienteRows
      .filter((cliente) => !clientesComMarca.has(asString(cliente.id, '')))
      .map((cliente) => ({
        value: `cliente:${asString(cliente.id, '')}`,
        label: asString(cliente.nome ?? cliente.razao_social ?? cliente.email, 'Cliente'),
      })),
  ].filter((option) => option.value !== 'marca:' && option.value !== 'cliente:')
  const manualAccountValue = manualLiveForm.marca_id ? `marca:${manualLiveForm.marca_id}` : manualLiveForm.cliente_id ? `cliente:${manualLiveForm.cliente_id}` : ''
  const manualAccountOptions = manualLiveForm.tipo === 'afiliado'
    ? marcaRows
      .filter((marca) => ['afiliada', 'parceira', 'propria'].includes(asString(marca.tipo, '')))
      .map((marca) => ({
        value: `marca:${asString(marca.id, '')}`,
        label: asString(marca.nome ?? marca.cliente_nome, 'Afiliada'),
      }))
    : [
      ...marcaRows
        .filter((marca) => asString(marca.tipo, 'cliente') === 'cliente')
        .map((marca) => ({
          value: `marca:${asString(marca.id, '')}`,
          label: asString(marca.nome ?? marca.cliente_nome, 'Marca'),
        })),
      ...clienteRows.map((cliente) => ({
        value: `cliente:${asString(cliente.id, '')}`,
        label: asString(cliente.nome ?? cliente.razao_social ?? cliente.email, 'Cliente'),
      })),
    ]
  const manualAccountRequired = manualLiveForm.tipo !== 'teste'
  function switchTab(next: ConteudoTab) {
    setTab(next)
    const nextParams = new URLSearchParams(params)
    if (next === 'agenda') nextParams.delete('tab')
    else nextParams.set('tab', next)
    setParams(nextParams, { replace: true })
  }

  function setAgendaField(key: keyof typeof emptyAgendaEvent, value: string) {
    setAgendaForm((current) => ({ ...current, [key]: value }))
  }

  function setAgendaAccount(value: string) {
    if (value.startsWith('marca:')) {
      const marcaId = value.slice('marca:'.length)
      const marca = (marcas.data ?? []).find((item) => asString(item.id, '') === marcaId)
      setAgendaForm((current) => ({
        ...current,
        marca_id: marcaId,
        cliente_id: asString(marca?.cliente_id, ''),
      }))
      return
    }
    if (value.startsWith('cliente:')) {
      setAgendaForm((current) => ({
        ...current,
        marca_id: '',
        cliente_id: value.slice('cliente:'.length),
      }))
      return
    }
    setAgendaForm((current) => ({ ...current, marca_id: '', cliente_id: '' }))
  }

  function setVideoField(key: keyof typeof emptyVideo, value: string) {
    setVideoForm((current) => ({ ...current, [key]: value }))
  }

  function setManualLiveField(key: keyof typeof emptyManualLive, value: string) {
    setManualLiveForm((current) => ({ ...current, [key]: value }))
  }

  function setManualLiveType(value: string) {
    setManualLiveForm((current) => ({ ...current, tipo: value, cliente_id: '', marca_id: '' }))
  }

  function setManualLiveAccount(value: string) {
    if (value.startsWith('marca:')) {
      const marcaId = value.slice('marca:'.length)
      const marca = (marcas.data ?? []).find((item) => asString(item.id, '') === marcaId)
      setManualLiveForm((current) => ({
        ...current,
        marca_id: marcaId,
        cliente_id: asString(marca?.cliente_id, ''),
      }))
      return
    }
    if (value.startsWith('cliente:')) {
      setManualLiveForm((current) => ({
        ...current,
        marca_id: '',
        cliente_id: value.slice('cliente:'.length),
      }))
      return
    }
    setManualLiveForm((current) => ({ ...current, marca_id: '', cliente_id: '' }))
  }

  function onAgendaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dataInicio = makeDateTime(agendaForm.data, agendaForm.hora_inicio)
    const dataFim = makeDateTime(agendaForm.data, agendaForm.hora_fim)
    createAgendaMutation.mutate({
      tipo: agendaForm.tipo,
      cabine_id: agendaForm.cabine_id || null,
      marca_id: agendaForm.tipo === 'bloqueio_manutencao' ? null : agendaForm.marca_id || null,
      cliente_id: agendaForm.tipo === 'bloqueio_manutencao' ? null : agendaForm.cliente_id || null,
      apresentadora_id: agendaForm.apresentadora_id || null,
      data_inicio: dataInicio,
      data_fim: dataFim,
      status: agendaForm.status,
      responsavel_marketing: agendaForm.responsavel_marketing || null,
      observacoes: agendaForm.observacoes || null,
    })
  }

  function onVideoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    createVideoMutation.mutate({
      ...videoForm,
      quantidade: asNumber(videoForm.quantidade),
      gmv_atribuido: asNumber(videoForm.gmv_atribuido),
      pedidos_atribuidos: asNumber(videoForm.pedidos_atribuidos),
      apresentadora_id: videoForm.apresentadora_id || null,
      campanha: videoForm.campanha || null,
      observacoes: videoForm.observacoes || null,
    })
  }

  function onManualLiveSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    createManualLiveMutation.mutate({
      cabine_id: manualLiveForm.cabine_id,
      cliente_id: manualLiveForm.cliente_id || undefined,
      marca_id: manualLiveForm.marca_id || undefined,
      apresentador_id: manualLiveForm.apresentador_id || undefined,
      data: manualLiveForm.data,
      hora_inicio: manualLiveForm.hora_inicio,
      hora_fim: manualLiveForm.hora_fim,
      fat_gerado: asNumber(manualLiveForm.fat_gerado),
      qtd_pedidos: asNumber(manualLiveForm.qtd_pedidos),
      manual_orders: asNumber(manualLiveForm.qtd_pedidos),
      manual_views: manualLiveForm.manual_views ? asNumber(manualLiveForm.manual_views) : undefined,
      manual_likes: manualLiveForm.manual_likes ? asNumber(manualLiveForm.manual_likes) : undefined,
      manual_gmv: asNumber(manualLiveForm.fat_gerado),
      resumo: manualLiveForm.resumo || undefined,
      status_publicacao: manualLiveForm.status_publicacao,
      tipo: manualLiveForm.tipo,
    })
  }

  function onStartAgendaLive(event: JsonRecord) {
    const cabineId = asString(event.cabine_id, '')
    if (!cabineId) return
    const marcaId = asString(event.marca_id, '')
    const marca = (marcas.data ?? []).find((item) => asString(item.id, '') === marcaId) as JsonRecord | undefined
    const clienteId = asString(event.cliente_id ?? marca?.cliente_id, '')
    const tipo = liveTypeFromMarca(marca)
    startLiveMutation.mutate({
      cabine_id: cabineId,
      agenda_evento_id: asString(event.id, ''),
      ...(marcaId ? { marca_id: marcaId } : {}),
      ...(clienteId ? { cliente_id: clienteId } : {}),
      ...(event.apresentadora_id ? { apresentador_id: event.apresentadora_id } : {}),
      tiktok_username: asString(event.tiktok_username ?? marca?.tiktok_username, '') || null,
      tipo,
    })
  }

  const hours = Array.from({ length: 14 }, (_, index) => index + 8)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conteúdo"
        accent="Produção"
        title="operacional"
        subtitle="Agenda por cabine, lives, vídeos e analytics em um fluxo único."
        actions={<Button variant="secondary" icon={RefreshCcw} onClick={() => {
          void agenda.refetch()
          void cabines.refetch()
          void lives.refetch()
          void videos.refetch()
        }}>Atualizar</Button>}
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
        <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base font-bold text-ink">Agenda por cabine</p>
                <div className="flex flex-wrap gap-2">
                  <input className="design-input h-10 px-3 text-sm" type="date" value={agendaDate} onChange={(event) => {
                    setAgendaDate(event.target.value)
                    setAgendaForm((current) => ({ ...current, data: event.target.value }))
                  }} />
                  <select className="design-input h-10 px-3 text-sm" value={agendaView} onChange={(event) => setAgendaView(event.target.value as 'dia' | 'semana')}>
                    <option value="dia">Dia</option>
                    <option value="semana">Semana</option>
                  </select>
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
                        const events = agendaRows.filter((event) => asString(event.cabine_id) === cabine.id && eventIntersectsLocalDate(event, agendaDate))
                        return (
                          <div key={cabine.id} className="relative border-r border-line">
                            {hours.map((hour, index) => (
                              <div key={hour} className="absolute left-0 right-0 border-t border-line" style={{ top: `${index * 72}px` }} />
                            ))}
                            {events.map((event) => {
                              const layout = getAgendaEventLayout(event, { startHour: hours[0], endHour: hours[hours.length - 1] + 1, rowHeight: 72 })
                              const canStart = event.tipo === 'live' && !['ao_vivo', 'concluido', 'cancelado'].includes(asString(event.status))
                              return (
                                <div
                                  key={asString(event.id)}
                                  className="absolute left-2 right-2 overflow-hidden rounded-xl border border-brand/35 bg-brand-soft p-2 text-xs shadow-sm"
                                  style={{ top: `${layout.top + 4}px`, height: `${Math.max(44, layout.height - 8)}px` }}
                                >
                                  <p className="font-bold text-brand">{typeLabel(event.tipo)} · {formatTime(event.data_inicio)}-{formatTime(event.data_fim)}</p>
                                  <p className="mt-1 truncate text-ink">{asString(event.marca_nome ?? event.cliente_nome ?? event.observacoes, 'Bloqueio')}</p>
                                  <p className="mt-1 truncate text-ink-muted">{asString(event.apresentadora_nome ?? event.responsavel_marketing, 'Sem apresentadora')}</p>
                                  {canStart && layout.height >= 92 ? (
                                    <Button className="mt-2 h-8 px-2 text-xs" icon={MonitorPlay} isLoading={startLiveMutation.isPending} onClick={() => onStartAgendaLive(event)}>
                                      Iniciar
                                    </Button>
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
                      render: (item) => item.tipo === 'live' && !['ao_vivo', 'concluido', 'cancelado'].includes(asString(item.status)) ? (
                        <Button variant="secondary" icon={MonitorPlay} isLoading={startLiveMutation.isPending} onClick={() => onStartAgendaLive(item)}>
                          Iniciar live
                        </Button>
                      ) : null,
                    },
                  ]}
                />
              )}
              {startLiveMutation.isError ? (
                <p className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(startLiveMutation.error)}</p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Agendar</p>
            </CardHeader>
            <CardBody>
              <form className="space-y-3" onSubmit={onAgendaSubmit}>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Tipo</span>
                  <select className="design-input mt-2 h-11 w-full px-4" value={agendaForm.tipo} onChange={(event) => setAgendaField('tipo', event.target.value)}>
                    <option value="live">Live</option>
                    <option value="gravacao_video">Gravação</option>
                    <option value="bloqueio_manutencao">Bloqueio/manutenção</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Cabine</span>
                  <select className="design-input mt-2 h-11 w-full px-4" value={agendaForm.cabine_id} onChange={(event) => setAgendaField('cabine_id', event.target.value)}>
                    <option value="">Sem cabine definida</option>
                    {activeCabines.map((cabine) => <option key={cabine.id} value={cabine.id}>Cabine {asString(cabine.numero)}</option>)}
                  </select>
                </label>
                {agendaForm.tipo !== 'bloqueio_manutencao' ? (
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Marca/cliente</span>
                    <select className="design-input mt-2 h-11 w-full px-4" value={agendaAccountValue} onChange={(event) => setAgendaAccount(event.target.value)} required>
                      <option value="">Selecione uma marca ou cliente</option>
                      {agendaAccountOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    {!agendaAccountOptions.length ? <p className="mt-2 text-xs text-ink-muted">Cadastre um cliente em Comercial ou uma marca afiliada para agendar lives.</p> : null}
                  </label>
                ) : null}
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Apresentadora</span>
                  <select className="design-input mt-2 h-11 w-full px-4" value={agendaForm.apresentadora_id} onChange={(event) => setAgendaField('apresentadora_id', event.target.value)}>
                    <option value="">Opcional</option>
                    {(apresentadoras.data ?? []).map((item) => <option key={asString(item.id, '')} value={asString(item.id, '')}>{asString(item.nome)}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Data</span>
                    <input className="design-input mt-2 h-11 w-full px-3" type="date" value={agendaForm.data} onChange={(event) => setAgendaField('data', event.target.value)} required />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Início</span>
                    <input className="design-input mt-2 h-11 w-full px-3" type="time" value={agendaForm.hora_inicio} onChange={(event) => setAgendaField('hora_inicio', event.target.value)} required />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Fim</span>
                    <input className="design-input mt-2 h-11 w-full px-3" type="time" value={agendaForm.hora_fim} onChange={(event) => setAgendaField('hora_fim', event.target.value)} required />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Responsável de marketing</span>
                  <input className="design-input mt-2 h-11 w-full px-4" value={agendaForm.responsavel_marketing} onChange={(event) => setAgendaField('responsavel_marketing', event.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Observações</span>
                  <textarea className="design-input mt-2 min-h-24 w-full px-4 py-3" value={agendaForm.observacoes} onChange={(event) => setAgendaField('observacoes', event.target.value)} />
                </label>
                {createAgendaMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(createAgendaMutation.error)}</p> : null}
                <Button type="submit" icon={Plus} isLoading={createAgendaMutation.isPending}>Agendar</Button>
              </form>
            </CardBody>
          </Card>
        </section>
      ) : null}

      {tab === 'cabines' ? <CabinesPage title="Cabines de conteúdo" /> : null}

      {tab === 'lives' ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_400px]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base font-bold text-ink">Lives realizadas</p>
                <Button icon={Plus} onClick={() => setShowManualLive((value) => !value)}>Cadastrar live manual</Button>
              </div>
            </CardHeader>
            <CardBody>
              <DataTable<JsonRecord>
                data={lives.data ?? []}
                columns={[
                  { key: 'iniciado_em', header: 'Data', render: (item) => formatDate(asString(item.iniciado_em, '')) },
                  { key: 'cliente_nome', header: 'Marca/cliente', render: (item) => asString(item.marca_nome ?? item.cliente_nome) },
                  { key: 'cabine_numero', header: 'Cabine', render: (item) => asString(item.cabine_numero) },
                  { key: 'apresentador_nome', header: 'Apresentadora', render: (item) => asString(item.apresentadora_nome ?? item.apresentador_nome) },
                  { key: 'fat_gerado', header: 'GMV', align: 'right', render: (item) => formatMoney(item.fat_gerado ?? item.manual_gmv) },
                  { key: 'final_orders_count', header: 'Pedidos', align: 'right', render: (item) => asNumber(item.final_orders_count ?? item.manual_orders).toLocaleString('pt-BR') },
                  { key: 'status_publicacao', header: 'Status', render: (item) => <Badge tone={statusTone(asString(item.status_publicacao, 'rascunho'))}>{publicationStatusLabel(item.status_publicacao)}</Badge> },
                  { key: 'selecionar', header: '', align: 'right', render: (item) => <Button variant="ghost" onClick={() => setParams({ live: asString(item.id, ''), tab: 'lives' })}>Selecionar</Button> },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">{showManualLive ? 'Cadastrar live manual' : 'Live selecionada'}</p>
            </CardHeader>
            <CardBody>
              {showManualLive ? (
                <form className="space-y-3" onSubmit={onManualLiveSubmit}>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Cabine</span>
                    <select className="design-input mt-2 h-11 w-full px-4" value={manualLiveForm.cabine_id} onChange={(event) => setManualLiveField('cabine_id', event.target.value)} required>
                      <option value="">Selecione uma cabine</option>
                      {activeCabines.map((cabine) => <option key={cabine.id} value={cabine.id}>Cabine {asString(cabine.numero)}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Tipo</span>
                    <select className="design-input mt-2 h-11 w-full px-4" value={manualLiveForm.tipo} onChange={(event) => setManualLiveType(event.target.value)}>
                      <option value="cliente">Cliente/e-commerce</option>
                      <option value="afiliado">Afiliada</option>
                      <option value="teste">Interna/teste</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Marca/cliente</span>
                    <select className="design-input mt-2 h-11 w-full px-4" value={manualAccountValue} onChange={(event) => setManualLiveAccount(event.target.value)} required={manualAccountRequired}>
                      <option value="">{manualLiveForm.tipo === 'afiliado' ? 'Selecione uma afiliada' : 'Selecione uma marca ou cliente'}</option>
                      {manualAccountOptions
                        .filter((option) => option.value !== 'marca:' && option.value !== 'cliente:')
                        .map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    {manualLiveForm.tipo === 'afiliado' && !manualAccountOptions.length ? (
                      <p className="mt-2 text-xs text-ink-muted">Cadastre uma marca afiliada em Comercial para lançar essa live.</p>
                    ) : null}
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Apresentadora</span>
                    <select className="design-input mt-2 h-11 w-full px-4" value={manualLiveForm.apresentador_id} onChange={(event) => setManualLiveField('apresentador_id', event.target.value)}>
                      <option value="">Opcional</option>
                      {(apresentadoras.data ?? []).map((item) => <option key={asString(item.id, '')} value={asString(item.id, '')}>{asString(item.nome)}</option>)}
                    </select>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Data</span>
                      <input className="design-input mt-2 h-11 w-full px-3" type="date" value={manualLiveForm.data} onChange={(event) => setManualLiveField('data', event.target.value)} required />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Início</span>
                      <input className="design-input mt-2 h-11 w-full px-3" type="time" value={manualLiveForm.hora_inicio} onChange={(event) => setManualLiveField('hora_inicio', event.target.value)} required />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Fim</span>
                      <input className="design-input mt-2 h-11 w-full px-3" type="time" value={manualLiveForm.hora_fim} onChange={(event) => setManualLiveField('hora_fim', event.target.value)} required />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">GMV</span>
                      <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" step="0.01" value={manualLiveForm.fat_gerado} onChange={(event) => setManualLiveField('fat_gerado', event.target.value)} required />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Pedidos</span>
                      <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" value={manualLiveForm.qtd_pedidos} onChange={(event) => setManualLiveField('qtd_pedidos', event.target.value)} required />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Viewers</span>
                      <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" value={manualLiveForm.manual_views} onChange={(event) => setManualLiveField('manual_views', event.target.value)} />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Likes</span>
                      <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" value={manualLiveForm.manual_likes} onChange={(event) => setManualLiveField('manual_likes', event.target.value)} />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Status de publicação</span>
                    <select className="design-input mt-2 h-11 w-full px-4" value={manualLiveForm.status_publicacao} onChange={(event) => setManualLiveField('status_publicacao', event.target.value)}>
                      <option value="rascunho">Rascunho</option>
                      <option value="revisado">Revisado</option>
                      <option value="publicado">Publicado</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Observações</span>
                    <textarea className="design-input mt-2 min-h-24 w-full px-4 py-3" value={manualLiveForm.resumo} onChange={(event) => setManualLiveField('resumo', event.target.value)} />
                  </label>
                  {createManualLiveMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(createManualLiveMutation.error)}</p> : null}
                  <Button type="submit" icon={Plus} isLoading={createManualLiveMutation.isPending}>Salvar live manual</Button>
                </form>
              ) : selectedLive ? (
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-ink-muted">Cliente</dt><dd className="font-semibold text-ink">{asString(selectedLive.cliente_nome)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-ink-muted">GMV</dt><dd className="font-semibold text-ink">{formatMoney(selectedLive.fat_gerado ?? selectedLive.manual_gmv)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-ink-muted">Pedidos</dt><dd className="font-semibold text-ink">{asNumber(selectedLive.final_orders_count ?? selectedLive.manual_orders).toLocaleString('pt-BR')}</dd></div>
                </dl>
              ) : (
                <p className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-ink-muted">Nenhuma live selecionada.</p>
              )}
            </CardBody>
          </Card>
        </section>
      ) : null}

      {tab === 'videos' ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Vídeos gravados</p>
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
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Registrar vídeo</p>
            </CardHeader>
            <CardBody>
              <form className="space-y-3" onSubmit={onVideoSubmit}>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Marca</span>
                  <select className="design-input mt-2 h-11 w-full px-4" value={videoForm.marca_id} onChange={(event) => setVideoField('marca_id', event.target.value)} required>
                    <option value="">Selecione uma marca</option>
                    {(marcas.data ?? []).map((item) => <option key={asString(item.id, '')} value={asString(item.id, '')}>{asString(item.nome)}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Apresentadora</span>
                  <select className="design-input mt-2 h-11 w-full px-4" value={videoForm.apresentadora_id} onChange={(event) => setVideoField('apresentadora_id', event.target.value)}>
                    <option value="">Opcional</option>
                    {(apresentadoras.data ?? []).map((item) => <option key={asString(item.id, '')} value={asString(item.id, '')}>{asString(item.nome)}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Data da gravação</span>
                  <input className="design-input mt-2 h-11 w-full px-4" type="date" value={videoForm.data} onChange={(event) => setVideoField('data', event.target.value)} required />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Quantidade</span>
                    <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" value={videoForm.quantidade} onChange={(event) => setVideoField('quantidade', event.target.value)} />
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
                    <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" step="0.01" value={videoForm.gmv_atribuido} onChange={(event) => setVideoField('gmv_atribuido', event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Pedidos atribuídos</span>
                    <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" value={videoForm.pedidos_atribuidos} onChange={(event) => setVideoField('pedidos_atribuidos', event.target.value)} />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Observações</span>
                  <textarea className="design-input mt-2 min-h-24 w-full px-4 py-3" value={videoForm.observacoes} onChange={(event) => setVideoField('observacoes', event.target.value)} />
                </label>
                {createVideoMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(createVideoMutation.error)}</p> : null}
                <Button type="submit" icon={Plus} isLoading={createVideoMutation.isPending}>Registrar vídeo</Button>
              </form>
            </CardBody>
          </Card>
        </section>
      ) : null}

      {tab === 'analytics' ? <AnalyticsPage /> : null}
    </div>
  )
}
