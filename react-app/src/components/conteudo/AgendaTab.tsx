import { Edit2, Eye, Plus, CheckCircle2 } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge, statusTone } from '../ui/Badge'
import { DataTable } from '../ui/DataTable'
import { TikTokLiveButton } from '../ui/TikTokLiveButton'
import { AgendarLiveModal, type AgendarLiveModalMode } from '../forms/AgendarLiveModal'
import { assignAgendaLanes, getAgendaEventLayout, publicationStatusLabel } from '../../pages/conteudo-helpers'
import { asString, formatDate } from '../../utils/format'
import { isSyntheticLiveEvent } from '../../pages/ConteudoPage'
import { getBrandImage } from '../../utils/favicon'
import type { JsonRecord } from '../../types/models'
import type { UseMutationResult } from '@tanstack/react-query'

// Re-export local helpers so they can be reused
function formatTime(value: unknown) {
  const date = typeof value === 'string' ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function typeLabel(tipo: unknown) {
  const value = asString(tipo, '')
  if (value === 'gravacao_video') return 'Gravação'
  if (value === 'bloqueio_manutencao') return 'Bloqueio'
  if (value === 'live') return 'Live'
  return value || '—'
}

function isPastRegisterable(event: JsonRecord) {
  const end = typeof event.data_fim === 'string' ? new Date(event.data_fim) : null
  if (!end || Number.isNaN(end.getTime())) return false
  return (
    asString(event.tipo, '') === 'live' &&
    end.getTime() <= Date.now() &&
    !['concluido', 'cancelado'].includes(asString(event.status, ''))
  )
}

function isLiveOnAir(item: JsonRecord) {
  return ['ao_vivo', 'em_andamento'].includes(asString(item.status, ''))
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

export interface AgendaTabProps {
  agendaDate: string
  agendaView: 'dia' | 'semana'
  agendaRows: JsonRecord[]
  activeCabines: JsonRecord[]
  marcaRows: JsonRecord[]
  clienteRows: JsonRecord[]
  apresentadoraRows: JsonRecord[]
  agendaModalMode: AgendarLiveModalMode | null
  selectedAgendaEvent: JsonRecord | null
  fetchingAgendaLive: boolean
  requestedDate: string
  requestedCabineId: string
  createAgendaMutation: UseMutationResult<unknown, Error, JsonRecord>
  updateAgendaMutation: UseMutationResult<unknown, Error, { id: string; payload: JsonRecord }>
  deleteAgendaMutation: UseMutationResult<unknown, Error, { id: string; modoRecorrencia: string }>
  onAgendaDateChange: (date: string) => void
  onAgendaViewChange: (view: 'dia' | 'semana') => void
  onOpenCreateAgendaModal: () => void
  onOpenEditAgendaModal: (event: JsonRecord) => void
  onOpenRegisterResult: (event: JsonRecord) => void
  onCloseAgendaModal: () => void
  onCreateAgenda: (payload: JsonRecord) => void
  onUpdateAgenda: (id: string, payload: JsonRecord) => void
  onDeleteAgenda: (id: string, modoRecorrencia: string) => void
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8)

export function AgendaTab({
  agendaDate,
  agendaView,
  agendaRows,
  activeCabines,
  marcaRows,
  clienteRows,
  apresentadoraRows,
  agendaModalMode,
  selectedAgendaEvent,
  fetchingAgendaLive,
  requestedDate,
  requestedCabineId,
  createAgendaMutation,
  updateAgendaMutation,
  deleteAgendaMutation,
  onAgendaDateChange,
  onAgendaViewChange,
  onOpenCreateAgendaModal,
  onOpenEditAgendaModal,
  onOpenRegisterResult,
  onCloseAgendaModal,
  onCreateAgenda,
  onUpdateAgenda,
  onDeleteAgenda,
}: AgendaTabProps) {
  return (
    <section>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-bold text-ink">Agenda por cabine</p>
            <div className="flex flex-wrap gap-2">
              <input
                className="design-input h-10 px-3 text-sm"
                type="date"
                value={agendaDate}
                onChange={(e) => onAgendaDateChange(e.target.value)}
              />
              <select
                className="design-input h-10 px-3 text-sm"
                value={agendaView}
                onChange={(e) => onAgendaViewChange(e.target.value as 'dia' | 'semana')}
              >
                <option value="dia">Dia</option>
                <option value="semana">Semana</option>
              </select>
              <Button icon={Plus} onClick={onOpenCreateAgendaModal}>
                Agendar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {agendaView === 'dia' ? (
            <div className="overflow-x-auto">
              <div className="min-w-[920px]">
                <div
                  className="grid border-b border-line pb-2"
                  style={{
                    gridTemplateColumns: `90px repeat(${Math.max(activeCabines.length, 1)}, minmax(160px, 1fr))`,
                  }}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
                    Horário
                  </p>
                  {activeCabines.map((cabine) => (
                    <p
                      key={cabine.id as string}
                      className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted"
                    >
                      Cabine {asString(cabine.numero)}
                    </p>
                  ))}
                </div>
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `90px repeat(${Math.max(activeCabines.length, 1)}, minmax(160px, 1fr))`,
                    height: `${HOURS.length * 72}px`,
                  }}
                >
                  <div className="relative border-r border-line">
                    {HOURS.map((hour, index) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-3 border-t border-line pt-2 text-sm font-bold text-ink-muted"
                        style={{ top: `${index * 72}px` }}
                      >
                        {String(hour).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                  {activeCabines.map((cabine) => {
                    const rawEvents = agendaRows.filter(
                      (event) =>
                        asString(event.cabine_id) === cabine.id &&
                        eventIntersectsLocalDate(event, agendaDate),
                    )
                    const events = Array.from(
                      new Map(rawEvents.map((e) => [asString(e.id), e])).values(),
                    )
                    const lanes = assignAgendaLanes(events)
                    return (
                      <div key={cabine.id as string} className="relative border-r border-line">
                        {HOURS.map((hour, index) => (
                          <div
                            key={hour}
                            className="absolute left-0 right-0 border-t border-line"
                            style={{ top: `${index * 72}px` }}
                          />
                        ))}
                        {events.map((event) => {
                          const layout = getAgendaEventLayout(event, {
                            startHour: HOURS[0],
                            endHour: HOURS[HOURS.length - 1] + 1,
                            rowHeight: 72,
                          })
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
                              style={{
                                top: `${layout.top + 4}px`,
                                height: `${Math.max(44, layout.height - 8)}px`,
                                left: `calc(${leftPct}% + 4px)`,
                                width: `calc(${widthPct}% - 8px)`,
                              }}
                              onClick={() => onOpenEditAgendaModal(event)}
                              onKeyDown={(ke) => {
                                if (ke.key === 'Enter' || ke.key === ' ')
                                  onOpenEditAgendaModal(event)
                              }}
                            >
                              {isLiveOnAir(event) ? (
                                <div className="absolute right-2 top-2">
                                  <TikTokLiveButton username={event.tiktok_username} compact />
                                </div>
                              ) : null}
                              <p className="font-bold text-brand">
                                {typeLabel(event.tipo)} · {formatTime(event.data_inicio)}-
                                {formatTime(event.data_fim)}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                {(() => {
                                  const img = getBrandImage({
                                    logo_url: event.marca_logo_url,
                                    site: event.marca_site,
                                  })
                                  return img ? (
                                    <img
                                      src={img}
                                      alt=""
                                      loading="lazy"
                                      decoding="async"
                                      className="h-5 w-5 rounded object-cover"
                                    />
                                  ) : null
                                })()}
                                <p className="truncate text-ink">
                                  {asString(
                                    event.marca_nome ?? event.cliente_nome ?? event.observacoes,
                                    'Bloqueio',
                                  )}
                                </p>
                              </div>
                              <p className="mt-1 truncate text-ink-muted">
                                {asString(
                                  event.apresentadora_nome ?? event.responsavel_marketing,
                                  'Sem apresentadora',
                                )}
                              </p>
                              {canRegister && layout.height >= 92 ? (
                                <button
                                  type="button"
                                  className="mt-2 inline-flex h-8 items-center rounded-full bg-brand px-3 text-xs font-bold text-white"
                                  onClick={(ce) => {
                                    ce.stopPropagation()
                                    onOpenRegisterResult(event)
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
                {
                  key: 'data_inicio',
                  header: 'Horário',
                  render: (item) =>
                    `${formatDate(asString(item.data_inicio, ''))} ${formatTime(item.data_inicio)}`,
                },
                {
                  key: 'cabine_numero',
                  header: 'Cabine',
                  render: (item) =>
                    asString(item.cabine_nome ?? item.cabine_numero, 'Sem cabine'),
                },
                { key: 'tipo', header: 'Tipo', render: (item) => typeLabel(item.tipo) },
                {
                  key: 'marca_nome',
                  header: 'Marca/cliente',
                  render: (item) => asString(item.marca_nome ?? item.cliente_nome, '—'),
                },
                {
                  key: 'apresentadora_nome',
                  header: 'Apresentadora',
                  render: (item) => asString(item.apresentadora_nome),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (item) => (
                    <Badge tone={statusTone(asString(item.status))}>{asString(item.status)}</Badge>
                  ),
                },
                {
                  key: 'acoes',
                  header: 'Ações',
                  align: 'right',
                  render: (item) => (
                    <div className="flex justify-end gap-2">
                      {isLiveOnAir(item) ? (
                        <TikTokLiveButton username={item.tiktok_username} compact />
                      ) : null}
                      {isPastRegisterable(item) ? (
                        <Button
                          variant="secondary"
                          icon={CheckCircle2}
                          onClick={() => onOpenRegisterResult(item)}
                        >
                          Registrar resultado
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        icon={isSyntheticLiveEvent(item) ? Eye : Edit2}
                        isLoading={
                          fetchingAgendaLive &&
                          asString(item.status) === 'ao_vivo' &&
                          Boolean(item.live_id)
                        }
                        onClick={() => onOpenEditAgendaModal(item)}
                      >
                        {isSyntheticLiveEvent(item) ? 'Abrir' : 'Editar'}
                      </Button>
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
        isSaving={
          createAgendaMutation.isPending ||
          updateAgendaMutation.isPending ||
          deleteAgendaMutation.isPending
        }
        error={
          createAgendaMutation.error ?? updateAgendaMutation.error ?? deleteAgendaMutation.error
        }
        onClose={onCloseAgendaModal}
        onCreate={onCreateAgenda}
        onUpdate={onUpdateAgenda}
        onDelete={(id, modoRecorrencia) => {
          if (!window.confirm('Cancelar este agendamento?')) return
          onDeleteAgenda(id, modoRecorrencia)
        }}
      />
    </section>
  )
}
