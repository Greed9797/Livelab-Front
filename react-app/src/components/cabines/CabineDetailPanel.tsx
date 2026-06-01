import { CalendarClock, EyeOff, MonitorPlay, Power, StopCircle, Trash2, Wrench } from 'lucide-react'
import { Badge, statusTone } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { LoadingState } from '../ui/States'
import { TikTokLiveButton } from '../ui/TikTokLiveButton'
import { asNumber, asString, formatDate, formatMoney } from '../../utils/format'
import { extractErrorMessage } from '../../services/api'
import type { Cabine, JsonRecord } from '../../types/models'

interface LiveStatusConnector {
  status?: string
  tiktok_username?: string
  last_sync_at?: string
  error?: string
}

interface HistoricoData {
  lives_recentes: JsonRecord[]
  totais?: JsonRecord
}

interface CabineDetailPanelProps {
  cabine: Cabine | null
  liveAtualData: JsonRecord | null
  liveLoading: boolean
  liveError: string | null
  tiktokConnector: LiveStatusConnector | undefined
  tiktokLoading: boolean
  historicoData: HistoricoData | undefined
  canWriteLive: boolean
  canWriteCabine: boolean
  isCabineActive: (cabine: Cabine) => boolean
  fetchingEditLive: boolean
  mutationErrors: Array<Error | null>
  liberarPending: boolean
  statusPending: boolean
  activePending: boolean
  deletePending: boolean
  iniciarPending: boolean
  encerrarPending: boolean
  onSchedule: (cabine: Cabine) => void
  onStartLive: (cabine: Cabine) => void
  onEncerrarLive: (live: JsonRecord) => void
  onEditLive: () => void
  onLiberar: (id: string) => void
  onSetStatus: (id: string, status: string) => void
  onToggleActive: (id: string, ativo: boolean) => void
  onDelete: (cabine: Cabine) => void
  onGmvModal: (liveId: string) => void
}

function officialLiveGmv(live: JsonRecord) {
  return live.gmv ?? live.ads_gmv ?? live.manual_gmv ?? live.fat_gerado
}

export function CabineDetailPanel({
  cabine,
  liveAtualData,
  liveLoading,
  liveError,
  tiktokConnector,
  tiktokLoading,
  historicoData,
  canWriteLive,
  canWriteCabine,
  isCabineActive,
  fetchingEditLive,
  mutationErrors,
  liberarPending,
  statusPending,
  activePending,
  deletePending,
  iniciarPending,
  encerrarPending,
  onSchedule,
  onStartLive,
  onEncerrarLive,
  onEditLive,
  onLiberar,
  onSetStatus,
  onToggleActive,
  onDelete,
  onGmvModal,
}: CabineDetailPanelProps) {
  const connector = tiktokConnector ?? {}
  const tiktokUsername = liveAtualData?.tiktok_username ?? connector.tiktok_username
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

  const anyMutationError = mutationErrors.find(Boolean)
  const combinedError = liveError ?? (anyMutationError ? extractErrorMessage(anyMutationError) : null)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <p className="text-base font-bold text-ink">Detalhe da cabine</p>
          <p className="mt-1 text-xs text-ink-muted">
            {cabine ? `Cabine ${asString(cabine.numero)}` : 'Selecione uma cabine'}
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          {!cabine ? (
            <p className="text-sm text-ink-muted">Abra os detalhes de uma cabine para ver live atual e histórico.</p>
          ) : null}

          {/* iniciar live section */}
          {cabine && canWriteLive && cabine.status !== 'ao_vivo' ? (
            <div className="space-y-3 rounded-2xl border border-brand/20 bg-brand-soft/60 p-3">
              <div>
                <p className="text-sm font-bold text-ink">Iniciar live agora</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Use o mesmo formulário operacional da agenda para informar marca, apresentadora e previsão.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canWriteCabine ? (
                  <Button variant="secondary" icon={CalendarClock} onClick={() => onSchedule(cabine)}>
                    Agendar esta cabine
                  </Button>
                ) : null}
                <Button icon={MonitorPlay} isLoading={iniciarPending} onClick={() => onStartLive(cabine)}>
                  Iniciar live
                </Button>
              </div>
            </div>
          ) : null}

          {/* admin actions */}
          {cabine && canWriteCabine ? (
            <div className="space-y-3 rounded-2xl border border-line bg-surface-muted p-3">
              <p className="text-sm font-bold text-ink">Ações administrativas</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  icon={Power}
                  disabled={!cabine.id || liberarPending}
                  onClick={() => onLiberar(cabine.id)}
                >
                  Liberar
                </Button>
                <Button
                  variant="ghost"
                  icon={Wrench}
                  disabled={statusPending}
                  onClick={() => onSetStatus(cabine.id, 'manutencao')}
                >
                  Manutenção
                </Button>
                <Button
                  variant="ghost"
                  icon={CalendarClock}
                  disabled={statusPending}
                  onClick={() => onSetStatus(cabine.id, 'disponivel')}
                >
                  Disponível
                </Button>
                <Button
                  variant="ghost"
                  icon={EyeOff}
                  disabled={activePending}
                  onClick={() => onToggleActive(cabine.id, !isCabineActive(cabine))}
                >
                  {isCabineActive(cabine) ? 'Inativar' : 'Reativar'}
                </Button>
                <Button
                  variant="danger"
                  icon={Trash2}
                  disabled={deletePending}
                  onClick={() => onDelete(cabine)}
                >
                  Excluir
                </Button>
              </div>
            </div>
          ) : null}

          {/* live status */}
          {liveLoading ? <LoadingState label="Carregando live atual" /> : null}

          {!liveLoading && cabine && !liveAtualData ? (
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink">Live atual</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {asString(liveAtualData.cliente_nome, 'Cliente em live')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <TikTokLiveButton username={tiktokUsername} compact />
                  <Badge tone={statusTone(asString(liveAtualData.status, 'em_andamento'))}>
                    {asString(liveAtualData.status, 'em_andamento') === 'em_andamento'
                      ? 'ativa'
                      : asString(liveAtualData.status)}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
                <div className="rounded-xl bg-surface p-2">
                  <p className="text-[10px] text-ink-muted">Viewers</p>
                  <p className="num font-bold text-ink">
                    {asNumber(liveAtualData.viewer_count ?? liveAtualData.manual_views)}
                  </p>
                </div>
                <div className="rounded-xl bg-surface p-2">
                  <p className="text-[10px] text-ink-muted">GMV</p>
                  <p className="num font-bold text-brand">
	                    {formatMoney(liveAtualData.gmv_atual ?? officialLiveGmv(liveAtualData))}
                  </p>
                </div>
                <div className="rounded-xl bg-surface p-2">
                  <p className="text-[10px] text-ink-muted">Pedidos</p>
                  <p className="num font-bold text-ink">
                    {asNumber(liveAtualData.total_orders ?? liveAtualData.final_orders_count ?? liveAtualData.qtd_pedidos)}
                  </p>
                </div>
                <div className="rounded-xl bg-surface p-2">
                  <p className="text-[10px] text-ink-muted">Likes</p>
                  <p className="num font-bold text-ink">
                    {asNumber(liveAtualData.likes_count ?? liveAtualData.manual_likes).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="rounded-xl bg-surface p-2">
                  <p className="text-[10px] text-ink-muted">Comentários</p>
                  <p className="num font-bold text-ink">
                    {asNumber(liveAtualData.comments_count ?? liveAtualData.manual_comments).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="rounded-xl bg-surface p-2">
                  <p className="text-[10px] text-ink-muted">Shares</p>
                  <p className="num font-bold text-ink">
                    {asNumber(liveAtualData.shares_count ?? liveAtualData.manual_shares).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="rounded-xl bg-surface p-2">
                  <p className="text-[10px] text-ink-muted">Diamantes</p>
                  <p className="num font-bold text-ink">
                    {asNumber(liveAtualData.gifts_diamonds ?? liveAtualData.manual_diamonds).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-line bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-ink">Conector TikTok</p>
                  {tiktokLoading ? (
                    <Badge tone="neutral">verificando</Badge>
                  ) : hasConnector ? (
                    <Badge tone={statusToneValue}>{connectorStatus}</Badge>
                  ) : (
                    <Badge tone="neutral">sem integração</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {hasConnector
                    ? `${asString(connector.tiktok_username, 'TikTok não informado')} · último snapshot ${lastSync ? formatDate(lastSync) : 'não recebido'}`
                    : 'Sem integração ativa ou snapshot recente para esta live.'}
                </p>
                {connector.error ? (
                  <p className="mt-2 text-xs font-semibold text-[var(--danger)]">{asString(connector.error)}</p>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <TikTokLiveButton username={tiktokUsername} />
                {canWriteLive ? (
                  <Button variant="secondary" isLoading={fetchingEditLive} onClick={onEditLive}>
                    Editar live
                  </Button>
                ) : null}
                {asString(liveAtualData.status, 'em_andamento') === 'em_andamento' && canWriteLive ? (
                  <Button
                    variant="danger"
                    icon={StopCircle}
                    isLoading={encerrarPending}
                    onClick={() => onEncerrarLive(liveAtualData)}
                  >
                    Encerrar live
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* historico */}
          {historicoData ? (
            <div className="rounded-2xl border border-line bg-surface-muted p-4">
              <p className="text-sm font-bold text-ink">Histórico</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Lives</p>
                  <p className="num mt-1 text-lg font-bold text-ink">
                    {asNumber(historicoData.lives_recentes.length)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">GMV total</p>
                  <p className="num mt-1 text-lg font-bold text-brand">
                    {formatMoney(historicoData.totais?.gmv_total)}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {historicoData.lives_recentes.slice(0, 3).map((live) => (
                  <div key={asString(live.id)} className="rounded-xl bg-surface p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-ink">
                          {asString(live.cliente_nome, 'Cliente')}
                        </p>
                        <p className="mt-1 text-[11px] text-ink-muted">
	                          {formatDate(asString(live.iniciado_em, ''))} · {formatMoney(officialLiveGmv(live))}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => onGmvModal(asString(live.id, ''))}
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

          {/* errors */}
          {combinedError ? (
            <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
              {combinedError}
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  )
}
