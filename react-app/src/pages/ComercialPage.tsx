import { Building2, CircleDollarSign, Download, Handshake, LayoutDashboard, Plus, Store, Users, Workflow } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { MetricCard } from '../components/ui/MetricCard'
import { Badge, statusTone } from '../components/ui/Badge'
import { LoadingState, ErrorState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { createCliente, createMarca, getClientes, getCrmSummary, getLeads, getMarcas } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, formatMoney, getRecord } from '../utils/format'
import { downloadCsv } from '../utils/exportCsv'
import { metric, moneyMetric, percentMetric } from './page-helpers'
import { CrmPage } from './CrmPage'
import type { JsonRecord } from '../types/models'

type ComercialTab = 'dashboard' | 'crm' | 'ativos'

const emptyClienteForm = {
  nome: '',
  responsavel: '',
  whatsapp: '',
  email: '',
  cnpj: '',
  nicho: '',
  tiktok_username: '',
}

const emptyAfiliadoForm = {
  nome: '',
  responsavel: '',
  whatsapp: '',
  email: '',
  tiktok_username: '',
  observacoes: '',
}

export function ComercialPage() {
  const [tab, setTab] = useState<ComercialTab>('dashboard')
  const [showClienteForm, setShowClienteForm] = useState(false)
  const [showAfiliadoForm, setShowAfiliadoForm] = useState(false)
  const [clienteForm, setClienteForm] = useState(emptyClienteForm)
  const [afiliadoForm, setAfiliadoForm] = useState(emptyAfiliadoForm)
  const queryClient = useQueryClient()

  const summaryQuery = useQuery({ queryKey: ['crm-summary'], queryFn: getCrmSummary })
  const leadsQuery = useQuery({ queryKey: ['leads'], queryFn: getLeads })
  const clientesQuery = useQuery({ queryKey: ['clientes'], queryFn: getClientes })
  const marcasQuery = useQuery({ queryKey: ['marcas', 'ativas'], queryFn: () => getMarcas({ status: 'ativa' }) })

  const clienteMutation = useMutation({
    mutationFn: createCliente,
    onSuccess: () => {
      setClienteForm(emptyClienteForm)
      setShowClienteForm(false)
      void queryClient.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
  const afiliadoMutation = useMutation({
    mutationFn: createMarca,
    onSuccess: () => {
      setAfiliadoForm(emptyAfiliadoForm)
      setShowAfiliadoForm(false)
      void queryClient.invalidateQueries({ queryKey: ['marcas'] })
      void queryClient.invalidateQueries({ queryKey: ['marcas', 'ativas'] })
    },
  })

  const isLoading = summaryQuery.isLoading || leadsQuery.isLoading || clientesQuery.isLoading || marcasQuery.isLoading
  const error = summaryQuery.error ?? leadsQuery.error ?? clientesQuery.error ?? marcasQuery.error
  const summary = getRecord(summaryQuery.data?.summary)
  const totals = getRecord(summaryQuery.data?.totals)
  const leads = leadsQuery.data ?? []
  const clientes = clientesQuery.data ?? []
  const marcas = marcasQuery.data ?? []
  const ganhos = asNumber(summary.ganhos ?? totals.ganhos)
  const taxaConversao = leads.length ? (ganhos / leads.length) * 100 : 0
  const metrics = [
    metric('Leads abertos', leads.filter((lead) => !['ganho', 'perdido'].includes(asString((lead as unknown as JsonRecord).crm_etapa))).length, 'pipeline ativo', 'neutral'),
    moneyMetric('Valor em negociação', summary.valor_estimado ?? totals.valor_pipeline ?? totals.valor_estimado, 'pipeline aberto', 'brand'),
    metric('Ganhos no mês', ganhos, 'clientes convertidos', 'success'),
    percentMetric('Conversão', taxaConversao, 'ganhos sobre leads', 'info'),
    metric('Clientes ativos', clientes.length, 'carteira da unidade', 'success'),
    metric('Afiliados ativos', marcas.filter((item) => asString(item.tipo) === 'afiliada').length, 'marcas afiliadas', 'brand'),
    metric('Marcas ativas', marcas.length, 'operação comercial', 'neutral'),
  ]

  const ativos = useMemo(() => {
    const marcasPorCliente = new Map<string, JsonRecord[]>()
    marcas.forEach((marca) => {
      const clienteId = asString(marca.cliente_id, '')
      if (!clienteId) return
      marcasPorCliente.set(clienteId, [...(marcasPorCliente.get(clienteId) ?? []), marca])
    })

    const clientesRows = clientes.map((cliente) => ({
      ...cliente,
      tipo_operacional: 'cliente_ecommerce',
      marca_principal: asString(marcasPorCliente.get(asString(cliente.id, ''))?.[0]?.nome, asString(cliente.nome)),
      apresentadoras: marcasPorCliente.get(asString(cliente.id, ''))?.[0]?.apresentadoras,
    }))
    const marcasSemCliente = marcas
      .filter((marca) => !marca.cliente_id)
      .map((marca) => ({
        ...marca,
        tipo_operacional: asString(marca.tipo, 'marca'),
        marca_principal: asString(marca.nome),
      }))

    return [...clientesRows, ...marcasSemCliente]
  }, [clientes, marcas])

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={() => {
    void summaryQuery.refetch()
    void leadsQuery.refetch()
    void clientesQuery.refetch()
    void marcasQuery.refetch()
  }} />

  function setClienteField(key: keyof typeof emptyClienteForm, value: string) {
    setClienteForm((current) => ({ ...current, [key]: value }))
  }

  function setAfiliadoField(key: keyof typeof emptyAfiliadoForm, value: string) {
    setAfiliadoForm((current) => ({ ...current, [key]: value }))
  }

  function exportAtivosCsv() {
    downloadCsv('clientes-afiliados.csv', ativos, [
      { key: 'tipo_operacional', header: 'tipo' },
      { key: 'nome', header: 'nome' },
      { key: 'marca_principal', header: 'marca_principal' },
      { key: 'status', header: 'status' },
      { key: 'gmv_mes', header: 'gmv_mes', value: (row) => row.gmv_mes ?? row.fat_anual ?? 0 },
      { key: 'lives_mes', header: 'lives_mes', value: (row) => row.lives_mes ?? row.total_lives ?? 0 },
      { key: 'videos_mes', header: 'videos_mes', value: (row) => row.videos_mes ?? row.quantidade_videos ?? 0 },
      {
        key: 'apresentadoras',
        header: 'apresentadoras',
        value: (row) => Array.isArray(row.apresentadoras)
          ? row.apresentadoras.map((ap) => asString((ap as JsonRecord).nome)).join(', ')
          : asString(row.apresentadora_nome, ''),
      },
      { key: 'responsavel', header: 'responsavel', value: (row) => row.responsavel_nome ?? row.gerente_nome ?? '' },
    ])
  }

  function onClienteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clienteMutation.mutate({
      nome: clienteForm.nome,
      celular: clienteForm.whatsapp,
      email: clienteForm.email || undefined,
      cnpj: clienteForm.cnpj || undefined,
      razao_social: clienteForm.responsavel || undefined,
      nicho: clienteForm.nicho || undefined,
      tiktok_username: clienteForm.tiktok_username || undefined,
    })
  }

  function onAfiliadoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    afiliadoMutation.mutate({
      nome: afiliadoForm.nome,
      tipo: 'afiliada',
      status: 'ativa',
      tiktok_username: afiliadoForm.tiktok_username || undefined,
      observacoes: [
        afiliadoForm.responsavel ? `Responsável: ${afiliadoForm.responsavel}` : '',
        afiliadoForm.whatsapp ? `WhatsApp: ${afiliadoForm.whatsapp}` : '',
        afiliadoForm.email ? `E-mail: ${afiliadoForm.email}` : '',
        afiliadoForm.observacoes,
      ].filter(Boolean).join('\n') || undefined,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Comercial" accent="Operação" title="comercial" subtitle="Dashboard, CRM e carteira ativa em uma única área." />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-1">
        {[
          ['dashboard', LayoutDashboard, 'Dashboard'],
          ['crm', Workflow, 'CRM'],
          ['ativos', Store, 'Clientes e afiliados'],
        ].map(([key, Icon, label]) => (
          <button
            key={String(key)}
            type="button"
            className={tab === key ? 'inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white' : 'inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-ink-muted hover:bg-surface-muted'}
            onClick={() => setTab(key as ComercialTab)}
          >
            <Icon className="h-4 w-4" />
            {label as string}
          </button>
        ))}
      </div>

      {tab === 'dashboard' ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((item, index) => (
              <MetricCard key={item.label} metric={item} icon={[Users, CircleDollarSign, Handshake, Workflow, Building2, Store, LayoutDashboard][index]} />
            ))}
          </section>
          <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
            <Card>
              <CardHeader>
                <p className="text-base font-bold text-ink">Pipeline por etapa</p>
              </CardHeader>
              <CardBody className="space-y-3">
                {asArray<JsonRecord>(summaryQuery.data?.pipeline).map((stage, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-[1fr_120px_120px] md:items-center">
                    <p className="text-sm font-semibold text-ink">{asString(stage.etapa ?? stage.stage ?? stage.label)}</p>
                    <p className="num text-sm font-bold text-ink md:text-right">{asNumber(stage.total ?? stage.count).toLocaleString('pt-BR')}</p>
                    <p className="num text-sm font-bold text-ink md:text-right">{formatMoney(stage.valor ?? stage.value)}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <p className="text-base font-bold text-ink">Leads parados</p>
              </CardHeader>
              <CardBody className="space-y-3">
                {leads
                  .filter((lead) => {
                    const record = lead as unknown as JsonRecord
                    const updated = new Date(asString(record.atualizado_em ?? record.criado_em, ''))
                    return !Number.isNaN(updated.getTime()) && Date.now() - updated.getTime() > 7 * 24 * 60 * 60 * 1000
                  })
                  .slice(0, 5)
                  .map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between rounded-2xl border border-line bg-surface-muted p-3">
                      <span className="text-sm font-semibold text-ink">{asString(lead.nome ?? lead.nome_cliente ?? lead.cliente_nome)}</span>
                      <Badge tone="warning">{asString((lead as unknown as JsonRecord).crm_etapa, 'lead_novo')}</Badge>
                    </div>
                  ))}
              </CardBody>
            </Card>
          </section>
        </>
      ) : null}

      {tab === 'crm' ? <CrmPage /> : null}

      {tab === 'ativos' ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base font-bold text-ink">Clientes e afiliados</p>
                <div className="flex flex-wrap gap-2">
                  <Button icon={Plus} onClick={() => setShowClienteForm((value) => !value)}>Novo cliente</Button>
                  <Button variant="secondary" icon={Plus} onClick={() => setShowAfiliadoForm((value) => !value)}>Novo afiliado</Button>
                  <Button variant="secondary" icon={Download} onClick={exportAtivosCsv}>Exportar CSV</Button>
                </div>
              </div>
            </CardHeader>
            {(showClienteForm || showAfiliadoForm) ? (
              <CardBody className="grid gap-4 xl:grid-cols-2">
                {showClienteForm ? (
                  <form className="grid gap-3 rounded-2xl border border-line bg-surface-muted p-4 md:grid-cols-2" onSubmit={onClienteSubmit}>
                    <p className="text-sm font-bold text-ink md:col-span-2">Novo cliente</p>
                    <input className="design-input h-11 px-4" placeholder="Nome da empresa/marca" value={clienteForm.nome} onChange={(event) => setClienteField('nome', event.target.value)} required />
                    <input className="design-input h-11 px-4" placeholder="Responsável" value={clienteForm.responsavel} onChange={(event) => setClienteField('responsavel', event.target.value)} />
                    <input className="design-input h-11 px-4" placeholder="WhatsApp" value={clienteForm.whatsapp} onChange={(event) => setClienteField('whatsapp', event.target.value)} required />
                    <input className="design-input h-11 px-4" placeholder="E-mail" type="email" value={clienteForm.email} onChange={(event) => setClienteField('email', event.target.value)} />
                    <input className="design-input h-11 px-4" placeholder="CNPJ" value={clienteForm.cnpj} onChange={(event) => setClienteField('cnpj', event.target.value)} />
                    <input className="design-input h-11 px-4" placeholder="Nicho" value={clienteForm.nicho} onChange={(event) => setClienteField('nicho', event.target.value)} />
                    <input className="design-input h-11 px-4 md:col-span-2" placeholder="TikTok username" value={clienteForm.tiktok_username} onChange={(event) => setClienteField('tiktok_username', event.target.value)} />
                    {clienteMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] md:col-span-2">{extractErrorMessage(clienteMutation.error)}</p> : null}
                    <Button type="submit" isLoading={clienteMutation.isPending}>Salvar cliente</Button>
                  </form>
                ) : null}
                {showAfiliadoForm ? (
                  <form className="grid gap-3 rounded-2xl border border-line bg-surface-muted p-4 md:grid-cols-2" onSubmit={onAfiliadoSubmit}>
                    <p className="text-sm font-bold text-ink md:col-span-2">Novo afiliado</p>
                    <input className="design-input h-11 px-4" placeholder="Nome da marca afiliada" value={afiliadoForm.nome} onChange={(event) => setAfiliadoField('nome', event.target.value)} required />
                    <input className="design-input h-11 px-4" placeholder="Responsável" value={afiliadoForm.responsavel} onChange={(event) => setAfiliadoField('responsavel', event.target.value)} />
                    <input className="design-input h-11 px-4" placeholder="WhatsApp" value={afiliadoForm.whatsapp} onChange={(event) => setAfiliadoField('whatsapp', event.target.value)} />
                    <input className="design-input h-11 px-4" placeholder="E-mail" type="email" value={afiliadoForm.email} onChange={(event) => setAfiliadoField('email', event.target.value)} />
                    <input className="design-input h-11 px-4 md:col-span-2" placeholder="TikTok username" value={afiliadoForm.tiktok_username} onChange={(event) => setAfiliadoField('tiktok_username', event.target.value)} />
                    <textarea className="design-input min-h-24 px-4 py-3 md:col-span-2" placeholder="Observações" value={afiliadoForm.observacoes} onChange={(event) => setAfiliadoField('observacoes', event.target.value)} />
                    {afiliadoMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] md:col-span-2">{extractErrorMessage(afiliadoMutation.error)}</p> : null}
                    <Button type="submit" isLoading={afiliadoMutation.isPending}>Salvar afiliado</Button>
                  </form>
                ) : null}
              </CardBody>
            ) : null}
          </Card>

          <Card>
            <CardBody>
              <DataTable<JsonRecord>
                data={ativos}
                columns={[
                  { key: 'tipo_operacional', header: 'Tipo', render: (item) => <Badge tone="brand">{asString(item.tipo_operacional ?? item.tipo)}</Badge> },
                  { key: 'nome', header: 'Nome', render: (item) => <span className="font-semibold">{asString(item.nome)}</span> },
                  { key: 'marca_principal', header: 'Marca principal', render: (item) => asString(item.marca_principal) },
                  { key: 'status', header: 'Status', render: (item) => <Badge tone={statusTone(asString(item.status, 'ativa'))}>{asString(item.status, 'ativa')}</Badge> },
                  { key: 'gmv_mes', header: 'GMV mês', align: 'right', render: (item) => formatMoney(item.gmv_mes ?? item.fat_anual) },
                  { key: 'lives_mes', header: 'Lives', align: 'right', render: (item) => asNumber(item.lives_mes ?? item.total_lives).toLocaleString('pt-BR') },
                  { key: 'videos_mes', header: 'Vídeos', align: 'right', render: (item) => asNumber(item.videos_mes ?? item.quantidade_videos).toLocaleString('pt-BR') },
                  {
                    key: 'apresentadoras',
                    header: 'Apresentadoras',
                    render: (item) => {
                      const vinculadas = Array.isArray(item.apresentadoras) ? item.apresentadoras : []
                      return vinculadas.length
                        ? vinculadas.map((ap) => asString((ap as JsonRecord).nome)).join(', ')
                        : asString(item.apresentadora_nome)
                    },
                  },
                  { key: 'responsavel', header: 'Responsável', render: (item) => asString(item.responsavel_nome ?? item.gerente_nome) },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
