import { CheckCircle2, PlayCircle, Plus, Trash2 } from 'lucide-react'
import { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { UnsavedChangesNotice } from '../ui/UnsavedChangesNotice'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import { ModalSection } from '../ui/ModalSection'
import { PresenterSelect } from './PresenterSelect'
import { useToast } from '../ui/Toast'
import { extractErrorMessage } from '../../services/api'
import { getAgendaConflitos, putAgendaTurnos } from '../../services/domain'
import { asArray, asNumber, asString } from '../../utils/format'
import { presenterProfileId } from '../../utils/presenters'
import { getSaoPauloDateInput } from '../../utils/sao-paulo-date'
import type { AgendaTurno, Cabine, JsonRecord } from '../../types/models'

export type AgendarLiveModalMode = 'create' | 'edit' | 'now'

/** Uma linha do revezamento: quem apresenta, de que hora a que hora no dia do evento. */
export type TurnoForm = {
  apresentadora_id: string
  hora_inicio: string
  hora_fim: string
}

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
  turnos: TurnoForm[]
}

/** Chaves de texto do form — `turnos` é lista e tem setters próprios. */
type AgendaFormTextKey = Exclude<keyof AgendaForm, 'turnos'>

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
  // `partial`: a cabine foi conferida mas os turnos não — /agenda/conflitos só
  // enxerga a apresentadora escalar do evento, não a tabela de turnos.
  status: 'idle' | 'checking' | 'available' | 'partial' | 'conflict' | 'error'
  message: string
}

/** Falha ao gravar os turnos DEPOIS do evento já ter sido salvo. */
type TurnoFalha = {
  eventoId: string
  mensagem: string
  /** Só quando o evento acabou de nascer e o back não tem a rota: dá pra desfazer. */
  podeExcluir: boolean
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
  turnos: [],
}

function today() {
  return getSaoPauloDateInput()
}

function minutosDoDia(hora: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hora ?? '')
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function horaDeMinutos(minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Divide a janela do evento ao meio — o padrão útil do revezamento ("Ana 14-16,
 * Bia 16-18"). Janela curta demais devolve o fim nos dois pontos e a validação
 * cobra o ajuste, em vez de inventar horário.
 */
export function dividirJanela(horaInicio: string, horaFim: string): [string, string, string] {
  const inicio = minutosDoDia(horaInicio)
  const fim = minutosDoDia(horaFim)
  if (inicio === null || fim === null || fim - inicio < 2) return [horaInicio, horaFim, horaFim]
  return [horaInicio, horaDeMinutos(Math.floor((inicio + fim) / 2)), horaFim]
}

/** Devolve a primeira mensagem de erro do revezamento, ou null se está tudo certo. */
export function validarTurnos(turnos: TurnoForm[], janela: { hora_inicio: string; hora_fim: string }): string | null {
  if (turnos.length === 0) return null
  const inicioEvento = minutosDoDia(janela.hora_inicio)
  const fimEvento = minutosDoDia(janela.hora_fim)
  const vistos = new Set<string>()
  for (const turno of turnos) {
    if (!turno.apresentadora_id) return 'Escolha a apresentadora de cada turno do revezamento.'
    const inicio = minutosDoDia(turno.hora_inicio)
    const fim = minutosDoDia(turno.hora_fim)
    if (inicio === null || fim === null) return 'Preencha início e fim de cada turno.'
    if (fim <= inicio) return 'Cada turno precisa terminar depois de começar.'
    if (inicioEvento === null || fimEvento === null || inicio < inicioEvento || fim > fimEvento) {
      return `Turno fora da janela do evento (${janela.hora_inicio}–${janela.hora_fim}).`
    }
    // Mesmo par (pessoa, início) é o que o UNIQUE da tabela recusa — pegar aqui
    // evita transformar um 400 do backend em erro sem explicação.
    const chave = `${turno.apresentadora_id}|${turno.hora_inicio}`
    if (vistos.has(chave)) return 'Turno repetido para a mesma apresentadora.'
    vistos.add(chave)
  }
  return null
}

/**
 * Turnos do form prontos para o backend, cada um carregando o índice da LINHA
 * que o originou. O índice é o que faz o aviso de conflito aparecer embaixo do
 * turno certo: linha em branco é descartada e o payload vai ordenado por
 * horário, então casar o resultado por posição apontaria para a linha errada.
 */
export function turnosParaChecagem(form: { data: string; turnos: TurnoForm[] }): { index: number; turno: AgendaTurno }[] {
  return form.turnos
    .map((turno, index) => ({ index, turno }))
    .filter(({ turno }) => turno.apresentadora_id && turno.hora_inicio && turno.hora_fim)
    .map(({ index, turno }) => ({
      index,
      turno: {
        apresentadora_id: turno.apresentadora_id,
        data_inicio: makeDateTime(form.data, turno.hora_inicio),
        data_fim: makeDateTime(form.data, turno.hora_fim),
      },
    }))
}

/** Turnos do form → payload do PUT, em ISO com offset de São Paulo e ordenado. */
export function montarPayloadTurnos(form: { data: string; turnos: TurnoForm[] }): AgendaTurno[] {
  return turnosParaChecagem(form)
    .map((item) => item.turno)
    // Mesma data e mesmo offset em todas as linhas: comparar string ordena certo.
    .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))
}

/** Avisos de conflito ancorados na linha do form que os gerou (vazio = sem aviso). */
export function avisosPorLinha(totalLinhas: number, entradas: { index: number; mensagem: string }[]): string[] {
  const avisos = new Array<string>(Math.max(0, totalLinhas)).fill('')
  for (const { index, mensagem } of entradas) {
    if (index >= 0 && index < avisos.length) avisos[index] = mensagem
  }
  return avisos
}

/**
 * Quem vira o espelho `agenda_eventos.apresentadora_id`: maior tempo somado;
 * empate → quem começa antes; empate → menor uuid. É a MESMA regra do backend
 * (src/lib/agenda-turnos.js) — se o PUT dos turnos falhar, o evento ainda
 * aponta para a apresentadora certa em vez de ficar sem ninguém.
 */
export function principalDosTurnos(turnos: AgendaTurno[]): string {
  const porPessoa = new Map<string, { id: string; segundos: number; inicio: number }>()
  for (const turno of turnos) {
    const inicio = new Date(turno.data_inicio).getTime()
    const fim = new Date(turno.data_fim).getTime()
    if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim <= inicio) continue
    const atual = porPessoa.get(turno.apresentadora_id) ?? { id: turno.apresentadora_id, segundos: 0, inicio }
    porPessoa.set(turno.apresentadora_id, {
      id: atual.id,
      segundos: atual.segundos + Math.round((fim - inicio) / 1000),
      inicio: Math.min(atual.inicio, inicio),
    })
  }
  let principal: { id: string; segundos: number; inicio: number } | null = null
  for (const pessoa of porPessoa.values()) {
    if (!principal
      || pessoa.segundos > principal.segundos
      || (pessoa.segundos === principal.segundos && pessoa.inicio < principal.inicio)
      || (pessoa.segundos === principal.segundos && pessoa.inicio === principal.inicio && pessoa.id < principal.id)) {
      principal = pessoa
    }
  }
  return principal?.id ?? ''
}

/**
 * Distingue o 404 de ROTA (back antigo, sem a sub-rota de turnos) do 404 do
 * próprio handler ("Evento não encontrado"). O Fastify sem notFoundHandler
 * devolve {"message":"Route PUT:/v1/agenda/... not found"}; os 404 do handler
 * mandam só `error`. Sem essa distinção o operador não saberia se o problema é
 * o deploy ou o dado.
 */
export function backSemRevezamento(error: unknown): boolean {
  const resposta = (error as { response?: { status?: number; data?: unknown } } | null)?.response
  if (resposta?.status !== 404) return false
  const mensagem = (resposta.data as { message?: unknown } | undefined)?.message
  return typeof mensagem === 'string' && /^Route\s.+not found$/i.test(mensagem)
}

/**
 * Id do evento recém-criado. POST /v1/agenda responde `{ evento, recorrentes }`
 * (agenda.js), mas um chamador pode devolver o evento cru — aceita as duas formas.
 */
export function idDoEventoCriado(resposta: JsonRecord | null): string {
  if (!resposta) return ''
  const evento = resposta.evento as JsonRecord | undefined
  return asString(evento?.id ?? resposta.id, '')
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return typeof (value as { then?: unknown } | null | undefined)?.then === 'function'
}

/**
 * A live desta reserva já nasceu? O rateio (live_apresentadoras_v2) é semeado
 * UMA vez, na abertura da live — depois disso mexer nos turnos da agenda não
 * move mais um centavo. Vale para `ao_vivo` e para qualquer evento que já
 * tenha `live_id`, inclusive o já concluído.
 */
export function liveJaFoiAberta(event: JsonRecord | null | undefined): boolean {
  if (!event) return false
  return asString(event.status, '') === 'ao_vivo' || Boolean(asString(event.live_id, ''))
}

export const AVISO_LIVE_ABERTA = 'A live desta reserva já foi aberta: o rateio dela já está gravado e mudar os turnos aqui NÃO muda quem recebe. Ajuste em "Dividir entre apresentadoras", na aba Lives.'

export const AVISO_TURNOS_SEM_SERIE = 'O revezamento é gravado só nesta ocorrência — o backend não replica turnos na série. Para os outros dias, edite cada ocorrência.'

export const ERRO_CHAMADOR_SEM_PROMISE = 'O evento foi salvo, mas esta tela não consegue gravar o revezamento (o salvamento não devolveu o evento). Abra o evento pela Grade e configure os turnos por lá.'

/**
 * O PATCH com `modo_recorrencia` diferente de `apenas_este` espalha os campos do
 * evento pela série inteira, mas os TURNOS vão numa sub-rota que só atinge o id
 * editado. Deixar as duas coisas juntas grava o revezamento em uma ocorrência e
 * o espelho escalar em todas — as outras abrem a live com 100% para a principal.
 * Havendo turnos em jogo, a alteração fica presa nesta ocorrência.
 */
export function modoRecorrenciaSeguro(modo: string, temTurnos: boolean): string {
  return temTurnos ? 'apenas_este' : modo
}

/** Primeiro conflito de uma resposta de /agenda/conflitos, ou null se está livre. */
function primeiroConflito(result: JsonRecord | null): { entidade: string; periodo: string } | null {
  if (!result) return null
  const conflitos = Array.isArray(result.conflitos) ? result.conflitos : []
  const total = asNumber(result.total ?? result.total_conflitos ?? conflitos.length)
  if (total <= 0) return null
  const first = conflitos[0] as JsonRecord | undefined
  const start = asString(first?.data_inicio ?? first?.inicio, '')
  const end = asString(first?.data_fim ?? first?.fim, '')
  return {
    entidade: asString(first?.entidade ?? first?.tipo, 'cabine/apresentadora'),
    periodo: start && end ? ` (${toTimeInput(start)}-${toTimeInput(end)})` : '',
  }
}

/** Turnos que vieram do GET /v1/agenda → linhas do form. */
function turnosDoEvento(event: JsonRecord | null | undefined): TurnoForm[] {
  return asArray<JsonRecord>(event?.apresentadoras)
    .map((turno) => ({
      apresentadora_id: asString(turno.apresentadora_id, ''),
      hora_inicio: toTimeInput(turno.data_inicio),
      hora_fim: toTimeInput(turno.data_fim),
    }))
    .filter((turno) => turno.apresentadora_id)
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
  defaultHoraInicio,
  defaultHoraFim,
  defaultMarcaId,
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
  defaultHoraInicio?: string
  defaultHoraFim?: string
  defaultMarcaId?: string
  cabines: Cabine[]
  marcas: JsonRecord[]
  clientes: JsonRecord[]
  apresentadoras: JsonRecord[]
  isSaving?: boolean
  error?: unknown
  onClose: () => void
  // Promise OBRIGATÓRIA (mutateAsync): é ela que habilita o segundo passo do
  // revezamento — o modal precisa do id do evento criado pra chamar
  // PUT .../apresentadoras. A assinatura antiga aceitava `void` (mutate), e aí
  // o revezamento era descartado em silêncio, com toast de sucesso.
  onCreate?: (payload: JsonRecord) => Promise<JsonRecord | null | undefined | void>
  onUpdate?: (id: string, payload: JsonRecord) => Promise<unknown>
  onStartNow?: (payload: JsonRecord) => void
  onDelete?: (id: string, modoRecorrencia: string) => void
}) {
  const toast = useToast()
  const [form, setForm] = useState<AgendaForm>(emptyForm)
  const initialFormRef = useRef<AgendaForm>(emptyForm)
  const [accountLookup, setAccountLookup] = useState('')
  const [cabineLookup, setCabineLookup] = useState('')
  const [availability, setAvailability] = useState<AvailabilityState>({ status: 'idle', message: '' })
  const [turnoAvisos, setTurnoAvisos] = useState<string[]>([])
  const [turnoFalha, setTurnoFalha] = useState<TurnoFalha | null>(null)
  const [gravandoTurnos, setGravandoTurnos] = useState(false)

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
  const eventoTemTurnos = asArray<JsonRecord>(event?.apresentadoras).length > 0
  const rateioJaGerado = mode === 'edit' && liveJaFoiAberta(event)

  // Apresentadora desativada (soft-delete) sai da lista de opções. Sem a linha
  // sintética abaixo o select não a acharia e o replace-all apagaria o turno
  // dela em silêncio ao salvar.
  const apresentadorasComTurnos = useMemo(() => {
    const conhecidas = new Set(apresentadoras.map((row) => presenterProfileId(row)).filter(Boolean))
    const faltantes = asArray<JsonRecord>(event?.apresentadoras)
      .filter((turno) => {
        const id = asString(turno.apresentadora_id, '')
        return Boolean(id) && !conhecidas.has(id)
      })
      .map((turno) => ({
        id: asString(turno.apresentadora_id, ''),
        nome: asString(turno.apresentadora_nome, 'Apresentadora'),
      }))
    return faltantes.length > 0 ? [...apresentadoras, ...faltantes] : apresentadoras
  }, [apresentadoras, event])

  // useRef rastreia se form já foi inicializado pra esta abertura do modal.
  // Antes: useEffect com deps [accountOptions, cabineOptions, ...] resetava
  // form sempre que React Query refetchOnWindowFocus disparava (iOS clock
  // picker dispara focus). Resultado: horário escolhido voltava pra 09:00/10:00.
  // Agora: form só inicializa quando open vira true; deps subsequentes não
  // tocam form, só atualizam lookups (efeito separado abaixo).
  const initializedRef = useRef(false)

  // Id do evento que ESTA abertura do modal já criou. Existe só entre o POST que
  // deu certo e o PUT dos turnos que falhou: sem ele, clicar "Agendar" de novo
  // criava um SEGUNDO evento na mesma cabine/horário, o primeiro sem turnos.
  const eventoCriadoRef = useRef('')

  useEffect(() => {
    if (!open) {
      initializedRef.current = false
      eventoCriadoRef.current = ''
      return
    }
    if (initializedRef.current) return
    initializedRef.current = true
    setTurnoFalha(null)
    setTurnoAvisos([])
    // O banner de disponibilidade é do slot anterior enquanto o debounce não
    // roda: sem este reset o operador lê "conflito de cabine" de outro horário.
    setAvailability({ status: 'idle', message: '' })

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
        turnos: turnosDoEvento(event),
      }
      initialFormRef.current = nextForm
      setForm(nextForm)
      setAccountLookup(optionLabel(accountOptions, nextForm.marca_id ? `marca:${nextForm.marca_id}` : nextForm.cliente_id ? `cliente:${nextForm.cliente_id}` : ''))
      setCabineLookup(optionLabel(cabineOptions, nextForm.cabine_id))
      return
    }

    const now = new Date()
    // defaultMarcaId vem da célula da Grade: o slot já sabe qual marca ocupa
    // aquele horário, então o operador não redigita a conta.
    const marcaPadrao = defaultMarcaId ? marcas.find((item) => asString(item.id, '') === defaultMarcaId) : undefined
    const nextForm = {
      ...emptyForm,
      cabine_id: defaultCabineId ?? '',
      marca_id: marcaPadrao ? asString(marcaPadrao.id, '') : '',
      cliente_id: asString(marcaPadrao?.cliente_id, ''),
      live_tipo: marcaPadrao ? liveTypeFromMarca(marcaPadrao) : emptyForm.live_tipo,
      data: defaultDate || today(),
      hora_inicio: mode === 'now' ? toTimeInput(now) : defaultHoraInicio || '09:00',
      hora_fim: mode === 'now' ? dateWithHourOffset(4) : defaultHoraFim || '10:00',
      status: mode === 'now' ? 'confirmado' : 'planejado',
    }
    initialFormRef.current = nextForm
    setForm(nextForm)
    setAccountLookup(marcaPadrao ? optionLabel(accountOptions, `marca:${asString(marcaPadrao.id, '')}`) : '')
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
    const checagens = turnosParaChecagem({ data: form.data, turnos: form.turnos })
    if (!open || (!form.cabine_id && !form.apresentadora_id && checagens.length === 0) || !form.data || !form.hora_inicio || !form.hora_fim) {
      setAvailability({ status: 'idle', message: '' })
      setTurnoAvisos([])
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
      // Com revezamento a checagem vira N+1 chamadas: a cabine responde pela
      // janela inteira e cada apresentadora só pela SUA faixa — perguntar pela
      // janela inteira acusaria conflito falso em quem sai no meio.
      // getAgendaConflitos não muda de assinatura.
      const cabineCheck = form.cabine_id
        ? getAgendaConflitos({
          cabineId: form.cabine_id,
          apresentadoraId: checagens.length === 0 ? form.apresentadora_id || undefined : undefined,
          dataInicio,
          dataFim,
          excludeId: editingEventId || undefined,
        })
        : Promise.resolve<JsonRecord | null>(null)
      const turnoChecks = checagens.map(({ turno }) => getAgendaConflitos({
        apresentadoraId: turno.apresentadora_id,
        dataInicio: turno.data_inicio,
        dataFim: turno.data_fim,
        excludeId: editingEventId || undefined,
      }))

      Promise.all([cabineCheck, Promise.all(turnoChecks)])
        .then(([cabine, porTurno]) => {
          if (cancelled) return
          // Cada resultado volta ancorado no índice da linha que o pediu — o
          // payload é filtrado e reordenado, então posição não serve de âncora.
          const avisos = avisosPorLinha(form.turnos.length, porTurno.map((resultado, i) => {
            const conflito = primeiroConflito(resultado)
            return {
              index: checagens[i].index,
              mensagem: conflito ? `Apresentadora já ocupada${conflito.periodo}.` : '',
            }
          }))
          setTurnoAvisos(avisos)

          const conflitoCabine = primeiroConflito(cabine)
          if (conflitoCabine) {
            setAvailability({ status: 'conflict', message: `Existe conflito de ${conflitoCabine.entidade}${conflitoCabine.periodo}. Escolha outro horário.` })
            return
          }
          if (avisos.some(Boolean)) {
            setAvailability({ status: 'conflict', message: 'Há conflito em pelo menos um turno do revezamento. Ajuste os horários abaixo.' })
            return
          }
          if (checagens.length > 0) {
            // /agenda/conflitos só enxerga a apresentadora escalar do evento —
            // turno de OUTRO evento não aparece aqui. Prometer "disponível"
            // seria mentira; quem confere de verdade é o PUT ao salvar.
            setAvailability({ status: 'partial', message: 'Cabine livre no período. Não foi possível verificar cada turno contra outros revezamentos — o backend confere ao salvar.' })
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
  }, [editingEventId, form.apresentadora_id, form.cabine_id, form.data, form.hora_fim, form.hora_inicio, form.turnos, open])

  function setField(key: AgendaFormTextKey, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function ativarRevezamento() {
    setForm((current) => {
      const [inicio, meio, fim] = dividirJanela(current.hora_inicio, current.hora_fim)
      return {
        ...current,
        turnos: [
          { apresentadora_id: current.apresentadora_id, hora_inicio: inicio, hora_fim: meio },
          { apresentadora_id: '', hora_inicio: meio, hora_fim: fim },
        ],
      }
    })
  }

  function desativarRevezamento() {
    // A primeira apresentadora sobe para o campo escalar — sair do revezamento
    // não pode deixar o evento sem ninguém.
    setForm((current) => ({
      ...current,
      apresentadora_id: current.apresentadora_id || current.turnos[0]?.apresentadora_id || '',
      turnos: [],
    }))
    setTurnoAvisos([])
  }

  function adicionarTurno() {
    setForm((current) => {
      const ultimo = current.turnos[current.turnos.length - 1]
      const inicio = ultimo?.hora_fim || current.hora_inicio
      return {
        ...current,
        turnos: [...current.turnos, { apresentadora_id: '', hora_inicio: inicio, hora_fim: current.hora_fim }],
      }
    })
  }

  function atualizarTurno(index: number, patch: Partial<TurnoForm>) {
    setForm((current) => ({
      ...current,
      turnos: current.turnos.map((turno, i) => (i === index ? { ...turno, ...patch } : turno)),
    }))
  }

  function removerTurno(index: number) {
    setForm((current) => ({ ...current, turnos: current.turnos.filter((_, i) => i !== index) }))
    setTurnoAvisos((current) => current.filter((_, i) => i !== index))
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

  /**
   * Segundo passo do salvamento: o evento já existe, agora vão os turnos.
   * Nunca deixa o operador achar que gravou: falhou, o modal fica aberto com o
   * motivo e — quando o evento nasceu agora e o back nem tem a rota — o botão
   * de desfazer.
   */
  async function aplicarTurnos(eventoId: string, turnos: AgendaTurno[], criadoAgora: boolean) {
    setGravandoTurnos(true)
    try {
      await putAgendaTurnos(eventoId, turnos)
      onClose()
    } catch (err) {
      const semRota = backSemRevezamento(err)
      const mensagem = semRota
        ? 'Seu backend ainda não suporta revezamento — o evento foi salvo só com a apresentadora principal.'
        : `Os turnos não foram salvos: ${extractErrorMessage(err)}`
      toast.push(mensagem, 'error')
      setTurnoFalha({ eventoId, mensagem, podeExcluir: criadoAgora && semRota })
    } finally {
      setGravandoTurnos(false)
    }
  }

  async function onSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    setTurnoFalha(null)
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
    const erroTurnos = validarTurnos(form.turnos, { hora_inicio: form.hora_inicio, hora_fim: form.hora_fim })
    if (erroTurnos) {
      setAvailability({ status: 'conflict', message: erroTurnos })
      return
    }
    const turnos = montarPayloadTurnos({ data: form.data, turnos: form.turnos })
    // Há o que gravar OU o que desfazer na sub-rota de turnos.
    const precisaGravarTurnos = mode === 'edit' ? turnos.length > 0 || eventoTemTurnos : turnos.length >= 2
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
      // Com revezamento o escalar vira espelho da principal, pela mesma regra do
      // backend. Sem turnos, o payload é byte a byte o de sempre.
      apresentadora_id: (turnos.length > 0 ? principalDosTurnos(turnos) : form.apresentadora_id) || null,
      data_inicio: dataInicio,
      data_fim: dataFim,
      status: form.status,
      responsavel_marketing: form.responsavel_marketing || null,
      observacoes: form.observacoes || null,
      ...(recorrencia && mode === 'create' ? { recorrencia } : {}),
      // Turno em jogo prende a alteração nesta ocorrência: o PATCH espalha pela
      // série, o PUT dos turnos não. Ver modoRecorrenciaSeguro.
      ...(mode === 'edit' ? { modo_recorrencia: modoRecorrenciaSeguro(form.modo_recorrencia, precisaGravarTurnos) } : {}),
    }

    if (mode === 'edit' && event) {
      const id = asString(event.id, '')
      const sucesso = `Agendamento atualizado — ${cabineNumero}${contaNome ? ` · ${contaNome}` : ''} em ${formattedDate}`
      const resultado = onUpdate?.(id, payload)
      if (!isPromiseLike(resultado)) {
        // Chamador sem Promise não deixa o segundo passo acontecer. Havendo
        // turnos, isso é perda de dado — falha alto em vez de mentir sucesso.
        if (precisaGravarTurnos) {
          toast.push(ERRO_CHAMADOR_SEM_PROMISE, 'error')
          setTurnoFalha({ eventoId: id, mensagem: ERRO_CHAMADOR_SEM_PROMISE, podeExcluir: false })
          return
        }
        toast.push(sucesso, 'success')
        return
      }
      try {
        await resultado
      } catch {
        return // o erro chega pela prop `error`; o modal fica aberto
      }
      // Rateio já semeado: o toast não pode sugerir que a troca de turno mudou
      // quem recebe. Ver AVISO_LIVE_ABERTA.
      const rateioCongelado = rateioJaGerado && precisaGravarTurnos
      toast.push(rateioCongelado ? `${sucesso}. ${AVISO_LIVE_ABERTA}` : sucesso, rateioCongelado ? 'error' : 'success')
      // Só chama a sub-rota quando há o que gravar OU o que desfazer — assim um
      // evento comum não colide com um back sem a rota de revezamento.
      if (precisaGravarTurnos) await aplicarTurnos(id, turnos, false)
      else onClose()
      return
    }

    const sucesso = `${cabineNumero} reservada${contaNome ? ` para ${contaNome}` : ''} em ${formattedDate}`

    // O POST desta abertura já passou e só o PUT dos turnos falhou: reenviar tem
    // que CONSERTAR o evento existente, nunca criar um segundo na mesma cabine.
    const jaCriado = eventoCriadoRef.current
    if (jaCriado) {
      // Vira PATCH: a série (se houver) já nasceu no POST e o PATCH não a cria
      // de novo — mandar `recorrencia` aqui só confundiria o backend.
      const { recorrencia: _ignorada, ...camposDoEvento } = payload
      const atualizacao = onUpdate?.(jaCriado, { ...camposDoEvento, modo_recorrencia: 'apenas_este' })
      if (isPromiseLike(atualizacao)) {
        try {
          await atualizacao
        } catch {
          return
        }
      }
      if (!precisaGravarTurnos) {
        onClose()
        return
      }
      await aplicarTurnos(jaCriado, turnos, true)
      return
    }

    const resultado = onCreate?.(payload)
    if (!isPromiseLike(resultado)) {
      if (precisaGravarTurnos) {
        toast.push(ERRO_CHAMADOR_SEM_PROMISE, 'error')
        setTurnoFalha({ eventoId: '', mensagem: ERRO_CHAMADOR_SEM_PROMISE, podeExcluir: false })
        return
      }
      toast.push(sucesso, 'success')
      return
    }
    let criado: JsonRecord | null = null
    try {
      criado = ((await resultado) as JsonRecord | null | undefined) ?? null
    } catch {
      return
    }
    toast.push(sucesso, 'success')
    const novoId = idDoEventoCriado(criado)
    // A partir daqui o evento EXISTE — memorizar antes de qualquer return.
    eventoCriadoRef.current = novoId
    // Uma apresentadora só já está coberta pelo campo escalar do evento.
    if (!precisaGravarTurnos) {
      onClose()
      return
    }
    if (!novoId) {
      setTurnoFalha({
        eventoId: '',
        mensagem: 'O evento foi criado, mas o revezamento não pôde ser vinculado (o backend não devolveu o id do evento). Abra o evento e configure os turnos.',
        podeExcluir: false,
      })
      return
    }
    await aplicarTurnos(novoId, turnos, true)
  }

  const title = mode === 'edit' ? 'Editar agendamento' : mode === 'now' ? 'Iniciar live agora' : 'Agendar live'
  const submitLabel = mode === 'edit' ? 'Salvar agendamento' : mode === 'now' ? 'Iniciar live' : 'Agendar live'
  const SubmitIcon = mode === 'now' ? PlayCircle : mode === 'edit' ? CheckCircle2 : Plus
  const accountRequired = form.tipo !== 'bloqueio_manutencao' && (mode !== 'now' || form.live_tipo !== 'teste')
  const accountInvalid = accountRequired && accountLookup.trim().length > 0 && !form.marca_id && !form.cliente_id
  const revezamentoAtivo = form.turnos.length > 0
  // Turno é decisão de evento: o loop de recorrência do backend não devolve os
  // ids das ocorrências, então não há como replicar o revezamento na série.
  const recorrenciaAtiva = form.recorrencia_tipo !== 'nenhuma'
  // Mesmo motivo, do outro lado: na edição o "Aplicar alteração" espalharia só
  // o espelho escalar pela série e deixaria os turnos nesta ocorrência.
  const turnosPresosNestaOcorrencia = mode === 'edit' && (revezamentoAtivo || eventoTemTurnos)
  const salvando = Boolean(isSaving) || gravandoTurnos
  const formId = useId()
  const closeGuard = useUnsavedChanges({ open, dirty: JSON.stringify(form) !== JSON.stringify(initialFormRef.current), busy: salvando, onClose })

  return (
    <Modal
      open={open}
      title={title}
      subtitle={mode === 'now' ? 'Confirme quem entra no ar e em qual cabine.' : 'Organize a operação; os demais detalhes ficam disponíveis abaixo.'}
      size="lg"
      onClose={closeGuard.requestClose}
      closeDisabled={salvando}
      footer={(
        <>
          <UnsavedChangesNotice guard={closeGuard} />
          {error ? <p role="alert" className="w-full rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(error)}</p> : null}
          {turnoFalha ? <p role="alert" className="w-full rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-[var(--danger)]">{turnoFalha.mensagem}</p> : null}
          {mode === 'edit' && event && onDelete ? (
            <Button type="button" variant="danger" icon={Trash2} disabled={salvando} onClick={() => onDelete(asString(event.id, ''), form.modo_recorrencia)}>
              Cancelar evento
            </Button>
          ) : null}
          <Button type="button" variant="secondary" disabled={salvando} onClick={closeGuard.requestClose}>Cancelar</Button>
          <Button type="submit" form={formId} icon={SubmitIcon} isLoading={salvando}>{submitLabel}</Button>
        </>
      )}
    >
      <form id={formId} className="space-y-0" onSubmit={onSubmit}>
        <ModalSection title="Dados da operação" description="Defina a marca, o horário, a cabine e quem apresenta.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Tipo do evento</span>
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
            ) : null}
            {form.tipo !== 'bloqueio_manutencao' ? (
              <label className="block">
                <span className="text-sm font-semibold text-ink">Marca ou cliente</span>
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
            <label className="block">
              <span className="text-sm font-semibold text-ink">Data</span>
              <input className="design-input mt-2 h-11 w-full px-3" type="date" value={form.data} onChange={(item) => setField('data', item.target.value)} required />
            </label>
            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              <label className="block">
                <span className="text-sm font-semibold text-ink">Início</span>
                <input className="design-input mt-2 h-11 w-full px-3" type="time" value={form.hora_inicio} onChange={(item) => setField('hora_inicio', item.target.value)} required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Fim</span>
                <input className="design-input mt-2 h-11 w-full px-3" type="time" value={form.hora_fim} onChange={(item) => setField('hora_fim', item.target.value)} required />
              </label>
            </div>
          </div>
          {availability.status !== 'idle' ? (
            <p
              role={availability.status === 'conflict' || availability.status === 'error' ? 'alert' : 'status'}
              className={[
                'rounded-xl px-4 py-3 text-sm font-medium',
                availability.status === 'available' ? 'bg-[var(--success-soft)] text-[var(--success)]' : '',
                availability.status === 'checking' || availability.status === 'partial' ? 'bg-surface-muted text-ink-muted' : '',
                availability.status === 'conflict' || availability.status === 'error' ? 'bg-[var(--danger-soft)] text-[var(--danger)]' : '',
              ].filter(Boolean).join(' ')}
            >
              {availability.message}
            </p>
          ) : null}
        {revezamentoAtivo ? (
          <div className="rounded-2xl border border-line bg-surface-muted p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">Revezamento de apresentadoras</p>
                <p className="text-xs text-ink-muted">Quem apresenta em cada faixa de horário. O rateio da live nasce daqui.</p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-ink-muted underline underline-offset-2 hover:text-ink"
                onClick={desativarRevezamento}
              >
                Remover revezamento
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {form.turnos.map((turno, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_112px_112px_auto] sm:items-end">
                  <PresenterSelect
                    rows={apresentadorasComTurnos}
                    label={`Turno ${index + 1}`}
                    value={turno.apresentadora_id}
                    onChange={(value) => atualizarTurno(index, { apresentadora_id: value })}
                    placeholder="Selecione uma apresentadora"
                    describedBy={turnoAvisos[index] ? `turno-aviso-${index}` : undefined}
                  />
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Início</span>
                    <input className="design-input mt-2 h-11 w-full px-3" type="time" value={turno.hora_inicio} onChange={(item) => atualizarTurno(index, { hora_inicio: item.target.value })} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Fim</span>
                    <input className="design-input mt-2 h-11 w-full px-3" type="time" value={turno.hora_fim} onChange={(item) => atualizarTurno(index, { hora_fim: item.target.value })} />
                  </label>
                  <button
                    type="button"
                    className="grid h-11 w-11 place-items-center rounded-2xl border border-line text-ink-muted transition hover:bg-surface hover:text-[var(--danger)]"
                    aria-label={`Remover turno ${index + 1}`}
                    onClick={() => removerTurno(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {/* role=alert + aria-describedby: o conflito por turno precisa
                      ser anunciado ao leitor de tela e lido de volta ao focar o
                      select da linha, não só aparecer em vermelho. */}
                  {turnoAvisos[index] ? (
                    <span
                      id={`turno-aviso-${index}`}
                      role="alert"
                      className="text-xs font-semibold text-[var(--danger)] sm:col-span-4"
                    >
                      {turnoAvisos[index]}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-ink transition hover:bg-surface-muted"
              onClick={adicionarTurno}
            >
              <Plus className="h-4 w-4" />
              Adicionar apresentadora
            </button>
            {form.turnos.length < 2 ? (
              <p className="mt-2 text-xs text-ink-muted">
                Com uma apresentadora só o evento é salvo sem revezamento — ela vira a apresentadora do evento.
              </p>
            ) : null}
          </div>
        ) : (
          <div>
            <PresenterSelect
              rows={apresentadorasComTurnos}
              value={form.apresentadora_id}
              onChange={(value) => setField('apresentadora_id', value)}
              required={mode === 'now'}
              placeholder={mode === 'now' ? 'Selecione uma apresentadora' : 'Sem apresentadora definida'}
            />
            {mode !== 'now' ? (
              <>
                <button
                  type="button"
                  className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-ink transition enabled:hover:bg-surface-muted disabled:opacity-50"
                  disabled={recorrenciaAtiva}
                  onClick={ativarRevezamento}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar apresentadora (revezamento)
                </button>
                {recorrenciaAtiva ? (
                  <span className="ml-2 text-xs font-medium text-ink-muted">
                    Revezamento só em evento único — edite cada ocorrência da série.
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        )}
        {/* A live já foi aberta: o rateio dela nasceu no autostart e não olha
            mais para os turnos da agenda. Sem este aviso o operador troca a
            apresentadora aqui, vê "atualizado" e a comissão continua na pessoa
            errada. */}
        {rateioJaGerado ? (
          <p role="alert" className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">
            {AVISO_LIVE_ABERTA}
          </p>
        ) : null}
        </ModalSection>
        <ModalSection title="Detalhes do evento" description="Status, responsável e observações." collapsible defaultOpen={mode === 'edit'}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {mode !== 'now' ? (
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
            ) : null}
          </div>
        {mode !== 'now' ? (
          <label className="block">
            <span className="text-sm font-semibold text-ink">Responsável de marketing</span>
            <input className="design-input mt-2 h-11 w-full px-4" value={form.responsavel_marketing} onChange={(item) => setField('responsavel_marketing', item.target.value)} />
          </label>
        ) : null}
          <label className="block">
            <span className="text-sm font-semibold text-ink">Observações</span>
            <textarea className="design-input mt-2 min-h-24 w-full px-4 py-3" value={form.observacoes} onChange={(item) => setField('observacoes', item.target.value)} />
          </label>
        </ModalSection>
        {mode !== 'now' ? (
          <ModalSection title="Recorrência" description="Use somente para repetir esta reserva." collapsible defaultOpen={recorrenciaAtiva}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-ink">Recorrência</span>
              <select className="design-input mt-2 h-11 w-full px-4" value={form.recorrencia_tipo} onChange={(item) => setRecurrenceType(item.target.value)} disabled={mode === 'edit' || revezamentoAtivo}>
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
        {['semanal', 'quinzenal'].includes(form.recorrencia_tipo) ? (
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
          </ModalSection>
        ) : null}
        {mode === 'edit' ? (
          <ModalSection title="Aplicar alteração" description="Escolha quais eventos da série devem receber esta mudança." collapsible defaultOpen={turnosPresosNestaOcorrencia}>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Aplicar alteração</span>
            <select
              className="design-input mt-2 h-11 w-full px-4"
              value={turnosPresosNestaOcorrencia ? 'apenas_este' : form.modo_recorrencia}
              onChange={(item) => setField('modo_recorrencia', item.target.value)}
              disabled={turnosPresosNestaOcorrencia}
            >
              <option value="apenas_este">Apenas este evento</option>
              <option value="este_e_proximos">Este e próximos</option>
              <option value="todos">Toda a série</option>
            </select>
            {turnosPresosNestaOcorrencia ? (
              <span className="mt-1 block text-xs font-medium text-ink-muted">{AVISO_TURNOS_SEM_SERIE}</span>
            ) : null}
          </label>
          </ModalSection>
        ) : null}
        {turnoFalha ? (
          <div className="space-y-2 rounded-2xl bg-[var(--danger-soft)] px-4 py-3">
            <p role="alert" className="text-sm font-medium text-[var(--danger)]">{turnoFalha.mensagem}</p>
            {turnoFalha.podeExcluir && onDelete ? (
              <Button
                type="button"
                variant="danger"
                icon={Trash2}
                disabled={salvando}
                onClick={() => { onDelete(turnoFalha.eventoId, 'apenas_este'); setTurnoFalha(null) }}
              >
                Excluir o evento recém-criado
              </Button>
            ) : null}
          </div>
        ) : null}
      </form>
    </Modal>
  )
}
