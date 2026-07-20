import { useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Eye,
  MapPin,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge, statusTone } from '../ui/Badge'
import { TikTokLiveButton } from '../ui/TikTokLiveButton'
import { AgendarLiveModal, type AgendarLiveModalMode } from '../forms/AgendarLiveModal'
import {
  assignAgendaLanes,
  eventIntersectsSaoPauloDate,
  formatSaoPauloTime,
  getAgendaEventLayout,
  monthGridDays,
  weekDays,
} from '../../pages/conteudo-helpers'
import { asString, formatDate } from '../../utils/format'
import { resolveMarcaCor, textColorOn } from '../../utils/brandColor'
import { isSyntheticLiveEvent } from '../../pages/ConteudoPage'
import { getBrandImage } from '../../utils/favicon'
import type { Cabine, JsonRecord } from '../../types/models'
import type { UseMutationResult } from '@tanstack/react-query'

type AgendaView = 'dia' | 'semana' | 'mes'

function typeLabel(tipo: unknown) {
  const value = asString(tipo, '')
  if (value === 'gravacao_video') return 'Gravação'
  if (value === 'bloqueio_manutencao') return 'Bloqueio'
  if (value === 'live') return 'Live'
  return value || '—'
}

export function isPastRegisterable(event: JsonRecord) {
  const end = typeof event.data_fim === 'string' ? new Date(event.data_fim) : null
  if (!end || Number.isNaN(end.getTime())) return false
  return (
    asString(event.tipo, '') === 'live' &&
    end.getTime() <= Date.now() &&
    !['concluido', 'cancelado'].includes(asString(event.status, ''))
  )
}

export function isLiveOnAir(item: JsonRecord) {
  return ['ao_vivo', 'em_andamento'].includes(asString(item.status, ''))
}

// Cor do evento = cor da marca (manual em marcas.cor, senão hash determinístico).
function eventCor(event: JsonRecord): string {
  return resolveMarcaCor(event.marca_cor, asString(event.marca_id))
}

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8)

function isoDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function dayNumber(iso: string) {
  return Number(iso.slice(8, 10))
}
function ddmm(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}
function eventTitle(e: JsonRecord) {
  return asString(e.marca_nome ?? e.cliente_nome ?? e.observacoes, asString(e.tipo) === 'bloqueio_manutencao' ? 'Bloqueio' : 'Sem marca')
}
function cabineLabel(e: JsonRecord) {
  const n = asString(e.cabine_numero ?? e.cabine_nome, '')
  if (!n) return ''
  return /^\d+$/.test(n) ? `C${n}` : n
}
function dedupSorted(rows: JsonRecord[]) {
  const unique = Array.from(new Map(rows.map((r) => [asString(r.id), r])).values())
  return unique.sort((a, b) => asString(a.data_inicio).localeCompare(asString(b.data_inicio)))
}

function EventChip({ event, chipH, onOpen }: { event: JsonRecord; chipH: number; onOpen: (e: JsonRecord) => void }) {
  const cor = eventCor(event)
  const live = isLiveOnAir(event)
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="flex w-full items-center gap-2 rounded-lg px-3 text-left font-bold transition hover:brightness-105"
      style={{ background: cor, color: textColorOn(cor), minHeight: chipH, fontSize: 13 }}
    >
      {live ? <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--danger)]" title="Ao vivo" /> : null}
      <span className="flex-1 truncate">{eventTitle(event)}</span>
      <span style={{ fontWeight: 600, fontSize: 11, opacity: 0.8 }}>{formatSaoPauloTime(event.data_inicio)}</span>
      {cabineLabel(event) ? (
        <span className="rounded px-1.5 py-0.5" style={{ fontSize: 10, fontWeight: 800, background: 'rgba(0,0,0,0.16)' }}>
          {cabineLabel(event)}
        </span>
      ) : null}
    </button>
  )
}

export interface AgendaTabProps {
  agendaDate: string
  agendaView: AgendaView
  agendaRows: JsonRecord[]
  activeCabines: Cabine[]
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
  onAgendaViewChange: (view: AgendaView) => void
  onOpenCreateAgendaModal: () => void
  onOpenEditAgendaModal: (event: JsonRecord) => void
  onOpenRegisterResult: (event: JsonRecord) => void
  onCloseAgendaModal: () => void
  onCreateAgenda: (payload: JsonRecord) => void
  onUpdateAgenda: (id: string, payload: JsonRecord) => void
  onDeleteAgenda: (id: string, modoRecorrencia: string) => void
}

export function AgendaTab(props: AgendaTabProps) {
  const {
    agendaDate, agendaView, agendaRows, activeCabines, marcaRows, clienteRows, apresentadoraRows,
    agendaModalMode, selectedAgendaEvent, requestedDate, requestedCabineId,
    createAgendaMutation, updateAgendaMutation, deleteAgendaMutation,
    onAgendaDateChange, onAgendaViewChange, onOpenCreateAgendaModal, onOpenEditAgendaModal,
    onOpenRegisterResult, onCloseAgendaModal, onCreateAgenda, onUpdateAgenda, onDeleteAgenda,
  } = props

  const [density, setDensity] = useState<'comfortable' | 'compacto'>('comfortable')
  const [filterCliente, setFilterCliente] = useState('')
  const [drawer, setDrawer] = useState<JsonRecord | null>(null)
  const compact = density === 'compacto'
  const chipH = compact ? 28 : 34
  const cellMin = compact ? 76 : 110

  const today = isoDay(new Date())
  const week = useMemo(() => weekDays(agendaDate), [agendaDate])
  const monthCells = useMemo(() => monthGridDays(agendaDate), [agendaDate])

  const rows = useMemo(
    () => (filterCliente ? agendaRows.filter((e) => asString(e.cliente_id) === filterCliente) : agendaRows),
    [agendaRows, filterCliente],
  )

  function shiftDays(delta: number) {
    const d = new Date(`${agendaDate}T00:00:00`)
    d.setDate(d.getDate() + delta)
    onAgendaDateChange(isoDay(d))
  }
  function shiftMonths(delta: number) {
    const d = new Date(`${agendaDate}T00:00:00`)
    d.setMonth(d.getMonth() + delta)
    onAgendaDateChange(isoDay(d))
  }
  const goPrev = () => (agendaView === 'dia' ? shiftDays(-1) : agendaView === 'semana' ? shiftDays(-7) : shiftMonths(-1))
  const goNext = () => (agendaView === 'dia' ? shiftDays(1) : agendaView === 'semana' ? shiftDays(7) : shiftMonths(1))

  const periodLabel =
    agendaView === 'dia'
      ? formatDate(agendaDate)
      : agendaView === 'semana'
        ? `${ddmm(week[0])} – ${ddmm(week[6])}`
        : `${MONTHS[Number(agendaDate.slice(5, 7)) - 1]} ${agendaDate.slice(0, 4)}`

  function openDrawer(e: JsonRecord) {
    setDrawer(e)
  }
  function drawerEdit() {
    if (!drawer) return
    const ev = drawer
    setDrawer(null)
    onOpenEditAgendaModal(ev)
  }
  function drawerDelete() {
    if (!drawer) return
    if (!window.confirm('Cancelar este agendamento?')) return
    onDeleteAgenda(asString(drawer.id), 'apenas_este')
    setDrawer(null)
  }
  function drawerRegister() {
    if (!drawer) return
    const ev = drawer
    setDrawer(null)
    onOpenRegisterResult(ev)
  }

  const segments: { key: AgendaView; label: string }[] = [
    { key: 'semana', label: 'Semana' },
    { key: 'dia', label: 'Dia' },
    { key: 'mes', label: 'Mês' },
  ]

  return (
    <section>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base font-bold text-ink">Agenda de lives</p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-full border border-line bg-surface p-1">
                  {segments.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => onAgendaViewChange(s.key)}
                      className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                        agendaView === s.key ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <Button icon={Plus} onClick={onOpenCreateAgendaModal}>Agendar</Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <button type="button" onClick={goPrev} aria-label="Período anterior" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink hover:bg-surface-muted">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[180px] text-center text-sm font-bold text-ink">{periodLabel}</span>
                <button type="button" onClick={goNext} aria-label="Próximo período" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink hover:bg-surface-muted">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button type="button" onClick={() => onAgendaDateChange(today)} className="h-9 rounded-lg border border-line px-3 text-sm font-bold text-ink-muted hover:text-ink">
                Hoje
              </button>
              <input className="design-input h-9 px-3 text-sm [color-scheme:dark]" type="date" value={agendaDate} onChange={(e) => onAgendaDateChange(e.target.value)} />
              <select aria-label="Filtrar por cliente" className="design-input h-9 px-3 text-sm" value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}>
                <option value="">Todos os clientes</option>
                {clienteRows.map((c) => (
                  <option key={asString(c.id)} value={asString(c.id)}>{asString(c.nome ?? c.razao_social, 'Sem nome')}</option>
                ))}
              </select>
              <button type="button" onClick={() => setDensity(compact ? 'comfortable' : 'compacto')} className="h-9 rounded-lg border border-line px-3 text-sm font-bold text-ink-muted hover:text-ink">
                {compact ? 'Densidade: compacta' : 'Densidade: confortável'}
              </button>
            </div>
          </div>
        </CardHeader>

        <CardBody>
          {agendaView === 'semana' ? (
            <WeekView week={week} today={today} rows={rows} cellMin={cellMin} chipH={chipH} onOpen={openDrawer} />
          ) : agendaView === 'dia' ? (
            <DayView
              agendaDate={agendaDate}
              activeCabines={activeCabines}
              rows={rows}
              onOpenEvent={openDrawer}
            />
          ) : (
            <MonthView
              monthCells={monthCells}
              monthRef={agendaDate}
              today={today}
              rows={rows}
              onOpenEvent={openDrawer}
              onOpenDay={(day) => { onAgendaDateChange(day); onAgendaViewChange('dia') }}
            />
          )}
        </CardBody>
      </Card>

      {drawer ? (
        <EventDrawer
          event={drawer}
          onClose={() => setDrawer(null)}
          onEdit={drawerEdit}
          onDelete={drawerDelete}
          onRegister={drawerRegister}
        />
      ) : null}

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

// ===================== SEMANA =====================
function WeekView({
  week, today, rows, cellMin, chipH, onOpen,
}: {
  week: string[]
  today: string
  rows: JsonRecord[]
  cellMin: number
  chipH: number
  onOpen: (e: JsonRecord) => void
}) {
  return (
    <div className="overflow-x-auto">
      <div className="grid overflow-hidden rounded-xl border border-line" style={{ gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))', minWidth: 1040 }}>
        {week.map((day, i) => (
          <div key={day} className={`border-b border-l border-line px-3 py-3 first:border-l-0 ${day === today ? 'bg-brand-soft' : ''}`}>
            <p className={`text-xs font-black uppercase tracking-[0.08em] ${day === today ? 'text-brand' : 'text-ink'}`}>{DOW[i]}</p>
            <p className="text-xs text-ink-muted">{ddmm(day)}</p>
          </div>
        ))}

        {week.map((day) => {
          const evs = dedupSorted(rows.filter((e) => eventIntersectsSaoPauloDate(e, day)))
          return (
            <div
              key={day}
              className={`flex flex-col gap-2 border-l border-line px-2.5 py-3 first:border-l-0 ${day === today ? 'bg-brand-soft/40' : ''}`}
              style={{ minHeight: cellMin * 2 }}
            >
              {evs.length === 0 ? (
                <span className="m-auto rounded-lg border border-dashed border-line px-3 py-1 text-[11px] font-bold text-ink-muted">folga</span>
              ) : (
                evs.map((e) => <EventChip key={asString(e.id)} event={e} chipH={chipH} onOpen={onOpen} />)
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ===================== DIA (timeline por cabine) =====================
function DayView({
  agendaDate, activeCabines, rows, onOpenEvent,
}: {
  agendaDate: string
  activeCabines: Cabine[]
  rows: JsonRecord[]
  onOpenEvent: (e: JsonRecord) => void
}) {
  const cols = `90px repeat(${Math.max(activeCabines.length, 1)}, minmax(160px, 1fr))`
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[920px]">
        <div className="grid border-b border-line pb-2" style={{ gridTemplateColumns: cols }}>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Horário</p>
          {activeCabines.map((cabine) => (
            <p key={cabine.id as string} className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Cabine {asString(cabine.numero)}</p>
          ))}
        </div>
        <div className="grid" style={{ gridTemplateColumns: cols, height: `${HOURS.length * 72}px` }}>
          <div className="relative border-r border-line">
            {HOURS.map((hour, index) => (
              <div key={hour} className="absolute left-0 right-3 border-t border-line pt-2 text-sm font-bold text-ink-muted" style={{ top: `${index * 72}px` }}>
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {activeCabines.map((cabine) => {
            const rawEvents = rows.filter((event) => asString(event.cabine_id) === cabine.id && eventIntersectsSaoPauloDate(event, agendaDate))
            const events = Array.from(new Map(rawEvents.map((e) => [asString(e.id), e])).values())
            const lanes = assignAgendaLanes(events, agendaDate)
            return (
              <div key={cabine.id as string} className="relative border-r border-line">
                {HOURS.map((hour, index) => (
                  <div key={hour} className="absolute left-0 right-0 border-t border-line" style={{ top: `${index * 72}px` }} />
                ))}
                {events.map((event) => {
                  const layout = getAgendaEventLayout(event, { startHour: HOURS[0], endHour: HOURS[HOURS.length - 1] + 1, rowHeight: 72, date: agendaDate })
                  const lane = lanes.get(asString(event.id)) ?? { index: 0, total: 1 }
                  const widthPct = 100 / lane.total
                  const leftPct = widthPct * lane.index
                  const cor = eventCor(event)
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      key={asString(event.id)}
                      className="absolute overflow-hidden rounded-xl border border-line bg-surface p-2 text-left text-xs shadow-sm transition hover:brightness-105"
                      style={{
                        top: `${layout.top + 4}px`,
                        height: `${Math.max(44, layout.height - 8)}px`,
                        left: `calc(${leftPct}% + 4px)`,
                        width: `calc(${widthPct}% - 8px)`,
                        borderLeft: `3px solid ${cor}`,
                      }}
                      onClick={() => onOpenEvent(event)}
                      onKeyDown={(ke) => { if (ke.key === 'Enter' || ke.key === ' ') onOpenEvent(event) }}
                    >
                      {isLiveOnAir(event) ? (
                        <div className="absolute right-2 top-2"><TikTokLiveButton username={event.tiktok_username} compact /></div>
                      ) : null}
                      <p className="font-bold" style={{ color: cor }}>
                        {typeLabel(event.tipo)} · {formatSaoPauloTime(event.data_inicio)}-{formatSaoPauloTime(event.data_fim)}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {(() => {
                          const img = getBrandImage({ logo_url: event.marca_logo_url, site: event.marca_site })
                          return img ? <img src={img} alt="" loading="lazy" decoding="async" className="h-5 w-5 rounded object-cover" /> : null
                        })()}
                        <p className="truncate text-ink">{eventTitle(event)}</p>
                      </div>
                      <p className="mt-1 truncate text-ink-muted">{asString(event.apresentadora_nome ?? event.responsavel_marketing, 'Sem apresentadora')}</p>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ===================== MÊS =====================
function MonthView({
  monthCells, monthRef, today, rows, onOpenEvent, onOpenDay,
}: {
  monthCells: string[]
  monthRef: string
  today: string
  rows: JsonRecord[]
  onOpenEvent: (e: JsonRecord) => void
  onOpenDay: (day: string) => void
}) {
  const refMonth = monthRef.slice(0, 7)
  const weeks: string[][] = Array.from({ length: 6 }, (_, i) => monthCells.slice(i * 7, i * 7 + 7))
  return (
    <div className="overflow-x-auto">
      <div className="overflow-hidden rounded-xl border border-line" style={{ minWidth: 900 }}>
        <div className="grid border-b border-line" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {DOW.map((d) => (
            <div key={d} className="border-l border-line px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-ink-muted first:border-l-0">{d}</div>
          ))}
        </div>
        {weeks.map((wk, wi) => (
          <div key={wi} className="grid border-t border-line first:border-t-0" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {wk.map((day) => {
              const inMonth = day.slice(0, 7) === refMonth
              const evs = dedupSorted(rows.filter((e) => eventIntersectsSaoPauloDate(e, day)))
              return (
                <div key={day} className={`flex min-h-[104px] flex-col gap-1 border-l border-line px-2.5 py-2 first:border-l-0 ${inMonth ? '' : 'bg-surface-muted/40'}`}>
                  <button
                    type="button"
                    onClick={() => onOpenDay(day)}
                    className={`grid h-6 w-6 place-items-center self-start rounded-full text-[13px] font-bold ${
                      day === today ? 'bg-brand text-white' : inMonth ? 'text-ink hover:bg-surface-muted' : 'text-ink-muted'
                    }`}
                  >
                    {dayNumber(day)}
                  </button>
                  {evs.slice(0, 3).map((e) => {
                    const cor = eventCor(e)
                    return (
                      <button
                        key={asString(e.id)}
                        type="button"
                        onClick={() => onOpenEvent(e)}
                        className="flex w-full items-center gap-1.5 rounded-r px-1.5 py-0.5 text-left text-[11.5px] font-semibold hover:bg-surface-muted"
                        style={{ borderLeft: `2px solid ${cor}` }}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: cor }} />
                        <span className="truncate text-ink-muted">{eventTitle(e)}</span>
                      </button>
                    )
                  })}
                  {evs.length > 3 ? (
                    <button type="button" onClick={() => onOpenDay(day)} className="px-1.5 text-left text-[10.5px] font-bold text-ink-muted hover:text-brand">
                      +{evs.length - 3} mais
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ===================== DRAWER (detalhe do evento) =====================
function DrawerField({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3.5 border-b border-line py-3.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-brand"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-muted">{label}</p>
        <p className="truncate text-sm font-bold text-ink">{value}</p>
      </div>
    </div>
  )
}

function EventDrawer({
  event, onClose, onEdit, onDelete, onRegister,
}: {
  event: JsonRecord
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onRegister: () => void
}) {
  const cor = eventCor(event)
  const synthetic = isSyntheticLiveEvent(event)
  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/55" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-[80] flex h-screen w-[392px] max-w-[92vw] flex-col border-l border-line bg-surface shadow-2xl">
        <div className="relative border-b border-line px-6 py-5">
          <span className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[10.5px] font-black uppercase tracking-[0.1em]" style={{ background: `${cor}26`, color: cor }}>
            {typeLabel(event.tipo)}
          </span>
          <h3 className="mt-3 text-2xl font-black tracking-[-0.01em] text-ink">{eventTitle(event)}</h3>
          <p className="mt-1 text-sm text-ink-muted">{formatDate(asString(event.data_inicio, ''))}</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-lg border border-line text-ink hover:bg-surface-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-2">
          <DrawerField icon={Clock} label="Horário" value={`${formatSaoPauloTime(event.data_inicio)} – ${formatSaoPauloTime(event.data_fim)}`} />
          <DrawerField icon={MapPin} label="Cabine" value={asString(event.cabine_nome ?? event.cabine_numero, 'Sem cabine')} />
          <DrawerField icon={User} label="Apresentadora" value={asString(event.apresentadora_nome ?? event.responsavel_marketing, 'Sem apresentadora')} />
          <DrawerField icon={CalendarDays} label="Cliente" value={asString(event.cliente_nome, '—')} />
          <div className="flex items-center gap-3 py-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-muted">Status</span>
            <Badge tone={statusTone(asString(event.status))}>{asString(event.status, '—')}</Badge>
            {isLiveOnAir(event) ? <TikTokLiveButton username={event.tiktok_username} compact /> : null}
          </div>
        </div>
        <div className="flex gap-2.5 border-t border-line px-6 py-5">
          {isPastRegisterable(event) ? (
            <Button variant="secondary" icon={CheckCircle2} onClick={onRegister}>Resultado</Button>
          ) : null}
          <Button variant="secondary" icon={synthetic ? Eye : Edit2} onClick={onEdit}>{synthetic ? 'Abrir' : 'Editar'}</Button>
          {!synthetic ? (
            <button type="button" onClick={onDelete} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-bold text-ink-muted hover:border-[var(--danger)] hover:text-[var(--danger)]">
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          ) : null}
        </div>
      </aside>
    </>
  )
}
