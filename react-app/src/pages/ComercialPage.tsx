import { Building2, CircleDollarSign, Handshake, LayoutDashboard, Store, Users, Workflow, FileText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { MetricCard } from '../components/ui/MetricCard'
import { Badge, statusTone } from '../components/ui/Badge'
import { LoadingState, ErrorState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { getClientes, getCrmSummary, getLeads, getMarcas, exportarDadosCliente } from '../services/domain'
import { useCurrentUser } from '../stores/auth-store'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, formatMoney, getRecord } from '../utils/format'
import { metric, moneyMetric, percentMetric } from './page-helpers'
import { CrmPage } from './CrmPage'
import type { JsonRecord } from '../types/models'

type ComercialTab = 'dashboard' | 'crm' | 'ativos'

export function ComercialPage() {
  const user = useCurrentUser()
  const [tab, setTab] = useState<ComercialTab>('dashboard')
  const summaryQuery = useQuery({ queryKey: ['crm-summary'], queryFn: getCrmSummary })
  const leadsQuery = useQuery({ queryKey: ['leads'], queryFn: getLeads })
  const clientesQuery = useQuery({ queryKey: ['clientes'], queryFn: getClientes })
  const marcasQuery = useQuery({ queryKey: ['marcas', 'ativas'], queryFn: () => getMarcas({ status: 'ativa' }) })
  const exportMutation = useMutation({ mutationFn: exportarDadosCliente })

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
    metric('Leads totais', summary.total_leads ?? totals.total_leads ?? leads.length, 'pipeline comercial', 'neutral'),
    moneyMetric('Pipeline', summary.valor_estimado ?? totals.valor_pipeline ?? totals.valor_estimado, 'valor estimado', 'brand'),
    metric('Ganhos 30 dias', ganhos, 'clientes convertidos', 'success'),
    percentMetric('Conversão', taxaConversao, 'ganhos sobre leads', 'info'),
    metric('Clientes ativos', clientes.length, 'carteira da unidade', 'success'),
    metric('Afiliados ativos', marcas.filter((item) => asString(item.tipo) === 'afiliada').length, 'marcas afiliadas', 'brand'),
    metric('Marcas ativas', marcas.length, 'operação comercial', 'neutral'),
  ]

  const canExportData = user?.papel === 'franqueador_master' || user?.papel === 'franqueado'
  const ativos = useMemo(() => {
    const marcasPorCliente = new Map<string, JsonRecord[]>()
    marcas.forEach((marca) => {
      const clienteId = asString(marca.cliente_id, '')
      if (!clienteId) return
      marcasPorCliente.set(clienteId, [...(marcasPorCliente.get(clienteId) ?? []), marca])
    })

    const clientesRows = clientes.map((cliente) => ({
      ...cliente,
      tipo_operacional: 'cliente',
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

  function handleExportarDados(clienteId: string) {
    exportMutation.mutate(clienteId, {
      onSuccess: (data) => {
        const jsonString = JSON.stringify(data, null, 2)
        const blob = new Blob([jsonString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `dados-cliente-${clienteId}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      },
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Comercial" accent="Operação" title="comercial" subtitle="Dashboard, CRM e carteira ativa em uma única área." />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-1">
        {[
          ['dashboard', LayoutDashboard, 'Dashboard'],
          ['crm', Workflow, 'CRM Comercial'],
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
                <p className="text-base font-bold text-ink">Origem dos leads</p>
              </CardHeader>
              <CardBody className="space-y-3">
                {['Cliente', 'Creator', 'Unidade', 'Bio'].map((origem) => {
                  const count = leads.filter((lead) => `${lead.origem ?? ''} ${lead.nicho ?? ''}`.toLowerCase().includes(origem.toLowerCase())).length
                  return (
                    <div key={origem} className="flex items-center justify-between rounded-2xl border border-line bg-surface-muted p-3">
                      <span className="text-sm font-semibold text-ink">{origem}</span>
                      <Badge tone="brand">{count}</Badge>
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          </section>
        </>
      ) : null}

      {tab === 'crm' ? <CrmPage /> : null}

      {tab === 'ativos' ? (
        <Card>
          <CardHeader>
            <p className="text-base font-bold text-ink">Clientes e afiliados ativos</p>
          </CardHeader>
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
                ...(canExportData ? [{
                  key: 'acoes',
                  header: 'Ações',
                  align: 'right' as const,
                  render: (item: JsonRecord) => (
                    item.tipo_operacional === 'cliente' ? (
                      <Button
                        variant="ghost"
                        icon={FileText}
                        disabled={exportMutation.isPending}
                        onClick={() => handleExportarDados(asString(item.id))}
                      >
                        Exportar
                      </Button>
                    ) : null
                  ),
                }] : []),
              ]}
            />
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
