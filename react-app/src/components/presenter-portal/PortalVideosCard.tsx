import { useState } from 'react'
import { Film, Pencil, Send, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { DataTable } from '../ui/DataTable'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { useToast } from '../ui/Toast'
import { QK } from '../../services/query-keys'
import { extractErrorMessage } from '../../services/api'
import {
  createPresenterVideo,
  deletePresenterVideo,
  getPresenterPortalOptions,
  getPresenterPortalVideos,
  updatePresenterVideo,
  type PresenterVideo,
  type PresenterVideoPayload,
} from '../../services/presenter-portal'
import { useCurrentUser } from '../../stores/auth-store'
import { formatDate, formatMoney } from '../../utils/format'
import { currentMonth } from '../../utils/presenter-portal'
import { parsePresenterCount, parsePresenterMoney } from '../../utils/presenter-input'
import { getSaoPauloDateInput } from '../../utils/sao-paulo-date'

interface VideoForm { marca_id: string; data: string; quantidade: string; gmv: string; pedidos: string; observacoes: string }

// Vídeo não tem horário, cabine, impressões nem views: só o que se aplica a ele.
export function videoPayloadFromForm(form: VideoForm, now = new Date()): { value: PresenterVideoPayload } | { error: string } {
  if (!form.marca_id) return { error: 'Escolha a marca.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.data) || form.data.slice(0, 7) !== currentMonth(now) || form.data > getSaoPauloDateInput(now)) {
    return { error: 'Informe um dia deste mês, até hoje (horário de Brasília).' }
  }
  const quantidade = parsePresenterCount(form.quantidade, 1000)
  if (!quantidade.ok) return { error: quantidade.error }
  if (quantidade.value < 1) return { error: 'Informe ao menos 1 vídeo.' }
  const gmv = form.gmv.trim() ? parsePresenterMoney(form.gmv) : { ok: true as const, value: '0' }
  if (!gmv.ok) return { error: gmv.error }
  const pedidos = form.pedidos.trim() ? parsePresenterCount(form.pedidos, 1_000_000) : { ok: true as const, value: 0 }
  if (!pedidos.ok) return { error: pedidos.error }
  return {
    value: {
      marca_id: form.marca_id,
      data: form.data,
      quantidade: quantidade.value,
      gmv_atribuido: gmv.value,
      pedidos_atribuidos: pedidos.value,
      observacoes: form.observacoes.trim() || null,
    },
  }
}

function formFromVideo(item: PresenterVideo | null): VideoForm {
  if (!item) return { marca_id: '', data: getSaoPauloDateInput(), quantidade: '1', gmv: '', pedidos: '', observacoes: '' }
  const gmv = Number(item.gmv_atribuido ?? 0)
  return {
    marca_id: item.marca_id,
    data: item.data,
    quantidade: String(item.quantidade),
    gmv: gmv > 0 ? gmv.toFixed(2).replace('.', ',') : '',
    pedidos: item.pedidos_atribuidos > 0 ? String(item.pedidos_atribuidos) : '',
    observacoes: item.observacoes ?? '',
  }
}

export function PortalVideosCard({ mes }: { mes: string }) {
  const user = useCurrentUser()
  const client = useQueryClient()
  const toast = useToast()
  const tenant = user?.tenant_id ?? ''
  const actor = user?.id ?? ''
  // undefined = modal fechado; null = novo vídeo.
  const [editing, setEditing] = useState<PresenterVideo | null | undefined>(undefined)
  const [removing, setRemoving] = useState<PresenterVideo | null>(null)
  const [form, setForm] = useState<VideoForm>(formFromVideo(null))
  const [error, setError] = useState('')

  const videos = useQuery({ queryKey: QK.presenterPortalVideos(tenant, actor, mes), queryFn: () => getPresenterPortalVideos(mes), enabled: Boolean(user) })
  const options = useQuery({ queryKey: ['presenter-portal-options', tenant, actor], queryFn: getPresenterPortalOptions, enabled: editing !== undefined })
  const invalidate = () => client.invalidateQueries({ queryKey: ['presenter-portal-videos'] })
  const close = () => { setEditing(undefined); setError('') }

  const save = useMutation({
    mutationFn: (payload: PresenterVideoPayload) => (editing ? updatePresenterVideo(editing.id, payload) : createPresenterVideo(payload)),
    onSuccess: () => { void invalidate(); toast.push(editing ? 'Vídeo atualizado' : 'Vídeo registrado', 'success'); close() },
    onError: (err) => setError(extractErrorMessage(err)),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deletePresenterVideo(id),
    onSuccess: () => { void invalidate(); toast.push('Vídeo excluído', 'success'); setRemoving(null) },
    onError: (err) => toast.push(extractErrorMessage(err), 'error'),
  })

  function open(item: PresenterVideo | null) {
    setForm(formFromVideo(item))
    setError('')
    setEditing(item)
  }

  function submit() {
    const result = videoPayloadFromForm(form)
    if ('error' in result) return setError(result.error)
    save.mutate(result.value)
  }

  const set = (key: keyof VideoForm) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const items = videos.data?.items ?? []

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Meus vídeos</h2>
          <p className="mt-1 text-sm text-ink-muted">{(videos.data?.total_videos ?? 0).toLocaleString('pt-BR')} vídeos no mês. Vídeo não conta como live.</p>
        </div>
        <Button icon={Film} onClick={() => open(null)} disabled={mes !== currentMonth()}>Registrar vídeo</Button>
      </CardHeader>
      <CardBody className="p-0">
        {videos.isLoading ? <LoadingState label="Carregando seus vídeos" /> : videos.isError ? <ErrorState message={extractErrorMessage(videos.error)} onRetry={() => void videos.refetch()} /> : items.length === 0
          ? <EmptyState title="Nenhum vídeo neste mês" description="Registre os vídeos gravados para contarem na sua meta." />
          : <DataTable
              data={items}
              rowKey={(row) => row.id}
              columns={[
                { key: 'data', header: 'Dia', render: (row) => formatDate(row.data) },
                { key: 'marca_nome', header: 'Marca', render: (row) => row.marca_nome ?? '—' },
                { key: 'quantidade', header: 'Vídeos', align: 'right', render: (row) => row.quantidade.toLocaleString('pt-BR') },
                { key: 'gmv_atribuido', header: 'GMV', align: 'right', render: (row) => formatMoney(row.gmv_atribuido) },
                { key: 'pedidos_atribuidos', header: 'Pedidos', align: 'right', render: (row) => row.pedidos_atribuidos.toLocaleString('pt-BR') },
                { key: 'acoes', header: '', align: 'right', render: (row) => row.editavel ? (
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" icon={Pencil} aria-label="Editar vídeo" title="Editar vídeo" onClick={() => open(row)}><span className="sr-only">Editar vídeo</span></Button>
                    <Button variant="ghost" size="icon" icon={Trash2} aria-label="Excluir vídeo" title="Excluir vídeo" onClick={() => setRemoving(row)}><span className="sr-only">Excluir vídeo</span></Button>
                  </div>
                ) : null },
              ]}
            />}
      </CardBody>

      {editing !== undefined ? (
        <Modal
          open
          title={editing ? 'Editar vídeo' : 'Registrar vídeo'}
          subtitle="Conta na sua meta de vídeos na hora. GMV e pedidos são opcionais."
          onClose={close}
          closeDisabled={save.isPending}
          footer={<div className="flex w-full flex-wrap justify-end gap-2"><Button variant="secondary" onClick={close} disabled={save.isPending}>Cancelar</Button><Button icon={Send} isLoading={save.isPending} onClick={submit}>Salvar</Button></div>}
        >
          <div className="grid min-w-0 gap-3 p-1 sm:grid-cols-2 [&_input]:min-w-0 [&_input]:w-full [&_input]:text-base [&_select]:min-w-0 [&_select]:w-full [&_select]:text-base [&_textarea]:text-base">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">Marca
              <select className="design-input h-11 px-3" value={form.marca_id} onChange={set('marca_id')}>
                <option value="">{options.isLoading ? 'Carregando marcas…' : 'Selecione'}</option>
                {(options.data?.marcas ?? []).map((marca) => <option key={marca.id} value={marca.id}>{marca.nome}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">Dia
              <input type="date" className="design-input h-11 px-3" min={`${currentMonth()}-01`} max={getSaoPauloDateInput()} value={form.data} onChange={set('data')} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">Quantidade de vídeos
              <input inputMode="numeric" className="design-input h-11 px-3" value={form.quantidade} onChange={set('quantidade')} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">GMV (opcional)
              <input inputMode="decimal" placeholder="0,00" className="design-input h-11 px-3" value={form.gmv} onChange={set('gmv')} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">Pedidos (opcional)
              <input inputMode="numeric" placeholder="0" className="design-input h-11 px-3" value={form.pedidos} onChange={set('pedidos')} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">Observação
              <textarea className="design-input min-h-24 p-3" maxLength={1000} value={form.observacoes} onChange={set('observacoes')} />
            </label>
            {error ? <p role="alert" className="text-sm text-[var(--danger)] sm:col-span-2">{error}</p> : null}
          </div>
        </Modal>
      ) : null}

      {removing ? (
        <Modal
          open
          title="Excluir vídeo"
          subtitle={`${removing.quantidade} vídeo(s) de ${formatDate(removing.data)} — ${removing.marca_nome ?? ''}`}
          onClose={() => setRemoving(null)}
          closeDisabled={remove.isPending}
          footer={<div className="flex w-full flex-wrap justify-end gap-2"><Button variant="secondary" onClick={() => setRemoving(null)} disabled={remove.isPending}>Cancelar</Button><Button variant="danger" isLoading={remove.isPending} onClick={() => remove.mutate(removing.id)}>Excluir</Button></div>}
        >
          <p className="text-sm text-ink-muted">O registro sai da sua contagem do mês.</p>
        </Modal>
      ) : null}
    </Card>
  )
}
