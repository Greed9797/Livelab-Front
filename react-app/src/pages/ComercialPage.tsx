import { Building2, CircleDollarSign, Download, Eye, Handshake, LayoutDashboard, Plus, Store, Trash2, Users, Workflow } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { MetricCard } from '../components/ui/MetricCard'
import { Badge, statusTone } from '../components/ui/Badge'
import { LoadingState, ErrorState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { ImagePicker } from '../components/ui/ImagePicker'
import { HistoricoAuditModal } from '../components/audit/HistoricoAuditModal'
import { createCliente, createMarca, deleteCliente, deleteMarca, getClienteOperacional, getClientes, getCrmSummary, getLeads, getMarcaOperacional, getMarcas, getMasterCrm, updateCliente, updateMarca, uploadImageAsset } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, formatMoney, getRecord } from '../utils/format'
import { getBrandImage } from '../utils/favicon'
import { downloadCsv } from '../utils/exportCsv'
import { metric, moneyMetric, percentMetric } from './page-helpers'
import { CrmPage } from './CrmPage'
import { QK } from '../services/query-keys'
import { useCurrentUser } from '../stores/auth-store'
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
  logo_url: '',
  criar_acesso: false,
  senha_temporaria: '',
}

const emptyAfiliadoForm = {
  nome: '',
  responsavel: '',
  whatsapp: '',
  email: '',
  tiktok_username: '',
  logo_url: '',
  observacoes: '',
}

// GMV operacional = verdade das lives (gmv_mes vem de /clientes e /marcas, derivado de
// lives+vídeos do mês). NÃO usa fat_anual (faturamento anual de contrato, dado cadastral
// estático que não reflete as lives) — sem lives no mês, mostra 0.
function officialOperationalGmv(item: JsonRecord) {
  return item.gmv_mes ?? item.gmv ?? item.ads_gmv ?? item.manual_gmv ?? 0
}

export function ComercialPage() {
  const [tab, setTab] = useState<ComercialTab>('ativos')
  const [showClienteForm, setShowClienteForm] = useState(false)
  const [showAfiliadoForm, setShowAfiliadoForm] = useState(false)
  const [clienteForm, setClienteForm] = useState(emptyClienteForm)
  const [afiliadoForm, setAfiliadoForm] = useState(emptyAfiliadoForm)
  const [selectedAtivo, setSelectedAtivo] = useState<JsonRecord | null>(null)
  const [ativoForm, setAtivoForm] = useState({ nome: '', status: 'ativo', email: '', celular: '', comissao_franquia_pct: '0', comissao_franqueadora_pct: '0', valor_fixo_minimo: '0', logo_url: '' })
  const [auditMarcaId, setAuditMarcaId] = useState<string | null>(null)
  // Para cliente_ecommerce, o % de comissão vive na marca principal vinculada.
  // Guardamos o id dessa marca para salvar o % via updateMarca.
  const [marcaPctId, setMarcaPctId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const user = useCurrentUser()
  const isMasterUser = user?.papel === 'franqueador_master'

  const summaryQuery = useQuery({
    queryKey: isMasterUser ? QK.masterCrm : QK.crmSummary,
    queryFn: isMasterUser ? () => getMasterCrm() : getCrmSummary,
  })
  const leadsQuery = useQuery({ queryKey: QK.leads, queryFn: getLeads })
  const clientesQuery = useQuery({ queryKey: QK.clientes(), queryFn: getClientes })
  const marcasQuery = useQuery({ queryKey: QK.marcas('ativas'), queryFn: () => getMarcas({ status: 'ativa' }) })
  const selectedAtivoId = asString(selectedAtivo?.id, '')
  const selectedAtivoKind = asString(selectedAtivo?.tipo_operacional) === 'cliente_ecommerce' ? 'cliente' : 'marca'
  const ativoDetailQuery = useQuery({
    queryKey: QK.ativoOperacional({ kind: selectedAtivoKind, id: selectedAtivoId }),
    enabled: Boolean(selectedAtivoId),
    queryFn: () => selectedAtivoKind === 'cliente'
      ? getClienteOperacional(selectedAtivoId)
      : getMarcaOperacional(selectedAtivoId),
  })

  const clienteMutation = useMutation({
    mutationFn: createCliente,
    onSuccess: () => {
      setClienteForm(emptyClienteForm)
      setShowClienteForm(false)
      void queryClient.invalidateQueries({ queryKey: QK.clientes() })
      void queryClient.invalidateQueries({ queryKey: QK.usuarios })
      void queryClient.invalidateQueries({ queryKey: QK.comissoesMarcas })
      void queryClient.invalidateQueries({ queryKey: QK.rankingMarcas() })
    },
  })
  const afiliadoMutation = useMutation({
    mutationFn: createMarca,
    onSuccess: () => {
      setAfiliadoForm(emptyAfiliadoForm)
      setShowAfiliadoForm(false)
      void queryClient.invalidateQueries({ queryKey: QK.marcas() })
      void queryClient.invalidateQueries({ queryKey: QK.marcas('ativas') })
      void queryClient.invalidateQueries({ queryKey: QK.comissoesMarcas })
      void queryClient.invalidateQueries({ queryKey: QK.rankingMarcas() })
    },
  })
  const ativoUpdateMutation = useMutation({
    mutationFn: ({ id, kind, payload }: { id: string; kind: 'cliente' | 'marca'; payload: JsonRecord }) => (
      kind === 'cliente' ? updateCliente(id, payload) : updateMarca(id, payload)
    ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QK.clientes() })
      void queryClient.invalidateQueries({ queryKey: QK.marcas() })
      void queryClient.invalidateQueries({ queryKey: QK.ativoOperacional() })
      void queryClient.invalidateQueries({ queryKey: QK.agenda() })
      void queryClient.invalidateQueries({ queryKey: QK.comissoesMarcas })
      void queryClient.invalidateQueries({ queryKey: QK.rankingMarcas() })
    },
  })
  const ativoDeleteMutation = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: 'cliente' | 'marca' }) => (
      kind === 'cliente' ? deleteCliente(id) : deleteMarca(id)
    ),
    onSuccess: () => {
      setSelectedAtivo(null)
      void queryClient.invalidateQueries({ queryKey: QK.clientes() })
      void queryClient.invalidateQueries({ queryKey: QK.marcas() })
      void queryClient.invalidateQueries({ queryKey: QK.marcas('ativas') })
      void queryClient.invalidateQueries({ queryKey: QK.agenda() })
      void queryClient.invalidateQueries({ queryKey: QK.comissoesMarcas })
      void queryClient.invalidateQueries({ queryKey: QK.rankingMarcas() })
    },
  })
  const uploadClienteImage = useMutation({
    mutationFn: (file: File) => uploadImageAsset(file, 'clientes'),
    onSuccess: (data) => setClienteField('logo_url', asString(data.url, '')),
  })
  const uploadAfiliadoImage = useMutation({
    mutationFn: (file: File) => uploadImageAsset(file, 'marcas'),
    onSuccess: (data) => setAfiliadoField('logo_url', asString(data.url, '')),
  })
  const uploadAtivoImage = useMutation({
    mutationFn: ({ file, folder }: { file: File; folder: 'clientes' | 'marcas' }) => uploadImageAsset(file, folder),
    onSuccess: (data) => setAtivoForm((current) => ({ ...current, logo_url: asString(data.url, '') })),
  })

  const isLoading = summaryQuery.isLoading || leadsQuery.isLoading || clientesQuery.isLoading || marcasQuery.isLoading
  const error = summaryQuery.error ?? leadsQuery.error ?? clientesQuery.error ?? marcasQuery.error
  const summary = getRecord(summaryQuery.data?.summary)
  const totals = getRecord(summaryQuery.data?.totals)
  const bioTotals = getRecord(summaryQuery.data?.bio_totals)
  const bioPorPersona = asArray<JsonRecord>(summaryQuery.data?.bio_por_persona)
  const leads = leadsQuery.data ?? []
  const clientes = clientesQuery.data ?? []
  const marcas = marcasQuery.data ?? []
  const crmLeadTotal = asNumber(totals.leads_total ?? summary.total_leads ?? leads.length)
  const ganhos = asNumber(summary.ganhos ?? totals.ganhos ?? totals.ganhos_30d)
  const taxaConversao = crmLeadTotal ? (ganhos / crmLeadTotal) * 100 : 0
  const metrics = [
    metric('Leads abertos', isMasterUser ? crmLeadTotal : leads.filter((lead) => !['ganho', 'perdido'].includes(asString((lead as unknown as JsonRecord).crm_etapa))).length, isMasterUser ? 'rede master' : 'pipeline ativo', 'neutral'),
    moneyMetric('Valor em negociação', summary.valor_estimado ?? totals.valor_pipeline ?? totals.valor_estimado ?? totals.valor_total, isMasterUser ? 'rede master' : 'pipeline aberto', 'brand'),
    metric('Ganhos no mês', ganhos, 'clientes convertidos', 'success'),
    percentMetric('Conversão', taxaConversao, 'ganhos sobre leads', 'info'),
    ...(isMasterUser ? [
      metric('Leads Bio', asNumber(bioTotals.total).toLocaleString('pt-BR'), `${asNumber(bioTotals.clientes).toLocaleString('pt-BR')} clientes · ${asNumber(bioTotals.franqueados).toLocaleString('pt-BR')} franquias · ${asNumber(bioTotals.apresentadores).toLocaleString('pt-BR')} creators`, 'brand' as const),
      moneyMetric('Potencial Bio', bioTotals.valor_total, 'payloads recebidos da página Bio', 'info' as const),
    ] : []),
    metric('Clientes ativos', clientes.length, 'carteira da unidade', 'success'),
    metric('Afiliados ativos', marcas.filter((item) => asString(item.tipo) === 'afiliada').length, 'marcas afiliadas', 'brand'),
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
      tipo_entidade: 'cliente',
      tipo_operacional: 'cliente_ecommerce',
      marca_principal: asString(marcasPorCliente.get(asString(cliente.id, ''))?.[0]?.nome, asString(cliente.nome)),
      apresentadoras: marcasPorCliente.get(asString(cliente.id, ''))?.[0]?.apresentadoras,
    }))
    const marcasSemCliente = marcas
      .filter((marca) => !marca.cliente_id)
      .map((marca) => ({
        ...marca,
        tipo_entidade: 'marca',
        tipo_operacional: asString(marca.tipo, 'marca'),
        marca_principal: asString(marca.nome),
      }))

    const unique = new Map<string, JsonRecord>()
    for (const itemRaw of [...clientesRows, ...marcasSemCliente]) {
      const item = itemRaw as JsonRecord
      const key = `${asString(item.tipo_operacional)}:${asString(item.nome).trim().toLowerCase()}`
      const existing = unique.get(key)
      if (!existing) {
        unique.set(key, item)
        continue
      }
      unique.set(key, {
        ...existing,
        logo_url: existing.logo_url || item.logo_url,
        site: existing.site || item.site,
        gmv_mes: asNumber(officialOperationalGmv(existing)) + asNumber(officialOperationalGmv(item)),
        lives_mes: asNumber(existing.lives_mes ?? existing.total_lives) + asNumber(item.lives_mes ?? item.total_lives),
        videos_mes: asNumber(existing.videos_mes ?? existing.quantidade_videos) + asNumber(item.videos_mes ?? item.quantidade_videos),
        duplicado_count: asNumber(existing.duplicado_count, 1) + 1,
      })
    }

    return [...unique.values()]
  }, [clientes, marcas])

  // Atualiza % de comissão na marca principal (usado quando o item é cliente_ecommerce).
  const updateMarcaPctMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateMarca(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QK.marcas() })
      void queryClient.invalidateQueries({ queryKey: QK.marcas('ativas') })
      void queryClient.invalidateQueries({ queryKey: QK.comissoesMarcas })
      void queryClient.invalidateQueries({ queryKey: QK.rankingMarcas() })
      void queryClient.invalidateQueries({ queryKey: QK.ativoOperacional() })
    },
  })

  // Carrega o % da marca (própria) ou da marca principal vinculada ao cliente.
  useEffect(() => {
    const data = ativoDetailQuery.data as JsonRecord | undefined
    if (!data) return
    if (selectedAtivoKind === 'marca') {
      setMarcaPctId(selectedAtivoId || null)
      return
    }
    const marcas = asArray<JsonRecord>(data.marcas)
    if (marcas.length === 0) { setMarcaPctId(null); return }
    const principal = marcas.find((m) => asString(m.nome) === asString(selectedAtivo?.nome))
      ?? marcas.find((m) => asString(m.tipo) === 'cliente')
      ?? marcas[0]
    setMarcaPctId(asString(principal.id) || null)
    setAtivoForm((current) => ({
      ...current,
      comissao_franquia_pct: asString(principal.comissao_franquia_pct ?? 0, '0'),
      comissao_franqueadora_pct: asString(principal.comissao_franqueadora_pct ?? 0, '0'),
      valor_fixo_minimo: asString(principal.valor_fixo_minimo ?? 0, '0'),
    }))
  }, [ativoDetailQuery.data, selectedAtivoKind, selectedAtivoId])

  // Deep-link: /comercial?ativo=<nome> abre a aba e o item direto (vindo do relatório).
  useEffect(() => {
    const alvo = searchParams.get('ativo')
    if (!alvo) return
    // espera as listas carregarem antes de decidir (senão perde o deep-link)
    if (clientesQuery.isLoading || marcasQuery.isLoading) return
    const found = ativos.find((r) => asString(r.nome).trim().toLowerCase() === alvo.trim().toLowerCase())
    if (found) {
      setTab('ativos')
      openAtivo(found)
    }
    // limpa o param sempre (achando ou não) para não ficar preso no URL
    const next = new URLSearchParams(searchParams)
    next.delete('ativo')
    setSearchParams(next, { replace: true })
  }, [searchParams, ativos, clientesQuery.isLoading, marcasQuery.isLoading])

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={() => {
    void summaryQuery.refetch()
    void leadsQuery.refetch()
    void clientesQuery.refetch()
    void marcasQuery.refetch()
  }} />

  function setClienteField(key: keyof typeof emptyClienteForm, value: string | boolean) {
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
      { key: 'gmv_mes', header: 'gmv_mes', value: (row) => officialOperationalGmv(row) ?? 0 },
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

  function openAtivo(item: JsonRecord) {
    setMarcaPctId(null) // evita salvar % na marca do item anterior antes do effect repopular
    setSelectedAtivo(item)
    setAtivoForm({
      nome: asString(item.nome, ''),
      status: asString(item.status, 'ativo'),
      email: asString(item.email, ''),
      celular: asString(item.celular ?? item.whatsapp, ''),
      comissao_franquia_pct: asString(item.comissao_franquia_pct ?? 0, '0'),
      comissao_franqueadora_pct: asString(item.comissao_franqueadora_pct ?? 0, '0'),
      valor_fixo_minimo: asString(item.valor_fixo_minimo ?? 0, '0'),
      logo_url: asString(item.logo_url, ''),
    })
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
      logo_url: clienteForm.logo_url || undefined,
      criar_acesso: clienteForm.criar_acesso,
      ...(clienteForm.criar_acesso ? {
        acesso_nome: clienteForm.responsavel || clienteForm.nome,
        acesso_email: clienteForm.email,
        senha_temporaria: clienteForm.senha_temporaria,
      } : {}),
    })
  }

  function onAfiliadoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    afiliadoMutation.mutate({
      nome: afiliadoForm.nome,
      tipo: 'afiliada',
      status: 'ativa',
      tiktok_username: afiliadoForm.tiktok_username || undefined,
      logo_url: afiliadoForm.logo_url || undefined,
      observacoes: [
        afiliadoForm.responsavel ? `Responsável: ${afiliadoForm.responsavel}` : '',
        afiliadoForm.whatsapp ? `WhatsApp: ${afiliadoForm.whatsapp}` : '',
        afiliadoForm.email ? `E-mail: ${afiliadoForm.email}` : '',
        afiliadoForm.observacoes,
      ].filter(Boolean).join('\n') || undefined,
    })
  }

  async function onAtivoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedAtivo) return
    const id = asString(selectedAtivo.id, '')
    const kind = selectedAtivoKind
    const payload = kind === 'cliente'
      ? {
          nome: ativoForm.nome,
          status: ativoForm.status,
          email: ativoForm.email || undefined,
          celular: ativoForm.celular || undefined,
          logo_url: ativoForm.logo_url || null,
        }
      : {
          nome: ativoForm.nome,
          status: ativoForm.status === 'ativo' ? 'ativa' : ativoForm.status,
          comissao_franquia_pct: Number(ativoForm.comissao_franquia_pct || 0),
          comissao_franqueadora_pct: Number(ativoForm.comissao_franqueadora_pct || 0),
          valor_fixo_minimo: Number(ativoForm.valor_fixo_minimo || 0),
          logo_url: ativoForm.logo_url || null,
        }
    try {
      await ativoUpdateMutation.mutateAsync({ id, kind, payload })
      // cliente_ecommerce: o % vive na marca principal — só salva após o cliente ok.
      if (kind === 'cliente' && marcaPctId) {
        await updateMarcaPctMutation.mutateAsync({
          id: marcaPctId,
          payload: {
            comissao_franquia_pct: Number(ativoForm.comissao_franquia_pct || 0),
            comissao_franqueadora_pct: Number(ativoForm.comissao_franqueadora_pct || 0),
            valor_fixo_minimo: Number(ativoForm.valor_fixo_minimo || 0),
          },
        })
      }
    } catch {
      // erros exibidos via *.isError nas mutations
    }
  }

  function toggleAtivoStatus(item = selectedAtivo) {
    if (!item) return
    const id = asString(item.id, '')
    const kind = selectedAtivoKind
    const current = asString(ativoForm.status || item.status)
    const nextStatus = kind === 'cliente'
      ? current === 'ativo' ? 'cancelado' : 'ativo'
      : current === 'ativa' ? 'inativa' : 'ativa'
    ativoUpdateMutation.mutate({ id, kind, payload: { status: nextStatus } })
    setAtivoForm((currentForm) => ({ ...currentForm, status: nextStatus }))
  }

  function deleteAtivo() {
    if (!selectedAtivo) return
    const id = asString(selectedAtivo.id, '')
    const kind = selectedAtivoKind
    const ok = window.confirm(`Excluir ${kind === 'cliente' ? 'cliente' : 'afiliado'}? Se houver histórico, a API pode bloquear a exclusão definitiva.`)
    if (!ok) return
    ativoDeleteMutation.mutate({ id, kind })
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Comercial" accent="Operação" title="comercial" subtitle="Dashboard, CRM e carteira ativa em uma única área." />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-1">
        {[
          ['ativos', Store, 'Clientes e afiliados'],
          ['dashboard', LayoutDashboard, 'Dashboard'],
          ['crm', Workflow, 'CRM'],
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
              <MetricCard key={item.label} metric={item} icon={[Users, CircleDollarSign, Handshake, Workflow, Building2, Store][index]} />
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
                <p className="text-base font-bold text-ink">{isMasterUser ? 'Entradas da Bio' : 'Leads parados'}</p>
              </CardHeader>
              <CardBody className="space-y-3">
                {isMasterUser ? (
                  <>
                    {bioPorPersona.map((item) => (
                      <div key={asString(item.persona ?? item.origem)} className="rounded-2xl border border-line bg-surface-muted p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-ink">{asString(item.label ?? item.persona)}</span>
                          <Badge tone="brand">{asNumber(item.total).toLocaleString('pt-BR')}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-ink-muted">{formatMoney(item.valor)} em potencial informado</p>
                      </div>
                    ))}
                    {!bioPorPersona.length ? (
                      <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-muted">
                        Nenhum lead Bio encontrado no escopo master.
                      </p>
                    ) : null}
                  </>
                ) : (
                  leads
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
                    ))
                )}
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
          </Card>

          <Card>
            <CardBody>
              <DataTable<JsonRecord>
                data={ativos}
                columns={[
                  { key: 'tipo_operacional', header: 'Tipo', render: (item) => <Badge tone="brand">{asString(item.tipo_operacional ?? item.tipo)}</Badge> },
                  {
                    key: 'nome',
                    header: 'Nome',
                    render: (item) => {
                      const image = getBrandImage(item)
                      const initials = asString(item.nome, 'CL').slice(0, 2).toUpperCase()
                      return (
                        <div className="flex min-w-56 items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-surface-muted text-xs font-black text-ink-muted">
                            {image ? <img src={image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{asString(item.nome)}</p>
                            {asNumber(item.duplicado_count) > 1 ? <Badge className="mt-1" tone="warning">{asNumber(item.duplicado_count)} cadastros</Badge> : null}
                          </div>
                        </div>
                      )
                    },
                  },
                  { key: 'marca_principal', header: 'Marca principal', render: (item) => asString(item.marca_principal) },
                  { key: 'status', header: 'Status', render: (item) => <Badge tone={statusTone(asString(item.status, 'ativa'))}>{asString(item.status, 'ativa')}</Badge> },
                  {
                    key: 'acesso',
                    header: 'Acesso',
                    render: (item) => {
                      if (!asString(item.user_id, '')) return <Badge tone="neutral">Sem acesso</Badge>
                      return <Badge tone={item.acesso_ativo === false ? 'warning' : 'success'}>{asString(item.acesso_email, 'Cliente')}</Badge>
                    },
                  },
                  { key: 'gmv_mes', header: 'GMV mês', align: 'right', render: (item) => formatMoney(officialOperationalGmv(item)) },
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
                  {
                    key: 'acoes',
                    header: 'Ações',
                    align: 'right',
                    render: (item) => (
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" icon={Eye} onClick={() => openAtivo(item)}>Detalhes</Button>
                      </div>
                    ),
                  },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      ) : null}

      <Modal
        open={showClienteForm}
        title="Novo cliente"
        subtitle="Cadastro manual de cliente/e-commerce."
        onClose={() => setShowClienteForm(false)}
      >
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onClienteSubmit}>
          <input className="design-input h-11 px-4" placeholder="Nome da empresa/marca" value={clienteForm.nome} onChange={(event) => setClienteField('nome', event.target.value)} required />
          <input className="design-input h-11 px-4" placeholder="Responsável" value={clienteForm.responsavel} onChange={(event) => setClienteField('responsavel', event.target.value)} />
          <input className="design-input h-11 px-4" placeholder="WhatsApp" value={clienteForm.whatsapp} onChange={(event) => setClienteField('whatsapp', event.target.value)} required />
          <input className="design-input h-11 px-4" placeholder="E-mail" type="email" value={clienteForm.email} onChange={(event) => setClienteField('email', event.target.value)} />
          <input className="design-input h-11 px-4" placeholder="CNPJ" value={clienteForm.cnpj} onChange={(event) => setClienteField('cnpj', event.target.value)} />
          <input className="design-input h-11 px-4" placeholder="Nicho" value={clienteForm.nicho} onChange={(event) => setClienteField('nicho', event.target.value)} />
          <input className="design-input h-11 px-4 md:col-span-2" placeholder="TikTok username" value={clienteForm.tiktok_username} onChange={(event) => setClienteField('tiktok_username', event.target.value.replace(/@/g, ''))} />
          <section className="space-y-3 rounded-2xl border border-line bg-surface-muted p-4 md:col-span-2">
            <label className="flex items-start gap-3">
              <input
                className="mt-1 h-4 w-4 accent-brand"
                type="checkbox"
                checked={clienteForm.criar_acesso}
                onChange={(event) => setClienteField('criar_acesso', event.target.checked)}
              />
              <span>
                <span className="block text-sm font-bold text-ink">Criar acesso do cliente agora</span>
                <span className="mt-1 block text-xs text-ink-muted">Cria um usuário com papel Cliente vinculado a este cadastro e liberado somente para o painel do cliente.</span>
              </span>
            </label>
            {clienteForm.criar_acesso ? (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-ink">E-mail de acesso</span>
                  <input
                    className="design-input mt-2 h-11 w-full px-4"
                    placeholder="cliente@empresa.com"
                    type="email"
                    value={clienteForm.email}
                    onChange={(event) => setClienteField('email', event.target.value)}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Senha temporária</span>
                  <input
                    className="design-input mt-2 h-11 w-full px-4"
                    value={clienteForm.senha_temporaria}
                    onChange={(event) => setClienteField('senha_temporaria', event.target.value)}
                    minLength={6}
                    placeholder="mínimo 6 caracteres"
                    required
                  />
                </label>
              </div>
            ) : null}
          </section>
          <div className="md:col-span-2">
            <ImagePicker
              label="Imagem do cliente"
              value={clienteForm.logo_url}
              onChange={(value) => setClienteField('logo_url', value)}
              onFileSelect={(file) => uploadClienteImage.mutate(file)}
              isUploading={uploadClienteImage.isPending}
              helper="Aparece nas agendas e rankings de marca quando este cliente for usado."
            />
          </div>
          {uploadClienteImage.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] md:col-span-2">{extractErrorMessage(uploadClienteImage.error)}</p> : null}
          {clienteMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] md:col-span-2">{extractErrorMessage(clienteMutation.error)}</p> : null}
          <Button type="submit" isLoading={clienteMutation.isPending}>Salvar cliente</Button>
        </form>
      </Modal>

      <Modal
        open={showAfiliadoForm}
        title="Novo afiliado"
        subtitle="Cadastro de marca afiliada sem exigir cliente/e-commerce vinculado."
        onClose={() => setShowAfiliadoForm(false)}
      >
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onAfiliadoSubmit}>
          <input className="design-input h-11 px-4" placeholder="Nome da marca afiliada" value={afiliadoForm.nome} onChange={(event) => setAfiliadoField('nome', event.target.value)} required />
          <input className="design-input h-11 px-4" placeholder="Responsável" value={afiliadoForm.responsavel} onChange={(event) => setAfiliadoField('responsavel', event.target.value)} />
          <input className="design-input h-11 px-4" placeholder="WhatsApp" value={afiliadoForm.whatsapp} onChange={(event) => setAfiliadoField('whatsapp', event.target.value)} />
          <input className="design-input h-11 px-4" placeholder="E-mail" type="email" value={afiliadoForm.email} onChange={(event) => setAfiliadoField('email', event.target.value)} />
          <input className="design-input h-11 px-4 md:col-span-2" placeholder="TikTok username" value={afiliadoForm.tiktok_username} onChange={(event) => setAfiliadoField('tiktok_username', event.target.value.replace(/@/g, ''))} />
          <div className="md:col-span-2">
            <ImagePicker
              label="Imagem da marca"
              value={afiliadoForm.logo_url}
              onChange={(value) => setAfiliadoField('logo_url', value)}
              onFileSelect={(file) => uploadAfiliadoImage.mutate(file)}
              isUploading={uploadAfiliadoImage.isPending}
              helper="Aparece nos rankings de marca, agendas e telas operacionais."
            />
          </div>
          <textarea className="design-input min-h-24 px-4 py-3 md:col-span-2" placeholder="Observações" value={afiliadoForm.observacoes} onChange={(event) => setAfiliadoField('observacoes', event.target.value)} />
          {uploadAfiliadoImage.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] md:col-span-2">{extractErrorMessage(uploadAfiliadoImage.error)}</p> : null}
          {afiliadoMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] md:col-span-2">{extractErrorMessage(afiliadoMutation.error)}</p> : null}
          <Button type="submit" isLoading={afiliadoMutation.isPending}>Salvar afiliado</Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedAtivo)}
        title={selectedAtivoKind === 'cliente' ? 'Cliente' : 'Afiliado'}
        subtitle="Dados operacionais, histórico e configuração comercial."
        size="xl"
        onClose={() => setSelectedAtivo(null)}
      >
        <div className="space-y-5">
          {ativoDetailQuery.isLoading ? <LoadingState label="Carregando histórico" /> : null}
          {ativoDetailQuery.isError ? <ErrorState message={extractErrorMessage(ativoDetailQuery.error)} onRetry={() => void ativoDetailQuery.refetch()} /> : null}
          {ativoDetailQuery.data ? (
            <>
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  moneyMetric('GMV mês', getRecord(ativoDetailQuery.data.metrics).gmv_mes, 'período atual', 'brand'),
                  moneyMetric('GMV acumulado', getRecord(ativoDetailQuery.data.metrics).gmv_acumulado, 'histórico total', 'success'),
                  metric('Lives', getRecord(ativoDetailQuery.data.metrics).total_lives ?? 0, 'histórico', 'neutral'),
                  metric('Vídeos', getRecord(ativoDetailQuery.data.metrics).total_videos ?? 0, 'histórico', 'info'),
                ].map((item) => <MetricCard key={item.label} metric={item} icon={Store} />)}
              </section>

              <form className="grid gap-3 rounded-2xl border border-line bg-surface-muted p-4 md:grid-cols-2" onSubmit={onAtivoSubmit}>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Nome</span>
                  <input className="design-input mt-2 h-11 w-full px-4" value={ativoForm.nome} onChange={(event) => setAtivoForm((current) => ({ ...current, nome: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Status</span>
                  <select className="design-input mt-2 h-11 w-full px-4" value={ativoForm.status} onChange={(event) => setAtivoForm((current) => ({ ...current, status: event.target.value }))}>
                    <option value="ativo">Ativo</option>
                    <option value="ativa">Ativa</option>
                    <option value="pausada">Pausada</option>
                    <option value="inativa">Inativa</option>
                    <option value="inadimplente">Inadimplente</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </label>
                <div className="md:col-span-2">
                  <ImagePicker
                    label={selectedAtivoKind === 'cliente' ? 'Imagem do cliente' : 'Imagem da marca'}
                    value={ativoForm.logo_url}
                    onChange={(value) => setAtivoForm((current) => ({ ...current, logo_url: value }))}
                    onFileSelect={(file) => uploadAtivoImage.mutate({ file, folder: selectedAtivoKind === 'cliente' ? 'clientes' : 'marcas' })}
                    isUploading={uploadAtivoImage.isPending}
                    helper={selectedAtivoKind === 'cliente' ? 'Aparece nas agendas e rankings de marca quando este cliente for usado.' : 'Aparece nos rankings de marca, agendas e telas operacionais.'}
                  />
                </div>
                {selectedAtivoKind === 'cliente' ? (
                  <>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">E-mail</span>
                      <input className="design-input mt-2 h-11 w-full px-4" value={ativoForm.email} onChange={(event) => setAtivoForm((current) => ({ ...current, email: event.target.value }))} />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">WhatsApp</span>
                      <input className="design-input mt-2 h-11 w-full px-4" value={ativoForm.celular} onChange={(event) => setAtivoForm((current) => ({ ...current, celular: event.target.value }))} />
                    </label>
                  </>
                ) : null}
                <>
                    <div className="col-span-full"><p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Comissão da marca</p></div>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Comissão Franquia (%)</span>
                      <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" max="100" step="0.01" value={ativoForm.comissao_franquia_pct} onChange={(event) => setAtivoForm((current) => ({ ...current, comissao_franquia_pct: event.target.value }))} />
                      <span className="mt-1 text-[11px] text-ink-muted">% sobre GMV mensal da marca destinado à franquia.</span>
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Comissão Franqueadora (%)</span>
                      <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" max="100" step="0.01" value={ativoForm.comissao_franqueadora_pct} onChange={(event) => setAtivoForm((current) => ({ ...current, comissao_franqueadora_pct: event.target.value }))} />
                      <span className="mt-1 text-[11px] text-ink-muted">% destinado à Livelab/franqueadora.</span>
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Fixo mensal (R$)</span>
                      <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" step="0.01" value={ativoForm.valor_fixo_minimo} onChange={(event) => setAtivoForm((current) => ({ ...current, valor_fixo_minimo: event.target.value }))} />
                      <span className="mt-1 text-[11px] text-ink-muted">≈ {formatMoney(asNumber(ativoForm.valor_fixo_minimo))} / mês quando a marca tiver atividade (em franquia e franqueadora).</span>
                    </label>
                </>
                <div className="flex flex-wrap items-end gap-2">
                  <Button type="submit" isLoading={ativoUpdateMutation.isPending}>Salvar alterações</Button>
                  <Button type="button" variant="secondary" onClick={() => toggleAtivoStatus()} disabled={ativoUpdateMutation.isPending}>
                    {['ativo', 'ativa'].includes(ativoForm.status) ? 'Inativar' : 'Reativar'}
                  </Button>
                  {selectedAtivoKind === 'marca' && selectedAtivoId ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setAuditMarcaId(selectedAtivoId)}
                    >
                      Histórico
                    </Button>
                  ) : null}
                  <Button type="button" variant="ghost" icon={Trash2} onClick={deleteAtivo} disabled={ativoDeleteMutation.isPending}>
                    Excluir
                  </Button>
                </div>
                {uploadAtivoImage.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] md:col-span-2">{extractErrorMessage(uploadAtivoImage.error)}</p> : null}
                {ativoUpdateMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] md:col-span-2">{extractErrorMessage(ativoUpdateMutation.error)}</p> : null}
                {ativoDeleteMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] md:col-span-2">{extractErrorMessage(ativoDeleteMutation.error)}</p> : null}
              </form>

              <section className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader><p className="text-base font-bold text-ink">Histórico de lives</p></CardHeader>
                  <CardBody>
                    <DataTable<JsonRecord>
                      data={asArray<JsonRecord>(ativoDetailQuery.data.lives)}
                      columns={[
                        { key: 'iniciado_em', header: 'Data', render: (item) => asString(item.iniciado_em).slice(0, 10) },
                        { key: 'marca_nome', header: 'Marca', render: (item) => asString(item.marca_nome ?? getRecord(ativoDetailQuery.data?.marca).nome ?? getRecord(ativoDetailQuery.data?.cliente).nome) },
                        { key: 'apresentadora_nome', header: 'Apresentadora', render: (item) => asString(item.apresentadora_nome, '—') },
                        { key: 'gmv', header: 'GMV', align: 'right', render: (item) => formatMoney(officialOperationalGmv(item)) },
                      ]}
                    />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader><p className="text-base font-bold text-ink">Histórico de vídeos</p></CardHeader>
                  <CardBody>
                    <DataTable<JsonRecord>
                      data={asArray<JsonRecord>(ativoDetailQuery.data.videos)}
                      columns={[
                        { key: 'data', header: 'Data', render: (item) => asString(item.data).slice(0, 10) },
                        { key: 'marca_nome', header: 'Marca', render: (item) => asString(item.marca_nome ?? getRecord(ativoDetailQuery.data?.marca).nome) },
                        { key: 'apresentadora_nome', header: 'Apresentadora', render: (item) => asString(item.apresentadora_nome, '—') },
                        { key: 'gmv_atribuido', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv_atribuido) },
                      ]}
                    />
                  </CardBody>
                </Card>
              </section>
            </>
          ) : null}
        </div>
      </Modal>

      {/* ---- Audit history modal — marca ---- */}
      <HistoricoAuditModal
        open={Boolean(auditMarcaId)}
        onClose={() => setAuditMarcaId(null)}
        entityType="marca"
        entityId={auditMarcaId ?? ''}
        titulo="Histórico de alterações — marca/afiliado"
      />
    </div>
  )
}
