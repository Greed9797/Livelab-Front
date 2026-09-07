import { Download, Eye, Plus, Search, Trash2 } from 'lucide-react'
import { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Badge, statusTone } from '../components/ui/Badge'
import { BotBadge } from '../components/ui/BotBadge'
import { LoadingState, ErrorState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { UnsavedChangesNotice } from '../components/ui/UnsavedChangesNotice'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { ModalSection } from '../components/ui/ModalSection'
import { ImagePicker } from '../components/ui/ImagePicker'
import { HistoricoAuditModal } from '../components/audit/HistoricoAuditModal'
import { BriefingSection } from '../components/comercial/BriefingSection'
import { MoneyInput } from '../components/ui/MoneyInput'
import { useToast } from '../components/ui/Toast'
import { normalizeMoneyInputText, parseBRMoneyToDecimal } from '../utils/money'
import { extractBrandColor, resolveMarcaCor } from '../utils/brandColor'
import { createCliente, createMarca, deleteCliente, deleteMarca, getClienteOperacional, getClientes, getMarcaOperacional, getMarcas, updateCliente, updateMarca, uploadImageAsset } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, formatMoney, getRecord } from '../utils/format'
import { getBrandImage } from '../utils/favicon'
import { downloadCsv } from '../utils/exportCsv'
import { chaveAgrupamentoCarteira, isCarteiraAtiva, resolverLinkCarteira, selecionarCarteiraPorVisibilidade, type CarteiraVisibilidade } from '../utils/carteira'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'

// Vocabulário de status alinhado aos CHECKs do banco:
// clientes (migrations 016/042) e marcas (migrations 080/121).
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

export function perfilOperacionalLabel(tipo: string) {
  const labels: Record<string, string> = {
    cliente_ecommerce: 'Cliente',
    cliente: 'Cliente',
    afiliada: 'Afiliada',
    parceira: 'Parceira',
    propria: 'Marca própria',
  }
  return labels[tipo] ?? 'Marca'
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
  const ativoFormId = useId()
  const [showClienteForm, setShowClienteForm] = useState(false)
  const [showAfiliadoForm, setShowAfiliadoForm] = useState(false)
  const [clienteForm, setClienteForm] = useState(emptyClienteForm)
  const [afiliadoForm, setAfiliadoForm] = useState(emptyAfiliadoForm)
  const [selectedAtivo, setSelectedAtivo] = useState<JsonRecord | null>(null)
  const [ativoForm, setAtivoForm] = useState({ nome: '', status: 'ativo', email: '', celular: '', comissao_franquia_pct: '0', comissao_franqueadora_pct: '0', valor_fixo_minimo: '0', tipo_cobranca: 'fixo_mais_comissao', data_inicio: '', data_fim: '', logo_url: '', cor: '' })
  const ativoInitialRef = useRef(ativoForm)
  const ativoHydratedRef = useRef('')
  const [ativoSubmitting, setAtivoSubmitting] = useState(false)
  // Cor da marca no modal de edição: null = intocada (mantém/extrai), 'manual' = hex
  // escolhido no picker, 'clear' = botão "Automática" (PATCH cor: null).
  const [ativoCorTouch, setAtivoCorTouch] = useState<'manual' | 'clear' | null>(null)
  const [auditMarcaId, setAuditMarcaId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [visibilidade, setVisibilidade] = useState<CarteiraVisibilidade>('ativos')
  const [mostrarTodos, setMostrarTodos] = useState(false)
  // Linha mesclada (N cadastros) clicada: guarda o item para o seletor de registro.
  const [dupEscolha, setDupEscolha] = useState<JsonRecord | null>(null)
  // Para cliente_ecommerce, o % de comissão vive na marca principal vinculada.
  // Guardamos o id dessa marca para salvar o % via updateMarca.
  const [marcaPctId, setMarcaPctId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const toast = useToast()
  const carregarInativos = visibilidade !== 'ativos'
  // O endpoint de clientes separa arquivados; só pede essa lista ao abrir Todos/Inativos.
  const clientesQuery = useQuery({ queryKey: QK.clientes('operacionais'), queryFn: () => getClientes() })
  const clientesArquivadosQuery = useQuery({
    queryKey: QK.clientes('arquivados'),
    queryFn: () => getClientes({ status: 'arquivado' }),
    enabled: carregarInativos,
  })
  const marcasQuery = useQuery({
    queryKey: QK.marcas(visibilidade === 'ativos' ? 'ativas' : 'todos'),
    queryFn: () => getMarcas({ status: visibilidade === 'ativos' ? 'ativa' : 'all' }),
  })
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
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QK.clientes() })
      void queryClient.invalidateQueries({ queryKey: QK.marcas() })
      void queryClient.invalidateQueries({ queryKey: QK.ativoOperacional() })
      void queryClient.invalidateQueries({ queryKey: QK.agenda() })
      void queryClient.invalidateQueries({ queryKey: QK.comissoesMarcas })
      void queryClient.invalidateQueries({ queryKey: QK.rankingMarcas() })
      if (variables.kind === 'cliente') {
        void queryClient.invalidateQueries({ queryKey: QK.lives })
        void queryClient.invalidateQueries({ queryKey: QK.videos })
        void queryClient.invalidateQueries({ queryKey: QK.crmSummary })
        void queryClient.invalidateQueries({ queryKey: QK.masterCrm })
        void queryClient.invalidateQueries({ queryKey: QK.analyticsDashboard() })
        void queryClient.invalidateQueries({ queryKey: ['daily-pulse'] })
        void queryClient.invalidateQueries({ queryKey: ['funil-analytics'] })
        void queryClient.invalidateQueries({ queryKey: ['audiencia-marcas'] })
      }
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

  const isLoading = clientesQuery.isLoading || marcasQuery.isLoading || (carregarInativos && clientesArquivadosQuery.isLoading)
  const error = clientesQuery.error ?? marcasQuery.error ?? (carregarInativos ? clientesArquivadosQuery.error : null)
  const clientes = useMemo(
    () => [...(clientesQuery.data ?? []), ...(carregarInativos ? (clientesArquivadosQuery.data ?? []) : [])],
    [clientesQuery.data, clientesArquivadosQuery.data, carregarInativos],
  )
  const marcas = useMemo(() => marcasQuery.data ?? [], [marcasQuery.data])

  const ativosCarregados = useMemo(() => {
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
      // Cadastros de mesmo nome, porém status diferentes, precisam continuar separados:
      // esconderia um ativo se a cópia inativa fosse o primeiro registro mesclado.
      const key = chaveAgrupamentoCarteira(item)
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
        gmv_mes: asNumber(existing.gmv_mes) + asNumber(item.gmv_mes),
        lives_mes: asNumber(existing.lives_mes) + asNumber(item.lives_mes),
        videos_mes: asNumber(existing.videos_mes ?? existing.quantidade_videos) + asNumber(item.videos_mes ?? item.quantidade_videos),
        duplicado_count: asNumber(existing.duplicado_count, 1) + 1,
        duplicados: [...asArray<JsonRecord>(existing.duplicados), item],
      })
    }

    return [...unique.values()]
  }, [clientes, marcas])

  const ativos = useMemo(
    () => selecionarCarteiraPorVisibilidade(ativosCarregados, visibilidade),
    [ativosCarregados, visibilidade],
  )
  const quantidadeCadastros = useMemo(
    () => ativos.reduce((total, item) => total + asNumber(item.duplicado_count, 1), 0),
    [ativos],
  )

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
  const quantidadeCadastrosFiltrados = useMemo(
    () => ativosFiltrados.reduce((total, item) => total + asNumber(item.duplicado_count, 1), 0),
    [ativosFiltrados],
  )

  // ponytail: paginação simples — mostra 50 e um "Mostrar todos"; troque por paginação real se a carteira passar de centenas.
  const LIMITE_LINHAS = 50
  const ativosVisiveis = mostrarTodos ? ativosFiltrados : ativosFiltrados.slice(0, LIMITE_LINHAS)
  const temFiltros = Boolean(busca) || filtroStatus !== 'todos'

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
    if (!data || !selectedAtivoId || ativoHydratedRef.current === selectedAtivoId) return
    ativoHydratedRef.current = selectedAtivoId
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
    const hydrated = {
      ...ativoInitialRef.current,
      comissao_franquia_pct: asString(principal.comissao_franquia_pct ?? 0, '0'),
      comissao_franqueadora_pct: asString(principal.comissao_franqueadora_pct ?? 0, '0'),
      valor_fixo_minimo: normalizeMoneyInputText(asString(principal.valor_fixo_minimo ?? 0, '0')),
      tipo_cobranca: asString(principal.tipo_cobranca ?? 'fixo_mais_comissao', 'fixo_mais_comissao'),
      data_inicio: asString(principal.data_inicio ?? '', '').slice(0, 10),
      data_fim: asString(principal.data_fim ?? '', '').slice(0, 10),
      // cor da marca principal (não vem no /clientes) — reflete a cor salva no picker.
      cor: asString(principal.cor ?? ativoInitialRef.current.cor, ''),
    }
    // Preserve contact/name edits made while the detail request was loading.
    setAtivoForm((current) => ({ ...current, ...Object.fromEntries(Object.entries(hydrated).filter(([key]) => !['nome', 'status', 'email', 'celular', 'logo_url'].includes(key))) }))
    ativoInitialRef.current = hydrated
  }, [ativoDetailQuery.data, selectedAtivoKind, selectedAtivoId])

  // Deep-link: /comercial?ativo=<nome> abre o item após ampliar o catálogo se necessário.
  useEffect(() => {
    const alvo = searchParams.get('ativo')
    if (!alvo) return
    // Em carga ou erro, mantém o parâmetro: o usuário pode recarregar ou voltar aos ativos.
    if (isLoading || error) return

    const alvoNormalizado = normalizarBusca(alvo.trim())
    const encontrados = ativosCarregados.filter((registro) => normalizarBusca(asString(registro.nome).trim()) === alvoNormalizado)
    const resolucao = resolverLinkCarteira(encontrados, visibilidade === 'todos')

    if (resolucao === 'todos' && visibilidade !== 'todos') {
      setVisibilidade('todos')
      setFiltroStatus('todos')
      setMostrarTodos(false)
      return
    }

    if (resolucao !== 'ausente') {
      const candidatos = encontrados.flatMap((registro) => asArray<JsonRecord>(registro.duplicados))
      if (candidatos.length > 1) {
        setDupEscolha({ ...encontrados[0], duplicado_count: candidatos.length, duplicados: candidatos })
      } else if (encontrados[0]) {
        abrirAtivo(encontrados[0])
      }
    }

    // O catálogo atual foi consultado até uma conclusão; só então remove o parâmetro.
    const next = new URLSearchParams(searchParams)
    next.delete('ativo')
    setSearchParams(next, { replace: true })
  }, [searchParams, ativosCarregados, error, isLoading, visibilidade])

  const clienteBusy = clienteMutation.isPending || uploadClienteImage.isPending
  const afiliadoBusy = afiliadoMutation.isPending || uploadAfiliadoImage.isPending
  const ativoBusy = ativoSubmitting || ativoUpdateMutation.isPending || updateMarcaPctMutation.isPending || uploadAtivoImage.isPending
  const clienteClose = useUnsavedChanges({ open: showClienteForm, dirty: JSON.stringify(clienteForm) !== JSON.stringify(emptyClienteForm), busy: clienteBusy, onClose: () => { setShowClienteForm(false); setClienteForm(emptyClienteForm) } })
  const afiliadoClose = useUnsavedChanges({ open: showAfiliadoForm, dirty: JSON.stringify(afiliadoForm) !== JSON.stringify(emptyAfiliadoForm), busy: afiliadoBusy, onClose: () => { setShowAfiliadoForm(false); setAfiliadoForm(emptyAfiliadoForm) } })
  const ativoClose = useUnsavedChanges({ open: Boolean(selectedAtivo), dirty: JSON.stringify(ativoForm) !== JSON.stringify(ativoInitialRef.current) || ativoCorTouch !== null, busy: ativoBusy, onClose: () => setSelectedAtivo(null) })

  function recarregarCarteira() {
    void clientesQuery.refetch()
    if (carregarInativos) void clientesArquivadosQuery.refetch()
    void marcasQuery.refetch()
  }

  function setClienteField(key: keyof typeof emptyClienteForm, value: string | boolean) {
    setClienteForm((current) => ({ ...current, [key]: value }))
  }

  function setAfiliadoField(key: keyof typeof emptyAfiliadoForm, value: string) {
    setAfiliadoForm((current) => ({ ...current, [key]: value }))
  }

  function exportAtivosCsv() {
    downloadCsv('clientes-afiliados.csv', ativosFiltrados, [
      { key: 'tipo_operacional', header: 'tipo' },
      { key: 'nome', header: 'nome' },
      { key: 'marca_principal', header: 'marca_principal' },
      { key: 'status', header: 'status' },
      { key: 'gmv_mes', header: 'gmv_mes', value: (row) => row.gmv_mes ?? 0 },
      { key: 'lives_mes', header: 'lives_mes', value: (row) => row.lives_mes ?? 0 },
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
    ativoUpdateMutation.reset()
    updateMarcaPctMutation.reset()
    ativoDeleteMutation.reset()
    uploadAtivoImage.reset()
    setMarcaPctId(null) // evita salvar % na marca do item anterior antes do effect repopular
    setSelectedAtivo(item)
    setAtivoCorTouch(null)
    ativoHydratedRef.current = ''
    const nextForm = {
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
    }
    ativoInitialRef.current = nextForm
    setAtivoForm(nextForm)
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
    if (!selectedAtivo || ativoBusy) return
    setAtivoSubmitting(true)
    try {
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
      ativoInitialRef.current = { ...ativoForm, ...(typeof cor === 'string' ? { cor } : {}) }
      setAtivoCorTouch(null)
    } catch (error) {
      if (!ativoUpdateMutation.isError && !updateMarcaPctMutation.isError) toast.push(extractErrorMessage(error), 'error')
    } finally {
      setAtivoSubmitting(false)
    }
  }

  function toggleAtivoStatus(item = selectedAtivo) {
    if (!item) return
    const id = asString(item.id, '')
    const kind = selectedAtivoKind
    const current = asString(ativoForm.status || item.status)
    const operacional = kind === 'cliente'
      ? current === 'ativo' || current === 'inadimplente'
      : current === 'ativa'
    const nextStatus = kind === 'cliente'
      ? operacional ? 'cancelado' : 'ativo'
      : operacional ? 'inativa' : 'ativa'
    ativoUpdateMutation.mutate(
      { id, kind, payload: { status: nextStatus } },
      { onSuccess: () => {
        ativoInitialRef.current = { ...ativoInitialRef.current, status: nextStatus }
        setAtivoForm((currentForm) => ({ ...currentForm, status: nextStatus }))
        toast.push(`Status atualizado para ${statusLabel(nextStatus)}.`, 'success')
      } },
    )
  }

  function deleteAtivo() {
    if (!selectedAtivo) return
    const id = asString(selectedAtivo.id, '')
    const kind = selectedAtivoKind
    const ok = window.confirm(
      `Excluir ${kind === 'cliente' ? 'o cliente' : 'o afiliado'} "${asString(selectedAtivo.nome)}"?\n\n`
      + 'O cadastro sai da carteira. Se houver histórico de lives ou vídeos, a API pode bloquear a exclusão — nesse caso, prefira desativar.',
    )
    if (!ok) return
    ativoDeleteMutation.mutate({ id, kind })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Carteira de clientes" subtitle="Encontre, consulte e atualize os cadastros que sustentam a operação." />

      <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-ink">Clientes e afiliados</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {isLoading
                      ? 'Carregando registros…'
                      : error
                        ? 'Não foi possível atualizar a contagem.'
                        : `${quantidadeCadastros.toLocaleString('pt-BR')} ${quantidadeCadastros === 1 ? 'cadastro' : 'cadastros'} nesta visão`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button icon={Plus} onClick={() => setShowClienteForm((value) => !value)}>Novo cliente</Button>
                  <Button variant="secondary" icon={Plus} onClick={() => setShowAfiliadoForm((value) => !value)}>Novo afiliado</Button>
                  <Button variant="secondary" icon={Download} onClick={exportAtivosCsv} disabled={isLoading || Boolean(error) || ativosFiltrados.length === 0}>Exportar CSV</Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-2" aria-label="Visibilidade da carteira">
                  {([
                    ['ativos', 'Ativos'],
                    ['todos', 'Todos'],
                    ['inativos', 'Inativos'],
                  ] as const).map(([value, label]) => (
                    <Button
                      key={value}
                      variant={visibilidade === value ? 'primary' : 'secondary'}
                      aria-pressed={visibilidade === value}
                      onClick={() => {
                        setVisibilidade(value)
                        setFiltroStatus('todos')
                        setMostrarTodos(false)
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <input
                    className="design-input h-10 w-64 pl-9 pr-3"
                    type="search"
                    placeholder="Buscar cliente ou marca"
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
                {!isLoading && !error && temFiltros ? (
                  <span className="text-xs text-ink-muted">{quantidadeCadastrosFiltrados} de {quantidadeCadastros} cadastros</span>
                ) : null}
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardBody>
              {isLoading ? (
                <LoadingState label="Atualizando a carteira…" />
              ) : error ? (
                <ErrorState message={extractErrorMessage(error)} onRetry={recarregarCarteira} />
              ) : ativosFiltrados.length === 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 py-8">
                  <div>
                    <p className="font-semibold text-ink">
                      {temFiltros ? 'Nenhum cadastro encontrado' : visibilidade === 'inativos' ? 'Nenhum cadastro inativo' : 'Nenhum cadastro nesta visão'}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {temFiltros
                        ? 'Ajuste a busca ou os filtros para continuar.'
                        : visibilidade === 'inativos'
                          ? 'Os cadastros desativados aparecerão aqui.'
                          : 'Crie um cliente ou afiliado para iniciar a carteira.'}
                    </p>
                  </div>
                  {temFiltros ? (
                    <Button variant="secondary" onClick={() => { setBusca(''); setFiltroStatus('todos') }}>Limpar filtros</Button>
                  ) : visibilidade === 'inativos' ? (
                    <Button variant="secondary" onClick={() => { setVisibilidade('ativos'); setMostrarTodos(false) }}>Ver ativos</Button>
                  ) : (
                    <Button icon={Plus} onClick={() => setShowClienteForm(true)}>Novo cliente</Button>
                  )}
                </div>
              ) : (
                <DataTable<JsonRecord>
                  data={ativosVisiveis}
                  onRowClick={abrirAtivo}
                  footer={!mostrarTodos && ativosFiltrados.length > LIMITE_LINHAS ? (
                    <Button variant="secondary" onClick={() => setMostrarTodos(true)}>
                      Mostrar todos ({ativosFiltrados.length - LIMITE_LINHAS} restantes)
                    </Button>
                  ) : undefined}
                  columns={[
                  {
                    key: 'nome',
                    header: 'Cliente / marca',
                    render: (item) => {
                      const image = getBrandImage(item)
                      const nome = asString(item.nome, 'CL')
                      const marcaPrincipal = asString(item.marca_principal)
                      const mostraMarcaOperacional = Boolean(marcaPrincipal) && normalizarBusca(marcaPrincipal) !== normalizarBusca(nome)
                      const initials = nome.slice(0, 2).toUpperCase()
                      const ativo = isCarteiraAtiva(asString(item.status))
                      return (
                        <div className="flex min-w-48 max-w-64 items-center gap-3">
                          <div
                            className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 bg-surface-muted text-xs font-black text-ink-muted"
                            style={{ borderColor: resolveMarcaCor(asString(item.cor) || null, asString(item.cor_seed_id) || asString(item.id)) }}
                          >
                            {image ? <img src={image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : initials}
                          </div>
                          <div className="min-w-0">
                            <p className={`truncate font-semibold ${ativo ? 'text-ink' : 'text-ink-muted'}`}>
                              {nome}
                              <BotBadge origem={item.origem_dados} className="ml-2 align-middle" />
                            </p>
                            <p className="mt-0.5 text-xs text-ink-muted">{perfilOperacionalLabel(asString(item.tipo_operacional ?? item.tipo))}</p>
                            {mostraMarcaOperacional ? <p className="mt-0.5 truncate text-xs text-ink-muted">Marca operacional: {marcaPrincipal}</p> : null}
                            {asNumber(item.duplicado_count) > 1 ? <Badge className="mt-1" tone="warning">{asNumber(item.duplicado_count)} cadastros</Badge> : null}
                          </div>
                        </div>
                      )
                    },
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (item) => {
                      const ativo = isCarteiraAtiva(asString(item.status))
                      return <Badge tone={ativo ? statusTone(asString(item.status, 'ativa')) : 'neutral'}>{statusLabel(asString(item.status, 'ativa'))}</Badge>
                    },
                  },
                  {
                    key: 'contato',
                    header: 'Contato',
                    render: (item) => {
                      const email = asString(item.email ?? item.acesso_email)
                      const celular = asString(item.celular ?? item.whatsapp)
                      if (!email && !celular) return <span className="text-ink-muted">—</span>
                      return (
                        <div className="min-w-36 text-sm text-ink">
                          {email ? <p className="truncate">{email}</p> : null}
                          {celular ? <p className="mt-0.5 text-xs text-ink-muted">{celular}</p> : null}
                        </div>
                      )
                    },
                  },
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
              )}
            </CardBody>
          </Card>
      </div>

      <Modal
        open={showClienteForm}
        title="Novo cliente"
        subtitle="Um cadastro para o cliente e sua marca nas lives. Campos com * são obrigatórios."
        onClose={clienteClose.requestClose}
        closeDisabled={clienteBusy}
        footer={clienteClose.confirming ? <UnsavedChangesNotice guard={clienteClose} /> : undefined}
      >
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onClienteSubmit}>
          <label className="block"><span className="text-sm font-medium text-ink">Nome da empresa/marca *</span><input aria-label="Nome da empresa/marca" className="design-input mt-1 h-11 w-full px-4" placeholder="Nome da empresa/marca" value={clienteForm.nome} onChange={(event) => setClienteField('nome', event.target.value)} required /></label>
          <label className="block"><span className="text-sm font-medium text-ink">Responsável</span><input aria-label="Responsável" className="design-input mt-1 h-11 w-full px-4" placeholder="Responsável" value={clienteForm.responsavel} onChange={(event) => setClienteField('responsavel', event.target.value)} /></label>
          <label className="block"><span className="text-sm font-medium text-ink">WhatsApp *</span><input aria-label="WhatsApp" className="design-input mt-1 h-11 w-full px-4" placeholder="WhatsApp" value={clienteForm.whatsapp} onChange={(event) => setClienteField('whatsapp', event.target.value)} required /></label>
          <label className="block"><span className="text-sm font-medium text-ink">E-mail</span><input aria-label="E-mail" className="design-input mt-1 h-11 w-full px-4" placeholder="E-mail" type="email" value={clienteForm.email} onChange={(event) => setClienteField('email', event.target.value)} /></label>
          <label className="block"><span className="text-sm font-medium text-ink">CNPJ</span><input aria-label="CNPJ" className="design-input mt-1 h-11 w-full px-4" placeholder="CNPJ" value={clienteForm.cnpj} onChange={(event) => setClienteField('cnpj', event.target.value)} /></label>
          <label className="block"><span className="text-sm font-medium text-ink">Nicho</span><input className="design-input mt-1 h-11 w-full px-4" placeholder="Nicho" value={clienteForm.nicho} onChange={(event) => setClienteField('nicho', event.target.value)} /></label>
          <label className="block"><span className="text-sm font-medium text-ink">TikTok username</span><input className="design-input mt-1 h-11 w-full px-4" placeholder="TikTok username" value={clienteForm.tiktok_username} onChange={(event) => setClienteField('tiktok_username', event.target.value.replace(/@/g, ''))} /></label>
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
        onClose={afiliadoClose.requestClose}
        closeDisabled={afiliadoBusy}
        footer={afiliadoClose.confirming ? <UnsavedChangesNotice guard={afiliadoClose} /> : undefined}
      >
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onAfiliadoSubmit}>
          <label className="block"><span className="text-sm font-medium text-ink">Nome da marca afiliada *</span><input aria-label="Nome da marca afiliada" className="design-input mt-1 h-11 w-full px-4" placeholder="Nome da marca afiliada" value={afiliadoForm.nome} onChange={(event) => setAfiliadoField('nome', event.target.value)} required /></label>
          <label className="block"><span className="text-sm font-medium text-ink">Responsável</span><input aria-label="Responsável" className="design-input mt-1 h-11 w-full px-4" placeholder="Responsável" value={afiliadoForm.responsavel} onChange={(event) => setAfiliadoField('responsavel', event.target.value)} /></label>
          <label className="block"><span className="text-sm font-medium text-ink">WhatsApp</span><input aria-label="WhatsApp" className="design-input mt-1 h-11 w-full px-4" placeholder="WhatsApp" value={afiliadoForm.whatsapp} onChange={(event) => setAfiliadoField('whatsapp', event.target.value)} /></label>
          <label className="block"><span className="text-sm font-medium text-ink">E-mail</span><input aria-label="E-mail" className="design-input mt-1 h-11 w-full px-4" placeholder="E-mail" type="email" value={afiliadoForm.email} onChange={(event) => setAfiliadoField('email', event.target.value)} /></label>
          <label className="block"><span className="text-sm font-medium text-ink">TikTok username</span><input className="design-input mt-1 h-11 w-full px-4" placeholder="TikTok username" value={afiliadoForm.tiktok_username} onChange={(event) => setAfiliadoField('tiktok_username', event.target.value.replace(/@/g, ''))} /></label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Comissão Franquia (%)</span>
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
          <textarea aria-label="Observações" className="design-input min-h-24 px-4 py-3 md:col-span-2" placeholder="Observações" value={afiliadoForm.observacoes} onChange={(event) => setAfiliadoField('observacoes', event.target.value)} />
          {uploadAfiliadoImage.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] md:col-span-2">{extractErrorMessage(uploadAfiliadoImage.error)}</p> : null}
          {afiliadoMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] md:col-span-2">{extractErrorMessage(afiliadoMutation.error)}</p> : null}
          <Button type="submit" isLoading={afiliadoMutation.isPending}>Salvar afiliado</Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedAtivo)}
        title={selectedAtivoKind === 'cliente' ? 'Cliente e marca' : 'Marca afiliada'}
        subtitle={selectedAtivoKind === 'cliente' ? 'Dados do cliente e da marca operacional vinculada.' : 'Dados operacionais, histórico e configuração comercial.'}
        size="lg"
        onClose={ativoClose.requestClose}
        closeDisabled={ativoBusy}
        footer={
          <>
            <UnsavedChangesNotice guard={ativoClose} />
            {ativoUpdateMutation.isError ? <p role="alert" className="w-full rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{extractErrorMessage(ativoUpdateMutation.error)}</p> : null}
            {updateMarcaPctMutation.isError ? <p role="alert" className="w-full rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">Cadastro salvo; as condições comerciais da marca não foram salvas: {extractErrorMessage(updateMarcaPctMutation.error)}</p> : null}
            <Button type="button" variant="secondary" disabled={ativoBusy} onClick={ativoClose.requestClose}>Cancelar</Button>
            <Button type="submit" form={ativoFormId} disabled={!ativoDetailQuery.data || ativoDetailQuery.isLoading} isLoading={ativoBusy}>Salvar alterações</Button>
          </>
        }
      >
        <div className="space-y-5">
          {ativoDetailQuery.isLoading ? <LoadingState label="Carregando histórico" /> : null}
          {ativoDetailQuery.isError ? <ErrorState message={extractErrorMessage(ativoDetailQuery.error)} onRetry={() => void ativoDetailQuery.refetch()} /> : null}
          {ativoDetailQuery.data ? (
            <>
              <dl className="grid gap-3 rounded-xl border border-line bg-surface-muted p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">GMV mês</dt>
                  <dd className="mt-1 text-lg font-bold text-ink">{formatMoney(getRecord(ativoDetailQuery.data.metrics).gmv_mes)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">GMV acumulado</dt>
                  <dd className="mt-1 text-lg font-bold text-ink">{formatMoney(getRecord(ativoDetailQuery.data.metrics).gmv_acumulado)}</dd>
                </div>
              </dl>

              <form id={ativoFormId} className="space-y-0" onSubmit={onAtivoSubmit}>
                <ModalSection title={selectedAtivoKind === 'cliente' ? 'Identidade e contato' : 'Identidade da marca'} description={selectedAtivoKind === 'cliente' ? 'Contato, situação e imagem do cadastro comercial.' : 'Nome, situação e imagem usadas na operação.'}>
                  <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-ink">{selectedAtivoKind === 'cliente' ? 'Nome do cliente e da marca' : 'Nome da marca'}</span>
                  <input className="design-input mt-2 h-11 w-full px-4" required value={ativoForm.nome} onChange={(event) => setAtivoForm((current) => ({ ...current, nome: event.target.value }))} />
                  {selectedAtivoKind === 'cliente' && marcaPctId ? <span className="mt-1 block text-[11px] text-ink-muted">Ao alterar este nome, a marca vinculada será renomeada também.</span> : null}
                </label>
                <div className="block">
                  <span className="text-sm font-semibold text-ink">Status</span>
                  <p className="mt-2 flex h-11 items-center rounded-xl border border-line bg-surface-muted px-4 text-sm text-ink">{statusLabel(ativoForm.status)}</p>
                  <span className="mt-1 block text-[11px] text-ink-muted">Use a ação abaixo para desativar ou reativar o cadastro.</span>
                </div>
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
                    {asString(selectedAtivo?.marca_principal) && normalizarBusca(asString(selectedAtivo?.marca_principal)) !== normalizarBusca(ativoForm.nome) ? (
                      <p className="rounded-xl bg-surface-muted px-3 py-2 text-xs text-ink-muted md:col-span-2">Marca operacional atual: <strong className="font-semibold text-ink">{asString(selectedAtivo?.marca_principal)}</strong>.</p>
                    ) : null}
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">E-mail</span>
                      <input className="design-input mt-2 h-11 w-full px-4" type="email" value={ativoForm.email} onChange={(event) => setAtivoForm((current) => ({ ...current, email: event.target.value }))} />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">WhatsApp</span>
                      <input className="design-input mt-2 h-11 w-full px-4" type="tel" value={ativoForm.celular} onChange={(event) => setAtivoForm((current) => ({ ...current, celular: event.target.value }))} />
                    </label>
                  </>
                ) : null}
                  </div>
                </ModalSection>

                <ModalSection title="Condições comerciais" description="Valores aplicados à marca operacional nas lives e vídeos." collapsible>
                  <div className="grid gap-3 md:grid-cols-2">
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
                  </div>
                </ModalSection>
                <ModalSection title="Ações administrativas" description="Desative, reative ou exclua este cadastro. O histórico é preservado." collapsible>
                  <div className="flex flex-wrap items-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => toggleAtivoStatus()} disabled={ativoUpdateMutation.isPending}>
                    {((selectedAtivoKind === 'cliente' && ['ativo', 'inadimplente'].includes(ativoForm.status)) || (selectedAtivoKind === 'marca' && ativoForm.status === 'ativa')) ? 'Desativar' : 'Reativar'}
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
                </ModalSection>
                {uploadAtivoImage.isError ? <p role="alert" className="mt-3 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{extractErrorMessage(uploadAtivoImage.error)}</p> : null}
                {ativoDeleteMutation.isError ? <p role="alert" className="mt-3 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{extractErrorMessage(ativoDeleteMutation.error)}</p> : null}
              </form>

              {selectedAtivoKind === 'cliente' && selectedAtivoId ? <BriefingSection key={selectedAtivoId} clienteId={selectedAtivoId} /> : null}

              <ModalSection title="Histórico operacional" description={`${asNumber(getRecord(ativoDetailQuery.data.metrics).total_lives).toLocaleString('pt-BR')} lives · ${asNumber(getRecord(ativoDetailQuery.data.metrics).total_videos).toLocaleString('pt-BR')} vídeos registrados para esta conta.`}>
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
              </ModalSection>
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
