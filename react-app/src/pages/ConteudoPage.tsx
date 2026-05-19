import { BarChart3, CalendarClock, MonitorPlay, Plus, Presentation, RefreshCcw, Video } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, statusTone } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { MetricCard } from '../components/ui/MetricCard'
import { LoadingState, ErrorState } from '../components/ui/States'
import { AnalyticsPage } from './AnalyticsPage'
import { CabinesPage } from './CabinesPage'
import {
  createAgendaEvento,
  createVideo,
  getAgenda,
  getApresentadoras,
  getCabines,
  getComissoesResumo,
  getLives,
  getMarcas,
  getVideos,
} from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, currentPeriod, formatDate, formatMoney } from '../utils/format'
import { metric, moneyMetric } from './page-helpers'
import type { JsonRecord } from '../types/models'

type ConteudoTab = 'calendario' | 'cabines' | 'lives' | 'videos' | 'analytics'

const emptyVideo = {
  marca_id: '',
  apresentadora_id: '',
  data: new Date().toISOString().slice(0, 10),
  quantidade: '1',
  plataforma: 'tiktok',
  campanha: '',
  gmv_atribuido: '0',
  pedidos_atribuidos: '0',
  observacoes: '',
}

export function ConteudoPage() {
  const [params, setParams] = useSearchParams()
  const initialTab = (params.get('tab') as ConteudoTab | null) ?? 'calendario'
  const [tab, setTab] = useState<ConteudoTab>(initialTab)
  const [videoForm, setVideoForm] = useState(emptyVideo)
  const period = currentPeriod()
  const client = useQueryClient()

  const agenda = useQuery({ queryKey: ['agenda'], queryFn: () => getAgenda() })
  const cabines = useQuery({ queryKey: ['cabines'], queryFn: getCabines })
  const lives = useQuery({ queryKey: ['lives', 'encerrada'], queryFn: () => getLives({ status: 'encerrada' }) })
  const livesAll = useQuery({ queryKey: ['lives'], queryFn: () => getLives() })
  const videos = useQuery({ queryKey: ['videos'], queryFn: () => getVideos() })
  const marcas = useQuery({ queryKey: ['marcas', 'ativas'], queryFn: () => getMarcas({ status: 'ativa' }) })
  const apresentadoras = useQuery({ queryKey: ['apresentadoras'], queryFn: getApresentadoras })
  const comissoes = useQuery({ queryKey: ['comissoes-resumo', period.ano, period.mes], queryFn: () => getComissoesResumo() })
  const createVideoMutation = useMutation({
    mutationFn: createVideo,
    onSuccess: () => {
      setVideoForm(emptyVideo)
      void client.invalidateQueries({ queryKey: ['videos'] })
      void client.invalidateQueries({ queryKey: ['comissoes-resumo'] })
    },
  })
  const createAgendaMutation = useMutation({
    mutationFn: createAgendaEvento,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['agenda'] }),
  })

  const selectedLiveId = params.get('live') ?? ''
  const selectedLive = useMemo(() => {
    const rows = lives.data ?? []
    if (!selectedLiveId) return null
    return rows.find((live) => asString(live.id, '') === selectedLiveId) ?? null
  }, [lives.data, selectedLiveId])

  const cabinesComStatus = (cabines.data ?? []).map((cabine) => ({
    ...cabine,
    ocupada: (livesAll.data ?? []).some(
      (live) => live.cabine_id === cabine.id && live.status === 'em_andamento'
    ),
  }))

  const isLoading = agenda.isLoading || cabines.isLoading || lives.isLoading || livesAll.isLoading || videos.isLoading || marcas.isLoading || apresentadoras.isLoading || comissoes.isLoading
  const error = agenda.error ?? cabines.error ?? lives.error ?? livesAll.error ?? videos.error ?? marcas.error ?? apresentadoras.error ?? comissoes.error
  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={() => {
    void agenda.refetch()
    void cabines.refetch()
    void lives.refetch()
    void livesAll.refetch()
    void videos.refetch()
    void marcas.refetch()
    void apresentadoras.refetch()
    void comissoes.refetch()
  }} />

  const metrics = [
    metric('Cabines', cabines.data?.length ?? 0, 'recursos físicos', 'neutral'),
    metric('Lives mês', lives.data?.length ?? 0, 'realizadas', 'success'),
    metric('Vídeos', videos.data?.reduce((sum, item) => sum + asNumber(item.quantidade), 0) ?? 0, 'gravados', 'brand'),
    moneyMetric('GMV vídeos', comissoes.data?.gmv_videos, 'vendas atribuídas', 'info'),
    moneyMetric('Comissão', comissoes.data?.comissao_apresentadoras, 'live + vídeo', 'warning'),
  ]

  function switchTab(next: ConteudoTab) {
    setTab(next)
    const nextParams = new URLSearchParams(params)
    if (next === 'calendario') nextParams.delete('tab')
    else nextParams.set('tab', next)
    setParams(nextParams, { replace: true })
  }

  function setVideoField(key: keyof typeof emptyVideo, value: string) {
    setVideoForm((current) => ({ ...current, [key]: value }))
  }

  function onVideoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    createVideoMutation.mutate({
      ...videoForm,
      quantidade: asNumber(videoForm.quantidade),
      gmv_atribuido: asNumber(videoForm.gmv_atribuido),
      pedidos_atribuidos: asNumber(videoForm.pedidos_atribuidos),
      apresentadora_id: videoForm.apresentadora_id || null,
      campanha: videoForm.campanha || null,
      observacoes: videoForm.observacoes || null,
    })
  }

  function createQuickAgenda(tipo: 'live' | 'gravacao_video') {
    const marcaId = asString(marcas.data?.[0]?.id, '')
    if (!marcaId) return
    const inicio = new Date()
    const fim = new Date(inicio.getTime() + 60 * 60 * 1000)
    createAgendaMutation.mutate({
      tipo,
      marca_id: marcaId,
      data_inicio: inicio.toISOString(),
      data_fim: fim.toISOString(),
      status: 'planejado',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conteúdo"
        accent="Produção"
        title="operacional"
        subtitle="Calendário, cabines, lives, vídeos e analytics em um fluxo único."
        actions={<Button variant="secondary" icon={RefreshCcw} onClick={() => {
          void agenda.refetch()
          void cabines.refetch()
          void lives.refetch()
          void livesAll.refetch()
          void videos.refetch()
        }}>Atualizar</Button>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((item, index) => (
          <MetricCard key={item.label} metric={item} icon={[Presentation, MonitorPlay, Video, BarChart3, CalendarClock][index]} />
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-1">
        {[
          ['calendario', CalendarClock, 'Calendário'],
          ['cabines', Presentation, 'Cabines'],
          ['lives', MonitorPlay, 'Lives realizadas'],
          ['videos', Video, 'Vídeos gravados'],
          ['analytics', BarChart3, 'Analytics'],
        ].map(([key, Icon, label]) => (
          <button key={String(key)} type="button" className={tab === key ? 'inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white' : 'inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-ink-muted hover:bg-surface-muted'} onClick={() => switchTab(key as ConteudoTab)}>
            <Icon className="h-4 w-4" />
            {label as string}
          </button>
        ))}
      </div>

      {tab === 'calendario' ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Agenda operacional</p>
            </CardHeader>
            <CardBody>
              <DataTable<JsonRecord>
                data={agenda.data ?? []}
                columns={[
                  { key: 'tipo', header: 'Tipo', render: (item) => <Badge tone="brand">{asString(item.tipo)}</Badge> },
                  { key: 'marca_nome', header: 'Marca', render: (item) => asString(item.marca_nome) },
                  { key: 'cabine_numero', header: 'Cabine', render: (item) => asString(item.cabine_nome ?? item.cabine_numero, 'Sem cabine') },
                  { key: 'data_inicio', header: 'Início', render: (item) => formatDate(asString(item.data_inicio, '')) },
                  { key: 'status', header: 'Status', render: (item) => <Badge tone={statusTone(asString(item.status))}>{asString(item.status)}</Badge> },
                ]}
              />
            </CardBody>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <p className="text-base font-bold text-ink">Status das cabines</p>
              </CardHeader>
              <CardBody>
                <DataTable<JsonRecord>
                  data={cabinesComStatus}
                  columns={[
                    { key: 'numero', header: 'Cabine', render: (item) => `Cabine ${String(item.numero ?? '').padStart(2, '0')}` },
                    { key: 'ocupada', header: 'Status', render: (item) => <Badge tone={item.ocupada ? 'danger' : 'success'}>{item.ocupada ? 'Em live' : 'Livre'}</Badge> },
                  ]}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <p className="text-base font-bold text-ink">Novo evento rápido</p>
              </CardHeader>
              <CardBody className="space-y-3">
                <Button icon={MonitorPlay} className="w-full" isLoading={createAgendaMutation.isPending} onClick={() => createQuickAgenda('live')}>Live</Button>
                <Button icon={Video} variant="secondary" className="w-full" isLoading={createAgendaMutation.isPending} onClick={() => createQuickAgenda('gravacao_video')}>Gravação de vídeo</Button>
                {createAgendaMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(createAgendaMutation.error)}</p> : null}
              </CardBody>
            </Card>
          </div>
        </section>
      ) : null}

      {tab === 'cabines' ? <CabinesPage title="Cabines de conteúdo" /> : null}

      {tab === 'lives' ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Lives</p>
            </CardHeader>
            <CardBody>
              <DataTable<JsonRecord>
                data={lives.data ?? []}
                columns={[
                  { key: 'iniciado_em', header: 'Data', render: (item) => formatDate(asString(item.iniciado_em, '')) },
                  { key: 'cliente_nome', header: 'Marca/cliente', render: (item) => asString(item.marca_nome ?? item.cliente_nome) },
                  { key: 'cabine_numero', header: 'Cabine', render: (item) => asString(item.cabine_numero) },
                  { key: 'apresentador_nome', header: 'Apresentadora', render: (item) => asString(item.apresentador_nome) },
                  { key: 'fat_gerado', header: 'GMV', align: 'right', render: (item) => formatMoney(item.fat_gerado) },
                  { key: 'status', header: 'Status', render: (item) => <Badge tone={statusTone(asString(item.status))}>{asString(item.status)}</Badge> },
                  { key: 'selecionar', header: '', align: 'right', render: (item) => <Button variant="ghost" onClick={() => setParams({ live: asString(item.id, ''), tab: 'lives' })}>Selecionar</Button> },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Live selecionada</p>
            </CardHeader>
            <CardBody>
              {selectedLive ? (
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-ink-muted">Cliente</dt><dd className="font-semibold text-ink">{asString(selectedLive.cliente_nome)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-ink-muted">GMV</dt><dd className="font-semibold text-ink">{formatMoney(selectedLive.fat_gerado)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-ink-muted">Pedidos</dt><dd className="font-semibold text-ink">{asNumber(selectedLive.final_orders_count).toLocaleString('pt-BR')}</dd></div>
                </dl>
              ) : (
                <p className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-ink-muted">Nenhuma live selecionada.</p>
              )}
            </CardBody>
          </Card>
        </section>
      ) : null}

      {tab === 'videos' ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Vídeos gravados</p>
            </CardHeader>
            <CardBody>
              <DataTable<JsonRecord>
                data={videos.data ?? []}
                columns={[
                  { key: 'data', header: 'Data', render: (item) => formatDate(asString(item.data, '')) },
                  { key: 'marca_nome', header: 'Marca', render: (item) => asString(item.marca_nome) },
                  { key: 'apresentadora_nome', header: 'Apresentadora', render: (item) => asString(item.apresentadora_nome) },
                  { key: 'quantidade', header: 'Qtd', align: 'right', render: (item) => asNumber(item.quantidade).toLocaleString('pt-BR') },
                  { key: 'gmv_atribuido', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv_atribuido) },
                  { key: 'pedidos_atribuidos', header: 'Pedidos', align: 'right', render: (item) => asNumber(item.pedidos_atribuidos).toLocaleString('pt-BR') },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Registrar vídeo</p>
            </CardHeader>
            <CardBody>
              <form className="space-y-3" onSubmit={onVideoSubmit}>
                <select className="design-input h-11 w-full px-4" value={videoForm.marca_id} onChange={(event) => setVideoField('marca_id', event.target.value)} required>
                  <option value="">Marca</option>
                  {(marcas.data ?? []).map((item) => <option key={asString(item.id, '')} value={asString(item.id, '')}>{asString(item.nome)}</option>)}
                </select>
                <select className="design-input h-11 w-full px-4" value={videoForm.apresentadora_id} onChange={(event) => setVideoField('apresentadora_id', event.target.value)}>
                  <option value="">Apresentadora</option>
                  {(apresentadoras.data ?? []).map((item) => <option key={asString(item.id, '')} value={asString(item.id, '')}>{asString(item.nome)}</option>)}
                </select>
                <input className="design-input h-11 w-full px-4" type="date" value={videoForm.data} onChange={(event) => setVideoField('data', event.target.value)} required />
                <div className="grid grid-cols-2 gap-3">
                  <input className="design-input h-11 w-full px-4" type="number" min="0" value={videoForm.quantidade} onChange={(event) => setVideoField('quantidade', event.target.value)} />
                  <input className="design-input h-11 w-full px-4" value={videoForm.plataforma} onChange={(event) => setVideoField('plataforma', event.target.value)} />
                </div>
                <input className="design-input h-11 w-full px-4" placeholder="Campanha" value={videoForm.campanha} onChange={(event) => setVideoField('campanha', event.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="design-input h-11 w-full px-4" type="number" min="0" step="0.01" placeholder="GMV" value={videoForm.gmv_atribuido} onChange={(event) => setVideoField('gmv_atribuido', event.target.value)} />
                  <input className="design-input h-11 w-full px-4" type="number" min="0" placeholder="Pedidos" value={videoForm.pedidos_atribuidos} onChange={(event) => setVideoField('pedidos_atribuidos', event.target.value)} />
                </div>
                <textarea className="design-input min-h-24 w-full px-4 py-3" placeholder="Observação" value={videoForm.observacoes} onChange={(event) => setVideoField('observacoes', event.target.value)} />
                {createVideoMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(createVideoMutation.error)}</p> : null}
                <Button type="submit" icon={Plus} isLoading={createVideoMutation.isPending}>Registrar vídeo</Button>
              </form>
            </CardBody>
          </Card>
        </section>
      ) : null}

      {tab === 'analytics' ? <AnalyticsPage /> : null}
    </div>
  )
}
