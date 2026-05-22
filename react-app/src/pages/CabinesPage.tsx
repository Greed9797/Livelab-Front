import { RefreshCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/States'
import { Modal } from '../components/ui/Modal'
import { AgendarLiveModal } from '../components/forms/AgendarLiveModal'
import { EditarLiveModal } from '../components/forms/EditarLiveModal'
import { HistoricoGmvModal } from './HistoricoGmvModal'
import { CabineFilters } from '../components/cabines/CabineFilters'
import { CabineGrid } from '../components/cabines/CabineGrid'
import { CabineDetailPanel } from '../components/cabines/CabineDetailPanel'
import { EncerrarLiveForm } from '../components/cabines/EncerrarLiveForm'
import type { EncerrarLiveFormData } from '../components/cabines/EncerrarLiveForm'
import {
  atualizarStatusCabine,
  deleteCabine,
  encerrarLive,
  getApresentadoras,
  getCabineHistorico,
  getCabines,
  getClientes,
  getLivePorId,
  getLiveTiktokStatus,
  getMarcas,
  iniciarLive,
  liberarCabine,
  updateCabine,
} from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString } from '../utils/format'
import { useCurrentUser } from '../stores/auth-store'
import type { Cabine, JsonRecord } from '../types/models'
import { useSelectedLive } from '../hooks/useSelectedLive'
import { isCabineActive, suggestedClienteId, toDatetimeLocal } from '../components/cabines/cabineUtils'

const writeCabineRoles = new Set(['franqueador_master', 'franqueado', 'gerente', 'operacional', 'produtor_live'])
const writeLiveRoles = new Set(['franqueador_master', 'franqueado', 'gerente', 'operacional', 'apresentador', 'apresentadora', 'produtor_live'])
const readClientesForLiveRoles = new Set(['franqueador_master', 'franqueado', 'gerente', 'operacional', 'produtor_live'])

const availableCabineStatus = 'disponivel'

const emptyEndForm: EncerrarLiveFormData = {
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

// ── Component ────────────────────────────────────────────────────────────────
export function CabinesPage({ title = 'Cabines', embedded = false }: { title?: string; embedded?: boolean }) {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const canWriteCabine = writeCabineRoles.has(user?.papel ?? '')
  const canWriteLive = writeLiveRoles.has(user?.papel ?? '')

  // ── Local state ────────────────────────────────────────────────────────────
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState('')
  const [startCabine, setStartCabine] = useState<Cabine | null>(null)
  const [endLiveData, setEndLiveData] = useState<JsonRecord | null>(null)
  const [editLiveData, setEditLiveData] = useState<JsonRecord | null>(null)
  const [fetchingEditLive, setFetchingEditLive] = useState(false)
  const [endForm, setEndForm] = useState<EncerrarLiveFormData>(emptyEndForm)
  const [gmvModalLiveId, setGmvModalLiveId] = useState<string | null>(null)

  const client = useQueryClient()
  const explicitCabineId = params.get('cabine') ?? ''
  const explicitLiveId = params.get('live') ?? ''

  // ── Queries ────────────────────────────────────────────────────────────────
  const query = useQuery({
    queryKey: ['cabines'],
    queryFn: getCabines,
    refetchInterval: () => (document.hidden ? false : 30_000),
    refetchIntervalInBackground: false,
    staleTime: 15_000,
  })
  const clientesQuery = useQuery({
    queryKey: ['clientes', 'live-start'],
    queryFn: getClientes,
    enabled: canWriteLive && readClientesForLiveRoles.has(user?.papel ?? ''),
  })
  const marcasQuery = useQuery({
    queryKey: ['marcas', 'live-start'],
    queryFn: () => getMarcas({ status: 'ativa' }),
    enabled: canWriteLive,
  })
  const apresentadorasQuery = useQuery({
    queryKey: ['apresentadoras', 'live-start'],
    queryFn: getApresentadoras,
    enabled: canWriteLive,
  })
  const historicoQuery = useQuery({
    queryKey: ['cabine-historico', selectedId],
    queryFn: () => getCabineHistorico(selectedId),
    enabled: Boolean(selectedId),
  })
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

  // ── Invalidate helper ──────────────────────────────────────────────────────
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

  // ── Mutations ──────────────────────────────────────────────────────────────
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
    },
  })

  // ── Derived data ───────────────────────────────────────────────────────────
  const cabines = query.data ?? []
  const activeCabines = cabines.filter(isCabineActive)
  const inactiveCount = cabines.length - activeCabines.length
  const liveCount = activeCabines.filter((c) => c.status === 'ao_vivo').length
  const maintenanceCount = activeCabines.filter((c) => c.status === 'manutencao').length
  const freeCount = activeCabines.filter((c) => c.status === availableCabineStatus).length
  const counts = {
    all: activeCabines.length,
    live: liveCount,
    maintenance: maintenanceCount,
    free: freeCount,
    busy: Math.max(activeCabines.length - liveCount - maintenanceCount - freeCount, 0),
    inactive: inactiveCount,
  }
  const visible = cabines.filter((cabine) => {
    const active = isCabineActive(cabine)
    return (
      (filter === 'all' && active) ||
      (filter === 'inactive' && !active) ||
      (filter === 'live' && active && cabine.status === 'ao_vivo') ||
      (filter === 'free' && active && cabine.status === availableCabineStatus) ||
      (filter === 'maintenance' && active && cabine.status === 'manutencao') ||
      (filter === 'busy' && active && !['ao_vivo', availableCabineStatus, 'manutencao'].includes(cabine.status ?? ''))
    )
  })
  const selectedCabine = visible.find((c) => c.id === selectedId)

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cabines.length) return
    if (explicitLiveId) {
      const byLive = cabines.find((c) => asString(c.live_atual_id, '') === explicitLiveId)
      setSelectedId(byLive?.id ?? '')
      return
    }
    if (explicitCabineId) {
      setSelectedId(cabines.some((c) => c.id === explicitCabineId) ? explicitCabineId : '')
    }
  }, [cabines, explicitCabineId, explicitLiveId])

  // ── Handlers ───────────────────────────────────────────────────────────────
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

  function confirmDeleteCabine(cabine: Cabine) {
    const confirmacao = window.prompt(`Para excluir a Cabine ${asString(cabine.numero)}, digite CABINE.`)
    if (confirmacao !== 'CABINE') return
    deleteMutation.mutate({ id: cabine.id, confirmacao })
  }

  function setEndField(key: keyof EncerrarLiveFormData, value: string) {
    setEndForm((current) => ({ ...current, [key]: value }))
  }

  // ── Early returns ──────────────────────────────────────────────────────────
  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  // ── Render ─────────────────────────────────────────────────────────────────
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
              <CabineFilters filter={filter} onFilterChange={setFilter} counts={counts} />
            </CardBody>
          </Card>

          <CabineGrid
            cabines={visible}
            loading={false}
            error={null}
            canWriteLive={canWriteLive}
            canWriteCabine={canWriteCabine}
            isCabineActive={isCabineActive}
            onSelect={selectCabine}
            onStartLive={(cabine) => { selectCabine(cabine); setStartCabine(cabine) }}
            onSchedule={scheduleCabine}
          />
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
          <CabineDetailPanel
            cabine={selectedCabine ?? null}
            liveAtualData={liveAtualData}
            liveLoading={selectedLive.loading}
            liveError={selectedLive.error ?? null}
            tiktokConnector={tiktokStatusQuery.data as Record<string, string> | undefined}
            tiktokLoading={tiktokStatusQuery.isLoading}
            historicoData={
              historicoQuery.data
                ? {
                    lives_recentes: Array.isArray(historicoQuery.data.lives_recentes)
                      ? (historicoQuery.data.lives_recentes as JsonRecord[])
                      : [],
                    totais: historicoQuery.data.totais as JsonRecord | undefined,
                  }
                : undefined
            }
            canWriteLive={canWriteLive}
            canWriteCabine={canWriteCabine}
            isCabineActive={isCabineActive}
            fetchingEditLive={fetchingEditLive}
            mutationErrors={[
              statusMutation.error,
              liberarMutation.error,
              activeMutation.error,
              deleteMutation.error,
              iniciarMutation.error,
              encerrarMutation.error,
              historicoQuery.error as Error | null,
            ]}
            liberarPending={liberarMutation.isPending}
            statusPending={statusMutation.isPending}
            activePending={activeMutation.isPending}
            deletePending={deleteMutation.isPending}
            iniciarPending={iniciarMutation.isPending}
            encerrarPending={encerrarMutation.isPending}
            onSchedule={scheduleCabine}
            onStartLive={(cabine) => setStartCabine(cabine)}
            onEncerrarLive={onEncerrarLive}
            onEditLive={() => void onEditLive()}
            onLiberar={(id) => void liberarMutation.mutate(id)}
            onSetStatus={(id, status) => void statusMutation.mutate({ id, status })}
            onToggleActive={(id, ativo) => void activeMutation.mutate({ id, ativo })}
            onDelete={confirmDeleteCabine}
            onGmvModal={setGmvModalLiveId}
          />
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
        {endLiveData ? (
          <EncerrarLiveForm
            live={endLiveData}
            formData={endForm}
            apresentadoras={apresentadorasQuery.data ?? []}
            isLoading={encerrarMutation.isPending}
            error={encerrarMutation.error}
            onFieldChange={setEndField}
            onSubmit={(payload) => {
              const liveId = asString(endLiveData.live_id ?? endLiveData.id, '')
              if (!liveId) return
              encerrarMutation.mutate({ id: liveId, payload })
            }}
            onCancel={() => setEndLiveData(null)}
          />
        ) : null}
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
        onStartNow={(payload) =>
          iniciarMutation.mutate({
            ...payload,
            ...(payload.cliente_id
              ? {}
              : suggestedClienteId(startCabine)
                ? { cliente_id: suggestedClienteId(startCabine) }
                : {}),
          })
        }
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
