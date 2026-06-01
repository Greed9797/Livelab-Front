import { CheckCircle2, PlayCircle, Plus, Trash2 } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { PresenterSelect } from './PresenterSelect'
import { useToast } from '../ui/Toast'
import { extractErrorMessage } from '../../services/api'
import { getAgendaConflitos } from '../../services/domain'
import { asNumber, asString } from '../../utils/format'
import { getSaoPauloDateInput } from '../../utils/sao-paulo-date'
import type { Cabine, JsonRecord } from '../../types/models'

export type AgendarLiveModalMode = 'create' | 'edit' | 'now'

type AgendaForm = {
  tipo: string
  live_tipo: string
  cabine_id: string
  marca_id: string
  cliente_id: string
  apresentadora_id: string
  data: string
  hora_inicio: string
  hora_fim: string
  status: string
  responsavel_marketing: string
  observacoes: string
  recorrencia_tipo: string
  recorrencia_ate: string
  recorrencia_total_ocorrencias: string
  recorrencia_dias_semana: string
  modo_recorrencia: string
}

type LookupOption = {
  value: string
  label: string
}

type AccountComboboxProps = {
  value: string
  options: LookupOption[]
  required?: boolean
  invalid?: boolean
  onChange: (value: string) => void
  onSelect: (option: LookupOption) => void
}

type AvailabilityState = {
  status: 'idle' | 'checking' | 'available' | 'conflict' | 'error'
  message: string
}

const emptyForm: AgendaForm = {
  tipo: 'live',
  live_tipo: 'cliente',
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
  recorrencia_tipo: 'nenhuma',
  recorrencia_ate: '',
  recorrencia_total_ocorrencias: '',
  recorrencia_dias_semana: '',
  modo_recorrencia: 'apenas_este',
}

function today() {
  return getSaoPauloDateInput()
}

function dateWithHourOffset(hours: number) {
  const date = new Date()
  date.setHours(date.getHours() + hours)
  return toTimeInput(date.toISOString())
}

function makeDateTime(date: string, time: string) {
  return `${date}T${time}:00-03:00`
}

function toDateInput(value: unknown) {
  const date = typeof value === 'string' ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return today()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${byType.year}-${byType.month}-${byType.day}`
}

function toTimeInput(value: unknown) {
  const date = typeof value === 'string' ? new Date(value) : value instanceof Date ? value : null
  if (!date || Number.isNaN(date.getTime())) return '09:00'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

function liveTypeFromMarca(marca?: JsonRecord): 'cliente' | 'afiliado' | 'teste' {
  const tipo = asString(marca?.tipo, '')
  if (tipo === 'afiliada') return 'afiliado'
  if (tipo === 'cliente') return 'cliente'
  return 'teste'
}

function findLookupOption(options: LookupOption[], rawValue: string) {
  const value = rawValue.trim().toLocaleLowerCase('pt-BR')
  return options.find((option) => (
    option.label.toLocaleLowerCase('pt-BR') === value ||
    option.value.toLocaleLowerCase('pt-BR') === value
  ))
}

function optionLabel(options: LookupOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? ''
}

function filterOptions(options: LookupOption[], query: string) {
  const normalized = query.trim().toLocaleLowerCase('pt-BR')
  if (!normalized) return options.slice(0, 8)
  return options
    .filter((option) => option.label.toLocaleLowerCase('pt-BR').includes(normalized))
    .slice(0, 8)
}

function selectedWeekdays(value: string) {
  return value
    .split(',')
    .map((item) => Number(item))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
}

function recurrencePayload(form: AgendaForm): JsonRecord | null {
  const weekday = new Date(`${form.data}T00:00:00`).getDay()
  const customWeekdays = selectedWeekdays(form.recorrencia_dias_semana)
  const recurrenceWeekdays = customWeekdays.length > 0 ? customWeekdays : [weekday]
  const recurrenceMap: Record<string, JsonRecord | null> = {
    nenhuma: null,
    diaria: { frequencia: 'diaria' },
    dias_uteis: { frequencia: 'semanal', dias_semana: [1, 2, 3, 4, 5] },
    semanal: { frequencia: 'semanal', dias_semana: recurrenceWeekdays },
    quinzenal: { frequencia: 'quinzenal', dias_semana: recurrenceWeekdays },
    mensal: { frequencia: 'mensal' },
  }
  const base = recurrenceMap[form.recorrencia_tipo]
  if (!base) return null
  return {
    ...base,
    ...(form.recorrencia_ate ? { ate: form.recorrencia_ate } : {}),
    ...(form.recorrencia_total_ocorrencias ? { total_ocorrencias: asNumber(form.recorrencia_total_ocorrencias) } : {}),
  }
}

function AccountCombobox({ value, options, required, invalid, onChange, onSelect }: AccountComboboxProps) {
  const [open, setOpen] = useState(false)
  const filtered = filterOptions(options, value)

  return (
    <div className="relative">
      <input
        className={`design-input mt-2 h-11 w-full px-4 ${invalid ? 'border-[var(--danger)]' : ''}`}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder="Buscar marca ou cliente"
        required={required}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open ? (
        <div className="absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-line bg-surface p-1 shadow-[var(--shadow-card)]">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-ink-muted">Nenhuma marca ou cliente encontrado.</div>
          ) : filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink transition hover:bg-surface-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect(option)
                setOpen(false)
              }}
            >
              <span className="truncate">{option.label}</span>
              <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wide text-ink-muted">
                {option.value.startsWith('marca:') ? 'marca' : 'cliente'}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function AgendarLiveModal({
  open,
  mode,
  event,
  defaultDate,
  defaultCabineId,
  cabines,
  marcas,
  clientes,
  apresentadoras,
  isSaving,
  error,
  onClose,
  onCreate,
  onUpdate,
  onStartNow,
  onDelete,
}: {
  open: boolean
  mode: AgendarLiveModalMode
  event?: JsonRecord | null
  defaultDate?: string
  defaultCabineId?: string
  cabines: Cabine[]
  marcas: JsonRecord[]
  clientes: JsonRecord[]
  apresentadoras: JsonRecord[]
  isSaving?: boolean
  error?: unknown
  onClose: () => void
  onCreate?: (payload: JsonRecord) => void
  onUpdate?: (id: string, payload: JsonRecord) => void
  onStartNow?: (payload: JsonRecord) => void
  onDelete?: (id: string, modoRecorrencia: string) => void
}) {
  const toast = useToast()
  const [form, setForm] = useState<AgendaForm>(emptyForm)
  const [accountLookup, setAccountLookup] = useState('')
  const [cabineLookup, setCabineLookup] = useState('')
  const [availability, setAvailability] = useState<AvailabilityState>({ status: 'idle', message: '' })

  const clientesComMarca = useMemo(() => new Set(marcas.map((marca) => asString(marca.cliente_id, '')).filter(Boolean)), [marcas])
  const accountOptions = useMemo<LookupOption[]>(() => [
    ...marcas.map((marca) => ({
      value: `marca:${asString(marca.id, '')}`,
      label: asString(marca.nome ?? marca.cliente_nome, 'Marca'),
    })),
    ...clientes
      .filter((cliente) => !clientesComMarca.has(asString(cliente.id, '')))
      .map((cliente) => ({
        value: `cliente:${asString(cliente.id, '')}`,
        label: asString(cliente.nome ?? cliente.razao_social ?? cliente.email, 'Cliente'),
      })),
  ].filter((option) => option.value !== 'marca:' && option.value !== 'cliente:'), [clientes, clientesComMarca, marcas])
  const cabineOptions = useMemo<LookupOption[]>(() => cabines.map((cabine) => ({
    value: asString(cabine.id, ''),
    label: `Cabine ${asString(cabine.numero, '')}`,
  })).filter((option) => option.value), [cabines])
  const editingEventId = mode === 'edit' ? asString(event?.id, '') : ''

  // useRef rastreia se form já foi inicializado pra esta abertura do modal.
  // Antes: useEffect com deps [accountOptions, cabineOptions, ...] resetava
  // form sempre que React Query refetchOnWindowFocus disparava (iOS clock
  // picker dispara focus). Resultado: horário escolhido voltava pra 09:00/10:00.
  // Agora: form só inicializa quando open vira true; deps subsequentes não
  // tocam form, só atualizam lookups (efeito separado abaixo).
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!open) {
      initializedRef.current = false
      return
    }
    if (initializedRef.current) return
    initializedRef.current = true

    if (mode === 'edit' && event) {
      const marcaId = asString(event.marca_id, '')
      const marca = marcas.find((item) => asString(item.id, '') === marcaId)
      const nextForm = {
        ...emptyForm,
        tipo: asString(event.tipo, 'live'),
        live_tipo: liveTypeFromMarca(marca),
        cabine_id: asString(event.cabine_id, ''),
        marca_id: marcaId,
        cliente_id: asString(event.cliente_id ?? marca?.cliente_id, ''),
        apresentadora_id: asString(event.apresentadora_id, ''),
        data: toDateInput(event.data_inicio),
        hora_inicio: toTimeInput(event.data_inicio),
        hora_fim: toTimeInput(event.data_fim),
        status: asString(event.status, 'planejado'),
        responsavel_marketing: asString(event.responsavel_marketing, ''),
        observacoes: asString(event.observacoes, ''),
        recorrencia_dias_semana: Array.isArray(event.recorrencia_dias_semana)
          ? event.recorrencia_dias_semana.join(',')
          : asString(event.recorrencia_dias_semana, ''),
        modo_recorrencia: 'apenas_este',
      }
      setForm(nextForm)
      setAccountLookup(optionLabel(accountOptions, nextForm.marca_id ? `marca:${nextForm.marca_id}` : nextForm.cliente_id ? `cliente:${nextForm.cliente_id}` : ''))
      setCabineLookup(optionLabel(cabineOptions, nextForm.cabine_id))
      return
    }

    const now = new Date()
    const nextForm = {
      ...emptyForm,
      cabine_id: defaultCabineId ?? '',
      data: defaultDate || today(),
      hora_inicio: mode === 'now' ? toTimeInput(now) : '09:00',
      hora_fim: mode === 'now' ? dateWithHourOffset(4) : '10:00',
      status: mode === 'now' ? 'confirmado' : 'planejado',
    }
    setForm(nextForm)
    setAccountLookup('')
    setCabineLookup(optionLabel(cabineOptions, nextForm.cabine_id))
    // Deps mínimas — accountOptions/cabineOptions removidas pra estabilizar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Atualiza apenas o LABEL dos selects quando listas mudam (form preservado).
  useEffect(() => {
    if (!open) return
    setCabineLookup((current) => current || optionLabel(cabineOptions, form.cabine_id))
  }, [cabineOptions, open, form.cabine_id])

  useEffect(() => {
    if (!open || (!form.cabine_id && !form.apresentadora_id) || !form.data || !form.hora_inicio || !form.hora_fim) {
      setAvailability({ status: 'idle', message: '' })
      return
    }

    const dataInicio = makeDateTime(form.data, form.hora_inicio)
    const dataFim = makeDateTime(form.data, form.hora_fim)
    if (new Date(dataFim).getTime() <= new Date(dataInicio).getTime()) {
      setAvailability({ status: 'conflict', message: 'O horário final precisa ser depois do início.' })
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setAvailability({ status: 'checking', message: 'Verificando disponibilidade da cabine e apresentadora...' })
      getAgendaConflitos({
        cabineId: form.cabine_id || undefined,
        apresentadoraId: form.apresentadora_id || undefined,
        dataInicio,
        dataFim,
        excludeId: editingEventId || undefined,
      })
        .then((result) => {
          if (cancelled) return
          const conflitos = Array.isArray(result.conflitos) ? result.conflitos : []
          const total = asNumber(result.total ?? result.total_conflitos ?? conflitos.length)
          if (total > 0) {
            const first = conflitos[0] as JsonRecord | undefined
            const entity = asString(first?.entidade ?? first?.tipo, 'cabine/apresentadora')
            const start = asString(first?.data_inicio ?? first?.inicio, '')
            const end = asString(first?.data_fim ?? first?.fim, '')
            const period = start && end ? ` (${toTimeInput(start)}-${toTimeInput(end)})` : ''
            setAvailability({ status: 'conflict', message: `Existe conflito de ${entity}${period}. Escolha outro horário.` })
            return
          }
          setAvailability({ status: 'available', message: 'Horário disponível para os vínculos selecionados.' })
        })
        .catch(() => {
          if (!cancelled) setAvailability({ status: 'error', message: 'Não foi possível verificar disponibilidade agora. O backend ainda validará ao salvar.' })
        })
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [editingEventId, form.apresentadora_id, form.cabine_id, form.data, form.hora_fim, form.hora_inicio, open])

  function setField(key: keyof AgendaForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function setRecurrenceType(value: string) {
    setForm((current) => ({
      ...current,
      recorrencia_tipo: value,
      recorrencia_dias_semana: ['semanal', 'quinzenal'].includes(value) && !current.recorrencia_dias_semana
        ? String(new Date(`${current.data}T00:00:00`).getDay())
        : current.recorrencia_dias_semana,
    }))
  }

  function toggleWeekday(day: number) {
    setForm((current) => {
      const currentDays = selectedWeekdays(current.recorrencia_dias_semana)
      const nextDays = currentDays.includes(day)
        ? currentDays.filter((item) => item !== day)
        : [...currentDays, day]
      return { ...current, recorrencia_dias_semana: nextDays.sort((a, b) => a - b).join(',') }
    })
  }

  function setAccount(value: string) {
    if (value.startsWith('marca:')) {
      const marcaId = value.slice('marca:'.length)
      const marca = marcas.find((item) => asString(item.id, '') === marcaId)
      setForm((current) => ({
        ...current,
        marca_id: marcaId,
        cliente_id: asString(marca?.cliente_id, ''),
        live_tipo: liveTypeFromMarca(marca),
      }))
      return
    }
    if (value.startsWith('cliente:')) {
      setForm((current) => ({ ...current, marca_id: '', cliente_id: value.slice('cliente:'.length), live_tipo: 'cliente' }))
      return
    }
    setForm((current) => ({ ...current, marca_id: '', cliente_id: '' }))
  }

  function onAccountLookupChange(value: string) {
    setAccountLookup(value)
    if (!value.trim()) setAccount('')
  }

  function onAccountOptionSelect(option: LookupOption) {
    setAccountLookup(option.label)
    setAccount(option.value)
  }

  function onCabineLookupChange(value: string) {
    setCabineLookup(value)
    const option = findLookupOption(cabineOptions, value)
    if (option) setField('cabine_id', option.value)
    else if (!value.trim()) setField('cabine_id', '')
  }

  function onSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    const dataInicio = makeDateTime(form.data, form.hora_inicio)
    const dataFim = makeDateTime(form.data, form.hora_fim)
    if (new Date(dataFim).getTime() <= new Date(dataInicio).getTime()) {
      setAvailability({ status: 'conflict', message: 'O horário final precisa ser depois do início.' })
      return
    }
    if (mode === 'now' && !form.cabine_id) {
      setAvailability({ status: 'conflict', message: 'Selecione uma cabine da lista antes de iniciar.' })
      return
    }
    if (mode === 'now' && !form.apresentadora_id) {
      setAvailability({ status: 'conflict', message: 'Selecione uma apresentadora da lista antes de iniciar.' })
      return
    }
    if (form.tipo !== 'bloqueio_manutencao' && (mode !== 'now' || form.live_tipo !== 'teste') && !form.marca_id && !form.cliente_id) {
      setAvailability({ status: 'conflict', message: 'Selecione uma marca ou cliente da lista antes de salvar.' })
      return
    }
    const cabineNumero = cabineOptions.find((o) => o.value === form.cabine_id)?.label ?? `Cabine ${form.cabine_id}`
    const contaNome = accountLookup.trim() || ''
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(`${form.data}T${form.hora_inicio}:00`))

    if (mode === 'now') {
      onStartNow?.({
        cabine_id: form.cabine_id,
        ...(form.marca_id ? { marca_id: form.marca_id } : {}),
        ...(form.cliente_id ? { cliente_id: form.cliente_id } : {}),
        apresentadora_id: form.apresentadora_id,
        apresentador_id: form.apresentadora_id,
        tipo: form.live_tipo,
        previsto_fim: dataFim,
      })
      toast.push(`Live iniciada na ${cabineNumero}${contaNome ? ` · ${contaNome}` : ''}`, 'success')
      return
    }

    const recorrencia = recurrencePayload(form)
    const payload = {
      tipo: form.tipo,
      cabine_id: form.cabine_id || null,
      marca_id: form.tipo === 'bloqueio_manutencao' ? null : form.marca_id || null,
      cliente_id: form.tipo === 'bloqueio_manutencao' ? null : form.cliente_id || null,
      apresentadora_id: form.apresentadora_id || null,
      data_inicio: dataInicio,
      data_fim: dataFim,
      status: form.status,
      responsavel_marketing: form.responsavel_marketing || null,
      observacoes: form.observacoes || null,
      ...(recorrencia && mode === 'create' ? { recorrencia } : {}),
      ...(mode === 'edit' ? { modo_recorrencia: form.modo_recorrencia } : {}),
    }

    if (mode === 'edit' && event) {
      onUpdate?.(asString(event.id, ''), payload)
      toast.push(`Agendamento atualizado — ${cabineNumero}${contaNome ? ` · ${contaNome}` : ''} em ${formattedDate}`, 'success')
    } else {
      onCreate?.(payload)
      toast.push(`${cabineNumero} reservada${contaNome ? ` para ${contaNome}` : ''} em ${formattedDate}`, 'success')
    }
  }

  const title = mode === 'edit' ? 'Editar agendamento' : mode === 'now' ? 'Iniciar live agora' : 'Agendar'
  const submitLabel = mode === 'edit' ? 'Salvar agendamento' : mode === 'now' ? 'Iniciar live' : 'Agendar'
  const SubmitIcon = mode === 'now' ? PlayCircle : mode === 'edit' ? CheckCircle2 : Plus
  const accountRequired = form.tipo !== 'bloqueio_manutencao' && (mode !== 'now' || form.live_tipo !== 'teste')
  const accountInvalid = accountRequired && accountLookup.trim().length > 0 && !form.marca_id && !form.cliente_id

  return (
    <Modal open={open} title={title} subtitle="Reserva de cabine com recorrência opcional." size="lg" onClose={onClose}>
      <form className="space-y-3" onSubmit={onSubmit}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Tipo</span>
            <select className="design-input mt-2 h-11 w-full px-4" value={form.tipo} onChange={(item) => setField('tipo', item.target.value)} disabled={mode === 'now'}>
              <option value="live">Live</option>
              <option value="gravacao_video">Gravação</option>
              <option value="bloqueio_manutencao">Bloqueio/manutenção</option>
            </select>
          </label>
          {mode === 'now' ? (
            <label className="block">
              <span className="text-sm font-semibold text-ink">Tipo de live</span>
              <select className="design-input mt-2 h-11 w-full px-4" value={form.live_tipo} onChange={(item) => setField('live_tipo', item.target.value)}>
                <option value="cliente">Cliente</option>
                <option value="afiliado">Afiliado</option>
                <option value="teste">Teste</option>
              </select>
            </label>
          ) : (
            <label className="block">
              <span className="text-sm font-semibold text-ink">Status</span>
              <select className="design-input mt-2 h-11 w-full px-4" value={form.status} onChange={(item) => setField('status', item.target.value)}>
                <option value="planejado">Planejado</option>
                <option value="confirmado">Confirmado</option>
                <option value="ao_vivo">Ao vivo</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </label>
          )}
        </div>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Cabine</span>
          <input
            className="design-input mt-2 h-11 w-full px-4"
            list="agenda-cabine-options"
            value={cabineLookup}
            onChange={(item) => onCabineLookupChange(item.target.value)}
            placeholder="Buscar cabine"
            required={mode === 'now'}
          />
          <datalist id="agenda-cabine-options">
            {cabineOptions.map((option) => <option key={option.value} value={option.label} />)}
          </datalist>
        </label>
        {form.tipo !== 'bloqueio_manutencao' ? (
          <label className="block">
            <span className="text-sm font-semibold text-ink">Marca/cliente</span>
            <AccountCombobox
              value={accountLookup}
              options={accountOptions}
              required={accountRequired}
              invalid={accountInvalid}
              onChange={onAccountLookupChange}
              onSelect={onAccountOptionSelect}
            />
            {accountInvalid ? (
              <span className="mt-1 block text-xs font-semibold text-[var(--danger)]">
                Escolha uma opção da lista para vincular a live corretamente.
              </span>
            ) : null}
          </label>
        ) : null}
        <PresenterSelect
          rows={apresentadoras}
          value={form.apresentadora_id}
          onChange={(value) => setField('apresentadora_id', value)}
          required={mode === 'now'}
          placeholder={mode === 'now' ? 'Selecione uma apresentadora' : 'Sem apresentadora definida'}
        />
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Data</span>
            <input className="design-input mt-2 h-11 w-full px-3" type="date" value={form.data} onChange={(item) => setField('data', item.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Início</span>
            <input className="design-input mt-2 h-11 w-full px-3" type="time" value={form.hora_inicio} onChange={(item) => setField('hora_inicio', item.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Fim</span>
            <input className="design-input mt-2 h-11 w-full px-3" type="time" value={form.hora_fim} onChange={(item) => setField('hora_fim', item.target.value)} required />
          </label>
        </div>
        {availability.status !== 'idle' ? (
          <p className={[
            'rounded-2xl px-4 py-3 text-sm font-medium',
            availability.status === 'available' ? 'bg-[var(--success-soft)] text-[var(--success)]' : '',
            availability.status === 'checking' ? 'bg-surface-muted text-ink-muted' : '',
            availability.status === 'conflict' || availability.status === 'error' ? 'bg-[var(--danger-soft)] text-[var(--danger)]' : '',
          ].filter(Boolean).join(' ')}
          >
            {availability.message}
          </p>
        ) : null}
        {mode !== 'now' ? (
          <label className="block">
            <span className="text-sm font-semibold text-ink">Responsável de marketing</span>
            <input className="design-input mt-2 h-11 w-full px-4" value={form.responsavel_marketing} onChange={(item) => setField('responsavel_marketing', item.target.value)} />
          </label>
        ) : null}
        {mode !== 'now' ? (
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Recorrência</span>
              <select className="design-input mt-2 h-11 w-full px-4" value={form.recorrencia_tipo} onChange={(item) => setRecurrenceType(item.target.value)} disabled={mode === 'edit'}>
                <option value="nenhuma">Sem recorrência</option>
                <option value="diaria">Diária</option>
                <option value="dias_uteis">Dias úteis</option>
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Repetir até</span>
              <input className="design-input mt-2 h-11 w-full px-4" type="date" value={form.recorrencia_ate} onChange={(item) => setField('recorrencia_ate', item.target.value)} disabled={form.recorrencia_tipo === 'nenhuma' || mode === 'edit'} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Ocorrências</span>
              <input className="design-input mt-2 h-11 w-full px-4" type="text" inputMode="numeric" pattern="[0-9.,]*" value={form.recorrencia_total_ocorrencias} onChange={(item) => setField('recorrencia_total_ocorrencias', item.target.value)} disabled={form.recorrencia_tipo === 'nenhuma' || mode === 'edit'} />
            </label>
          </div>
        ) : null}
        {mode !== 'now' && ['semanal', 'quinzenal'].includes(form.recorrencia_tipo) ? (
          <div className="rounded-2xl border border-line bg-surface-muted p-3">
            <p className="text-sm font-semibold text-ink">Dias da recorrência</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                [0, 'Dom'],
                [1, 'Seg'],
                [2, 'Ter'],
                [3, 'Qua'],
                [4, 'Qui'],
                [5, 'Sex'],
                [6, 'Sáb'],
              ].map(([day, label]) => {
                const dayNumber = Number(day)
                const checked = selectedWeekdays(form.recorrencia_dias_semana).includes(dayNumber)
                return (
                  <label key={dayNumber} className={`inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold ${checked ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink'}`}>
                    <input
                      className="sr-only"
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleWeekday(dayNumber)}
                      disabled={mode === 'edit'}
                    />
                    {label}
                  </label>
                )
              })}
            </div>
          </div>
        ) : null}
        {mode === 'edit' ? (
          <label className="block">
            <span className="text-sm font-semibold text-ink">Aplicar alteração</span>
            <select className="design-input mt-2 h-11 w-full px-4" value={form.modo_recorrencia} onChange={(item) => setField('modo_recorrencia', item.target.value)}>
              <option value="apenas_este">Apenas este evento</option>
              <option value="este_e_proximos">Este e próximos</option>
              <option value="todos">Toda a série</option>
            </select>
          </label>
        ) : null}
        <label className="block">
          <span className="text-sm font-semibold text-ink">Observações</span>
          <textarea className="design-input mt-2 min-h-24 w-full px-4 py-3" value={form.observacoes} onChange={(item) => setField('observacoes', item.target.value)} />
        </label>
        {error ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(error)}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" icon={SubmitIcon} isLoading={isSaving}>{submitLabel}</Button>
          {mode === 'edit' && event && onDelete ? (
            <Button type="button" variant="danger" icon={Trash2} disabled={isSaving} onClick={() => onDelete(asString(event.id, ''), form.modo_recorrencia)}>
              Cancelar evento
            </Button>
          ) : null}
          <Button type="button" variant="secondary" disabled={isSaving} onClick={onClose}>Fechar</Button>
        </div>
      </form>
    </Modal>
  )
}
