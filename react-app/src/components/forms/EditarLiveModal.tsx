import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { MoneyInput } from '../ui/MoneyInput'
import { PresenterSelect } from './PresenterSelect'
import { extractErrorMessage } from '../../services/api'
import {
  getApresentadoras,
  getCabines,
  getClientes,
  getMarcas,
  updateLive,
} from '../../services/domain'
import { asArray, asNumber, asString } from '../../utils/format'
import { officialLiveGmvRaw } from '../../utils/live-gmv'
import { QK, invalidateOperational } from '../../services/query-keys'
import type { JsonRecord } from '../../types/models'

type LookupOption = { value: string; label: string }

type EditForm = {
  cabine_id: string
  cliente_id: string
  marca_id: string
  apresentador_id: string
  apresentador2_id: string
  gestor_id: string
  agenda_evento_id: string
  tiktok_username: string
  status: string
  tipo: string
  status_publicacao: string
  origem_dados: string
  data: string
  hora_inicio: string
  hora_fim: string
  previsto_fim: string
  fat_gerado: string
  manual_gmv: string
  qtd_pedidos: string
  manual_orders: string
  manual_views: string
  manual_likes: string
  manual_comments: string
  manual_shares: string
  manual_diamonds: string
  resumo: string
}

const emptyForm: EditForm = {
  cabine_id: '',
  cliente_id: '',
  marca_id: '',
  apresentador_id: '',
  apresentador2_id: '',
  gestor_id: '',
  agenda_evento_id: '',
  tiktok_username: '',
  status: '',
  tipo: '',
  status_publicacao: '',
  origem_dados: '',
  data: '',
  hora_inicio: '',
  hora_fim: '',
  previsto_fim: '',
  fat_gerado: '',
  manual_gmv: '',
  qtd_pedidos: '',
  manual_orders: '',
  manual_views: '',
  manual_likes: '',
  manual_comments: '',
  manual_shares: '',
  manual_diamonds: '',
  resumo: '',
}

export function presenterIdsFromLive(live: JsonRecord): { principalId: string; supportId: string } {
  const rateio = asArray<JsonRecord>(live.apresentadoras)
    .filter((item) => asString(item.apresentadora_id, ''))
  const principal = rateio.find((item) => asString(item.papel) === 'principal') ?? rateio[0]
  const support = rateio.find((item) => item !== principal)
  return {
    principalId: asString(principal?.apresentadora_id ?? live.apresentadora_id ?? live.apresentador_id, ''),
    supportId: asString(support?.apresentadora_id ?? live.apresentadora2_id ?? live.apresentador2_id, ''),
  }
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

function toDatetimeLocal(value: unknown): string {
  if (!value) return ''
  const d = new Date(asString(value))
  if (Number.isNaN(d.getTime())) return ''
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

type Props = {
  open: boolean
  onClose: () => void
  live: JsonRecord | null
  onSaved?: () => void
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
]

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
    out[payloadKey] = payloadKey === 'fat_gerado' || payloadKey === 'manual_gmv'
      ? value
      : Math.trunc(value)
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

export function EditarLiveModal({ open, onClose, live, onSaved }: Props) {
  const client = useQueryClient()
  const [form, setForm] = useState<EditForm>(emptyForm)
  // Snapshot do formulário como ele nasceu. Serve de referência para decidir o que o usuário
  // realmente alterou — sem isso o save reenvia campos numéricos intocados (ver handleSubmit).
  const prefillRef = useRef<EditForm>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const [cabinesQuery, clientesQuery, marcasQuery, apresentadorasQuery] = useQueries({
    queries: [
      { queryKey: QK.cabines, queryFn: getCabines, staleTime: 15_000, enabled: open },
      { queryKey: QK.clientes('live-edit'), queryFn: () => getClientes(), enabled: open },
      { queryKey: QK.marcas('live-edit'), queryFn: () => getMarcas({ status: 'ativa' }), enabled: open },
      { queryKey: QK.apresentadoras('live-edit'), queryFn: getApresentadoras, enabled: open },
    ],
  })

  const cabineOptions = useMemo(() => toLookupOptions(asArray(cabinesQuery.data) as JsonRecord[], 'numero'), [cabinesQuery.data])
  const clienteOptions = useMemo(() => toLookupOptions(asArray(clientesQuery.data) as JsonRecord[]), [clientesQuery.data])
  const marcaOptions = useMemo(() => toLookupOptions(asArray(marcasQuery.data) as JsonRecord[]), [marcasQuery.data])
  const apresentadoraRows = useMemo(() => asArray<JsonRecord>(apresentadorasQuery.data), [apresentadorasQuery.data])

  useEffect(() => {
    if (!live) {
      setForm(emptyForm)
      prefillRef.current = emptyForm
      return
    }
    const presenterIds = presenterIdsFromLive(live)
    const prefill: EditForm = {
      cabine_id: asString(live.cabine_id, ''),
      cliente_id: asString(live.cliente_id, ''),
      marca_id: asString(live.marca_id, ''),
      apresentador_id: presenterIds.principalId,
      apresentador2_id: presenterIds.supportId,
      gestor_id: asString(live.gestor_id, ''),
      agenda_evento_id: asString(live.agenda_evento_id, ''),
      tiktok_username: asString(live.tiktok_username, ''),
      status: asString(live.status, 'em_andamento'),
      tipo: asString(live.tipo, 'cliente'),
      status_publicacao: asString(live.status_publicacao, 'rascunho'),
      origem_dados: asString(live.origem_dados, 'manual'),
      data: toDateInput(live.iniciado_em ?? live.data),
      hora_inicio: toTimeInput(live.iniciado_em),
      hora_fim: toTimeInput(live.encerrado_em ?? live.previsto_fim),
      previsto_fim: toDatetimeLocal(live.previsto_fim),
      fat_gerado: asString(officialLiveGmvRaw(live), ''),
      manual_gmv: asString(live.manual_gmv, ''),
      qtd_pedidos: asString(live.manual_orders ?? live.qtd_pedidos ?? live.final_orders_count, ''),
      manual_orders: asString(live.manual_orders, ''),
      manual_views: asString(live.manual_views, ''),
      manual_likes: asString(live.manual_likes, ''),
      manual_comments: asString(live.manual_comments, ''),
      manual_shares: asString(live.manual_shares, ''),
      manual_diamonds: asString(live.manual_diamonds, ''),
      resumo: asString(live.resumo, ''),
    }
    setForm(prefill)
    // Guarda o prefill para o save saber o que o usuário REALMENTE mexeu. Ver o loop
    // numérico em handleSubmit.
    prefillRef.current = prefill
    setError(null)
  }, [live])

  // Live importada do TikTok Studio grava em ads_gmv, que é o TOPO de
  // COALESCE(ads_gmv, manual_gmv, fat_gerado) em src/lib/metric-sql.js. Enquanto ads_gmv
  // existir, editar os outros dois campos grava no banco mas NENHUM relatório enxerga —
  // o usuário digita, salva, e nada muda na tela. Bloquear é honesto; deixar editável seria
  // repetir o bug do GMV que "não salva" com outra roupa.
  const gmvVeioDoTikTok = live?.ads_gmv !== null && live?.ads_gmv !== undefined

  function setField<K extends keyof EditForm>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
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
      setError('hora_fim deve ser maior que hora_inicio')
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
    const presenterIds = presenterIdsFromLive(live)
    setIfChanged('apresentador_id', form.apresentador_id, presenterIds.principalId)
    setIfChanged('apresentador2_id', form.apresentador2_id, presenterIds.supportId)
    setIfChanged('gestor_id', form.gestor_id, live.gestor_id)
    setIfChanged('agenda_evento_id', form.agenda_evento_id, live.agenda_evento_id)
    setIfChanged('tiktok_username', form.tiktok_username, live.tiktok_username)
    setIfChanged('status', form.status, live.status)
    setIfChanged('tipo', form.tipo, live.tipo)
    setIfChanged('status_publicacao', form.status_publicacao, live.status_publicacao)
    setIfChanged('origem_dados', form.origem_dados, live.origem_dados)
    setIfChanged('resumo', form.resumo, live.resumo)

    if (form.data) payload.data = form.data
    if (form.hora_inicio) payload.hora_inicio = form.hora_inicio
    if (form.hora_fim) payload.hora_fim = form.hora_fim
    if (form.previsto_fim) payload.previsto_fim = new Date(form.previsto_fim).toISOString()

    Object.assign(payload, montarCamposNumericos(form, prefillRef.current, gmvVeioDoTikTok))

    if (Object.keys(payload).length === 0) {
      setError('Nenhum campo modificado.')
      return
    }

    saveMutation.mutate({ id: asString(live.id), payload })
  }

  if (!open || !live) return null

  return (
    <Modal open={open} onClose={onClose} title="Editar live" size="xl">
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Geral */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-ink">Geral</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-ink-muted">Cabine</span>
              <select className="design-input mt-1 h-11 w-full px-3" value={form.cabine_id} onChange={(e) => setField('cabine_id', e.target.value)}>
                <option value="">—</option>
                {cabineOptions.map((o) => <option key={o.value} value={o.value}>Cabine {o.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Cliente</span>
              <select className="design-input mt-1 h-11 w-full px-3" value={form.cliente_id} onChange={(e) => setField('cliente_id', e.target.value)}>
                <option value="">—</option>
                {clienteOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Marca</span>
              <select className="design-input mt-1 h-11 w-full px-3" value={form.marca_id} onChange={(e) => setField('marca_id', e.target.value)}>
                <option value="">—</option>
                {marcaOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <PresenterSelect
              rows={apresentadoraRows}
              label="Apresentadora principal"
              value={form.apresentador_id}
              onChange={(value) => setField('apresentador_id', value)}
              placeholder="Sem apresentadora definida"
              disabled={asArray<JsonRecord>(live.apresentadoras).length > 1}
            />
            <PresenterSelect
              rows={apresentadoraRows}
              label="Apresentadora 2"
              value={form.apresentador2_id}
              onChange={(value) => setField('apresentador2_id', value)}
              placeholder="Sem segunda apresentadora"
              disabled={asArray<JsonRecord>(live.apresentadoras).length > 1}
            />
            {asArray<JsonRecord>(live.apresentadoras).length > 1 ? (
              <p className="col-span-2 text-xs font-medium text-ink-muted">
                Esta live tem rateio salvo. Altere nomes, tempo e GMV em “Dividir entre apresentadoras”.
              </p>
            ) : null}
            <label className="block">
              <span className="text-xs text-ink-muted">Status</span>
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
            <label className="block">
              <span className="text-xs text-ink-muted">Status de publicação</span>
              <select className="design-input mt-1 h-11 w-full px-3" value={form.status_publicacao} onChange={(e) => setField('status_publicacao', e.target.value)}>
                <option value="rascunho">Rascunho</option>
                <option value="revisado">Revisado</option>
                <option value="publicado">Publicado</option>
              </select>
            </label>
          </div>
        </section>

        {/* Tempo + TikTok */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-ink">Tempo e TikTok</h3>
          <div className="grid grid-cols-3 gap-3">
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
            <label className="block col-span-2">
              <span className="text-xs text-ink-muted">Previsto fim</span>
              <input type="datetime-local" className="design-input mt-1 h-11 w-full px-3" value={form.previsto_fim} onChange={(e) => setField('previsto_fim', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">TikTok username</span>
              <input className="design-input mt-1 h-11 w-full px-3" value={form.tiktok_username} onChange={(e) => setField('tiktok_username', e.target.value.trim().replace(/@/g, ''))} />
            </label>
          </div>
        </section>

        {/* Financeiro */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-ink">Financeiro</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-ink-muted">GMV faturado</span>
              <MoneyInput
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
              <span className="text-xs text-ink-muted">GMV manual</span>
              <MoneyInput value={form.manual_gmv} onChange={(v) => setField('manual_gmv', v)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Pedidos</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.qtd_pedidos} onChange={(e) => setField('qtd_pedidos', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Pedidos manuais</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.manual_orders} onChange={(e) => setField('manual_orders', e.target.value)} />
            </label>
          </div>
        </section>

        {/* Métricas TikTok */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-ink">Métricas TikTok</h3>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-ink-muted">Views</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.manual_views} onChange={(e) => setField('manual_views', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Likes</span>
              <input type="text" inputMode="numeric" className="design-input mt-1 h-11 w-full px-3" value={form.manual_likes} onChange={(e) => setField('manual_likes', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Comments</span>
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
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-ink-muted">Resumo</span>
            <textarea className="design-input mt-1 w-full px-3 py-2" rows={2} value={form.resumo} onChange={(e) => setField('resumo', e.target.value)} />
          </label>
        </section>

        {error ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{error}</p> : null}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" type="button" onClick={onClose} disabled={saveMutation.isPending}>Cancelar</Button>
          <Button type="submit" isLoading={saveMutation.isPending}>Salvar e recalcular comissão</Button>
        </div>
      </form>
    </Modal>
  )
}
