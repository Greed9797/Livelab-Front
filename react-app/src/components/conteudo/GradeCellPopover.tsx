import { FormEvent, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { UnsavedChangesNotice } from '../ui/UnsavedChangesNotice'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import { getAgenda } from '../../services/domain'
import { asArray, asString } from '../../utils/format'
import { getSaoPauloDateInput } from '../../utils/sao-paulo-date'
import type { JsonRecord } from '../../types/models'
import type { GradeCelula } from './gradeUtils'

export interface GradeCellTarget {
  cabineId: string
  cabineNumero: number | null
  horaInicio: string
  horaFim: string
  /** Data do dia (visão normal) — ausente no modo editar padrão. */
  data?: string
  /** Dia da semana (modo editar padrão). */
  diaSemana?: number
  celula: GradeCelula | null
}

interface GradeCellPopoverProps {
  target: GradeCellTarget | null
  marcas: JsonRecord[]
  apresentadoras: JsonRecord[]
  isSaving: boolean
  errorMessage: string | null
  onClose: () => void
  onSave: (values: { marca_id: string; apresentadora_id: string | null; observacao: string | null }) => void
  onClear: () => void
  /** Ações da agenda real (lives agendadas). Só existem no modo exceção. */
  onAgendarLive?: () => void
  onEditarLive?: (evento: JsonRecord) => void
  onExcluirLive?: (evento: JsonRecord) => void
  isExcluindoLive?: boolean
  /** Erro das mutations de agenda (exclusão feita daqui) — nunca falhar em silêncio. */
  agendaErrorMessage?: string | null
}

const HORA_SP = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "HH:MM" de um instante ISO, em horário de São Paulo. */
export function horaSP(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return HORA_SP.format(date)
}

function minutosDoDia(hora: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hora)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/**
 * Minuto do dia `data`. Instante de outro dia vira o extremo da janela — evento
 * que começou na véspera ocupa o slot desde 00:00, não é descartado por ter a
 * hora de outro dia.
 */
function limiteEmMinutos(value: unknown, data: string): number | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const dia = getSaoPauloDateInput(date)
  if (dia < data) return 0
  if (dia > data) return 24 * 60
  return minutosDoDia(HORA_SP.format(date))
}

/** Eventos da agenda que cruzam o slot [horaInicio, horaFim) — overlap half-open. */
export function eventosNoSlot(
  eventos: JsonRecord[],
  slot: { data: string; horaInicio: string; horaFim: string },
): JsonRecord[] {
  const slotInicio = minutosDoDia(slot.horaInicio)
  const slotFim = minutosDoDia(slot.horaFim)
  if (slotInicio === null || slotFim === null) return []
  return eventos.filter((evento) => {
    const inicio = limiteEmMinutos(evento.data_inicio, slot.data)
    const fim = limiteEmMinutos(evento.data_fim, slot.data)
    if (inicio === null || fim === null) return false
    return inicio < slotFim && fim > slotInicio
  })
}

/** Quem apresenta: os turnos do revezamento quando existem, senão o campo escalar. */
export function apresentadorasDoEvento(evento: JsonRecord): string {
  const turnos = asArray<JsonRecord>(evento.apresentadoras)
  if (turnos.length > 0) {
    return turnos
      .map((turno) => `${asString(turno.apresentadora_nome, 'Apresentadora')} ${horaSP(turno.data_inicio)}–${horaSP(turno.data_fim)}`)
      .join(' · ')
  }
  return asString(evento.apresentadora_nome, 'Sem apresentadora')
}

export function GradeCellPopover({
  target,
  marcas,
  apresentadoras,
  isSaving,
  errorMessage,
  onClose,
  onSave,
  onClear,
  onAgendarLive,
  onEditarLive,
  onExcluirLive,
  isExcluindoLive = false,
  agendaErrorMessage = null,
}: GradeCellPopoverProps) {
  const [marcaId, setMarcaId] = useState('')
  const [apresentadoraId, setApresentadoraId] = useState('')
  const [observacao, setObservacao] = useState('')

  useEffect(() => {
    setMarcaId(target?.celula?.marca_id ?? '')
    setApresentadoraId(target?.celula?.apresentadora_id ?? '')
    setObservacao(target?.celula?.observacao ?? '')
  }, [target])

  const dirty = Boolean(target) && (
    marcaId !== (target?.celula?.marca_id ?? '')
    || apresentadoraId !== (target?.celula?.apresentadora_id ?? '')
    || observacao !== (target?.celula?.observacao ?? '')
  )
  const closeGuard = useUnsavedChanges({ open: Boolean(target), dirty, busy: isSaving, onClose })

  // Só o modo exceção (dia concreto) tem agenda real: o padrão semanal é template.
  const cabineId = target?.cabineId ?? ''
  const dataSlot = target?.data ?? ''
  const agendaQuery = useQuery({
    queryKey: ['agenda-slot', cabineId, dataSlot],
    queryFn: () => getAgenda({ cabine_id: cabineId, data: dataSlot }),
    enabled: Boolean(cabineId && dataSlot),
  })

  if (!target) return null

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!marcaId) return
    onSave({ marca_id: marcaId, apresentadora_id: apresentadoraId || null, observacao: observacao.trim() || null })
  }

  const titulo = `Cabine ${target.cabineNumero ?? '—'} · ${target.horaInicio}–${target.horaFim}`
  const subtitulo = target.data
    ? `Ajuste válido apenas em ${target.data.split('-').reverse().join('/')}`
    : 'Editando o padrão semanal — repete toda semana'
  const lives = target.data
    ? eventosNoSlot(agendaQuery.data ?? [], { data: target.data, horaInicio: target.horaInicio, horaFim: target.horaFim })
    : []

  return (
    <Modal open title={titulo} subtitle={subtitulo} size="sm" onClose={closeGuard.requestClose} closeDisabled={isSaving}>
      <form onSubmit={onSubmit} className="space-y-4 px-5 py-4">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Marca</span>
          <select className="design-input h-10 w-full px-3" value={marcaId} onChange={(e) => setMarcaId(e.target.value)} required>
            <option value="">Selecione a marca…</option>
            {marcas.map((m) => (
              <option key={asString(m.id)} value={asString(m.id)}>{asString(m.nome, 'Sem nome')}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Apresentadora</span>
          <select className="design-input h-10 w-full px-3" value={apresentadoraId} onChange={(e) => setApresentadoraId(e.target.value)}>
            <option value="">Sem apresentadora</option>
            {apresentadoras.map((a) => (
              <option key={asString(a.id)} value={asString(a.id)}>{asString(a.nome, 'Sem nome')}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Observação</span>
          <input className="design-input h-10 w-full px-3" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional" />
        </label>

        {errorMessage ? <p className="text-sm font-semibold text-[color:var(--danger)]">{errorMessage}</p> : null}

        <UnsavedChangesNotice guard={closeGuard} />

        <div className="flex items-center justify-between gap-2 pt-1">
          {target.celula ? (
            <Button type="button" variant="danger" onClick={onClear} disabled={isSaving}>Limpar célula</Button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={closeGuard.requestClose} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" isLoading={isSaving} disabled={!marcaId}>Salvar</Button>
          </div>
        </div>
      </form>

      {/* A grade é template; o agendamento real vive em agenda_eventos. Este bloco
          é o CRUD dele no lugar onde o operador já está clicando. */}
      {target.data && onAgendarLive ? (
        <div className="border-t border-line px-5 py-4">
          <p className="text-sm font-semibold text-ink">Lives agendadas neste horário</p>
          {agendaQuery.isLoading ? (
            <p className="mt-2 text-sm text-ink-muted">Carregando agendamentos…</p>
          ) : agendaQuery.error ? (
            <p className="mt-2 text-sm font-semibold text-[color:var(--danger)]">Não foi possível carregar os agendamentos deste horário.</p>
          ) : lives.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">Nenhuma live agendada neste slot.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {lives.map((evento) => (
                <li key={asString(evento.id)} className="rounded-xl border border-line bg-surface-muted px-3 py-2">
                  <p className="text-sm font-semibold text-ink">
                    {asString(evento.marca_nome ?? evento.cliente_nome, 'Sem marca')}
                    <span className="ml-2 font-normal text-ink-muted">
                      {horaSP(evento.data_inicio)}–{horaSP(evento.data_fim)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">{apresentadorasDoEvento(evento)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button type="button" variant="secondary" icon={Pencil} onClick={() => onEditarLive?.(evento)}>Editar</Button>
                    <Button
                      type="button"
                      variant="ghost"
                      icon={Trash2}
                      disabled={isExcluindoLive}
                      onClick={() => {
                        if (!window.confirm('Cancelar este agendamento?')) return
                        onExcluirLive?.(evento)
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {agendaErrorMessage ? (
            <p className="mt-2 text-sm font-semibold text-[color:var(--danger)]">{agendaErrorMessage}</p>
          ) : null}
          <Button type="button" variant="secondary" icon={CalendarPlus} className="mt-3" onClick={onAgendarLive}>
            Agendar live real neste horário
          </Button>
        </div>
      ) : null}
    </Modal>
  )
}
