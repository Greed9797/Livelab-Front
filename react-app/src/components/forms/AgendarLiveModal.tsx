import { CheckCircle2, PlayCircle, Plus, Trash2 } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { extractErrorMessage } from '../../services/api'
import { asNumber, asString } from '../../utils/format'
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
  tiktok_username: string
  observacoes: string
  recorrencia_tipo: string
  recorrencia_ate: string
  recorrencia_total_ocorrencias: string
  modo_recorrencia: string
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
  tiktok_username: '',
  observacoes: '',
  recorrencia_tipo: 'nenhuma',
  recorrencia_ate: '',
  recorrencia_total_ocorrencias: '',
  modo_recorrencia: 'apenas_este',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function dateWithHourOffset(hours: number) {
  const date = new Date()
  date.setHours(date.getHours() + hours)
  return toTimeInput(date.toISOString())
}

function makeDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString()
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

function recurrencePayload(form: AgendaForm): JsonRecord | null {
  const weekday = new Date(`${form.data}T00:00:00`).getDay()
  const recurrenceMap: Record<string, JsonRecord | null> = {
    nenhuma: null,
    diaria: { frequencia: 'diaria' },
    dias_uteis: { frequencia: 'semanal', dias_semana: [1, 2, 3, 4, 5] },
    semanal: { frequencia: 'semanal', dias_semana: [weekday] },
    quinzenal: { frequencia: 'quinzenal', dias_semana: [weekday] },
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
  const [form, setForm] = useState<AgendaForm>(emptyForm)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && event) {
      const marcaId = asString(event.marca_id, '')
      const marca = marcas.find((item) => asString(item.id, '') === marcaId)
      setForm({
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
        tiktok_username: asString(event.tiktok_username ?? marca?.tiktok_username, ''),
        observacoes: asString(event.observacoes, ''),
        modo_recorrencia: 'apenas_este',
      })
      return
    }

    const now = new Date()
    setForm({
      ...emptyForm,
      cabine_id: defaultCabineId ?? '',
      data: defaultDate || today(),
      hora_inicio: mode === 'now' ? toTimeInput(now) : '09:00',
      hora_fim: mode === 'now' ? dateWithHourOffset(4) : '10:00',
      status: mode === 'now' ? 'confirmado' : 'planejado',
    })
  }, [defaultCabineId, defaultDate, event, marcas, mode, open])

  const clientesComMarca = useMemo(() => new Set(marcas.map((marca) => asString(marca.cliente_id, '')).filter(Boolean)), [marcas])
  const accountOptions = useMemo(() => [
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

  const accountValue = form.marca_id ? `marca:${form.marca_id}` : form.cliente_id ? `cliente:${form.cliente_id}` : ''

  function setField(key: keyof AgendaForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
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
        tiktok_username: current.tiktok_username || asString(marca?.tiktok_username, ''),
      }))
      return
    }
    if (value.startsWith('cliente:')) {
      setForm((current) => ({ ...current, marca_id: '', cliente_id: value.slice('cliente:'.length), live_tipo: 'cliente' }))
      return
    }
    setForm((current) => ({ ...current, marca_id: '', cliente_id: '' }))
  }

  function onSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    const dataInicio = makeDateTime(form.data, form.hora_inicio)
    const dataFim = makeDateTime(form.data, form.hora_fim)
    if (mode === 'now') {
      onStartNow?.({
        cabine_id: form.cabine_id,
        ...(form.marca_id ? { marca_id: form.marca_id } : {}),
        ...(form.cliente_id ? { cliente_id: form.cliente_id } : {}),
        apresentadora_id: form.apresentadora_id,
        apresentador_id: form.apresentadora_id,
        tipo: form.live_tipo,
        previsto_fim: dataFim,
        tiktok_username: form.tiktok_username || null,
      })
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

    if (mode === 'edit' && event) onUpdate?.(asString(event.id, ''), payload)
    else onCreate?.(payload)
  }

  const title = mode === 'edit' ? 'Editar agendamento' : mode === 'now' ? 'Iniciar live agora' : 'Agendar'
  const submitLabel = mode === 'edit' ? 'Salvar agendamento' : mode === 'now' ? 'Iniciar live' : 'Agendar'
  const SubmitIcon = mode === 'now' ? PlayCircle : mode === 'edit' ? CheckCircle2 : Plus

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
          <select className="design-input mt-2 h-11 w-full px-4" value={form.cabine_id} onChange={(item) => setField('cabine_id', item.target.value)} required={mode === 'now'}>
            <option value="">Sem cabine definida</option>
            {cabines.map((cabine) => <option key={cabine.id} value={cabine.id}>Cabine {asString(cabine.numero)}</option>)}
          </select>
        </label>
        {form.tipo !== 'bloqueio_manutencao' ? (
          <label className="block">
            <span className="text-sm font-semibold text-ink">Marca/cliente</span>
            <select className="design-input mt-2 h-11 w-full px-4" value={accountValue} onChange={(item) => setAccount(item.target.value)} required={mode !== 'now' || form.live_tipo !== 'teste'}>
              <option value="">Selecione uma marca ou cliente</option>
              {accountOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        ) : null}
        <label className="block">
          <span className="text-sm font-semibold text-ink">Apresentadora</span>
          <select className="design-input mt-2 h-11 w-full px-4" value={form.apresentadora_id} onChange={(item) => setField('apresentadora_id', item.target.value)} required={mode === 'now'}>
            <option value="">Selecione</option>
            {apresentadoras.map((item) => <option key={asString(item.id, '')} value={asString(item.id, '')}>{asString(item.nome ?? item.email)}</option>)}
          </select>
        </label>
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
        {mode === 'now' ? (
          <label className="block">
            <span className="text-sm font-semibold text-ink">TikTok da live</span>
            <input className="design-input mt-2 h-11 w-full px-4" placeholder="@usuario_tiktok" value={form.tiktok_username} onChange={(item) => setField('tiktok_username', item.target.value)} />
          </label>
        ) : (
          <label className="block">
            <span className="text-sm font-semibold text-ink">Responsável de marketing</span>
            <input className="design-input mt-2 h-11 w-full px-4" value={form.responsavel_marketing} onChange={(item) => setField('responsavel_marketing', item.target.value)} />
          </label>
        )}
        {mode !== 'now' ? (
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Recorrência</span>
              <select className="design-input mt-2 h-11 w-full px-4" value={form.recorrencia_tipo} onChange={(item) => setField('recorrencia_tipo', item.target.value)} disabled={mode === 'edit'}>
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
