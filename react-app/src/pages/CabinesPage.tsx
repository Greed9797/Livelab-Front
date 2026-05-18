import { Activity, CalendarClock, Edit2, MonitorPlay, PlayCircle, Plus, Power, Presentation, RefreshCcw, Search, StopCircle, Wrench, type LucideIcon } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import clsx from 'clsx'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge, statusTone } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/States'
import { HistoricoGmvModal } from './HistoricoGmvModal'
import { atualizarStatusCabine, createCabine, encerrarLive, getCabineHistorico, getCabineLiveAtual, getCabines, getClientes, getContratos, iniciarLive, liberarCabine, reservarCabine, updateCabine } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, formatDate, formatMoney } from '../utils/format'
import { useCurrentUser } from '../stores/auth-store'
import type { Cabine, JsonRecord } from '../types/models'

const writeCabineRoles = new Set(['franqueador_master', 'franqueado', 'gerente', 'produtor_live'])
const writeLiveRoles = new Set(['franqueador_master', 'franqueado', 'gerente', 'apresentador', 'apresentadora', 'produtor_live'])
const readClientesForLiveRoles = new Set(['franqueador_master', 'franqueado', 'gerente', 'produtor_live'])
const availableCabineStatus = 'disponivel'
const emptyCabineForm = { nome: '', descricao: '' }
const emptyStartForm = { cliente_id: '', tiktok_username: '' }

function suggestedClienteId(cabine?: Cabine | null): string {
  if (!cabine) return ''
  const record = cabine as Cabine & JsonRecord
  const agenda = asArray<JsonRecord>(record.agenda)
  return asString(record.cliente_id ?? agenda[0]?.cliente_id, '')
}

function suggestedTiktokUsername(cabine?: Cabine | null): string {
  return asString((cabine as (Cabine & JsonRecord) | undefined)?.tiktok_username, '')
}

export function CabinesPage({ title = 'Cabines' }: { title?: string }) {
  const user = useCurrentUser()
  const [params, setParams] = useSearchParams()
  const canWriteCabine = writeCabineRoles.has(user?.papel ?? '')
  const canWriteLive = writeLiveRoles.has(user?.papel ?? '')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [cabineForm, setCabineForm] = useState(emptyCabineForm)
  const [startForm, setStartForm] = useState(emptyStartForm)
  const [contratoId, setContratoId] = useState('')
  const [liveType, setLiveType] = useState<'cliente' | 'afiliado' | 'teste'>('cliente')
  const [gmvModalLiveId, setGmvModalLiveId] = useState<string | null>(null)
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['cabines'], queryFn: getCabines, refetchInterval: 20_000 })
  const contratosQuery = useQuery({ queryKey: ['contratos'], queryFn: () => getContratos(), enabled: canWriteCabine })
  const clientesQuery = useQuery({ queryKey: ['clientes', 'live-start'], queryFn: getClientes, enabled: canWriteLive && readClientesForLiveRoles.has(user?.papel ?? '') })
  const historicoQuery = useQuery({ queryKey: ['cabine-historico', selectedId], queryFn: () => getCabineHistorico(selectedId), enabled: Boolean(selectedId) })
  // TODO(PR-7): migrate to useSelectedLive({ cabineId: selectedId, autoRefreshMs: 20_000 })
  // Current direct useQuery call returns raw JsonRecord instead of typed LiveAtual,
  // which caused the bug of stale/wrong live data in the Live Toolkit panel.
  const liveAtualQuery = useQuery({ queryKey: ['cabine-live-atual', selectedId], queryFn: () => getCabineLiveAtual(selectedId), enabled: Boolean(selectedId) })
  const saveCabineMutation = useMutation({
    mutationFn: (payload: JsonRecord) => editingId ? updateCabine(editingId, payload) : createCabine(payload),
    onSuccess: () => {
      setShowForm(false)
      setEditingId('')
      setCabineForm(emptyCabineForm)
      void client.invalidateQueries({ queryKey: ['cabines'] })
    },
  })
  const liberarMutation = useMutation({
    mutationFn: liberarCabine,
    onSuccess: () => client.invalidateQueries({ queryKey: ['cabines'] }),
  })
  const reservarMutation = useMutation({
    mutationFn: ({ id, contrato }: { id: string; contrato: string }) => reservarCabine(id, contrato),
    onSuccess: () => {
      setContratoId('')
      void client.invalidateQueries({ queryKey: ['cabines'] })
    },
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => atualizarStatusCabine(id, status),
    onSuccess: () => client.invalidateQueries({ queryKey: ['cabines'] }),
  })
  const encerrarMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => encerrarLive(id, payload),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['cabines'] })
      void client.invalidateQueries({ queryKey: ['cabine-live-atual'] })
    },
  })
  const iniciarMutation = useMutation({
    mutationFn: iniciarLive,
    onSuccess: (live) => {
      const liveId = asString(live.id, '')
      const cabineId = asString(live.cabine_id ?? selectedId, selectedId)
      const nextParams = new URLSearchParams(params)
      if (cabineId) nextParams.set('cabine', cabineId)
      if (liveId) nextParams.set('live', liveId)
      setParams(nextParams, { replace: true })
      void client.invalidateQueries({ queryKey: ['cabines'] })
      void client.invalidateQueries({ queryKey: ['lives'] })
      void client.invalidateQueries({ queryKey: ['cabine-live-atual'] })
    },
  })

  const cabines = query.data ?? []
  const liveCount = cabines.filter((item) => item.status === 'ao_vivo').length
  const maintenanceCount = cabines.filter((item) => item.status === 'manutencao').length
  const freeCount = cabines.filter((item) => item.status === availableCabineStatus).length
  const counts = {
    all: cabines.length,
    live: liveCount,
    maintenance: maintenanceCount,
    free: freeCount,
    busy: Math.max(cabines.length - liveCount - maintenanceCount - freeCount, 0),
  }
  const visible = cabines.filter((cabine) => {
    const normalized = `${cabine.numero ?? ''} ${cabine.cliente_nome ?? ''} ${cabine.apresentador_nome ?? ''}`.toLowerCase()
    const statusMatch =
      filter === 'all' ||
      (filter === 'live' && cabine.status === 'ao_vivo') ||
      (filter === 'free' && cabine.status === availableCabineStatus) ||
      (filter === 'maintenance' && cabine.status === 'manutencao') ||
      (filter === 'busy' && !['ao_vivo', availableCabineStatus, 'manutencao'].includes(cabine.status ?? ''))
    return statusMatch && normalized.includes(search.trim().toLowerCase())
  })
  const totalGmv = cabines.reduce((sum, cabine) => sum + asNumber(cabine.gmv_atual), 0)
  const totalViewers = cabines.reduce((sum, cabine) => sum + asNumber(cabine.viewer_count), 0)
  const occupancyRows: Array<{ label: string; value: number; color: string; icon: LucideIcon }> = [
    { label: 'Ao vivo', value: counts.live, color: 'bg-brand', icon: MonitorPlay },
    { label: 'Preparando', value: counts.busy, color: 'bg-[var(--info)]', icon: Activity },
    { label: 'Livres', value: counts.free, color: 'bg-[var(--success)]', icon: CalendarClock },
    { label: 'Manutenção', value: counts.maintenance, color: 'bg-[var(--warning)]', icon: Wrench },
  ]
  const explicitCabineId = params.get('cabine') ?? ''
  const explicitLiveId = params.get('live') ?? ''
  const explicitSelection = Boolean(selectedId || explicitCabineId || explicitLiveId)
  const selectedCabine = visible.find((cabine) => cabine.id === selectedId) ?? (!explicitSelection ? visible[0] : undefined)
  const activeContracts = (contratosQuery.data ?? []).filter((contrato) => asString(contrato.status).toLowerCase() === 'ativo')

  useEffect(() => {
    if (!cabines.length) return
    if (explicitLiveId) {
      const byLive = cabines.find((cabine) => asString(cabine.live_atual_id, '') === explicitLiveId)
      setSelectedId(byLive?.id ?? '')
      return
    }
    if (explicitCabineId) {
      setSelectedId(cabines.some((cabine) => cabine.id === explicitCabineId) ? explicitCabineId : '')
    }
  }, [cabines, explicitCabineId, explicitLiveId])

  function selectCabine(cabine: Cabine) {
    setSelectedId(cabine.id)
    setStartForm({
      cliente_id: suggestedClienteId(cabine),
      tiktok_username: suggestedTiktokUsername(cabine),
    })
    const nextParams = new URLSearchParams(params)
    nextParams.set('cabine', cabine.id)
    const liveId = asString((cabine as Cabine & JsonRecord).live_atual_id, '')
    if (liveId) nextParams.set('live', liveId)
    else nextParams.delete('live')
    setParams(nextParams, { replace: true })
  }

  function setStartField(key: keyof typeof emptyStartForm, value: string) {
    setStartForm((current) => ({ ...current, [key]: value }))
  }

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  function setCabineField(key: keyof typeof emptyCabineForm, value: string) {
    setCabineForm((current) => ({ ...current, [key]: value }))
  }

  function openCreateForm() {
    setEditingId('')
    setCabineForm(emptyCabineForm)
    setShowForm(true)
  }

  function openEditForm(cabine: Cabine) {
    const record = cabine as Cabine & JsonRecord
    setEditingId(cabine.id)
    setCabineForm({
      nome: asString(record.nome ?? `Cabine ${cabine.numero ?? ''}`, ''),
      descricao: asString(record.descricao, ''),
    })
    setShowForm(true)
  }

  function onCabineSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    saveCabineMutation.mutate(cabineForm)
  }

  function onReservar(cabineId: string) {
    if (!contratoId) return
    reservarMutation.mutate({ id: cabineId, contrato: contratoId })
  }

  function onStartLive(cabine: Cabine) {
    const clienteId = startForm.cliente_id || suggestedClienteId(cabine)
    const tiktokUsername = startForm.tiktok_username.trim() || suggestedTiktokUsername(cabine)
    iniciarMutation.mutate({
      cabine_id: cabine.id,
      ...(clienteId ? { cliente_id: clienteId } : {}),
      tiktok_username: tiktokUsername || null,
      tipo: liveType,
    })
  }

  function onEncerrarLive(live: JsonRecord) {
    const liveId = asString(live.live_id, '')
    if (!liveId) return
    encerrarMutation.mutate({
      id: liveId,
      payload: {
        fat_gerado: asNumber(live.gmv_atual),
        qtd_pedidos: asNumber(live.total_orders),
        resumo: 'Live encerrada pelo painel React.',
        manual_gmv: asNumber(live.gmv_atual),
        manual_orders: asNumber(live.total_orders),
        manual_views: asNumber(live.total_viewers ?? live.viewer_count),
        manual_likes: asNumber(live.likes_count),
      },
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação"
        accent={title}
        title="e lives"
        subtitle="Status das cabines, lives ativas, GMV atual e ações operacionais básicas."
        actions={
          <div className="flex flex-wrap gap-2">
            {canWriteCabine ? <Button icon={Plus} onClick={openCreateForm}>Nova cabine</Button> : null}
            <Button variant="secondary" icon={RefreshCcw} onClick={() => void query.refetch()}>
              Atualizar
            </Button>
          </div>
        }
      />

      {showForm && canWriteCabine ? (
        <Card>
          <CardBody>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={onCabineSubmit}>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Nome</span>
                <input className="design-input mt-2 h-11 w-full px-4" value={cabineForm.nome} onChange={(event) => setCabineField('nome', event.target.value)} required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Descrição</span>
                <input className="design-input mt-2 h-11 w-full px-4" value={cabineForm.descricao} onChange={(event) => setCabineField('descricao', event.target.value)} />
              </label>
              {saveCabineMutation.isError ? <p className="md:col-span-2 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(saveCabineMutation.error)}</p> : null}
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button type="submit" icon={Plus} isLoading={saveCabineMutation.isPending}>{editingId ? 'Salvar cabine' : 'Criar cabine'}</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardBody className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="design-input flex h-11 min-w-0 flex-1 items-center gap-2 px-3">
                <Search className="h-4 w-4 shrink-0 text-ink-muted" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
                  placeholder="Buscar por cabine, cliente ou apresentadora"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ['all', 'Todas', counts.all],
                  ['live', 'Ao vivo', counts.live],
                  ['busy', 'Preparando', counts.busy],
                  ['free', 'Livres', counts.free],
                  ['maintenance', 'Manutenção', counts.maintenance],
                ].map(([key, label, count]) => (
                  <button
                    key={String(key)}
                    className={filter === key ? 'rounded-full border border-brand bg-brand-soft px-3 py-2 text-xs font-bold text-brand' : 'rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink-muted hover:bg-surface-muted'}
                    onClick={() => setFilter(String(key))}
                  >
                    {label} <span className="ml-1 num">{count}</span>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {visible.map((cabine) => {
          const live = cabine.status === 'ao_vivo'
          return (
            <Card
              key={cabine.id}
              className={live ? 'border-[var(--success)]/35 bg-gradient-to-b from-[var(--success-soft)] to-surface' : undefined}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand shadow-sm">
                      <Presentation className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="num text-lg font-bold tracking-[-0.02em] text-ink">Cabine {String(cabine.numero ?? '').padStart(2, '0')}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{asString(cabine.cliente_nome, 'sem cliente vinculado')}</p>
                    </div>
                  </div>
                  <Badge tone={statusTone(cabine.status)}>{asString(cabine.status)}</Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <p className="text-xs text-[var(--text-secondary)]">
                  {asString(cabine.apresentador_nome, live ? 'apresentadora em transmissão' : 'sem apresentadora definida')}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-surface-muted p-3">
                    <p className="text-xs text-ink-muted">Viewers</p>
                    <p className="num font-bold text-ink">{asNumber(cabine.viewer_count).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="rounded-xl bg-surface-muted p-3">
                    <p className="text-xs text-ink-muted">GMV</p>
                    <p className="num font-bold text-brand">{formatMoney(cabine.gmv_atual)}</p>
                  </div>
                  <div className="rounded-xl bg-surface-muted p-3">
                    <p className="text-xs text-ink-muted">Pedidos</p>
                    <p className="num font-bold text-ink">{asNumber(cabine.total_orders).toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" icon={MonitorPlay} onClick={() => selectCabine(cabine)}>
                    Detalhes
                  </Button>
                  {canWriteLive && !live ? (
                    <Button
                      icon={PlayCircle}
                      isLoading={iniciarMutation.isPending}
                      onClick={() => {
                        selectCabine(cabine)
                        const clienteId = suggestedClienteId(cabine)
                        if (clienteId) {
                          iniciarMutation.mutate({
                            cabine_id: cabine.id,
                            cliente_id: clienteId,
                            tiktok_username: suggestedTiktokUsername(cabine) || null,
                          })
                        }
                      }}
                    >
                      Iniciar live
                    </Button>
                  ) : null}
                  {canWriteCabine ? (
                    <Button variant="secondary" icon={Edit2} onClick={() => openEditForm(cabine)}>
                      Editar
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    icon={Power}
                    disabled={!canWriteCabine || !cabine.id || liberarMutation.isPending}
                    onClick={() => void liberarMutation.mutate(cabine.id)}
                  >
                    Liberar
                  </Button>
                  {canWriteCabine ? (
                    <>
                      <Button variant="ghost" icon={Wrench} disabled={statusMutation.isPending} onClick={() => void statusMutation.mutate({ id: cabine.id, status: 'manutencao' })}>
                        Manutenção
                      </Button>
                      <Button variant="ghost" icon={CalendarClock} disabled={statusMutation.isPending} onClick={() => void statusMutation.mutate({ id: cabine.id, status: 'disponivel' })}>
                        Disponível
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          )
        })}
          </section>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-ink">Ocupação agora</p>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand">Tempo real</span>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {occupancyRows.map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={clsx('h-2.5 w-2.5 rounded-full', color)} />
                    <span className="text-sm font-medium text-ink">{label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-ink">
                    <Icon className="h-4 w-4 text-ink-muted" />
                    <span className="num">{value}</span>
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Espectadores</p>
                  <p className="num mt-1 text-lg font-bold text-ink">{totalViewers.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">GMV agora</p>
                  <p className="num mt-1 text-lg font-bold text-brand">{formatMoney(totalGmv)}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Detalhe da cabine</p>
              <p className="mt-1 text-xs text-ink-muted">{selectedCabine ? `Cabine ${asString(selectedCabine.numero)}` : 'Selecione uma cabine'}</p>
            </CardHeader>
            <CardBody className="space-y-4">
              {!selectedCabine ? <p className="text-sm text-ink-muted">Abra os detalhes de uma cabine para ver live atual e histórico.</p> : null}
              {selectedCabine && canWriteLive && selectedCabine.status !== 'ao_vivo' ? (
                <div className="space-y-3 rounded-2xl border border-brand/20 bg-brand-soft/60 p-3">
                  <div>
                    <p className="text-sm font-bold text-ink">Iniciar live agora</p>
                    <p className="mt-1 text-xs text-ink-muted">Usa o fluxo operacional antigo e coloca a cabine em ao vivo.</p>
                  </div>
                  <label className="block">
                    <span className="text-xs font-semibold text-ink-muted">Cliente ou marca</span>
                    <select
                      className="design-input mt-2 h-10 w-full px-3 text-sm"
                      value={startForm.cliente_id || suggestedClienteId(selectedCabine)}
                      onChange={(event) => setStartField('cliente_id', event.target.value)}
                      disabled={clientesQuery.isLoading || !readClientesForLiveRoles.has(user?.papel ?? '')}
                    >
                      <option value="">Selecione um cliente</option>
                      {suggestedClienteId(selectedCabine) && !clientesQuery.data?.some((cliente) => asString(cliente.id) === suggestedClienteId(selectedCabine)) ? (
                        <option value={suggestedClienteId(selectedCabine)}>{asString(selectedCabine.cliente_nome, 'Cliente vinculado')}</option>
                      ) : null}
                      {(clientesQuery.data ?? []).map((cliente) => (
                        <option key={asString(cliente.id)} value={asString(cliente.id)}>
                          {asString(cliente.nome ?? cliente.razao_social ?? cliente.email, 'Cliente')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-ink-muted">TikTok da live</span>
                    <input
                      className="design-input mt-2 h-10 w-full px-3 text-sm"
                      placeholder="@usuario_tiktok"
                      value={startForm.tiktok_username}
                      onChange={(event) => setStartField('tiktok_username', event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-ink-muted">Tipo de live</span>
                    <select
                      className="design-input mt-2 h-10 w-full px-3 text-sm"
                      value={liveType}
                      onChange={(event) => setLiveType(event.target.value as 'cliente' | 'afiliado' | 'teste')}
                    >
                      <option value="cliente">Cliente</option>
                      <option value="afiliado">Afiliado</option>
                      <option value="teste">Teste</option>
                    </select>
                  </label>
                  <Button
                    className="w-full"
                    icon={PlayCircle}
                    isLoading={iniciarMutation.isPending}
                    disabled={!selectedCabine.id || !(startForm.cliente_id || suggestedClienteId(selectedCabine))}
                    onClick={() => onStartLive(selectedCabine)}
                  >
                    Iniciar live
                  </Button>
                  {clientesQuery.isError ? <p className="text-xs font-medium text-[var(--danger)]">{extractErrorMessage(clientesQuery.error)}</p> : null}
                  {!(startForm.cliente_id || suggestedClienteId(selectedCabine)) ? (
                    <p className="text-xs text-ink-muted">Selecione um cliente para iniciar live sem contrato reservado.</p>
                  ) : null}
                </div>
              ) : null}

              {selectedCabine && canWriteCabine ? (
                <div className="space-y-3 rounded-2xl border border-line bg-surface-muted p-3">
                  <p className="text-sm font-bold text-ink">Reservar por contrato ativo</p>
                  <select className="design-input h-10 w-full px-3 text-sm" value={contratoId} onChange={(event) => setContratoId(event.target.value)}>
                    <option value="">Selecione um contrato</option>
                    {activeContracts.map((contrato) => (
                      <option key={asString(contrato.id)} value={asString(contrato.id)}>
                        {asString(contrato.cliente_nome)} · {asString(contrato.status)}
                      </option>
                    ))}
                  </select>
                  {contratosQuery.isError ? <p className="text-xs font-medium text-[var(--danger)]">{extractErrorMessage(contratosQuery.error)}</p> : null}
                  <Button variant="secondary" icon={CalendarClock} disabled={!contratoId || reservarMutation.isPending} onClick={() => onReservar(selectedCabine.id)}>
                    Reservar cabine
                  </Button>
                </div>
              ) : null}

              {liveAtualQuery.isLoading ? <LoadingState label="Carregando live atual" /> : null}
              {liveAtualQuery.data ? (
                <div className="rounded-2xl border border-line bg-surface-muted p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink">Live atual</p>
                      <p className="mt-1 text-xs text-ink-muted">{liveAtualQuery.data.live_ativa ? asString(liveAtualQuery.data.cliente_nome, 'Cliente em live') : asString(liveAtualQuery.data.message, 'Nenhuma live ativa')}</p>
                    </div>
                    <Badge tone={liveAtualQuery.data.live_ativa ? 'success' : 'neutral'}>{liveAtualQuery.data.live_ativa ? 'ativa' : 'sem live'}</Badge>
                  </div>
                  {liveAtualQuery.data.live_ativa ? (
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-surface p-2"><p className="text-[10px] text-ink-muted">Viewers</p><p className="num font-bold text-ink">{asNumber(liveAtualQuery.data.viewer_count)}</p></div>
                      <div className="rounded-xl bg-surface p-2"><p className="text-[10px] text-ink-muted">GMV</p><p className="num font-bold text-brand">{formatMoney(liveAtualQuery.data.gmv_atual)}</p></div>
                      <div className="rounded-xl bg-surface p-2"><p className="text-[10px] text-ink-muted">Pedidos</p><p className="num font-bold text-ink">{asNumber(liveAtualQuery.data.total_orders)}</p></div>
                    </div>
                  ) : null}
                  {liveAtualQuery.data.live_ativa && canWriteLive ? (
                    <Button className="mt-4" variant="danger" icon={StopCircle} isLoading={encerrarMutation.isPending} onClick={() => onEncerrarLive(liveAtualQuery.data ?? {})}>
                      Encerrar live
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {historicoQuery.data ? (
                <div className="rounded-2xl border border-line bg-surface-muted p-4">
                  <p className="text-sm font-bold text-ink">Histórico</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Lives</p>
                      <p className="num mt-1 text-lg font-bold text-ink">{asNumber(asArray<JsonRecord>(historicoQuery.data.lives_recentes).length)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">GMV total</p>
                      <p className="num mt-1 text-lg font-bold text-brand">{formatMoney((historicoQuery.data.totais as JsonRecord | undefined)?.gmv_total)}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {asArray<JsonRecord>(historicoQuery.data.lives_recentes).slice(0, 3).map((live) => (
                      <div key={asString(live.id)} className="rounded-xl bg-surface p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-ink">{asString(live.cliente_nome, 'Cliente')}</p>
                            <p className="mt-1 text-[11px] text-ink-muted">{formatDate(asString(live.iniciado_em, ''))} · {formatMoney(live.fat_gerado)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            onClick={() => setGmvModalLiveId(asString(live.id, ''))}
                            className="shrink-0"
                          >
                            Hist. GMV
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {reservarMutation.isError || statusMutation.isError || liberarMutation.isError || iniciarMutation.isError || encerrarMutation.isError || liveAtualQuery.isError || historicoQuery.isError ? (
                <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
                  {extractErrorMessage(reservarMutation.error ?? statusMutation.error ?? liberarMutation.error ?? iniciarMutation.error ?? encerrarMutation.error ?? liveAtualQuery.error ?? historicoQuery.error)}
                </p>
              ) : null}
            </CardBody>
          </Card>
        </aside>
      </section>

      <HistoricoGmvModal liveId={gmvModalLiveId} onClose={() => setGmvModalLiveId(null)} />
    </div>
  )
}
