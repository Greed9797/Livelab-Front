import { Building2, CircleDollarSign, Download, Eye, Handshake, LayoutDashboard, Plus, Search, Store, Trash2, Users, Workflow } from 'lucide-react'
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
import { BriefingSection } from '../components/comercial/BriefingSection'
import { MoneyInput } from '../components/ui/MoneyInput'
import { useToast } from '../components/ui/Toast'
import { normalizeMoneyInputText, parseBRMoneyToDecimal } from '../utils/money'
import { extractBrandColor, resolveMarcaCor } from '../utils/brandColor'
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

// Vocabulário de status alinhado aos CHECKs do banco:
// clientes (migrations 016/042) e marcas (migrations 080/121).
const CLIENTE_STATUS_OPTIONS = ['ativo', 'inadimplente', 'cancelado', 'arquivado']
const MARCA_STATUS_OPTIONS = ['ativa', 'pausada', 'inativa', 'arquivada']
const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  ativa: 'Ativa',
  pausada: 'Pausada',
  inativa: 'Inativa',
  inadimplente: 'Inadimplente',
  cancelado: 'Cancelado',
  cancelado_automaticamente: 'Cancelado (auto)',
  arquivado: 'Arquivado',
  arquivada: 'Arquivada',
  negociacao: 'Negociação',
  enviado: 'Enviado',
  em_analise: 'Em análise',
  pendencia_comercial: 'Pendência comercial',
  aprovado: 'Aprovado',
  onboarding: 'Onboarding',
  risco_assumido: 'Risco assumido',
  reprovado: 'Reprovado',
}

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? (status || '—')
}

// Busca insensível a acento/caixa (client-side).
export function normalizarBusca(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

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
  comissao_franquia_pct: '',
  cor: '', // '' = automática (extraída do logo ao salvar, senão hash)
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
  const [ativoForm, setAtivoForm] = useState({ nome: '', status: 'ativo', email: '', celular: '', comissao_franquia_pct: '0', comissao_franqueadora_pct: '0', valor_fixo_minimo: '0', tipo_cobranca: 'fixo_mais_comissao', data_inicio: '', data_fim: '', logo_url: '', cor: '' })
  // Cor da marca no modal de edição: null = intocada (mantém/extrai), 'manual' = hex
  // escolhido no picker, 'clear' = botão "Automática" (PATCH cor: null).
  const [ativoCorTouch, setAtivoCorTouch] = useState<'manual' | 'clear' | null>(null)
  const [auditMarcaId, setAuditMarcaId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [mostrarTodos, setMostrarTodos] = useState(false)
  // Linha mesclada (N cadastros) clicada: guarda o item para o seletor de registro.
  const [dupEscolha, setDupEscolha] = useState<JsonRecord | null>(null)
  // Para cliente_ecommerce, o % de comissão vive na marca principal vinculada.
  // Guardamos o id dessa marca para salvar o % via updateMarca.
  const [marcaPctId, setMarcaPctId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const toast = useToast()
  const user = useCurrentUser()
  const isMasterUser = user?.papel === 'franqueador_master'
  const [verArquivados, setVerArquivados] = useState(false)

  const summaryQuery = useQuery({
    queryKey: isMasterUser ? QK.masterCrm : QK.crmSummary,
    queryFn: isMasterUser ? () => getMasterCrm() : getCrmSummary,
  })
  const leadsQuery = useQuery({ queryKey: QK.leads, queryFn: getLeads })
  const clientesQuery = useQuery({ queryKey: QK.clientes(verArquivados ? 'arquivados' : 'ativos'), queryFn: () => getClientes(verArquivados ? { status: 'arquivado' } : {}) })
  const marcasQuery = useQuery({ queryKey: QK.marcas(verArquivados ? 'arquivadas' : 'ativas'), queryFn: () => getMarcas({ status: verArquivados ? 'arquivada' : 'ativa' }) })
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
      toast.push('Cliente criado com sucesso.', 'success')
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
      toast.push('Afiliado criado com sucesso.', 'success')
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
      toast.push('Cadastro excluído.', 'success')
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
      // cor vive na marca principal do cliente (getMarcas traz cor), não no /clientes.
      // Sem isto o avatar da lista do cliente cai no hash em vez da cor salva.
      cor: asString(marcasPorCliente.get(asString(cliente.id, ''))?.[0]?.cor, ''),
      // Seed do fallback por hash: precisa ser o id da MARCA, que é o que a agenda usa.
      // Com o id do cliente, a mesma marca ganhava cores diferentes nas duas telas.
      cor_seed_id: asString(marcasPorCliente.get(asString(cliente.id, ''))?.[0]?.id, asString(cliente.id, '')),
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
        // duplicados = registros originais por trás da linha mesclada (seletor de edição)
        unique.set(key, { ...item, duplicados: [item] })
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
        duplicados: [...asArray<JsonRecord>(existing.duplicados), item],
      })
    }

    return [...unique.values()]
  }, [clientes, marcas])

  const statusDisponiveis = useMemo(
    () => [...new Set(ativos.map((item) => asString(item.status)).filter(Boolean))].sort(),
    [ativos],
  )

  const ativosFiltrados = useMemo(() => {
    const q = normalizarBusca(busca.trim())
    return ativos.filter((item) => {
      if (filtroStatus !== 'todos' && asString(item.status) !== filtroStatus) return false
      if (!q) return true
      return [item.nome, item.marca_principal, item.tipo_operacional, item.status, statusLabel(asString(item.status))]
        .some((value) => normalizarBusca(asString(value)).includes(q))
    })
  }, [ativos, busca, filtroStatus])

  // ponytail: paginação simples — mostra 50 e um "Mostrar todos"; troque por paginação real se a carteira passar de centenas.
  const LIMITE_LINHAS = 50
  const ativosVisiveis = mostrarTodos ? ativosFiltrados : ativosFiltrados.slice(0, LIMITE_LINHAS)

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
      valor_fixo_minimo: normalizeMoneyInputText(asString(principal.valor_fixo_minimo ?? 0, '0')),
      tipo_cobranca: asString(principal.tipo_cobranca ?? 'fixo_mais_comissao', 'fixo_mais_comissao'),
      data_inicio: asString(principal.data_inicio ?? '', '').slice(0, 10),
      data_fim: asString(principal.data_fim ?? '', '').slice(0, 10),
      // cor da marca principal (não vem no /clientes) — reflete a cor salva no picker.
      cor: asString(principal.cor ?? current.cor, ''),
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
    const isCliente = asString(item.tipo_operacional) === 'cliente_ecommerce'
    setMarcaPctId(null) // evita salvar % na marca do item anterior antes do effect repopular
    setSelectedAtivo(item)
    setAtivoCorTouch(null)
    setAtivoForm({
      nome: asString(item.nome, ''),
      status: asString(item.status, isCliente ? 'ativo' : 'ativa'),
      email: asString(item.email, ''),
      celular: asString(item.celular ?? item.whatsapp, ''),
      comissao_franquia_pct: asString(item.comissao_franquia_pct ?? 0, '0'),
      comissao_franqueadora_pct: asString(item.comissao_franqueadora_pct ?? 0, '0'),
      valor_fixo_minimo: normalizeMoneyInputText(asString(item.valor_fixo_minimo ?? 0, '0')),
      tipo_cobranca: asString(item.tipo_cobranca ?? 'fixo_mais_comissao', 'fixo_mais_comissao'),
      data_inicio: asString(item.data_inicio ?? '', '').slice(0, 10),
      data_fim: asString(item.data_fim ?? '', '').slice(0, 10),
      logo_url: asString(item.logo_url, ''),
      cor: asString(item.cor, ''),
    })
  }

  // Clique na linha/Detalhes: item mesclado (N>1) abre seletor de qual registro editar.
  function abrirAtivo(item: JsonRecord) {
    if (asArray<JsonRecord>(item.duplicados).length > 1) {
      setDupEscolha(item)
      return
    }
    openAtivo(item)
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

  async function onAfiliadoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Cor: manual vence; sem manual, tenta extrair do logo (falha = sem cor, hash cobre).
    let cor: string | undefined = afiliadoForm.cor || undefined
    if (!cor && afiliadoForm.logo_url) cor = (await extractBrandColor(afiliadoForm.logo_url)) ?? undefined
    afiliadoMutation.mutate({
      nome: afiliadoForm.nome,
      tipo: 'afiliada',
      status: 'ativa',
      tiktok_username: afiliadoForm.tiktok_username || undefined,
      logo_url: afiliadoForm.logo_url || undefined,
      ...(cor ? { cor } : {}),
      // Comissão tem coluna própria (comissao_franquia_pct); não vai mais em observações.
      ...(afiliadoForm.comissao_franquia_pct !== '' ? { comissao_franquia_pct: Number(afiliadoForm.comissao_franquia_pct) } : {}),
      // Responsável/WhatsApp/E-mail não têm coluna em marcas — permanecem em observações.
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
    let payload: JsonRecord
    // Cor: manual = hex escolhido; "Automática" = null (limpa); intocada e sem cor
    // salva = tenta extrair do logo (falha = segue sem cor, hash cobre). A cor vive na
    // MARCA — para cliente_ecommerce ela vai na marca principal (marcaPct), não no cliente.
    let cor: string | null | undefined
    if (ativoCorTouch === 'manual') cor = ativoForm.cor || null
    else if (ativoCorTouch === 'clear') cor = null
    else if (!ativoForm.cor && ativoForm.logo_url) cor = (await extractBrandColor(ativoForm.logo_url)) ?? undefined
    // Extração veio automática: reflete no form sem marcar como escolha manual.
    if (typeof cor === 'string' && ativoCorTouch === null) setAtivoForm((current) => ({ ...current, cor }))
    if (kind === 'cliente') {
      payload = {
        nome: ativoForm.nome,
        status: ativoForm.status,
        email: ativoForm.email || undefined,
        celular: ativoForm.celular || undefined,
        logo_url: ativoForm.logo_url || null,
      }
    } else {
      payload = {
        nome: ativoForm.nome,
        status: ativoForm.status === 'ativo' ? 'ativa' : ativoForm.status,
        comissao_franquia_pct: Number(ativoForm.comissao_franquia_pct || 0),
        comissao_franqueadora_pct: Number(ativoForm.comissao_franqueadora_pct || 0),
        valor_fixo_minimo: parseBRMoneyToDecimal(ativoForm.valor_fixo_minimo),
        tipo_cobranca: ativoForm.tipo_cobranca,
        data_inicio: ativoForm.data_inicio || null,
        data_fim: ativoForm.data_fim || null,
        logo_url: ativoForm.logo_url || null,
        ...(cor !== undefined ? { cor } : {}),
      }
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
            valor_fixo_minimo: parseBRMoneyToDecimal(ativoForm.valor_fixo_minimo),
            tipo_cobranca: ativoForm.tipo_cobranca,
            data_inicio: ativoForm.data_inicio || null,
            data_fim: ativoForm.data_fim || null,
            ...(cor !== undefined ? { cor } : {}),
          },
        })
      }
      if (kind === 'cliente' && !marcaPctId) {
        // Comissão/fixo/tipo/cor vivem na marca principal; sem ela nada disso persiste.
        // Não fingir sucesso: avisar honestamente o que foi (e não foi) salvo.
        toast.push('Cliente salvo. Comissão, fixo e cor precisam de uma marca principal vinculada.', 'info')
      } else {
        toast.push('Alterações salvas com sucesso.', 'success')
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
    ativoUpdateMutation.mutate(
      { id, kind, payload: { status: nextStatus } },
      { onSuccess: () => toast.push(`Status atualizado para ${statusLabel(nextStatus)}.`, 'success') },
    )
    setAtivoForm((currentForm) => ({ ...currentForm, status: nextStatus }))
  }

  function toggleArquivarAtivo(item = selectedAtivo) {
    if (!item) return
    const id = asString(item.id, '')
    const kind = selectedAtivoKind
    const current = asString(ativoForm.status || item.status)
    const arquivado = current === 'arquivada' || current === 'arquivado'
    // Arquivar = ocultar de tudo (revés. Desarquivar volta pra ativa/ativo).
    const nextStatus = kind === 'cliente'
      ? (arquivado ? 'ativo' : 'arquivado')
      : (arquivado ? 'ativa' : 'arquivada')
    ativoUpdateMutation.mutate(
      { id, kind, payload: { status: nextStatus } },
      { onSuccess: () => toast.push(arquivado ? 'Cadastro desarquivado.' : 'Cadastro arquivado.', 'success') },
    )
    setAtivoForm((currentForm) => ({ ...currentForm, status: nextStatus }))
  }

  function deleteAtivo() {
    if (!selectedAtivo) return
    const id = asString(selectedAtivo.id, '')
    const kind = selectedAtivoKind
    const ok = window.confirm(
      `Excluir ${kind === 'cliente' ? 'o cliente' : 'o afiliado'} "${asString(selectedAtivo.nome)}"?\n\n`
      + 'O cadastro sai da carteira. Se houver histórico de lives ou vídeos, a API pode bloquear a exclusão — nesse caso, prefira Arquivar.',
    )
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
                  <Button variant={verArquivados ? 'primary' : 'secondary'} onClick={() => setVerArquivados((v) => !v)}>
                    {verArquivados ? 'Ver ativos' : 'Ver arquivados'}
                  </Button>
                  <Button icon={Plus} onClick={() => setShowClienteForm((value) => !value)}>Novo cliente</Button>
                  <Button variant="secondary" icon={Plus} onClick={() => setShowAfiliadoForm((value) => !value)}>Novo afiliado</Button>
                  <Button variant="secondary" icon={Download} onClick={exportAtivosCsv}>Exportar CSV</Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <input
                    className="design-input h-10 w-64 pl-9 pr-3"
                    type="search"
                    placeholder="Buscar por nome, tipo ou status"
                    value={busca}
                    onChange={(event) => { setBusca(event.target.value); setMostrarTodos(false) }}
                  />
                </div>
                <select
                  className="design-input h-10 px-3"
                  aria-label="Filtrar por status"
                  value={filtroStatus}
                  onChange={(event) => { setFiltroStatus(event.target.value); setMostrarTodos(false) }}
                >
                  <option value="todos">Todos os status</option>
                  {statusDisponiveis.map((status) => (
                    <option key={status} value={status}>{statusLabel(status)}</option>
                  ))}
                </select>
                {busca || filtroStatus !== 'todos' ? (
                  <span className="text-xs text-ink-muted">{ativosFiltrados.length} de {ativos.length}</span>
                ) : null}
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardBody>
              <DataTable<JsonRecord>
                data={ativosVisiveis}
                onRowClick={abrirAtivo}
                footer={!mostrarTodos && ativosFiltrados.length > LIMITE_LINHAS ? (
                  <Button variant="secondary" onClick={() => setMostrarTodos(true)}>
                    Mostrar todos ({ativosFiltrados.length - LIMITE_LINHAS} restantes)
                  </Button>
                ) : undefined}
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
                          <div
                            className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 bg-surface-muted text-xs font-black text-ink-muted"
                            style={{ borderColor: resolveMarcaCor(asString(item.cor) || null, asString(item.cor_seed_id) || asString(item.id)) }}
                          >
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
                  { key: 'status', header: 'Status', render: (item) => <Badge tone={statusTone(asString(item.status, 'ativa'))}>{statusLabel(asString(item.status, 'ativa'))}</Badge> },
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
                        <Button
                          variant="secondary"
                          icon={Eye}
                          onClick={(event) => { event.stopPropagation(); abrirAtivo(item) }}
                        >
                          Detalhes
                        </Button>
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
          <input aria-label="Nome da empresa/marca" className="design-input h-11 px-4" placeholder="Nome da empresa/marca" value={clienteForm.nome} onChange={(event) => setClienteField('nome', event.target.value)} required />
          <input aria-label="Responsável" className="design-input h-11 px-4" placeholder="Responsável" value={clienteForm.responsavel} onChange={(event) => setClienteField('responsavel', event.target.value)} />
          <input aria-label="WhatsApp" className="design-input h-11 px-4" placeholder="WhatsApp" value={clienteForm.whatsapp} onChange={(event) => setClienteField('whatsapp', event.target.value)} required />
          <input aria-label="E-mail" className="design-input h-11 px-4" placeholder="E-mail" type="email" value={clienteForm.email} onChange={(event) => setClienteField('email', event.target.value)} />
          <input aria-label="CNPJ" className="design-input h-11 px-4" placeholder="CNPJ" value={clienteForm.cnpj} onChange={(event) => setClienteField('cnpj', event.target.value)} />
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
                    type="password"
                    autoComplete="new-password"
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
          <input aria-label="Nome da marca afiliada" className="design-input h-11 px-4" placeholder="Nome da marca afiliada" value={afiliadoForm.nome} onChange={(event) => setAfiliadoField('nome', event.target.value)} required />
          <input aria-label="Responsável" className="design-input h-11 px-4" placeholder="Responsável" value={afiliadoForm.responsavel} onChange={(event) => setAfiliadoField('responsavel', event.target.value)} />
          <input aria-label="WhatsApp" className="design-input h-11 px-4" placeholder="WhatsApp" value={afiliadoForm.whatsapp} onChange={(event) => setAfiliadoField('whatsapp', event.target.value)} />
          <input aria-label="E-mail" className="design-input h-11 px-4" placeholder="E-mail" type="email" value={afiliadoForm.email} onChange={(event) => setAfiliadoField('email', event.target.value)} />
          <input className="design-input h-11 px-4" placeholder="TikTok username" value={afiliadoForm.tiktok_username} onChange={(event) => setAfiliadoField('tiktok_username', event.target.value.replace(/@/g, ''))} />
          <label className="block">
            <span className="sr-only">Comissão Franquia (%)</span>
            <input
              className="design-input h-11 w-full px-4"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="Comissão Franquia (%)"
              value={afiliadoForm.comissao_franquia_pct}
              onChange={(event) => setAfiliadoField('comissao_franquia_pct', event.target.value)}
            />
          </label>
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
          <div className="md:col-span-2">
            <CorMarcaField
              cor={afiliadoForm.cor}
              seed={afiliadoForm.nome}
              onManual={(hex) => setAfiliadoField('cor', hex)}
              onAuto={() => setAfiliadoField('cor', '')}
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
                    {(() => {
                      const options = selectedAtivoKind === 'cliente' ? CLIENTE_STATUS_OPTIONS : MARCA_STATUS_OPTIONS
                      // status atual fora da lista curta (ex.: funil do CRM) entra como opção para não ser trocado sem querer
                      const withCurrent = options.includes(ativoForm.status) ? options : [ativoForm.status, ...options]
                      return withCurrent.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)
                    })()}
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
                {(selectedAtivoKind === 'marca' || (selectedAtivoKind === 'cliente' && Boolean(marcaPctId))) ? (
                  <div className="md:col-span-2">
                    <CorMarcaField
                      cor={ativoForm.cor}
                      // Sem cor salva, a cor vem de um hash do seed — e a agenda usa o
                      // marca_id. Semear com o id do CLIENTE dava uma cor aqui e outra lá
                      // (Posthaus aparecia azul no comercial e laranja na agenda).
                      seed={selectedAtivoKind === 'cliente' ? (marcaPctId || selectedAtivoId) : selectedAtivoId}
                      onManual={(hex) => { setAtivoCorTouch('manual'); setAtivoForm((current) => ({ ...current, cor: hex })) }}
                      onAuto={() => { setAtivoCorTouch('clear'); setAtivoForm((current) => ({ ...current, cor: '' })) }}
                    />
                  </div>
                ) : null}
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
                      <MoneyInput className="design-input mt-2 h-11 w-full px-4" placeholder="0,00" value={ativoForm.valor_fixo_minimo} onChange={(raw) => setAtivoForm((current) => ({ ...current, valor_fixo_minimo: raw }))} />
                      <span className="mt-1 text-[11px] text-ink-muted">≈ {formatMoney(parseBRMoneyToDecimal(ativoForm.valor_fixo_minimo))} / mês quando a marca tiver atividade (em franquia e franqueadora).</span>
                    </label>
                    <div className="col-span-full">
                      <span className="text-sm font-semibold text-ink">Tipo de cobrança</span>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {([
                          { v: 'fixo_mais_comissao', label: 'Fixo + comissão', hint: 'Soma o fixo mensal e a comissão sobre GMV.' },
                          { v: 'fixo_ou_comissao', label: 'Fixo OU comissão', hint: 'Entra só o maior: o fixo ou a comissão.' },
                        ] as const).map((opt) => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => setAtivoForm((current) => ({ ...current, tipo_cobranca: opt.v }))}
                            className={`rounded-xl border px-4 py-3 text-left transition ${ativoForm.tipo_cobranca === opt.v ? 'border-brand bg-brand-soft text-ink' : 'border-border text-ink-muted hover:border-border-strong'}`}
                            aria-pressed={ativoForm.tipo_cobranca === opt.v}
                          >
                            <span className="block text-sm font-semibold">{opt.label}</span>
                            <span className="mt-0.5 block text-[11px] text-ink-muted">{opt.hint}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-semibold text-ink">Início do contrato</span>
                        <input type="date" className="design-input mt-2 h-11 w-full px-4" value={ativoForm.data_inicio} onChange={(e) => setAtivoForm((current) => ({ ...current, data_inicio: e.target.value }))} />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-ink">Fim do contrato</span>
                        <input type="date" className="design-input mt-2 h-11 w-full px-4" value={ativoForm.data_fim} onChange={(e) => setAtivoForm((current) => ({ ...current, data_fim: e.target.value }))} />
                        <span className="mt-1 text-[11px] text-ink-muted">Rateia o fixo por dias no mês de entrada/saída. Vazio = sem recorte.</span>
                      </label>
                    </div>
                </>
                <div className="flex flex-wrap items-end gap-2">
                  <Button type="submit" isLoading={ativoUpdateMutation.isPending}>Salvar alterações</Button>
                  <Button type="button" variant="secondary" onClick={() => toggleAtivoStatus()} disabled={ativoUpdateMutation.isPending}>
                    {selectedAtivoKind === 'cliente'
                      ? (ativoForm.status === 'ativo' ? 'Cancelar cliente' : 'Reativar')
                      : (ativoForm.status === 'ativa' ? 'Inativar' : 'Reativar')}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => toggleArquivarAtivo()} disabled={ativoUpdateMutation.isPending}>
                    {['arquivada', 'arquivado'].includes(ativoForm.status) ? 'Desarquivar' : 'Arquivar'}
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
                {updateMarcaPctMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] md:col-span-2">Comissão da marca principal não foi salva: {extractErrorMessage(updateMarcaPctMutation.error)}</p> : null}
                {ativoDeleteMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] md:col-span-2">{extractErrorMessage(ativoDeleteMutation.error)}</p> : null}
              </form>

              {selectedAtivoKind === 'cliente' && selectedAtivoId ? (
                <BriefingSection key={selectedAtivoId} clienteId={selectedAtivoId} />
              ) : null}

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

      {/* ---- Seletor de cadastro — item mesclado (N cadastros) ---- */}
      <Modal
        open={Boolean(dupEscolha)}
        title="Escolher cadastro"
        subtitle="Este item agrupa vários cadastros com o mesmo nome. Escolha qual deles editar."
        onClose={() => setDupEscolha(null)}
      >
        <div className="space-y-2">
          {asArray<JsonRecord>(dupEscolha?.duplicados).map((registro) => (
            <button
              key={asString(registro.id)}
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-surface-muted px-4 py-3 text-left transition hover:border-[var(--border-strong)] hover:bg-surface"
              onClick={() => { setDupEscolha(null); openAtivo(registro) }}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{asString(registro.nome)}</span>
                <span className="block text-[11px] text-ink-muted">id: {asString(registro.id)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge tone="brand">{asString(registro.tipo_operacional ?? registro.tipo)}</Badge>
                <Badge tone={statusTone(asString(registro.status))}>{statusLabel(asString(registro.status))}</Badge>
              </span>
            </button>
          ))}
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

// Campo "Cor da marca": picker nativo + preview + botão Automática.
// cor='' significa automática — o preview mostra a cor resolvida (hash por seed).
function CorMarcaField({ cor, seed, onManual, onAuto }: {
  cor: string
  seed: string
  onManual: (hex: string) => void
  onAuto: () => void
}) {
  const preview = resolveMarcaCor(cor || null, seed)
  return (
    <div>
      <span className="text-sm font-semibold text-ink">Cor da marca</span>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          type="color"
          aria-label="Escolher cor da marca"
          className="h-11 w-16 cursor-pointer rounded-xl border border-line bg-surface p-1"
          value={preview}
          onChange={(event) => onManual(event.target.value)}
        />
        <span aria-hidden className="h-6 w-6 shrink-0 rounded-full border border-line" style={{ background: preview }} />
        <Button type="button" variant="secondary" onClick={onAuto} disabled={!cor}>Automática</Button>
        <span className="text-[11px] text-ink-muted">
          {cor ? `Cor manual ${cor}.` : 'Automática — extraída do logo ao salvar; sem logo, gerada a partir do cadastro.'}
        </span>
      </div>
    </div>
  )
}
