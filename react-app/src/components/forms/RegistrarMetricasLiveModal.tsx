import { CheckCircle2 } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { MoneyInput } from '../ui/MoneyInput'
import { PresenterSelect } from './PresenterSelect'
import { extractErrorMessage } from '../../services/api'
import { asString } from '../../utils/format'
import { officialLiveGmv } from '../../utils/live-gmv'
import { formatBRLWithoutSymbol } from '../../utils/money'
import { buildManualLivePayload, type ManualLiveForm } from '../../utils/live-manual'
import type { Cabine, JsonRecord } from '../../types/models'

export type RegistrarMetricasLiveMode = 'manual' | 'edit' | 'result'

type MetricsForm = ManualLiveForm & {
  manual_comments: string
  manual_shares: string
  manual_diamonds: string
  origem_dados: string
}

const emptyForm: MetricsForm = {
  cabine_id: '',
  cliente_id: '',
  marca_id: '',
  apresentador_id: '',
  agenda_evento_id: '',
  data: today(),
  hora_inicio: '09:00',
  hora_fim: '10:00',
  fat_gerado: '0',
  qtd_pedidos: '0',
  manual_views: '',
  manual_likes: '',
  manual_comments: '',
  manual_shares: '',
  manual_diamonds: '',
  resumo: '',
  status_publicacao: 'rascunho',
  tipo: 'cliente',
  origem_dados: 'manual',
}

function today() {
  return new Date().toISOString().slice(0, 10)
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
  const date = typeof value === 'string' ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return '09:00'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

function toDatetimeLocal(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString()
}

function liveTypeFromMarca(marca?: JsonRecord): 'cliente' | 'afiliado' | 'teste' {
  const tipo = asString(marca?.tipo, '')
  if (tipo === 'afiliada') return 'afiliado'
  if (tipo === 'cliente') return 'cliente'
  return 'teste'
}

function formFromLive(live: JsonRecord): MetricsForm {
  return {
    ...emptyForm,
    cabine_id: asString(live.cabine_id, ''),
    cliente_id: asString(live.cliente_id, ''),
    marca_id: asString(live.marca_id, ''),
    apresentador_id: asString(live.apresentadora_id ?? live.apresentador_id, ''),
    agenda_evento_id: asString(live.agenda_evento_id, ''),
    data: toDateInput(live.iniciado_em),
    hora_inicio: toTimeInput(live.iniciado_em),
    hora_fim: toTimeInput(live.encerrado_em),
    fat_gerado: formatBRLWithoutSymbol(officialLiveGmv(live)),
    qtd_pedidos: asString(live.manual_orders ?? live.final_orders_count ?? 0, '0'),
    manual_views: asString(live.manual_views ?? ''),
    manual_likes: asString(live.manual_likes ?? ''),
    manual_comments: asString(live.manual_comments ?? ''),
    manual_shares: asString(live.manual_shares ?? ''),
    manual_diamonds: asString(live.manual_diamonds ?? ''),
    resumo: asString(live.resumo, ''),
    status_publicacao: asString(live.status_publicacao, 'rascunho'),
    tipo: asString(live.tipo, 'cliente'),
    origem_dados: asString(live.origem_dados, 'manual'),
  }
}

function formFromAgendaEvent(event: JsonRecord, marcas: JsonRecord[]): MetricsForm {
  const marcaId = asString(event.marca_id, '')
  const marca = marcas.find((item) => asString(item.id, '') === marcaId)
  return {
    ...emptyForm,
    cabine_id: asString(event.cabine_id, ''),
    cliente_id: asString(event.cliente_id ?? marca?.cliente_id, ''),
    marca_id: marcaId,
    apresentador_id: asString(event.apresentadora_id, ''),
    agenda_evento_id: asString(event.id, ''),
    data: toDateInput(event.data_inicio),
    hora_inicio: toTimeInput(event.data_inicio),
    hora_fim: toTimeInput(event.data_fim),
    tipo: liveTypeFromMarca(marca),
    resumo: asString(event.observacoes, ''),
  }
}

export function RegistrarMetricasLiveModal({
  open,
  mode,
  live,
  agendaEvent,
  cabines,
  marcas,
  clientes,
  apresentadoras,
  isSaving,
  error,
  onClose,
  onCreateManual,
  onCreateResultFromAgenda,
  onUpdateLive,
  onCloseLive,
}: {
  open: boolean
  mode: RegistrarMetricasLiveMode
  live?: JsonRecord | null
  agendaEvent?: JsonRecord | null
  cabines: Cabine[]
  marcas: JsonRecord[]
  clientes: JsonRecord[]
  apresentadoras: JsonRecord[]
  isSaving?: boolean
  error?: unknown
  onClose: () => void
  onCreateManual: (payload: JsonRecord) => void
  onCreateResultFromAgenda?: (payload: JsonRecord) => void
  onUpdateLive?: (id: string, payload: JsonRecord) => void
  onCloseLive?: (id: string, payload: JsonRecord) => void
}) {
  const [form, setForm] = useState<MetricsForm>(emptyForm)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && live) {
      setForm(formFromLive(live))
      return
    }
    if (mode === 'result' && agendaEvent) {
      setForm(formFromAgendaEvent(agendaEvent, marcas))
      return
    }
    setForm(emptyForm)
  }, [agendaEvent, live, marcas, mode, open])

  const clientesComMarca = useMemo(() => new Set(marcas.map((marca) => asString(marca.cliente_id, '')).filter(Boolean)), [marcas])
  const accountOptions = useMemo(() => form.tipo === 'afiliado'
    ? marcas
      .filter((marca) => ['afiliada', 'parceira', 'propria'].includes(asString(marca.tipo, '')))
      .map((marca) => ({ value: `marca:${asString(marca.id, '')}`, label: asString(marca.nome ?? marca.cliente_nome, 'Afiliada') }))
    : [
      ...marcas
        .filter((marca) => asString(marca.tipo, 'cliente') === 'cliente')
        .map((marca) => ({ value: `marca:${asString(marca.id, '')}`, label: asString(marca.nome ?? marca.cliente_nome, 'Marca') })),
      ...clientes
        .filter((cliente) => !clientesComMarca.has(asString(cliente.id, '')))
        .map((cliente) => ({ value: `cliente:${asString(cliente.id, '')}`, label: asString(cliente.nome ?? cliente.razao_social ?? cliente.email, 'Cliente') })),
    ], [clientes, clientesComMarca, form.tipo, marcas])

  const accountValue = form.marca_id ? `marca:${form.marca_id}` : form.cliente_id ? `cliente:${form.cliente_id}` : ''

  function setField(key: keyof MetricsForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function setType(value: string) {
    setForm((current) => ({ ...current, tipo: value, cliente_id: '', marca_id: '' }))
  }

  function setAccount(value: string) {
    if (value.startsWith('marca:')) {
      const marcaId = value.slice('marca:'.length)
      const marca = marcas.find((item) => asString(item.id, '') === marcaId)
      setForm((current) => ({ ...current, marca_id: marcaId, cliente_id: asString(marca?.cliente_id, '') }))
      return
    }
    if (value.startsWith('cliente:')) {
      setForm((current) => ({ ...current, marca_id: '', cliente_id: value.slice('cliente:'.length) }))
      return
    }
    setForm((current) => ({ ...current, marca_id: '', cliente_id: '' }))
  }

  function buildEncerrarPayload(): JsonRecord {
    const payload = buildManualLivePayload(form)
    return {
      fat_gerado: payload.fat_gerado,
      qtd_pedidos: payload.qtd_pedidos,
      resumo: payload.resumo,
      manual_gmv: payload.manual_gmv,
      manual_orders: payload.manual_orders,
      manual_views: payload.manual_views,
      manual_likes: payload.manual_likes,
      manual_comments: payload.manual_comments,
      manual_shares: payload.manual_shares,
      manual_diamonds: payload.manual_diamonds,
      apresentadora_id: form.apresentador_id || null,
      encerrado_em: toDatetimeLocal(form.data, form.hora_fim),
      origem_dados: form.origem_dados,
      status_publicacao: form.status_publicacao,
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === 'edit' && live && onUpdateLive) {
      onUpdateLive(asString(live.id, ''), buildManualLivePayload(form))
      return
    }
    if (mode === 'result' && agendaEvent?.live_id && onCloseLive) {
      onCloseLive(asString(agendaEvent.live_id, ''), buildEncerrarPayload())
      return
    }
    if (mode === 'result') {
      onCreateResultFromAgenda?.(buildManualLivePayload(form))
      return
    }
    onCreateManual(buildManualLivePayload(form))
  }

  const title = mode === 'edit' ? 'Editar live realizada' : mode === 'result' ? 'Registrar resultado' : 'Cadastrar live manual'
  const submitLabel = mode === 'edit' ? 'Salvar live' : mode === 'result' ? 'Registrar resultado' : 'Cadastrar live'
  const accountRequired = form.tipo !== 'teste'

  return (
    <Modal open={open} title={title} subtitle="Registro operacional da live, GMV, pedidos e métricas finais." onClose={onClose} size="lg">
      <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Cabine</span>
          <select className="design-input mt-2 h-11 w-full px-4" value={form.cabine_id} onChange={(event) => setField('cabine_id', event.target.value)} required>
            <option value="">Selecione uma cabine</option>
            {cabines.map((cabine) => <option key={cabine.id} value={cabine.id}>Cabine {asString(cabine.numero)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Tipo</span>
          <select className="design-input mt-2 h-11 w-full px-4" value={form.tipo} onChange={(event) => setType(event.target.value)}>
            <option value="cliente">Cliente/e-commerce</option>
            <option value="afiliado">Afiliada</option>
            <option value="teste">Interna/teste</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Marca/cliente</span>
          <select className="design-input mt-2 h-11 w-full px-4" value={accountValue} onChange={(event) => setAccount(event.target.value)} required={accountRequired}>
            <option value="">{form.tipo === 'afiliado' ? 'Selecione uma afiliada' : 'Selecione uma marca ou cliente'}</option>
            {accountOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <PresenterSelect
          rows={apresentadoras}
          value={form.apresentador_id}
          onChange={(value) => setField('apresentador_id', value)}
          placeholder="Sem apresentadora definida"
        />
        <label className="block">
          <span className="text-sm font-semibold text-ink">Data</span>
          <input className="design-input mt-2 h-11 w-full px-3" type="date" value={form.data} onChange={(event) => setField('data', event.target.value)} required />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Início</span>
            <input className="design-input mt-2 h-11 w-full px-3" type="time" value={form.hora_inicio} onChange={(event) => setField('hora_inicio', event.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Fim</span>
            <input className="design-input mt-2 h-11 w-full px-3" type="time" value={form.hora_fim} onChange={(event) => setField('hora_fim', event.target.value)} required />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-semibold text-ink">GMV</span>
          <MoneyInput className="design-input mt-2 h-11 w-full px-4" value={form.fat_gerado} onChange={(raw) => setField('fat_gerado', raw)} required />
        </label>
        {[
          ['qtd_pedidos', 'Pedidos'],
          ['manual_views', 'Viewers'],
          ['manual_likes', 'Likes'],
          ['manual_comments', 'Comentários'],
          ['manual_shares', 'Shares'],
          ['manual_diamonds', 'Diamonds'],
        ].map(([key, label]) => (
          <label className="block" key={key}>
            <span className="text-sm font-semibold text-ink">{label}</span>
            <input
              className="design-input mt-2 h-11 w-full px-4"
              type="text"
              inputMode="numeric"
              pattern="[0-9.,]*"
              value={asString(form[key as keyof MetricsForm], '')}
              onChange={(event) => setField(key as keyof MetricsForm, event.target.value)}
              required={key === 'qtd_pedidos'}
            />
          </label>
        ))}
        <label className="block">
          <span className="text-sm font-semibold text-ink">Origem dos dados</span>
          <select className="design-input mt-2 h-11 w-full px-4" value={form.origem_dados} onChange={(event) => setField('origem_dados', event.target.value)}>
            <option value="manual">Manual</option>
            <option value="api">API TikTok</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Status de publicação</span>
          <select className="design-input mt-2 h-11 w-full px-4" value={form.status_publicacao} onChange={(event) => setField('status_publicacao', event.target.value)}>
            <option value="rascunho">Rascunho</option>
            <option value="revisado">Revisado</option>
            <option value="publicado">Publicado</option>
          </select>
        </label>
        <label className="block md:col-span-2 xl:col-span-3">
          <span className="text-sm font-semibold text-ink">Observações</span>
          <textarea className="design-input mt-2 min-h-24 w-full px-4 py-3" value={form.resumo} onChange={(event) => setField('resumo', event.target.value)} />
        </label>
        {error ? (
          <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] md:col-span-2 xl:col-span-3">{extractErrorMessage(error)}</p>
        ) : null}
        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3">
          <Button type="submit" icon={CheckCircle2} isLoading={isSaving}>{submitLabel}</Button>
          <Button type="button" variant="secondary" disabled={isSaving} onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  )
}
