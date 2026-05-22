import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

export function EditarLiveModal({ open, onClose, live, onSaved }: Props) {
  const client = useQueryClient()
  const [form, setForm] = useState<EditForm>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const cabinesQuery = useQuery({ queryKey: ['cabines'], queryFn: getCabines, enabled: open })
  const clientesQuery = useQuery({ queryKey: ['clientes', 'live-edit'], queryFn: getClientes, enabled: open })
  const marcasQuery = useQuery({ queryKey: ['marcas', 'live-edit'], queryFn: () => getMarcas({ status: 'ativa' }), enabled: open })
  const apresentadorasQuery = useQuery({ queryKey: ['apresentadoras', 'live-edit'], queryFn: getApresentadoras, enabled: open })

  const cabineOptions = useMemo(() => toLookupOptions(asArray(cabinesQuery.data) as JsonRecord[], 'numero'), [cabinesQuery.data])
  const clienteOptions = useMemo(() => toLookupOptions(asArray(clientesQuery.data) as JsonRecord[]), [clientesQuery.data])
  const marcaOptions = useMemo(() => toLookupOptions(asArray(marcasQuery.data) as JsonRecord[]), [marcasQuery.data])
  const apresentadoraRows = useMemo(() => asArray<JsonRecord>(apresentadorasQuery.data), [apresentadorasQuery.data])

  useEffect(() => {
    if (!live) {
      setForm(emptyForm)
      return
    }
    setForm({
      cabine_id: asString(live.cabine_id),
      cliente_id: asString(live.cliente_id),
      marca_id: asString(live.marca_id),
      apresentador_id: asString(live.apresentadora_id ?? live.apresentador_id),
      apresentador2_id: asString(live.apresentadora2_id ?? live.apresentador2_id),
      gestor_id: asString(live.gestor_id),
      agenda_evento_id: asString(live.agenda_evento_id),
      tiktok_username: asString(live.tiktok_username),
      status: asString(live.status, 'em_andamento'),
      tipo: asString(live.tipo, 'cliente'),
      status_publicacao: asString(live.status_publicacao, 'rascunho'),
      origem_dados: asString(live.origem_dados, 'manual'),
      data: toDateInput(live.iniciado_em ?? live.data),
      hora_inicio: toTimeInput(live.iniciado_em),
      hora_fim: toTimeInput(live.encerrado_em ?? live.previsto_fim),
      previsto_fim: toDatetimeLocal(live.previsto_fim),
      fat_gerado: asString(live.fat_gerado, ''),
      manual_gmv: asString(live.manual_gmv, ''),
      qtd_pedidos: asString(live.qtd_pedidos ?? live.final_orders_count, ''),
      manual_orders: asString(live.manual_orders, ''),
      manual_views: asString(live.manual_views, ''),
      manual_likes: asString(live.manual_likes, ''),
      manual_comments: asString(live.manual_comments, ''),
      manual_shares: asString(live.manual_shares, ''),
      manual_diamonds: asString(live.manual_diamonds, ''),
      resumo: asString(live.resumo),
    })
    setError(null)
  }, [live])

  function setField<K extends keyof EditForm>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateLive(id, payload),
    onSuccess: () => {
      ;[
        ['cabines'],
        ['lives'],
        ['live'],
        ['home-dashboard'],
        ['comissoes-resumo'],
        ['comissoes-pendentes'],
        ['comissoes-apresentadoras'],
        ['comissoes-marcas'],
        ['ranking-apresentadoras'],
        ['vendas-atribuidas'],
        ['agenda'],
      ].forEach((queryKey) => {
        void client.invalidateQueries({ queryKey })
      })
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
    setIfChanged('apresentador_id', form.apresentador_id, live.apresentadora_id ?? live.apresentador_id)
    setIfChanged('apresentador2_id', form.apresentador2_id, live.apresentadora2_id ?? live.apresentador2_id)
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

    const numFields: Array<[keyof EditForm, string]> = [
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
    for (const [formKey, payloadKey] of numFields) {
      const raw = form[formKey]
      if (raw === '') continue
      const value = asNumber(raw)
      if (payloadKey === 'fat_gerado' || payloadKey === 'manual_gmv') {
        payload[payloadKey] = value
      } else {
        payload[payloadKey] = Math.trunc(value)
      }
    }

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
            />
            <PresenterSelect
              rows={apresentadoraRows}
              label="Apresentadora 2"
              value={form.apresentador2_id}
              onChange={(value) => setField('apresentador2_id', value)}
              placeholder="Sem segunda apresentadora"
            />
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
              <span className="text-xs text-ink-muted">TikTok @username</span>
              <input className="design-input mt-1 h-11 w-full px-3" value={form.tiktok_username} onChange={(e) => setField('tiktok_username', e.target.value.trim().replace(/^@/, ''))} />
            </label>
          </div>
        </section>

        {/* Financeiro */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-ink">Financeiro</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-ink-muted">GMV total (fat_gerado)</span>
              <MoneyInput value={form.fat_gerado} onChange={(v) => setField('fat_gerado', v)} />
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
