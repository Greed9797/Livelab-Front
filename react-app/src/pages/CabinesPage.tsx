import { CalendarClock, EyeOff, MonitorPlay, Power, Presentation, RefreshCcw, StopCircle, Trash2, Wrench } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge, statusTone } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/States'
import { Modal } from '../components/ui/Modal'
import { MoneyInput } from '../components/ui/MoneyInput'
import { TikTokLiveButton } from '../components/ui/TikTokLiveButton'
import { AgendarLiveModal } from '../components/forms/AgendarLiveModal'
import { EditarLiveModal } from '../components/forms/EditarLiveModal'
import { PresenterSelect } from '../components/forms/PresenterSelect'
import { HistoricoGmvModal } from './HistoricoGmvModal'
import { atualizarStatusCabine, deleteCabine, encerrarLive, getApresentadoras, getCabineHistorico, getCabines, getClientes, getLivePorId, getLiveTiktokStatus, getMarcas, iniciarLive, liberarCabine, updateCabine } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, formatDate, formatMoney } from '../utils/format'
import { getBrandImage } from '../utils/favicon'
import { useCurrentUser } from '../stores/auth-store'
import { useToast } from '../components/ui/Toast'
import type { Cabine, JsonRecord } from '../types/models'
import { useSelectedLive } from '../hooks/useSelectedLive'

const writeCabineRoles = new Set(['franqueador_master', 'franqueado', 'gerente', 'operacional', 'produtor_live'])
const writeLiveRoles = new Set(['franqueador_master', 'franqueado', 'gerente', 'operacional', 'apresentador', 'apresentadora', 'produtor_live'])
const readClientesForLiveRoles = new Set(['franqueador_master', 'franqueado', 'gerente', 'operacional', 'produtor_live'])
const availableCabineStatus = 'disponivel'
const staleLiveThresholdMinutes = 12 * 60
const emptyEndForm = {
  fat_gerado: '',
  qtd_pedidos: '',
  manual_views: '',
  manual_likes: '',
  manual_comments: '',
  manual_shares: '',
  manual_diamonds: '',
  apresentadora_id: '',
  encerrado_em: '',
  origem_dados: 'manual',
  status_publicacao: 'rascunho',
  resumo: '',
}

function suggestedClienteId(cabine?: Cabine | null): string {
  if (!cabine) return ''
  const record = cabine as Cabine & JsonRecord
  const agenda = asArray<JsonRecord>(record.agenda)
  return asString(
    record.cliente_id ??
      record.cliente_em_live_id ??
      getNestedValue(record.cliente_em_live, 'id') ??
      record.proxima_cliente_id ??
      getNestedValue(record.proxima_agenda, 'cliente_id') ??
      record.cliente_reservado_id ??
      getNestedValue(record.cliente_reservado, 'id') ??
      agenda[0]?.cliente_id,
    '',
  )
}

function isCabineActive(cabine: Cabine): boolean {
  return (cabine as Cabine & JsonRecord).ativo !== false
}

function getNestedValue(value: unknown, key: string): unknown {
  return value && typeof value === 'object' ? (value as JsonRecord)[key] : undefined
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, '0') + 'min' : ''}` : `${m}min`
}

function fmtRecDuration(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00`
}

function getLiveElapsedMinutes(cabine: Cabine): number {
  if (cabine.status !== 'ao_vivo') return 0
  const iniciadoEm = asString((cabine as Cabine & JsonRecord).iniciado_em, '')
  if (!iniciadoEm) return 0
  const iniciado = new Date(iniciadoEm)
  if (Number.isNaN(iniciado.getTime())) return 0
  return Math.max(0, Math.floor((Date.now() - iniciado.getTime()) / 60000))
}

function isStaleLiveDuration(minutes: number): boolean {
  return minutes >= staleLiveThresholdMinutes
}

function isCabineLiveStale(cabine: Cabine): boolean {
  return isStaleLiveDuration(getLiveElapsedMinutes(cabine))
}

export function CabinesPage({ title = 'Cabines', embedded = false }: { title?: string; embedded?: boolean }) {
  const user = useCurrentUser()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const canWriteCabine = writeCabineRoles.has(user?.papel ?? '')
  const canWriteLive = writeLiveRoles.has(user?.papel ?? '')
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState('')
  const [startCabine, setStartCabine] = useState<Cabine | null>(null)
  const [endLiveData, setEndLiveData] = useState<JsonRecord | null>(null)
  const [editLiveData, setEditLiveData] = useState<JsonRecord | null>(null)
  const [fetchingEditLive, setFetchingEditLive] = useState(false)
  const [endForm, setEndForm] = useState(emptyEndForm)
  const [gmvModalLiveId, setGmvModalLiveId] = useState<string | null>(null)
  const client = useQueryClient()
  const explicitCabineId = params.get('cabine') ?? ''
  const explicitLiveId = params.get('live') ?? ''
  const query = useQuery({ queryKey: ['cabines'], queryFn: getCabines, refetchInterval: () => (document.hidden ? false : 30_000), refetchIntervalInBackground: false, staleTime: 15_000 })
  const clientesQuery = useQuery({ queryKey: ['clientes', 'live-start'], queryFn: getClientes, enabled: canWriteLive && readClientesForLiveRoles.has(user?.papel ?? '') })
  const marcasQuery = useQuery({ queryKey: ['marcas', 'live-start'], queryFn: () => getMarcas({ status: 'ativa' }), enabled: canWriteLive })
  const apresentadorasQuery = useQuery({ queryKey: ['apresentadoras', 'live-start'], queryFn: getApresentadoras, enabled: canWriteLive })
  const historicoQuery = useQuery({ queryKey: ['cabine-historico', selectedId], queryFn: () => getCabineHistorico(selectedId), enabled: Boolean(selectedId) })
  const selectedLive = useSelectedLive({
    liveId: explicitLiveId || undefined,
    cabineId: selectedId || undefined,
    autoRefreshMs: selectedId || explicitLiveId ? 20_000 : 0,
  })
  const liveAtualData = selectedLive.live as unknown as JsonRecord | null
  const liveAtualId = asString(liveAtualData?.id ?? liveAtualData?.live_id, '')
  const tiktokStatusQuery = useQuery({
    queryKey: ['live-tiktok-status', liveAtualId],
    queryFn: () => getLiveTiktokStatus(liveAtualId),
    enabled: Boolean(liveAtualId),
    refetchInterval: () => (liveAtualId && !document.hidden ? 20_000 : false),
    refetchIntervalInBackground: false,
  })
  function invalidateOperational() {
    ;[
      ['cabines'],
      ['agenda'],
      ['lives'],
      ['home-dashboard'],
      ['ranking-apresentadoras'],
      ['comissoes-resumo'],
      ['comissoes-apresentadoras'],
      ['comissoes-marcas'],
      ['comissoes-pendentes'],
    ].forEach((queryKey) => {
      void client.invalidateQueries({ queryKey })
    })
  }

  const liberarMutation = useMutation({
    mutationFn: liberarCabine,
    onSuccess: () => invalidateOperational(),
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => atualizarStatusCabine(id, status),
    onSuccess: () => invalidateOperational(),
  })
  const activeMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => updateCabine(id, { ativo }),
    onSuccess: () => invalidateOperational(),
  })
  const deleteMutation = useMutation({
    mutationFn: ({ id, confirmacao }: { id: string; confirmacao?: string }) => deleteCabine(id, confirmacao),
    onSuccess: () => {
      setSelectedId('')
      invalidateOperational()
    },
  })
  const encerrarMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => encerrarLive(id, payload),
    onSuccess: () => {
      setEndLiveData(null)
      setEndForm(emptyEndForm)
      invalidateOperational()
      selectedLive.refresh()
      toast.push('Live encerrada', 'success')
    },
    onError: (e) => {
      toast.push('Erro ao encerrar live: ' + extractErrorMessage(e), 'error')
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
      setStartCabine(null)
      invalidateOperational()
      selectedLive.refresh()
      toast.push('Live iniciada com sucesso', 'success')
    },
    onError: (e) => {
      toast.push('Erro ao iniciar live: ' + extractErrorMessage(e), 'error')
    },
  })

  const cabines = query.data ?? []
  const activeCabines = cabines.filter(isCabineActive)
  const inactiveCount = cabines.length - activeCabines.length
  const liveCount = activeCabines.filter((item) => item.status === 'ao_vivo' && !isCabineLiveStale(item)).length
  const staleLiveCount = activeCabines.filter((item) => item.status === 'ao_vivo' && isCabineLiveStale(item)).length
  const maintenanceCount = activeCabines.filter((item) => item.status === 'manutencao').length
  const freeCount = activeCabines.filter((item) => item.status === availableCabineStatus).length
  const counts = {
    all: activeCabines.length,
    live: liveCount,
    review: staleLiveCount,
    maintenance: maintenanceCount,
    free: freeCount,
    busy: Math.max(activeCabines.length - liveCount - staleLiveCount - maintenanceCount - freeCount, 0),
    inactive: inactiveCount,
  }
  const visible = cabines.filter((cabine) => {
    const active = isCabineActive(cabine)
    const staleLive = active && cabine.status === 'ao_vivo' && isCabineLiveStale(cabine)
    const statusMatch =
      (filter === 'all' && active) ||
      (filter === 'inactive' && !active) ||
      (filter === 'live' && active && cabine.status === 'ao_vivo' && !staleLive) ||
      (filter === 'review' && staleLive) ||
      (filter === 'free' && active && cabine.status === availableCabineStatus) ||
      (filter === 'maintenance' && active && cabine.status === 'manutencao') ||
      (filter === 'busy' && active && !['ao_vivo', availableCabineStatus, 'manutencao'].includes(cabine.status ?? ''))
    return statusMatch
  })
  const selectedCabine = visible.find((cabine) => cabine.id === selectedId)

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
    const nextParams = new URLSearchParams(params)
    nextParams.set('cabine', cabine.id)
    const liveId = asString((cabine as Cabine & JsonRecord).live_atual_id, '')
    if (liveId) nextParams.set('live', liveId)
    else nextParams.delete('live')
    setParams(nextParams, { replace: true })
  }

  function scheduleCabine(cabine: Cabine) {
    selectCabine(cabine)
    const nextParams = new URLSearchParams()
    nextParams.set('tab', 'agenda')
    nextParams.set('cabine', cabine.id)
    navigate(`/conteudo?${nextParams.toString()}`)
  }

  async function onEditLive() {
    if (!liveAtualId) return
    setFetchingEditLive(true)
    try {
      const fullLive = await getLivePorId(liveAtualId)
      setEditLiveData(fullLive as unknown as JsonRecord)
    } catch {
      setEditLiveData(liveAtualData)
    } finally {
      setFetchingEditLive(false)
    }
  }

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  function setEndField(key: keyof typeof emptyEndForm, value: string) {
    setEndForm((current) => ({ ...current, [key]: value }))
  }

  function toDatetimeLocal(value?: unknown): string {
    const date = value ? new Date(asString(value, '')) : new Date()
    const valid = Number.isNaN(date.getTime()) ? new Date() : date
    return new Date(valid.getTime() - valid.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
  }

  function onEncerrarLive(live: JsonRecord) {
    const liveId = asString(live.live_id ?? live.id, '')
    if (!liveId) return
    setEndLiveData(live)
    setEndForm({
      fat_gerado: String(asNumber(live.gmv_atual ?? live.manual_gmv ?? live.fat_gerado) || ''),
      qtd_pedidos: String(asNumber(live.total_orders ?? live.final_orders_count ?? live.qtd_pedidos) || ''),
      manual_views: String(asNumber(live.total_viewers ?? live.viewer_count ?? live.manual_views) || ''),
      manual_likes: String(asNumber(live.likes_count ?? live.manual_likes) || ''),
      manual_comments: String(asNumber(live.comments_count ?? live.manual_comments) || ''),
      manual_shares: String(asNumber(live.shares_count ?? live.manual_shares) || ''),
      manual_diamonds: String(asNumber(live.gifts_diamonds ?? live.manual_diamonds) || ''),
      apresentadora_id: asString(live.apresentadora_id, ''),
      encerrado_em: toDatetimeLocal(new Date()),
      origem_dados: asString(live.origem_dados, 'manual') === 'api' ? 'api' : 'manual',
      status_publicacao: asString(live.status_publicacao, 'rascunho'),
      resumo: 'Live encerrada pelo painel React.',
    })
  }

  function confirmEncerrarLive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const liveId = asString(endLiveData?.live_id ?? endLiveData?.id, '')
    if (!liveId) return
    if (!endForm.apresentadora_id) {
      window.alert('Selecione a apresentadora antes de encerrar a live.')
      return
    }
    if (endForm.encerrado_em && endLiveData?.iniciado_em) {
      const fim = new Date(endForm.encerrado_em).getTime()
      const ini = new Date(asString(endLiveData.iniciado_em)).getTime()
      if (Number.isFinite(fim) && Number.isFinite(ini) && fim < ini) {
        window.alert('Término real não pode ser anterior ao início da live.')
        return
      }
    }
    encerrarMutation.mutate({
      id: liveId,
      payload: {
        fat_gerado: asNumber(endForm.fat_gerado),
        qtd_pedidos: asNumber(endForm.qtd_pedidos),
        resumo: endForm.resumo.trim() || 'Live encerrada pelo painel React.',
        manual_gmv: asNumber(endForm.fat_gerado),
        manual_orders: asNumber(endForm.qtd_pedidos),
        manual_views: asNumber(endForm.manual_views),
        manual_likes: asNumber(endForm.manual_likes),
        manual_comments: asNumber(endForm.manual_comments),
        manual_shares: asNumber(endForm.manual_shares),
        manual_diamonds: asNumber(endForm.manual_diamonds),
        apresentadora_id: endForm.apresentadora_id,
        encerrado_em: endForm.encerrado_em ? new Date(endForm.encerrado_em).toISOString() : new Date().toISOString(),
        origem_dados: endForm.origem_dados,
        status_publicacao: endForm.status_publicacao,
      },
    })
  }

  function confirmDeleteCabine(cabine: Cabine) {
    const confirmacao = window.prompt(`Para excluir a Cabine ${asString(cabine.numero)}, digite CABINE.`)
    if (confirmacao !== 'CABINE') return
    deleteMutation.mutate({ id: cabine.id, confirmacao })
  }

  return (
    <div className="space-y-6">
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-bold text-ink">{title}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={RefreshCcw} onClick={() => void query.refetch()}>
              Atualizar
            </Button>
          </div>
        </div>
      ) : (
        <PageHeader
          eyebrow="Operação"
          accent={title}
          title="e lives"
          subtitle="Status das cabines, lives ativas, GMV atual e ações operacionais básicas."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={RefreshCcw} onClick={() => void query.refetch()}>
                Atualizar
              </Button>
            </div>
          }
        />
      )}

      <section>
        <div className="space-y-4">
          <Card>
            <CardBody className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-end">
              <div className="flex flex-wrap gap-2">
                {[
                  ['all', 'Todas', counts.all],
                  ['live', 'Ao vivo', counts.live],
                  ['review', 'Revisar', counts.review],
                  ['busy', 'Preparando', counts.busy],
                  ['free', 'Livres', counts.free],
                  ['maintenance', 'Manutenção', counts.maintenance],
                  ['inactive', 'Inativas', counts.inactive],
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

          <section className="grid gap-[22px] sm:grid-cols-2 2xl:grid-cols-3">
            {visible.map((cabine) => {
              const live = cabine.status === 'ao_vivo'
              const active = isCabineActive(cabine)
              const record = cabine as Cabine & JsonRecord
              const duracaoMin = getLiveElapsedMinutes(cabine)
              const staleLive = live && isStaleLiveDuration(duracaoMin)
              const healthyLive = live && !staleLive
              const brandLogo = getBrandImage({
                logo_url: record.marca_logo_url ?? getNestedValue(record.proxima_agenda, 'marca_logo_url'),
                site: record.marca_site ?? getNestedValue(record.proxima_agenda, 'marca_site'),
              })
              const brandName = asString(
                record.marca_nome
                  ?? (getNestedValue(record.proxima_agenda, 'marca_nome') as string | undefined)
                  ?? record.cliente_nome
                  ?? record.cliente_em_live_nome,
                '',
              )
              const brandInitials = brandName
                ? brandName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                : ''

              return (
                <article
                  key={cabine.id}
                  className={`relative overflow-hidden rounded-[18px] border transition-all duration-[250ms] ${healthyLive ? 'cabine-card-live' : staleLive ? 'hover:border-[var(--warning)]' : 'cabine-card-avail border-[var(--border)] hover:border-[var(--border-strong)]'}`}
                  style={
                    healthyLive ? {
                      borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
                      background: 'radial-gradient(500px 180px at 100% -30%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 60%), var(--bg-elev-1)',
                    } : staleLive ? {
                      borderColor: 'color-mix(in srgb, var(--warning) 42%, transparent)',
                      background: 'radial-gradient(500px 180px at 100% -30%, color-mix(in srgb, var(--warning) 12%, transparent), transparent 60%), var(--bg-elev-1)',
                    } : { background: 'var(--bg-elev-1)' }
                  }
                >
                  {/* card body */}
                  <div className="relative z-[2] p-[22px_24px_20px]">

                    {/* head: icon + name + status badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-[14px] min-w-0">
                        {/* brand icon: logo image → initials → generic */}
                        {brandLogo ? (
                          <img
                            src={brandLogo}
                            alt={brandName}
                            loading="lazy"
                            decoding="async"
                            className="h-[42px] w-[42px] flex-none rounded-[11px] object-cover border border-[var(--border)]"
                          />
                        ) : brandInitials ? (
                          <div className="h-[42px] w-[42px] flex-none rounded-[11px] grid place-items-center text-[11px] font-bold tracking-[0.08em] bg-[var(--bg-elev-3)] text-[var(--text-secondary)] border border-[var(--border)]">
                            {brandInitials}
                          </div>
                        ) : (
                          <div
                            className="h-[42px] w-[42px] flex-none rounded-[11px] grid place-items-center border"
                            style={healthyLive
                              ? { background: 'var(--primary-soft)', color: 'var(--primary)', borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)' }
                              : staleLive
                                ? { background: 'var(--warning-soft)', color: 'var(--warning)', borderColor: 'color-mix(in srgb, var(--warning) 30%, transparent)' }
                              : { background: 'var(--bg-elev-3)', color: 'var(--text-muted)', borderColor: 'var(--border)' }
                            }
                          >
                            <Presentation className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="m-0 text-[19px] font-semibold tracking-[-0.015em] text-[var(--text-primary)] leading-tight">
                            Cabine {String(cabine.numero ?? '').padStart(2, '0')}
                          </h3>
                          {brandName ? (
                            <p className="mt-[3px] text-[11.5px] uppercase tracking-[0.08em] font-mono text-[var(--text-muted)] truncate">
                              {brandName}
                            </p>
                          ) : (
                            <p className="mt-[3px] text-[12px] italic text-[var(--text-faint)]">sem cliente</p>
                          )}
                        </div>
                      </div>

                      {/* status badge */}
                      {live ? (
                        <span
                          className={`shrink-0 inline-flex items-center gap-2 px-[10px] py-[5px] rounded-full text-[11px] font-semibold tracking-[0.06em] uppercase font-mono border ${staleLive ? 'bg-[var(--warning-soft)] text-[var(--warning)]' : 'bg-[var(--primary-soft)] text-[var(--primary)]'}`}
                          style={{ borderColor: staleLive ? 'color-mix(in srgb, var(--warning) 35%, transparent)' : 'color-mix(in srgb, var(--primary) 30%, transparent)' }}
                        >
                          <span className={`${healthyLive ? 'cabine-live-ping' : ''} relative w-[7px] h-[7px] rounded-full ${staleLive ? 'bg-[var(--warning)]' : 'bg-[var(--primary)]'}`} />
                          {staleLive ? 'REVISAR' : 'AO VIVO'}
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-2 px-[10px] py-[5px] rounded-full text-[11px] font-semibold tracking-[0.06em] uppercase font-mono border border-[var(--border)] bg-[var(--bg-elev-3)] text-[var(--text-muted)]">
                          <span className="w-[7px] h-[7px] rounded-full bg-[var(--text-faint)]" />
                          {active ? 'DISPONÍVEL' : 'INATIVA'}
                        </span>
                      )}
                    </div>

                    {/* presenter row */}
                    <div className="mt-[18px] flex items-center gap-[10px] px-[14px] py-[11px] rounded-[11px] border border-[var(--border)] text-[13px] text-[var(--text-secondary)]" style={{ background: 'rgba(0,0,0,0.02)' }}>
                      {live ? (
                        <>
                          <span
                            className={`w-[7px] h-[7px] shrink-0 rounded-full ${staleLive ? 'bg-[var(--warning)]' : 'bg-[var(--primary)]'}`}
                            style={{ boxShadow: staleLive ? '0 0 8px var(--warning)' : '0 0 8px var(--primary)' }}
                          />
                          <span className="truncate">
                            <span className="font-medium text-[var(--text-primary)]">{asString(record.apresentador_nome, 'Apresentadora')}</span>
                            {staleLive ? ' · live sem encerramento' : ' · em transmissão'}
                          </span>
                          {duracaoMin > 0 && (
                            <span className="ml-auto shrink-0 font-mono text-[11px] text-[var(--text-muted)]">
                              {staleLive ? 'iniciada há ' : 'há '}{fmtDuration(duracaoMin)}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="w-[7px] h-[7px] shrink-0 rounded-full bg-[var(--text-faint)]" />
                          <span className="text-[var(--text-faint)]">sem apresentadora definida</span>
                        </>
                      )}
                    </div>

                    {/* metrics 3-col */}
                    <div className="mt-[14px] grid grid-cols-3 gap-px rounded-[12px] overflow-hidden border border-[var(--border)] bg-[var(--border)]">
                      {[
                        { label: 'Viewers', value: live ? asNumber(cabine.viewer_count).toLocaleString('pt-BR') : '—', accent: false },
                        { label: 'GMV',     value: live ? formatMoney(cabine.gmv_atual) : '—',                        accent: live  },
                        { label: 'Pedidos', value: live ? asNumber(cabine.total_orders).toLocaleString('pt-BR') : '—', accent: false },
                      ].map(({ label, value, accent }) => (
                        <div key={label} className="bg-[var(--bg-elev-1)] p-[13px_15px] min-h-[66px]">
                          <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.10em] font-medium">{label}</div>
                          <div className={`mt-[5px] text-[20px] font-semibold tracking-[-0.015em] num leading-none ${accent ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* live strip — audio wave + REC timecode */}
                    {live && (
                      <div
                        className="mt-[14px] flex items-center gap-3 px-[14px] py-[10px] rounded-[11px] border text-[12px] text-[var(--text-primary)]"
                        style={{
                          borderColor: staleLive ? 'color-mix(in srgb, var(--warning) 26%, transparent)' : 'color-mix(in srgb, var(--primary) 20%, transparent)',
                          background: staleLive ? 'linear-gradient(90deg, color-mix(in srgb, var(--warning) 12%, transparent), transparent 80%)' : 'linear-gradient(90deg, color-mix(in srgb, var(--primary) 10%, transparent), transparent 80%)',
                        }}
                      >
                        {staleLive ? (
                          <StopCircle className="h-4 w-4 text-[var(--warning)]" />
                        ) : (
                          <span className="flex items-end gap-[2px]" style={{ height: 14 }}>
                            {(['30%', '80%', '50%', '95%', '60%'] as const).map((h, i) => (
                              <i key={i} className="cabine-wave-bar" style={{ height: h, animationDelay: `${[0, 0.15, 0.3, 0.45, 0.6][i]}s` }} />
                            ))}
                          </span>
                        )}
                        <span className="text-[var(--text-secondary)]">{staleLive ? 'Encerramento pendente' : 'Transmissão ativa'}</span>
                        {duracaoMin > 0 && (
                          <span className="ml-auto font-mono text-[11px] text-[var(--text-muted)]">
                            {staleLive ? `iniciada há ${fmtDuration(duracaoMin)}` : `REC ${fmtRecDuration(duracaoMin)}`}
                          </span>
                        )}
                      </div>
                    )}

                    {/* action buttons */}
                    <div className="mt-[16px] flex flex-wrap gap-2 items-center">
                      {live ? <TikTokLiveButton username={record.tiktok_username} /> : null}
                      {live ? (
                        <Button variant="secondary" icon={MonitorPlay} onClick={() => selectCabine(cabine)}>
                          Detalhes
                        </Button>
                      ) : active && canWriteLive ? (
                        <Button icon={MonitorPlay} onClick={() => { selectCabine(cabine); setStartCabine(cabine) }}>
                          Iniciar live
                        </Button>
                      ) : null}
                      {active && canWriteCabine ? (
                        <Button variant="secondary" icon={CalendarClock} onClick={() => scheduleCabine(cabine)}>
                          Agendar
                        </Button>
                      ) : null}
                      {!live ? (
                        <Button variant="ghost" icon={MonitorPlay} onClick={() => selectCabine(cabine)}>
                          Detalhes
                        </Button>
                      ) : null}
                      {staleLive && canWriteLive ? (
                        <Button
                          variant="danger"
                          icon={StopCircle}
                          isLoading={encerrarMutation.isPending}
                          onClick={() => {
                            selectCabine(cabine)
                            onEncerrarLive({ ...record, id: record.live_atual_id, live_id: record.live_atual_id })
                          }}
                        >
                          Encerrar
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* card footer */}
                  <div
                    className="relative z-[2] flex items-center justify-between px-6 py-[10px] border-t border-[var(--border)] text-[11px] font-mono text-[var(--text-faint)]"
                    style={{ background: 'rgba(0,0,0,0.04)' }}
                  >
                    <span>C-{String(cabine.numero ?? '').padStart(2, '0')}</span>
                    <span className="flex items-center gap-[6px]">
                      <span
                        className="w-[6px] h-[6px] rounded-full"
                        style={healthyLive
                          ? { background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }
                          : staleLive
                            ? { background: 'var(--warning)', boxShadow: '0 0 6px var(--warning)' }
                          : { background: 'var(--text-faint)' }
                        }
                      />
                      {staleLive ? 'verificar encerramento' : live ? 'transmitindo · estável' : 'aguardando'}
                    </span>
                  </div>
                </article>
              )
            })}
          </section>
        </div>

        <Modal
          open={Boolean(selectedCabine)}
          title={selectedCabine ? `Cabine ${asString(selectedCabine.numero)}` : 'Detalhe da cabine'}
          subtitle="Detalhes, agendamento, live atual e ações administrativas."
          size="lg"
          onClose={() => {
            setSelectedId('')
            const nextParams = new URLSearchParams(params)
            nextParams.delete('cabine')
            nextParams.delete('live')
            setParams(nextParams, { replace: true })
          }}
        >
        <div className="space-y-4">
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
	                    <p className="mt-1 text-xs text-ink-muted">Use o mesmo formulário operacional da agenda para informar marca, apresentadora e previsão.</p>
	                  </div>
	                  <div className="flex flex-wrap gap-2">
	                    {canWriteCabine ? (
	                      <Button variant="secondary" icon={CalendarClock} onClick={() => scheduleCabine(selectedCabine)}>
	                        Agendar esta cabine
	                      </Button>
	                    ) : null}
	                    <Button icon={MonitorPlay} isLoading={iniciarMutation.isPending} onClick={() => setStartCabine(selectedCabine)}>
	                      Iniciar live
	                    </Button>
	                  </div>
	                </div>
	              ) : null}

              {selectedCabine && canWriteCabine ? (
                <div className="space-y-3 rounded-2xl border border-line bg-surface-muted p-3">
                  <p className="text-sm font-bold text-ink">Ações administrativas</p>
                  <div className="flex flex-wrap gap-2">
	                    <Button
                      variant="ghost"
                      icon={Power}
                      disabled={!selectedCabine.id || liberarMutation.isPending}
                      onClick={() => void liberarMutation.mutate(selectedCabine.id)}
                    >
                      Liberar
                    </Button>
                    <Button variant="ghost" icon={Wrench} disabled={statusMutation.isPending} onClick={() => void statusMutation.mutate({ id: selectedCabine.id, status: 'manutencao' })}>
                      Manutenção
                    </Button>
                    <Button variant="ghost" icon={CalendarClock} disabled={statusMutation.isPending} onClick={() => void statusMutation.mutate({ id: selectedCabine.id, status: 'disponivel' })}>
                      Disponível
                    </Button>
                    <Button
                      variant="ghost"
                      icon={EyeOff}
                      disabled={activeMutation.isPending}
                      onClick={() => void activeMutation.mutate({ id: selectedCabine.id, ativo: !isCabineActive(selectedCabine) })}
                    >
                      {isCabineActive(selectedCabine) ? 'Inativar' : 'Reativar'}
                    </Button>
                    <Button
                      variant="danger"
                      icon={Trash2}
                      disabled={deleteMutation.isPending}
                      onClick={() => confirmDeleteCabine(selectedCabine)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              ) : null}

              {selectedLive.loading ? <LoadingState label="Carregando live atual" /> : null}
              {!selectedLive.loading && selectedCabine && !liveAtualData ? (
                <div className="rounded-2xl border border-line bg-surface-muted p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink">Live atual</p>
                      <p className="mt-1 text-xs text-ink-muted">Nenhuma live ativa nesta cabine</p>
                    </div>
                    <Badge tone="neutral">sem live</Badge>
                  </div>
                </div>
              ) : null}
              {liveAtualData ? (
                <div className="rounded-2xl border border-line bg-surface-muted p-4">
                  {(() => {
                    const connector = tiktokStatusQuery.data ?? {}
                    const tiktokUsername = liveAtualData.tiktok_username ?? connector.tiktok_username
                    const connectorStatus = asString(connector.status, '')
                    const hasConnector = Boolean(connectorStatus)
                    const lastSync = asString(connector.last_sync_at, '')
                    const statusToneValue: 'success' | 'warning' | 'danger' | 'neutral' =
                      connectorStatus === 'connected'
                        ? 'success'
                        : connectorStatus === 'connecting'
                          ? 'warning'
                          : connectorStatus === 'error'
                            ? 'danger'
                            : 'neutral'
                    return (
                      <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink">Live atual</p>
                      <p className="mt-1 text-xs text-ink-muted">{asString(liveAtualData.cliente_nome, 'Cliente em live')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <TikTokLiveButton username={tiktokUsername} compact />
                      <Badge tone={statusTone(asString(liveAtualData.status, 'em_andamento'))}>{asString(liveAtualData.status, 'em_andamento') === 'em_andamento' ? 'ativa' : asString(liveAtualData.status)}</Badge>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
                    <div className="rounded-xl bg-surface p-2"><p className="text-[10px] text-ink-muted">Viewers</p><p className="num font-bold text-ink">{asNumber(liveAtualData.viewer_count ?? liveAtualData.manual_views)}</p></div>
                    <div className="rounded-xl bg-surface p-2"><p className="text-[10px] text-ink-muted">GMV</p><p className="num font-bold text-brand">{formatMoney(liveAtualData.gmv_atual ?? liveAtualData.manual_gmv ?? liveAtualData.fat_gerado)}</p></div>
                    <div className="rounded-xl bg-surface p-2"><p className="text-[10px] text-ink-muted">Pedidos</p><p className="num font-bold text-ink">{asNumber(liveAtualData.total_orders ?? liveAtualData.final_orders_count ?? liveAtualData.qtd_pedidos)}</p></div>
                    <div className="rounded-xl bg-surface p-2"><p className="text-[10px] text-ink-muted">Likes</p><p className="num font-bold text-ink">{asNumber(liveAtualData.likes_count ?? liveAtualData.manual_likes).toLocaleString('pt-BR')}</p></div>
                    <div className="rounded-xl bg-surface p-2"><p className="text-[10px] text-ink-muted">Comentários</p><p className="num font-bold text-ink">{asNumber(liveAtualData.comments_count ?? liveAtualData.manual_comments).toLocaleString('pt-BR')}</p></div>
                  </div>
                  <div className="mt-3 rounded-xl border border-line bg-surface p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-ink">Conector TikTok</p>
                      {tiktokStatusQuery.isLoading ? <Badge tone="neutral">verificando</Badge> : hasConnector ? <Badge tone={statusToneValue}>{connectorStatus}</Badge> : <Badge tone="neutral">sem integração</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {hasConnector
                        ? `${asString(connector.tiktok_username, 'TikTok não informado')} · último snapshot ${lastSync ? formatDate(lastSync) : 'não recebido'}`
                        : 'Sem integração ativa ou snapshot recente para esta live.'}
                    </p>
                    {connector.error ? <p className="mt-2 text-xs font-semibold text-[var(--danger)]">{asString(connector.error)}</p> : null}
                  </div>
                      </>
                    )
                  })()}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <TikTokLiveButton username={liveAtualData.tiktok_username ?? (tiktokStatusQuery.data as JsonRecord | undefined)?.tiktok_username} />
                    {canWriteLive ? (
                      <Button variant="secondary" isLoading={fetchingEditLive} onClick={() => void onEditLive()}>
                        Editar live
                      </Button>
                    ) : null}
                    {asString(liveAtualData.status, 'em_andamento') === 'em_andamento' && canWriteLive ? (
                      <Button variant="danger" icon={StopCircle} isLoading={encerrarMutation.isPending} onClick={() => onEncerrarLive(liveAtualData)}>
                        Encerrar live
                      </Button>
                    ) : null}
                  </div>
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

              {statusMutation.isError || liberarMutation.isError || activeMutation.isError || deleteMutation.isError || iniciarMutation.isError || encerrarMutation.isError || selectedLive.error || historicoQuery.isError ? (
                <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
                  {selectedLive.error ?? extractErrorMessage(statusMutation.error ?? liberarMutation.error ?? activeMutation.error ?? deleteMutation.error ?? iniciarMutation.error ?? encerrarMutation.error ?? historicoQuery.error)}
                </p>
              ) : null}
            </CardBody>
          </Card>
        </div>
        </Modal>
      </section>

      <Modal
        open={Boolean(endLiveData)}
        title="Encerrar live"
        subtitle="Confirme os dados finais antes de salvar histórico, GMV e comissão."
        size="lg"
        onClose={() => {
          if (encerrarMutation.isPending) return
          setEndLiveData(null)
          setEndForm(emptyEndForm)
        }}
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={confirmEncerrarLive}>
          <label className="block">
            <span className="text-sm font-semibold text-ink">GMV final</span>
            <MoneyInput
              className="design-input mt-2 h-11 w-full px-4"
              value={endForm.fat_gerado}
              onChange={(raw) => setEndField('fat_gerado', raw)}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Pedidos finais</span>
            <input
              className="design-input mt-2 h-11 w-full px-4"
              type="text"
              inputMode="numeric"
              pattern="[0-9.,]*"
              value={endForm.qtd_pedidos}
              onChange={(event) => setEndField('qtd_pedidos', event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Viewers finais</span>
            <input
              className="design-input mt-2 h-11 w-full px-4"
              type="text"
              inputMode="numeric"
              pattern="[0-9.,]*"
              value={endForm.manual_views}
              onChange={(event) => setEndField('manual_views', event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Likes finais</span>
            <input
              className="design-input mt-2 h-11 w-full px-4"
              type="text"
              inputMode="numeric"
              pattern="[0-9.,]*"
              value={endForm.manual_likes}
              onChange={(event) => setEndField('manual_likes', event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Comentários finais</span>
            <input
              className="design-input mt-2 h-11 w-full px-4"
              type="text"
              inputMode="numeric"
              pattern="[0-9.,]*"
              value={endForm.manual_comments}
              onChange={(event) => setEndField('manual_comments', event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Shares finais</span>
            <input
              className="design-input mt-2 h-11 w-full px-4"
              type="text"
              inputMode="numeric"
              pattern="[0-9.,]*"
              value={endForm.manual_shares}
              onChange={(event) => setEndField('manual_shares', event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Diamonds finais</span>
            <input
              className="design-input mt-2 h-11 w-full px-4"
              type="text"
              inputMode="numeric"
              pattern="[0-9.,]*"
              value={endForm.manual_diamonds}
              onChange={(event) => setEndField('manual_diamonds', event.target.value)}
            />
          </label>
          <PresenterSelect
            rows={apresentadorasQuery.data ?? []}
            value={endForm.apresentadora_id}
            onChange={(value) => setEndField('apresentadora_id', value)}
            required
          />
          <label className="block">
            <span className="text-sm font-semibold text-ink">Término real</span>
            <input
              className="design-input mt-2 h-11 w-full px-4"
              type="datetime-local"
              value={endForm.encerrado_em}
              onChange={(event) => setEndField('encerrado_em', event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Origem dos dados</span>
            <select
              className="design-input mt-2 h-11 w-full px-4"
              value={endForm.origem_dados}
              onChange={(event) => setEndField('origem_dados', event.target.value)}
            >
              <option value="manual">Manual</option>
              <option value="api">API TikTok</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Status de publicação</span>
            <select
              className="design-input mt-2 h-11 w-full px-4"
              value={endForm.status_publicacao}
              onChange={(event) => setEndField('status_publicacao', event.target.value)}
            >
              <option value="rascunho">Rascunho</option>
              <option value="revisado">Revisado</option>
              <option value="publicado">Publicado</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-ink">Observações</span>
            <textarea
              className="design-input mt-2 min-h-[96px] w-full px-4 py-3"
              value={endForm.resumo}
              onChange={(event) => setEndField('resumo', event.target.value)}
            />
          </label>
          {encerrarMutation.isError ? (
            <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] md:col-span-2">
              {extractErrorMessage(encerrarMutation.error)}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" variant="danger" icon={StopCircle} isLoading={encerrarMutation.isPending}>
              Salvar encerramento
            </Button>
            <Button type="button" variant="secondary" disabled={encerrarMutation.isPending} onClick={() => setEndLiveData(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <AgendarLiveModal
        open={Boolean(startCabine)}
        mode="now"
        defaultCabineId={startCabine?.id}
        cabines={activeCabines}
        marcas={marcasQuery.data ?? []}
        clientes={clientesQuery.data ?? []}
        apresentadoras={apresentadorasQuery.data ?? []}
        isSaving={iniciarMutation.isPending}
        error={iniciarMutation.error}
        onClose={() => setStartCabine(null)}
        onStartNow={(payload) => iniciarMutation.mutate({
          ...payload,
          ...(payload.cliente_id ? {} : suggestedClienteId(startCabine) ? { cliente_id: suggestedClienteId(startCabine) } : {}),
        })}
      />

      <HistoricoGmvModal liveId={gmvModalLiveId} onClose={() => setGmvModalLiveId(null)} />

      <EditarLiveModal
        open={Boolean(editLiveData)}
        live={editLiveData}
        onClose={() => setEditLiveData(null)}
        onSaved={() => selectedLive.refresh()}
      />
    </div>
  )
}
