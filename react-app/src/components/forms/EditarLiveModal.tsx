import { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { UnsavedChangesNotice } from '../ui/UnsavedChangesNotice'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import { ModalSection } from '../ui/ModalSection'
import { MoneyInput } from '../ui/MoneyInput'
import { extractErrorMessage } from '../../services/api'
import {
  getCabines,
  getClientes,
  getMarcas,
  updateLive,
} from '../../services/domain'
import { asArray, asNumber, asString, formatPercent } from '../../utils/format'
import { officialLiveGmvRaw } from '../../utils/live-gmv'
import { QK, invalidateOperational } from '../../services/query-keys'
import type { JsonRecord } from '../../types/models'

type LookupOption = { value: string; label: string }

type EditForm = {
  cabine_id: string
  cliente_id: string
  marca_id: string
  gestor_id: string
  agenda_evento_id: string
  status: string
  tipo: string
  status_publicacao: string
  origem_dados: string
  data: string
  hora_inicio: string
  hora_fim: string
  fat_gerado: string
  manual_gmv: string
  qtd_pedidos: string
  manual_orders: string
  manual_views: string
  manual_likes: string
  manual_comments: string
  manual_shares: string
  manual_diamonds: string
  ads_cost: string
  live_impressions: string
  product_impressions: string
  product_clicks: string
  avg_viewing_duration: string
  new_followers: string
  resumo: string
}

const emptyForm: EditForm = {
  cabine_id: '',
  cliente_id: '',
  marca_id: '',
  gestor_id: '',
  agenda_evento_id: '',
  status: '',
  tipo: '',
  status_publicacao: '',
  origem_dados: '',
  data: '',
  hora_inicio: '',
  hora_fim: '',
  fat_gerado: '',
  manual_gmv: '',
  qtd_pedidos: '',
  manual_orders: '',
  manual_views: '',
  manual_likes: '',
  manual_comments: '',
  manual_shares: '',
  manual_diamonds: '',
  ads_cost: '',
  live_impressions: '',
  product_impressions: '',
  product_clicks: '',
  avg_viewing_duration: '',
  new_followers: '',
  resumo: '',
}

export type LiveAccountOption = { value: string; label: string }

export function liveAccountOptions(marcas: JsonRecord[], clientes: JsonRecord[]): LiveAccountOption[] {
  const clientesComMarca = new Set(marcas.map((marca) => asString(marca.cliente_id, '')).filter(Boolean))
  return [
    ...marcas.map((marca) => ({ value: `marca:${asString(marca.id, '')}`, label: `Marca · ${asString(marca.nome ?? marca.cliente_nome, 'Marca')}` })),
    ...clientes
      .filter((cliente) => !clientesComMarca.has(asString(cliente.id, '')))
      .map((cliente) => ({ value: `cliente:${asString(cliente.id, '')}`, label: `Cliente · ${asString(cliente.nome ?? cliente.razao_social ?? cliente.email, 'Cliente')}` })),
  ].filter((option) => option.value !== 'marca:' && option.value !== 'cliente:')
}

export function liveAccountSelection(value: string, marcas: JsonRecord[]): { marca_id: string; cliente_id: string } | null {
  if (value === '') return { marca_id: '', cliente_id: '' }
  if (value.startsWith('marca:')) {
    const marcaId = value.slice('marca:'.length)
    const marca = marcas.find((item) => asString(item.id, '') === marcaId)
    return marca ? { marca_id: marcaId, cliente_id: asString(marca.cliente_id, '') } : null
  }
  if (value.startsWith('cliente:')) return { marca_id: '', cliente_id: value.slice('cliente:'.length) }
  return null
}

/**
 * Distingue rateio PLANEJADO de rateio confirmado, sem campo novo no backend.
 * Assinatura do plano: mais de uma apresentadora e nenhuma com GMV rateado —
 * o seed dos turnos da agenda grava percentual e deixa gmv_rateado NULL de
 * propósito. Quando alguém confirma o rateio real, gmv deixa de ser null.
 * Devolve o resumo "Ana 25,0% · Bia 75,0%", ou null se o rateio já é real.
 */
export function resumoRateioPlanejado(live: JsonRecord): string | null {
  const rows = asArray<JsonRecord>(live.apresentadoras)
  if (rows.length <= 1) return null
  if (!rows.every((row) => row.gmv == null)) return null
  return rows
    .map((row) => {
      const nome = presenterDisplayName(row)
      return row.percentual == null ? nome : `${nome} ${formatPercent(row.percentual)}`
    })
    .join(' · ')
}

/** A resposta completa usa `nome`; listas e dados antigos podem trazer os aliases abaixo. */
export function presenterDisplayName(row: JsonRecord): string {
  return asString(row.nome ?? row.apresentadora_nome ?? row.apresentador_nome, 'Apresentadora')
}

export function hasUnsavedLiveChanges<T extends object>(form: T, prefill: T): boolean {
  return (Object.keys(form) as Array<keyof T>).some((key) => form[key] !== prefill[key])
}

function toLookupOptions(rows: JsonRecord[], labelKey = 'nome'): LookupOption[] {
  return rows
    .map((r) => ({ value: asString(r.id), label: asString(r[labelKey] ?? r.nome ?? r.email, '—') }))
    .filter((o) => o.value)
}

function toDateInput(value: unknown): string {
  if (!value) return ''
  const d = new Date(asString(value))
  if (Number.isNaN(d.getTime())) return ''
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 10)
}

function toTimeInput(value: unknown): string {
  if (!value) return ''
  const d = new Date(asString(value))
  if (Number.isNaN(d.getTime())) return ''
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(11, 16)
}


type Props = {
  open: boolean
  onClose: () => void
  live: JsonRecord | null
  onSaved?: () => void
  /**
   * Abre "Dividir entre apresentadoras" para esta live. Sem isto, a tela cobrava a ação
   * ("altere em Dividir entre apresentadoras") sem oferecer caminho nenhum até ela: o
   * operador tinha que fechar a edição e reencontrar o botão no modal anterior, que também
   * mostra o relatório para copiar — daí a impressão de que ratear é coisa de compartilhar.
   */
  onDividir?: (live: JsonRecord) => void
}

const CAMPOS_NUMERICOS: Array<[keyof EditForm, string]> = [
  ['fat_gerado', 'fat_gerado'],
  ['manual_gmv', 'manual_gmv'],
  ['qtd_pedidos', 'qtd_pedidos'],
  ['manual_orders', 'manual_orders'],
  ['manual_views', 'manual_views'],
  ['manual_likes', 'manual_likes'],
  ['manual_comments', 'manual_comments'],
  ['manual_shares', 'manual_shares'],
  ['manual_diamonds', 'manual_diamonds'],
  ['ads_cost', 'ads_cost'],
  ['live_impressions', 'live_impressions'],
  ['product_impressions', 'product_impressions'],
  ['product_clicks', 'product_clicks'],
  ['avg_viewing_duration', 'avg_viewing_duration'],
  ['new_followers', 'new_followers'],
]

const CAMPOS_DINHEIRO = new Set<string>(['fat_gerado', 'manual_gmv', 'ads_cost'])

/**
 * Monta a parte numérica do PATCH, enviando SÓ o que o usuário alterou em relação ao
 * formulário como ele nasceu.
 *
 * Antes o loop mandava todo campo numérico preenchido, tocado ou não. Junto com um prefill
 * vindo de uma cópia envelhecida da linha, isso fazia o save regravar o valor antigo por cima
 * do novo — três lives em produção tiveram o GMV revertido minutos depois de editado
 * (ex.: 1817 → 2419 e, 378s depois, de volta para 1817).
 *
 * Campo vazio segue sendo ignorado (comportamento preservado: não dá para zerar o GMV por
 * aqui — isso é decisão de produto à parte, não regressão introduzida agora).
 */
export function montarCamposNumericos(form: EditForm, prefill: EditForm, temAdsGmv = false): JsonRecord {
  const out: JsonRecord = {}
  for (const [formKey, payloadKey] of CAMPOS_NUMERICOS) {
    const raw = form[formKey]
    if (raw === '') continue
    if (raw === prefill[formKey]) continue
    const value = asNumber(raw)
    out[payloadKey] = CAMPOS_DINHEIRO.has(payloadKey) ? value : Math.trunc(value)
  }

  // Espelha os dois campos de GMV quando só um foi editado.
  //
  // O backend exibe COALESCE(ads_gmv, manual_gmv, fat_gerado): manual_gmv GANHA de
  // fat_gerado. Então mudar só "GMV faturado" grava no banco e não muda nada na tela —
  // é a outra metade do "não salva" que o usuário relatou, verificada clicando.
  //
  // Na prática os dois carregam o mesmo número: das 475 lives com ambos preenchidos, só 4
  // divergem. Espelhar mantém o comportamento visível que existia antes (quando todo save
  // mandava os dois) sem trazer de volta a reversão, porque agora isto só dispara quando o
  // usuário REALMENTE mexeu num dos dois. Se ele editou os dois com valores diferentes,
  // respeitamos o que ele digitou em cada um.
  const mudouFat = 'fat_gerado' in out
  const mudouManual = 'manual_gmv' in out
  if (mudouFat && !mudouManual) out.manual_gmv = out.fat_gerado
  else if (mudouManual && !mudouFat) out.fat_gerado = out.manual_gmv

  // Live importada do TikTok Studio guarda o GMV em ads_gmv, que é o TOPO de
  // COALESCE(ads_gmv, manual_gmv, fat_gerado) (src/lib/metric-sql.js). Sem mandar ads_gmv, a
  // correção grava nos outros dois campos e NENHUM relatório enxerga — o operador digita,
  // salva e nada muda. Por isso o campo ficou desabilitado por um tempo; travar resolvia a
  // mentira e criava outra, porque 157 lives ficaram sem como ser corrigidas.
  // O campo visível "GMV faturado" já nasce com o valor oficial (officialLiveGmvRaw), então
  // quando a live veio do import é ads_gmv que o usuário está editando.
  if (temAdsGmv && 'fat_gerado' in out) out.ads_gmv = out.fat_gerado

  return out
}

export function EditarLiveModal({ open, onClose, live, onSaved, onDividir }: Props) {
  const client = useQueryClient()
  const formId = useId()
  const [form, setForm] = useState<EditForm>(emptyForm)
  // Snapshot do formulário como ele nasceu. Serve de referência para decidir o que o usuário
  // realmente alterou — sem isso o save reenvia campos numéricos intocados (ver handleSubmit).
  const prefillRef = useRef<EditForm>(emptyForm)
  const initializedLiveRef = useRef('')
  const [error, setError] = useState<string | null>(null)

  const [cabinesQuery, clientesQuery, marcasQuery] = useQueries({
    queries: [
      { queryKey: QK.cabines, queryFn: getCabines, staleTime: 15_000, enabled: open },
      { queryKey: QK.clientes('live-edit'), queryFn: () => getClientes(), enabled: open },
      { queryKey: QK.marcas('live-edit'), queryFn: () => getMarcas({ status: 'ativa' }), enabled: open },
    ],
  })

  const cabineOptions = useMemo(() => toLookupOptions(asArray(cabinesQuery.data) as JsonRecord[], 'numero'), [cabinesQuery.data])
  const clienteRows = useMemo(() => asArray<JsonRecord>(clientesQuery.data), [clientesQuery.data])
  const marcaRows = useMemo(() => asArray<JsonRecord>(marcasQuery.data), [marcasQuery.data])
  const accountOptions = useMemo(() => liveAccountOptions(marcaRows, clienteRows), [clienteRows, marcaRows])

  useEffect(() => {
    if (!open) { initializedLiveRef.current = ''; return }
    if (!live) {
      setForm(emptyForm)
      prefillRef.current = emptyForm
      return
    }
    const liveKey = asString(live.id, '')
    if (initializedLiveRef.current === liveKey) return
    initializedLiveRef.current = liveKey
    const prefill: EditForm = {
      cabine_id: asString(live.cabine_id, ''),
      cliente_id: asString(live.cliente_id, ''),
      marca_id: asString(live.marca_id, ''),
      gestor_id: asString(live.gestor_id, ''),
      agenda_evento_id: asString(live.agenda_evento_id, ''),
      status: asString(live.status, 'em_andamento'),
      tipo: asString(live.tipo, 'cliente'),
      status_publicacao: asString(live.status_publicacao, 'rascunho'),
      origem_dados: asString(live.origem_dados, 'manual'),
      data: toDateInput(live.iniciado_em ?? live.data),
      hora_inicio: toTimeInput(live.iniciado_em),
      hora_fim: toTimeInput(live.encerrado_em ?? live.previsto_fim),
      fat_gerado: asString(officialLiveGmvRaw(live), ''),
      manual_gmv: asString(live.manual_gmv, ''),
      qtd_pedidos: asString(live.manual_orders ?? live.qtd_pedidos ?? live.final_orders_count, ''),
      manual_orders: asString(live.manual_orders, ''),
      manual_views: asString(live.manual_views, ''),
      manual_likes: asString(live.manual_likes, ''),
      manual_comments: asString(live.manual_comments, ''),
      manual_shares: asString(live.manual_shares, ''),
      manual_diamonds: asString(live.manual_diamonds, ''),
      ads_cost: asString(live.ads_cost, ''),
      live_impressions: asString(live.live_impressions, ''),
      product_impressions: asString(live.product_impressions, ''),
      product_clicks: asString(live.product_clicks, ''),
      avg_viewing_duration: asString(live.avg_viewing_duration, ''),
      new_followers: asString(live.new_followers, ''),
      resumo: asString(live.resumo, ''),
    }
    setForm(prefill)
    // Guarda o prefill para o save saber o que o usuário REALMENTE mexeu. Ver o loop
    // numérico em handleSubmit.
    prefillRef.current = prefill
    setError(null)
  }, [live, open])

  // Live importada do TikTok Studio grava em ads_gmv, que é o TOPO de
  // COALESCE(ads_gmv, manual_gmv, fat_gerado) em src/lib/metric-sql.js. Enquanto ads_gmv
  // existir, editar os outros dois campos grava no banco mas NENHUM relatório enxerga —
  // o usuário digita, salva, e nada muda na tela. Bloquear é honesto; deixar editável seria
  // repetir o bug do GMV que "não salva" com outra roupa.
  const gmvVeioDoTikTok = live?.ads_gmv !== null && live?.ads_gmv !== undefined

  function setField<K extends keyof EditForm>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function setAccount(value: string) {
    const selection = liveAccountSelection(value, marcaRows)
    if (selection) setForm((current) => ({ ...current, ...selection }))
  }

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateLive(id, payload),
    onSuccess: () => {
      invalidateOperational(client)
      onSaved?.()
      onClose()
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!live?.id) return
    setError(null)

    if (form.hora_inicio && form.hora_fim && form.hora_fim <= form.hora_inicio) {
      setError('O término deve ser depois do início.')
      return
    }

    const payload: JsonRecord = {}
    const setIfChanged = <K extends keyof EditForm>(key: K, raw: string, current: unknown) => {
      const liveValue = asString(current, '')
      if (raw !== liveValue) {
        payload[key as string] = raw === '' ? null : raw
      }
    }

    // cabine_id nunca pode ser null (live sempre tem cabine) — só envia se preenchido e mudou.
    if (form.cabine_id && form.cabine_id !== asString(live.cabine_id, '')) payload.cabine_id = form.cabine_id
    setIfChanged('cliente_id', form.cliente_id, live.cliente_id)
    setIfChanged('marca_id', form.marca_id, live.marca_id)
    setIfChanged('gestor_id', form.gestor_id, live.gestor_id)
    setIfChanged('agenda_evento_id', form.agenda_evento_id, live.agenda_evento_id)
    setIfChanged('status', form.status, live.status)
    setIfChanged('tipo', form.tipo, live.tipo)
    setIfChanged('status_publicacao', form.status_publicacao, live.status_publicacao)
    setIfChanged('origem_dados', form.origem_dados, live.origem_dados)
    setIfChanged('resumo', form.resumo, live.resumo)

    if (form.data) payload.data = form.data
    if (form.hora_inicio) payload.hora_inicio = form.hora_inicio
    if (form.hora_fim) payload.hora_fim = form.hora_fim

    Object.assign(payload, montarCamposNumericos(form, prefillRef.current, gmvVeioDoTikTok))

    if (Object.keys(payload).length === 0) {
      setError('Nenhum campo modificado.')
      return
    }

    saveMutation.mutate({ id: asString(live.id), payload })
  }

  const hasUnsavedChanges = hasUnsavedLiveChanges(form, prefillRef.current)
  const closeGuard = useUnsavedChanges({ open, dirty: hasUnsavedChanges, busy: saveMutation.isPending, onClose })

  if (!open || !live) return null

  const rateioPlanejado = resumoRateioPlanejado(live)
  const rateioAtual = asArray<JsonRecord>(live.apresentadoras)
  const accountValue = form.marca_id ? `marca:${form.marca_id}` : form.cliente_id ? `cliente:${form.cliente_id}` : ''
  const accountKnown = !accountValue || accountOptions.some((option) => option.value === accountValue)
  const legacyPresenters = [
    asString(live.apresentadora_nome ?? live.apresentador_nome, ''),
    asString(live.apresentadora2_nome ?? live.apresentador2_nome, ''),
  ].filter(Boolean)

  return (
    <Modal
      open={open}
      onClose={closeGuard.requestClose}
      closeDisabled={saveMutation.isPending}
      title="Editar live"
      size="lg"
      footer={(
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <UnsavedChangesNotice guard={closeGuard} />
          {error ? <p role="alert" className="w-full rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-[var(--danger)]">{error}</p> : null}
          <p className="w-full text-xs text-ink-muted sm:mr-auto sm:w-auto sm:self-center">Ao salvar, a comissão é recalculada.</p>
          <Button variant="ghost" type="button" onClick={closeGuard.requestClose} disabled={saveMutation.isPending}>Cancelar</Button>
          <Button type="submit" form={formId} isLoading={saveMutation.isPending}>Salvar alterações</Button>
        </div>
      )}
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-5">
        <ModalSection title="Dados da live" description="Defina onde, para quem e com quem a live acontece.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs text-ink-muted">Cabine</span>
              <select className="design-input mt-1 h-11 w-full px-3" value={form.cabine_id} onChange={(e) => setField('cabine_id', e.target.value)}>
                <option value="">Selecione</option>
                {cabineOptions.map((o) => <option key={o.value} value={o.value}>Cabine {o.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Marca ou cliente</span>
              <select className="design-input mt-1 h-11 w-full px-3" value={accountValue} onChange={(e) => setAccount(e.target.value)}>
                <option value="">Selecione</option>
                {!accountKnown ? <option value={accountValue}>Conta atual indisponível</option> : null}
                {accountOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Situação da transmissão</span>
              <select className="design-input mt-1 h-11 w-full px-3" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                <option value="em_andamento">Em andamento</option>
                <option value="encerrada">Encerrada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Tipo</span>
              <select className="design-input mt-1 h-11 w-full px-3" value={form.tipo} onChange={(e) => setField('tipo', e.target.value)}>
                <option value="cliente">Cliente</option>
                <option value="afiliado">Afiliado</option>
                <option value="teste">Teste</option>
              </select>
            </label>
          </div>
        </ModalSection>

        <ModalSection title="Apresentadoras e divisão" description="Gerencie aqui quem participou e a divisão registrada para esta live.">
          <div className="flex flex-wrap items-center gap-2">
            {rateioAtual.length > 0 ? (
              rateioPlanejado ? (
                <p className="text-xs font-semibold text-[color:var(--warning)]">Divisão planejada: {rateioPlanejado}.</p>
              ) : (
                <p className="text-xs text-ink-muted">Participantes: {rateioAtual.map(presenterDisplayName).join(' · ')}.</p>
              )
            ) : legacyPresenters.length > 0 ? (
              <p className="text-xs text-ink-muted">Participantes do registro anterior: {legacyPresenters.join(' · ')}; revise a divisão.</p>
            ) : <p className="text-xs text-ink-muted">Nenhuma divisão registrada.</p>}
            {hasUnsavedChanges ? <p className="w-full text-xs text-ink-muted">Salve as alterações da live antes de gerenciar a divisão.</p> : null}
            {onDividir ? <Button type="button" variant="secondary" icon={Users} onClick={() => onDividir(live)} disabled={hasUnsavedChanges}>Gerenciar divisão</Button> : null}
          </div>
        </ModalSection>

        <ModalSection title="Data e horário" description="Use o horário real de início e término.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="text-xs text-ink-muted">Data</span>
              <input type="date" className="design-input mt-1 h-11 w-full px-3" value={form.data} onChange={(e) => setField('data', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Hora início</span>
              <input type="time" className="design-input mt-1 h-11 w-full px-3" value={form.hora_inicio} onChange={(e) => setField('hora_inicio', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Hora fim</span>
              <input type="time" className="design-input mt-1 h-11 w-full px-3" value={form.hora_fim} onChange={(e) => setField('hora_fim', e.target.value)} />
            </label>
          </div>
        </ModalSection>

        <ModalSection title="Resultado da live" description="Registre o resultado principal antes de salvar.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs text-ink-muted">GMV faturado</span>
              <MoneyInput
                className="design-input mt-1 h-11 w-full px-3"
                value={form.fat_gerado}
                onChange={(v) => setField('fat_gerado', v)}
              />
              {gmvVeioDoTikTok ? (
                <span className="mt-1 block text-[11px] leading-tight text-ink-muted">
                  Veio do TikTok Studio. Sua correção substitui o valor, vale nos relatórios e fica
                  registrada no histórico de GMV — reimportar a planilha não desfaz.
                </span>
              ) : null}
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Pedidos</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.qtd_pedidos} onChange={(e) => setField('qtd_pedidos', e.target.value)} />
            </label>
          </div>
        </ModalSection>

        <ModalSection title="Ajustes financeiros" description="Use apenas para correções manuais e investimento em mídia." collapsible>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs text-ink-muted">GMV manual</span>
              <MoneyInput className="design-input mt-1 h-11 w-full px-3" value={form.manual_gmv} onChange={(v) => setField('manual_gmv', v)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Pedidos manuais</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.manual_orders} onChange={(e) => setField('manual_orders', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Verba Ads investida</span>
              <MoneyInput className="design-input mt-1 h-11 w-full px-3" value={form.ads_cost} onChange={(v) => setField('ads_cost', v)} />
            </label>
          </div>
        </ModalSection>

        <ModalSection title="Publicação" description="Controle interno de disponibilidade da live." collapsible>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs text-ink-muted">Status de publicação</span>
              <select className="design-input mt-1 h-11 w-full px-3" value={form.status_publicacao} onChange={(e) => setField('status_publicacao', e.target.value)}>
                <option value="rascunho">Rascunho</option>
                <option value="revisado">Revisado</option>
                <option value="publicado">Publicado</option>
              </select>
            </label>
          </div>
        </ModalSection>

        <ModalSection title="Métricas do TikTok" description="Métricas complementares importadas ou ajustadas manualmente." collapsible>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs text-ink-muted">Impressões da live</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.live_impressions} onChange={(e) => setField('live_impressions', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Impressões de produto</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.product_impressions} onChange={(e) => setField('product_impressions', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Cliques em produto</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.product_clicks} onChange={(e) => setField('product_clicks', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Visualizações</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.manual_views} onChange={(e) => setField('manual_views', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Novos seguidores</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.new_followers} onChange={(e) => setField('new_followers', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Retenção média (segundos)</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.avg_viewing_duration} onChange={(e) => setField('avg_viewing_duration', e.target.value)} />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs text-ink-muted">Likes</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.manual_likes} onChange={(e) => setField('manual_likes', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Comentários</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.manual_comments} onChange={(e) => setField('manual_comments', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Shares</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.manual_shares} onChange={(e) => setField('manual_shares', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Diamonds</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.manual_diamonds} onChange={(e) => setField('manual_diamonds', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Origem dos dados</span>
              <select className="design-input mt-1 h-11 w-full px-3" value={form.origem_dados} onChange={(e) => setField('origem_dados', e.target.value)}>
                <option value="manual">Manual</option>
                <option value="api">API TikTok</option>
                <option value="bot" disabled>BOT (automação)</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-ink-muted">Resumo</span>
            <textarea className="design-input mt-1 w-full px-3 py-2" rows={2} value={form.resumo} onChange={(e) => setField('resumo', e.target.value)} />
          </label>
        </ModalSection>
      </form>
    </Modal>
  )
}
