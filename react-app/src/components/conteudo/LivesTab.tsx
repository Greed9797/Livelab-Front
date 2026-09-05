import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Edit2,
  ExternalLink,
  Filter,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { BotBadge } from '../ui/BotBadge'
import { ErrorState, LoadingState } from '../ui/States'
import { AnalyticsImportSection } from '../analytics/AnalyticsImportSection'
import { publicationStatusLabel } from '../../pages/conteudo-helpers'
import { asNumber, asString, formatMoney } from '../../utils/format'
import { officialLiveGmv } from '../../utils/live-gmv'
import {
  calcDuration,
  classifyLivePendings,
  filterLivesByPending,
  fmtTime,
  hasRecordedMetricValue,
  hasRecordedLiveGmv,
  livePresenterCellModel,
  livePresenterNames,
  summarizeLivePendings,
  type LiveFilterOption,
  type LivePendingKind,
} from './live-helpers'
import { InlineApresentadoraCell, InlineGmvCell, InlinePedidosCell } from './LiveInlineCells'
import { LiveDetailModal } from './LiveDetailModal'
import { LivePendingPanel } from './LivePendingPanel'
import type { DateRange } from './live-date-range'
import './LivesTab.css'
import type { JsonRecord } from '../../types/models'
import type { UseMutationResult } from '@tanstack/react-query'

// ─── colunas opcionais ─────────────────────────────────────────────────────
// A tabela nasce enxuta (Horário, Live, Duração, GMV, GMV/h, Pedidos, Comissão, Apresentadora,
// Status). O que é contexto raro — cabine, barra de duração, origem — e o funil do TikTok
// ligam pelo botão "Colunas"; a escolha fica no navegador (localStorage).
export type LiveColumnKey =
  | 'cabine' | 'duracao_barra' | 'gmv_hora' | 'impressoes' | 'visualizacoes' | 'cliques' | 'seguidores' | 'tipo'

export const LIVE_COLUMN_OPTIONS: ReadonlyArray<{ key: LiveColumnKey; label: string; hint: string }> = [
  { key: 'gmv_hora', label: 'GMV/h', hint: 'GMV dividido pelas horas registradas' },
  { key: 'impressoes', label: 'Impressões', hint: 'impressões da live no feed (CSV do TikTok)' },
  { key: 'visualizacoes', label: 'Visualizações', hint: 'views da live' },
  { key: 'cliques', label: 'Cliques em produto', hint: 'CSV do TikTok' },
  { key: 'seguidores', label: 'Novos seguidores', hint: 'CSV do TikTok' },
  { key: 'cabine', label: 'Cabine', hint: 'número da cabine' },
  { key: 'duracao_barra', label: 'Barra de duração', hint: 'barra proporcional a 8h ao lado da duração' },
  { key: 'tipo', label: 'Origem (Manual / API / Bot)', hint: 'o chip BOT ao lado do nome já cobre o caso mais comum' },
]

export const DEFAULT_LIVE_COLUMNS: ReadonlyArray<LiveColumnKey> = ['gmv_hora']
const LIVE_COLUMNS_STORAGE_KEY = 'livelab.lives.colunas.v1'

// Grid template shared between header + every row — segue exatamente a ordem das células.
export function buildLivesGridTemplate(visiveis: ReadonlySet<LiveColumnKey>): string {
  const cols = ['80px', 'minmax(180px,1.4fr)']
  if (visiveis.has('cabine')) cols.push('90px')
  cols.push(visiveis.has('duracao_barra') ? '110px' : '72px')
  cols.push('115px') // GMV
  if (visiveis.has('gmv_hora')) cols.push('92px')
  cols.push('80px') // Pedidos
  for (const key of ['impressoes', 'visualizacoes', 'cliques', 'seguidores'] as const) {
    if (visiveis.has(key)) cols.push('92px')
  }
  cols.push('100px', 'minmax(115px,1fr)', '90px') // Comissão, Apresentadora, Status
  if (visiveis.has('tipo')) cols.push('76px')
  cols.push('76px') // ações
  return cols.join(' ')
}

/** GMV por hora registrada; null quando não há duração ou GMV para dividir. */
export function gmvPorHora(gmv: number, mins: number): number | null {
  if (!(mins > 0) || !(gmv > 0)) return null
  return gmv / (mins / 60)
}

function loadLiveColumns(): Set<LiveColumnKey> {
  try {
    const raw = localStorage.getItem(LIVE_COLUMNS_STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const validas = parsed.filter((k): k is LiveColumnKey => LIVE_COLUMN_OPTIONS.some((o) => o.key === k))
        return new Set(validas)
      }
    }
  } catch {
    // localStorage indisponível (modo privado, sandbox): cai no padrão
  }
  return new Set(DEFAULT_LIVE_COLUMNS)
}

function saveLiveColumns(cols: ReadonlySet<LiveColumnKey>) {
  try { localStorage.setItem(LIVE_COLUMNS_STORAGE_KEY, JSON.stringify([...cols])) } catch { /* idem */ }
}

const fmtInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
// Reference max duration (8 h) for the duration bar width
const MAX_DUR_MINS = 480
const ACTION_MENU_WIDTH = 168

export { dateRangeToWindow, isValidCustomDateRange, type DateRange } from './live-date-range'

export type { LiveFilterOption } from './live-helpers'

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'todos', label: 'Qualquer data' },
  { value: 'hoje', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'mes', label: 'Este mês' },
  { value: 'custom', label: 'Personalizado' },
]

function localIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// ─── helpers ───────────────────────────────────────────────────────────────

function groupByDay(lives: JsonRecord[]) {
  const map = new Map<string, { label: string; lives: JsonRecord[] }>()
  for (const live of lives) {
    const d = live.iniciado_em ? new Date(live.iniciado_em as string) : null
    const key =
      d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '1970-01-01'
    const label =
      d && !Number.isNaN(d.getTime())
        ? new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }).format(d)
        : 'Sem data'
    if (!map.has(key)) map.set(key, { label, lives: [] })
    map.get(key)!.lives.push(live)
  }
  return [...map.entries()]
    .map(([dateKey, { label, lives }]) => ({ dateKey, label, lives }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
}

function doExportCSV(lives: JsonRecord[]) {
  const header = [
    'ID',
    'Data',
    'Início',
    'Término',
    'Duração',
    'Cliente/Marca',
    'Cabine',
    'Apresentadora',
    'Status',
    'Tipo',
    'GMV (R$)',
    'GMV/h (R$)',
  ]
  const groups = groupByDay(lives)
  const rows: string[][] = [header]
  for (const g of groups) {
    for (const l of g.lives) {
      const { text: dur, mins } = calcDuration(l)
      const gmvHora = gmvPorHora(asNumber(officialLiveGmv(l)), mins)
      rows.push([
        asString(l.id),
        g.dateKey,
        fmtTime(l.iniciado_em),
        fmtTime(l.encerrado_em),
        dur,
        asString(l.marca_nome ?? l.cliente_nome),
        `Cabine ${asString(l.cabine_numero)}`,
        livePresenterNames(l).join(' + ') || '—',
        publicationStatusLabel(l.status_publicacao),
        asString(l.origem_dados, 'manual'),
        asNumber(officialLiveGmv(l))
          .toFixed(2)
          .replace('.', ','),
        gmvHora == null ? '' : gmvHora.toFixed(2).replace('.', ','),
      ])
    }
  }
  const csv = rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c)
          return /[,;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(';'),
    )
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'lives-realizadas.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

// ─── small sub-components ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: unknown }) {
  const s = asString(status, 'rascunho').toLowerCase()
  const isPublicado = s === 'publicado' || s === 'publicada'
  const isRevisado = s === 'revisado'
  let border = '1px solid var(--warning-soft)'
  let bg = 'var(--warning-soft)'
  let color = 'var(--warning)'
  if (isPublicado) {
    border = '1px solid var(--success-soft)'
    bg = 'var(--success-soft)'
    color = 'var(--success)'
  } else if (isRevisado) {
    border = '1px solid var(--info-soft)'
    bg = 'var(--info-soft)'
    color = 'var(--info)'
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 7px',
        borderRadius: 5,
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-mono)',
        lineHeight: 1.4,
        border,
        background: bg,
        color,
      }}
    >
      {publicationStatusLabel(status)}
    </span>
  )
}

// Célula numérica alinhada à direita; zero informado continua visível e distinto de ausência.
function MetricaCell({ valor, dinheiro = false }: { valor: unknown; dinheiro?: boolean }) {
  const temValor = hasRecordedMetricValue(valor)
  const numero = asNumber(valor)
  return (
    <div style={{ textAlign: 'right', paddingRight: 10, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontSize: 12 }}>
      {temValor ? (
        <span style={{ color: 'var(--text-secondary)' }}>{dinheiro ? formatMoney(numero) : fmtInt.format(numero)}</span>
      ) : (
        <span style={{ color: 'var(--text-faint)' }}>—</span>
      )}
    </div>
  )
}

function TipoBadge({ tipo }: { tipo: unknown }) {
  const t = asString(tipo, 'manual').toLowerCase()
  // 'bot' é automação também: antes caía em MANUAL e brigava com o chip BOT ao lado do nome.
  const isAuto = ['api', 'auto', 'tiktok', 'sync', 'bot'].includes(t)
  const rotulo = t === 'bot' ? 'BOT' : isAuto ? 'AUTO' : 'MANUAL'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 7px',
        borderRadius: 5,
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-mono)',
        lineHeight: 1.4,
        border: isAuto ? '1px solid var(--info-soft)' : '1px solid var(--border-strong)',
        background: isAuto ? 'var(--info-soft)' : 'var(--bg-elev-2)',
        color: isAuto ? 'var(--info)' : 'var(--text-muted)',
      }}
    >
      {rotulo}
    </span>
  )
}

function MenuBtn({
  icon,
  label,
  hint,
  danger,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        width: '100%',
        textAlign: 'left',
        padding: '7px 10px',
        borderRadius: 6,
        background: 'transparent',
        border: 'none',
        color: danger ? 'var(--danger)' : 'var(--text-primary)',
        fontSize: 12.5,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
      onClick={onClick}
    >
      {icon}
      {label}
      {hint && (
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            color: 'var(--text-muted)',
          }}
        >
          {hint}
        </span>
      )}
    </button>
  )
}

// ─── types ─────────────────────────────────────────────────────────────────

export interface LivesTabProps {
  /** false = papel read-only: lista visível, ações de escrita escondidas. */
  canWrite?: boolean
  livesData: JsonRecord[]
  liveModalMode: 'detail' | null
  selectedLiveRecord: JsonRecord | null
  reportCopied: boolean
  deleteLiveMutation: UseMutationResult<unknown, Error, string>
  onOpenCreateLiveModal: () => void
  onOpenLiveDetail: (live: JsonRecord) => void
  onOpenEditLive: (live: JsonRecord) => void
  onSplitApresentadoras: (live: JsonRecord) => void
  onDeleteLive: (live: JsonRecord) => void
  onCloseLiveModal: () => void
  onCopyLiveReport: (text: string) => void
  onInlineSaveLive?: (liveId: string, payload: JsonRecord) => Promise<unknown>
  duplicateLiveIds?: string[]
  duplicateClusterCount?: number
  pendingFilter: LivePendingKind | ''
  onPendingFilterChange: (pending: LivePendingKind | '') => void
  cabineFilterId: string
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  contextSource?: string
  contextAgendaId?: string
  contextAgendaLoading?: boolean
  duplicateStatus?: 'loading' | 'error' | 'ready'
  onRegisterAgendaResult?: () => void
  onBackContext?: () => void
  onClearContext?: () => void
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  customDateFrom: string
  customDateTo: string
  customDateError?: string
  onCustomDateFromChange: (value: string) => void
  onCustomDateToChange: (value: string) => void
  marcaFilterId: string
  apresentadoraFilterId: string
  onMarcaFilterChange: (id: string) => void
  onApresentadoraFilterChange: (id: string) => void
  marcaFilterOptions: LiveFilterOption[]
  apresentadoraFilterOptions: LiveFilterOption[]
  onClearFilters: () => void
  // Busca/status server-side + paginação real
  searchQuery: string
  onSearchChange: (q: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'encerrada', label: 'Encerradas' },
  { value: 'faturada', label: 'Faturadas' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'todas', label: 'Todos os status' },
]

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// ─── main component ────────────────────────────────────────────────────────

export function LivesTab({
  canWrite = true,
  livesData,
  liveModalMode,
  selectedLiveRecord,
  reportCopied,
  deleteLiveMutation,
  onOpenCreateLiveModal,
  onOpenLiveDetail,
  onOpenEditLive,
  onSplitApresentadoras,
  onDeleteLive,
  onCloseLiveModal,
  onCopyLiveReport,
  onInlineSaveLive,
  duplicateLiveIds,
  duplicateClusterCount = 0,
  pendingFilter,
  onPendingFilterChange,
  cabineFilterId,
  isLoading = false,
  errorMessage,
  onRetry,
  contextSource,
  contextAgendaId,
  contextAgendaLoading = false,
  duplicateStatus = 'ready',
  onRegisterAgendaResult,
  onBackContext,
  onClearContext,
  dateRange,
  onDateRangeChange,
  customDateFrom,
  customDateTo,
  customDateError,
  onCustomDateFromChange,
  onCustomDateToChange,
  marcaFilterId,
  apresentadoraFilterId,
  onMarcaFilterChange,
  onApresentadoraFilterChange,
  marcaFilterOptions,
  apresentadoraFilterOptions,
  onClearFilters,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: LivesTabProps) {
  const [importOpen, setImportOpen] = useState(false)
  const [search, setSearch] = useState(searchQuery)
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set())
  const [kebabMenu, setKebabMenu] = useState<{ liveId: string; live: JsonRecord; top: number; left: number } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [colunasOpen, setColunasOpen] = useState(false)
  const [colunas, setColunas] = useState<Set<LiveColumnKey>>(loadLiveColumns)
  const gridCols = useMemo(() => buildLivesGridTemplate(colunas), [colunas])
  function toggleColuna(key: LiveColumnKey) {
    setColunas((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(key)) proximo.delete(key)
      else proximo.add(key)
      saveLiveColumns(proximo)
      return proximo
    })
  }
  const searchRef = useRef<HTMLInputElement>(null)
  const duplicateIdSet = useMemo(() => new Set(duplicateLiveIds ?? []), [duplicateLiveIds])
  // Filtros de data/marca/apresentadora são controlados pelo ConteudoPage (server-side).
  const setDateRange = onDateRangeChange
  const marcaFilter = marcaFilterId
  const apresentadoraFilter = apresentadoraFilterId
  const setMarcaFilter = onMarcaFilterChange
  const setApresentadoraFilter = onApresentadoraFilterChange
  const marcaOptions = marcaFilterOptions
  const apresentadoraOptions = apresentadoraFilterOptions
  const kebabOpenId = kebabMenu?.liveId ?? null
  const todayIso = localIsoDate(new Date())

  // Close overlay menus on outside click
  useEffect(() => {
    const close = () => {
      setKebabMenu(null)
      setExportOpen(false)
      setFiltersOpen(false)
      setColunasOpen(false)
    }
    document.addEventListener('click', close)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('click', close)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [])

  // `/` keyboard shortcut → focus search
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as Element).tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  // Busca server-side com debounce: o input é local; ~400ms depois propaga via
  // onSearchChange (que atualiza a URL e refaz a query). lastSentRef distingue
  // mudança externa (limpar filtros, back/forward) — que ressincroniza o input —
  // de eco da própria digitação, que não pode sobrescrever o que o usuário digita.
  const lastSentRef = useRef(searchQuery)
  useEffect(() => {
    if (searchQuery !== lastSentRef.current) {
      lastSentRef.current = searchQuery
      setSearch(searchQuery)
    }
  }, [searchQuery])
  useEffect(() => {
    if (search === searchQuery) return
    const timer = setTimeout(() => {
      lastSentRef.current = search
      onSearchChange(search)
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, searchQuery])

  // Busca/data/marca/apresentadora/status/cabine já vêm filtrados do servidor. A classificação
  // de pendência é deliberadamente local e os números deixam claro que cobrem os resultados
  // carregados desta página, sem sugerir um total que o endpoint não calcula.
  const filteredLives = useMemo(() => {
    return filterLivesByPending(livesData, pendingFilter, duplicateIdSet)
  }, [livesData, pendingFilter, duplicateIdSet])
  const pendingCounts = useMemo(() => summarizeLivePendings(livesData, duplicateIdSet), [livesData, duplicateIdSet])

  const activeFilterCount =
    (dateRange !== 'todos' ? 1 : 0) +
    (marcaFilter ? 1 : 0) +
    (apresentadoraFilter ? 1 : 0) +
    (cabineFilterId ? 1 : 0) +
    (statusFilter !== 'encerrada' ? 1 : 0) +
    (pendingFilter ? 1 : 0)
  const hasAnyFilter = Boolean(search.trim()) || activeFilterCount > 0
  const clearFilters = onClearFilters

  const dayGroups = useMemo(() => groupByDay(filteredLives), [filteredLives])
  // Pré-computa as agregações por grupo (duração/GMV/publicadas/rascunhos) uma única
  // vez por mudança de `dayGroups`, em vez de recalcular reduce/filter por render
  // dentro do map. Keyed pela própria referência de `group.lives`.
  const dayGroupAggregates = useMemo(
    () =>
      dayGroups.map((group) => {
        const totalMins = group.lives.reduce((s, l) => s + calcDuration(l).mins, 0)
        const totalGmv = group.lives.reduce((s, l) => s + asNumber(officialLiveGmv(l)), 0)
        const publicadas = group.lives.filter((l) => {
          const s = asString(l.status_publicacao, '').toLowerCase()
          return s === 'publicado' || s === 'publicada'
        }).length
        return {
          dateKey: group.dateKey,
          totalMins,
          totalGmv,
          publicadas,
          rascunhos: group.lives.length - publicadas,
        }
      }),
    [dayGroups],
  )
  // Paginação server-side
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  const rangeFrom = total === 0 ? 0 : page * pageSize + 1
  const rangeTo = Math.min(total, page * pageSize + livesData.length)

  function toggleDay(key: string) {
    setCollapsedDays((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleKebabMenu(event: React.MouseEvent<HTMLButtonElement>, liveId: string, live: JsonRecord) {
    event.stopPropagation()

    if (kebabOpenId === liveId) {
      setKebabMenu(null)
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const left = Math.min(
      Math.max(8, rect.right - ACTION_MENU_WIDTH),
      window.innerWidth - ACTION_MENU_WIDTH - 8,
    )
    const top = Math.min(rect.bottom + 6, window.innerHeight - 112)
    setKebabMenu({ liveId, live, top: Math.max(8, top), left })
    setExportOpen(false)
  }

  // ── common button styles ──────────────────────────────────────────────
  const tbtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 12px',
    borderRadius: 9,
    background: 'var(--bg-elev-2)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    fontSize: 12.5,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  }

  const menuPopover: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    minWidth: 210,
    background: 'var(--bg-elev-2)',
    border: '1px solid var(--border-strong)',
    borderRadius: 10,
    boxShadow: 'var(--shadow-card-lg)',
    padding: 5,
    zIndex: 20,
  }

  return (
    <section className="space-y-3">
      {contextSource ? (
        <div className="lives-context-bar">
          <strong>Recorte vindo de {contextSource === 'analytics' ? 'Analytics' : contextSource === 'grade' ? 'Grade' : contextSource}</strong>
          <span>
            Os filtros de período, marca e cabine foram preservados.
            {contextAgendaId ? ' O evento da agenda aguarda o cadastro do resultado.' : ''}
          </span>
          <div className="lives-context-actions">
            {canWrite && contextAgendaId && onRegisterAgendaResult ? (
              <button type="button" className="lives-context-action" onClick={onRegisterAgendaResult} disabled={contextAgendaLoading}>
                {contextAgendaLoading ? 'Carregando evento…' : 'Cadastrar resultado'}
              </button>
            ) : null}
            {onBackContext ? <button type="button" className="lives-context-action" onClick={onBackContext}>Voltar</button> : null}
            {onClearContext ? <button type="button" className="lives-context-action" onClick={onClearContext}>Limpar recorte</button> : null}
          </div>
        </div>
      ) : null}

      <LivePendingPanel
        counts={pendingCounts}
        loadedCount={livesData.length}
        selected={pendingFilter}
        onSelect={onPendingFilterChange}
        loading={isLoading}
        error={Boolean(errorMessage)}
        duplicateStatus={duplicateStatus}
        onRetry={onRetry}
      />

      {duplicateClusterCount > 0 ? (
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 11 }}>
          O detector encontrou {duplicateClusterCount} {duplicateClusterCount === 1 ? 'grupo possível' : 'grupos possíveis'} nos últimos 90 dias; confirme no detalhe antes de corrigir.
        </p>
      ) : null}

      {/* ── Toolbar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          padding: 8,
          border: '1px solid var(--border)',
          borderRadius: 14,
          background: 'var(--bg-elev-1)',
        }}
      >
        {/* title + count */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 8px 0 6px',
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            letterSpacing: -0.005,
          }}
        >
          Lives realizadas
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              color: 'var(--text-muted)',
              background: 'var(--bg-elev-2)',
              padding: '2px 7px',
              borderRadius: 5,
              border: '1px solid var(--border)',
              fontWeight: 500,
            }}
          >
            {isLoading ? '—' : total}
          </span>
        </span>

        {/* search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 14,
              height: 14,
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por marca, cliente, apresentadora, observações…"
            style={{
              width: '100%',
              padding: '8px 40px 8px 34px',
              borderRadius: 9,
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              fontSize: 13,
              outline: 'none',
              transition: 'border-color .18s, box-shadow .18s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)'
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-softer)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          {!search && (
            <span
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                color: 'var(--text-muted)',
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                pointerEvents: 'none',
              }}
            >
              /
            </span>
          )}
        </div>

        {/* date range select */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <Calendar style={{ position: 'absolute', left: 11, width: 14, height: 14, color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            aria-label="Filtrar por período"
            style={{ ...tbtn, paddingLeft: 32, paddingRight: 28, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', color: dateRange === 'todos' ? 'var(--text-primary)' : 'var(--primary)', borderColor: dateRange === 'todos' ? 'var(--border)' : 'var(--primary)' }}
          >
            {DATE_RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown style={{ position: 'absolute', right: 9, width: 14, height: 14, color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>

        {dateRange === 'custom' ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <input
              type="date"
              aria-label="Data inicial"
              value={customDateFrom}
              max={customDateTo || todayIso}
              onChange={(event) => onCustomDateFromChange(event.target.value)}
              style={{ ...tbtn, color: 'var(--text-primary)', colorScheme: 'dark' }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>até</span>
            <input
              type="date"
              aria-label="Data final"
              value={customDateTo}
              min={customDateFrom || undefined}
              max={todayIso}
              onChange={(event) => onCustomDateToChange(event.target.value)}
              style={{ ...tbtn, color: 'var(--text-primary)', colorScheme: 'dark' }}
            />
            {customDateError ? (
              <span role="alert" style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}>
                {customDateError}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* filters popover (marca / apresentadora) */}
        <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            style={{ ...tbtn, ...(activeFilterCount > 0 ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : null) }}
            onClick={() => { setFiltersOpen((v) => !v); setExportOpen(false) }}
          >
            <Filter style={{ width: 14, height: 14 }} />
            Filtros
            {activeFilterCount > 0 ? (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--primary)', color: '#fff', borderRadius: 999, padding: '1px 6px', lineHeight: 1.5 }}>{activeFilterCount}</span>
            ) : null}
            <ChevronDown style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
          </button>
          {filtersOpen ? (
            <div style={{ ...menuPopover, right: 'auto', left: 0, minWidth: 250, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '2px 4px' }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Marca / cliente</span>
                <select value={marcaFilter} onChange={(e) => setMarcaFilter(e.target.value)} style={{ ...tbtn, width: '100%', justifyContent: 'flex-start' }}>
                  <option value="">Todas as marcas</option>
                  {marcaOptions.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '2px 4px' }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Apresentadora</span>
                <select value={apresentadoraFilter} onChange={(e) => setApresentadoraFilter(e.target.value)} style={{ ...tbtn, width: '100%', justifyContent: 'flex-start' }}>
                  <option value="">Todas as apresentadoras</option>
                  {apresentadoraOptions.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '2px 4px' }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Status</span>
                <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} style={{ ...tbtn, width: '100%', justifyContent: 'flex-start' }}>
                  {STATUS_FILTER_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={() => { clearFilters(); setFiltersOpen(false) }}
                  style={{ ...tbtn, justifyContent: 'center', color: 'var(--text-muted)' }}
                >
                  Limpar filtros
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* colunas visíveis */}
        <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label="Escolher colunas"
            style={tbtn}
            onClick={() => { setColunasOpen((v) => !v); setFiltersOpen(false); setExportOpen(false) }}
          >
            <SlidersHorizontal style={{ width: 14, height: 14 }} />
            Colunas
            <ChevronDown style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
          </button>
          {colunasOpen ? (
            <div style={{ ...menuPopover, right: 'auto', left: 0, minWidth: 250, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ padding: '4px 6px 6px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                Mostrar na tabela
              </span>
              {LIVE_COLUMN_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  title={opt.hint}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 6, fontSize: 12.5, color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  <input type="checkbox" checked={colunas.has(opt.key)} onChange={() => toggleColuna(opt.key)} />
                  {opt.label}
                </label>
              ))}
            </div>
          ) : null}
        </div>
        {/* divider */}
        <div
          style={{
            width: 1,
            alignSelf: 'stretch',
            background: 'var(--border)',
            margin: '0 2px',
          }}
        />

        {/* export split button */}
        <div
          style={{ position: 'relative', display: 'inline-flex' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            style={{ ...tbtn, borderRadius: '9px 0 0 9px', borderRight: 'none', paddingRight: 11 }}
            onClick={() => doExportCSV(filteredLives)}
          >
            <Download style={{ width: 14, height: 14 }} />
            Exportar
          </button>
          <button
            type="button"
            style={{ ...tbtn, borderRadius: '0 9px 9px 0', padding: '8px 9px', borderLeft: '1px solid var(--border)' }}
            aria-label="Opções de exportação"
            onClick={() => setExportOpen((v) => !v)}
          >
            <ChevronDown style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
          </button>
          {exportOpen && (
            <div style={menuPopover}>
              <MenuBtn
                icon={<Download style={{ width: 13, height: 13 }} />}
                label="Exportar como CSV"
                hint=".csv"
                onClick={() => {
                  doExportCSV(filteredLives)
                  setExportOpen(false)
                }}
              />
              <MenuBtn
                icon={<Printer style={{ width: 13, height: 13 }} />}
                label="Exportar como PDF"
                hint=".pdf"
                onClick={() => {
                  window.print()
                  setExportOpen(false)
                }}
              />
            </div>
          )}
        </div>

        {/* import — contraparte da exportação: entra planilha do TikTok, sai live preenchida */}
        {canWrite ? (
          <button
            type="button"
            style={{ ...tbtn, ...(importOpen ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : {}) }}
            aria-expanded={importOpen}
            onClick={() => setImportOpen((v) => !v)}
          >
            <Upload style={{ width: 14, height: 14 }} />
            Importar
          </button>
        ) : null}

        {/* add button */}
        {canWrite ? (
        <button
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 14px',
            borderRadius: 9,
            background: 'var(--primary)',
            color: 'var(--button-primary-foreground)',
            border: '1px solid transparent',
            boxShadow: '0 4px 14px -6px var(--primary)',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
          onClick={onOpenCreateLiveModal}
        >
          <Plus style={{ width: 14, height: 14, strokeWidth: 2.2 }} />
          Cadastrar live
        </button>
        ) : null}
      </div>

      {/* ── Importação de planilha (TikTok Studio / Ads) ──
          Fica aqui e não na Analytics porque é onde as lives realizadas são geridas: o que a
          planilha preenche é exatamente esta lista. Colapsado por padrão — é ferramenta de
          operação eventual, não parte da consulta do dia a dia. */}
      {importOpen ? <AnalyticsImportSection /> : null}

      {/* ── Table ── */}
      <div
        className="lives-table-scroll"
        style={{
          border: '1px solid var(--border)',
          borderRadius: 16,
          overflow: 'clip',
          background: 'var(--bg-elev-1)',
        }}
      >
        {/* Sticky thead */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: gridCols,
            padding: '11px 18px 11px 22px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-elev-2)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontWeight: 500,
            position: 'sticky',
            top: 0,
            zIndex: 3,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div>Horário</div>
          <div>Live</div>
          {colunas.has('cabine') ? <div>Cabine</div> : null}
          <div>Duração</div>
          <div style={{ textAlign: 'right', paddingRight: 14 }}>GMV</div>
          {colunas.has('gmv_hora') ? <div style={{ textAlign: 'right', paddingRight: 10 }}>GMV/h</div> : null}
          <div style={{ textAlign: 'right', paddingRight: 10 }}>Pedidos</div>
          {colunas.has('impressoes') ? <div style={{ textAlign: 'right', paddingRight: 10 }}>Impressões</div> : null}
          {colunas.has('visualizacoes') ? <div style={{ textAlign: 'right', paddingRight: 10 }}>Views</div> : null}
          {colunas.has('cliques') ? <div style={{ textAlign: 'right', paddingRight: 10 }}>Cliques</div> : null}
          {colunas.has('seguidores') ? <div style={{ textAlign: 'right', paddingRight: 10 }}>Seguidores</div> : null}
          <div style={{ textAlign: 'right', paddingRight: 8 }}>Comissão</div>
          <div>Apresentadora</div>
          <div>Status</div>
          {colunas.has('tipo') ? <div>Tipo</div> : null}
          <div />
        </div>

        {/* Body */}
        {isLoading ? (
          <div style={{ padding: '36px 20px' }}><LoadingState /></div>
        ) : errorMessage ? (
          <div style={{ padding: '24px 20px' }}><ErrorState message={errorMessage} onRetry={onRetry} /></div>
        ) : dayGroups.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            Nenhuma live encontrada{hasAnyFilter ? ' para esses filtros' : ''}.
          </div>
        ) : (
          dayGroups.map((group, groupIdx) => {
            const collapsed = collapsedDays.has(group.dateKey)
            const { totalMins, totalGmv, publicadas, rascunhos } = dayGroupAggregates[groupIdx]
            const h = Math.floor(totalMins / 60)
            const m = totalMins % 60

            return (
              <div key={group.dateKey}>
                {/* Day header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 16,
                    alignItems: 'center',
                    padding: '9px 22px',
                    background: 'var(--bg-elev-2)',
                    borderBottom: '1px solid var(--border)',
                    position: 'sticky',
                    top: 37,
                    zIndex: 2,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <button
                      type="button"
                      onClick={() => toggleDay(group.dateKey)}
                      style={{
                        width: 18,
                        height: 18,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: 5,
                        background: 'var(--bg-elev-3)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        border: '1px solid var(--border)',
                        flexShrink: 0,
                      }}
                      aria-label={collapsed ? 'Expandir' : 'Recolher'}
                    >
                      <ChevronRight
                        style={{
                          width: 10,
                          height: 10,
                          transform: collapsed ? 'none' : 'rotate(90deg)',
                          transition: 'transform 0.2s',
                        }}
                      />
                    </button>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          letterSpacing: -0.005,
                          textTransform: 'capitalize',
                        }}
                      >
                        {group.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                          letterSpacing: '0.02em',
                          marginTop: 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {group.lives.length} {group.lives.length === 1 ? 'live' : 'lives'}
                        {' · '}
                        {h}h {String(m).padStart(2, '0')}min
                        {publicadas > 0
                          ? ` · ${publicadas} publicada${publicadas > 1 ? 's' : ''}`
                          : ''}
                        {rascunhos > 0
                          ? ` · ${rascunhos} rascunho${rascunhos > 1 ? 's' : ''}`
                          : ''}
                      </div>
                    </div>
                  </div>

                  {/* GMV pill */}
                  {totalGmv > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                        padding: '5px 12px 5px 14px',
                        borderRadius: 9,
                        background:
                          'linear-gradient(90deg, var(--primary-soft), var(--primary-softer))',
                        border: '1px solid var(--primary-soft)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.10em',
                          fontWeight: 500,
                        }}
                      >
                        GMV do dia
                      </span>
                      <b
                        style={{
                          color: 'var(--primary)',
                          fontSize: 15,
                          fontWeight: 600,
                          letterSpacing: -0.01,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatMoney(totalGmv)}
                      </b>
                    </div>
                  )}
                </div>

                {/* Rows */}
                {!collapsed &&
                  group.lives.map((live, rowIdx) => {
                    const liveId = asString(live.id)
                    const { text: durText, mins: durMins } = calcDuration(live)
                    const durPct = Math.min(100, (durMins / MAX_DUR_MINS) * 100)
                    const gmvHora = gmvPorHora(asNumber(officialLiveGmv(live)), durMins)
                    const presenterCell = livePresenterCellModel(live, Boolean(onInlineSaveLive))
                    const clientName = asString(live.marca_nome ?? live.cliente_nome)
                    const officialGmvValue = officialLiveGmv(live)
                    const gmv = asNumber(officialGmvValue)
                    const ordersValue = live.manual_orders ?? live.final_orders_count ?? live.qtd_pedidos
                    const pendingIssue = pendingFilter
                      ? classifyLivePendings(live, duplicateIdSet).find((issue) => issue.kind === pendingFilter)
                      : null
                    const isKebabOpen = kebabOpenId === liveId
                    const isEvenRow = rowIdx % 2 === 1

                    return (
                      <div
                        key={liveId || rowIdx}
                        className="lives-table-row"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: gridCols,
                          alignItems: 'center',
                          padding: '0 18px 0 22px',
                          minHeight: 52,
                          borderBottom: '1px solid var(--hairline)',
                          background: isEvenRow ? 'rgba(0,0,0,0.02)' : 'transparent',
                          position: 'relative',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-elev-3)'
                          const acts = e.currentTarget.querySelector(
                            '.lives-row-actions',
                          ) as HTMLElement | null
                          if (acts) {
                            acts.style.opacity = '1'
                            acts.style.transform = 'translateX(0)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (kebabOpenId !== liveId) {
                            e.currentTarget.style.background = isEvenRow
                              ? 'rgba(0,0,0,0.02)'
                              : 'transparent'
                            const acts = e.currentTarget.querySelector(
                              '.lives-row-actions',
                            ) as HTMLElement | null
                            if (acts && kebabOpenId !== liveId) {
                              acts.style.opacity = '0'
                              acts.style.transform = 'translateX(4px)'
                            }
                          }
                        }}
                      >
                        {/* Horário */}
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              fontVariantNumeric: 'tabular-nums',
                              letterSpacing: -0.005,
                            }}
                          >
                            {fmtTime(live.iniciado_em)}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--text-muted)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            → {fmtTime(live.encerrado_em)}
                          </span>
                        </div>

                        {/* Live (client + ID) */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                            minWidth: 0,
                            paddingRight: 14,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <span
                              style={{
                                fontSize: 13.5,
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                letterSpacing: -0.005,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {clientName || '—'}
                              <BotBadge origem={live.origem_dados} className="ml-2 align-middle" />
                            </span>
                            <button
                              type="button"
                              className="lives-mobile-open"
                              aria-label={`Abrir detalhes de ${clientName || 'live'}`}
                              title="Abrir"
                              onClick={() => onOpenLiveDetail(live)}
                            >
                              <ExternalLink aria-hidden="true" />
                              <span>Abrir</span>
                            </button>
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--text-muted)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            ID #{String(liveId).padStart(4, '0')}
                          </span>
                          {duplicateIdSet.has(liveId) ? (
                            <span
                              style={{
                                marginTop: 2,
                                alignSelf: 'flex-start',
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '1px 6px',
                                borderRadius: 5,
                                fontSize: 9.5,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                border: '1px solid var(--warning-soft)',
                                background: 'var(--warning-soft)',
                                color: 'var(--warning)',
                              }}
                            >
                              Possível duplicata
                            </span>
                          ) : null}
                          {pendingIssue ? (
                            <>
                              <span className="lives-pending-reason">{pendingIssue.reason}</span>
                              <button
                                type="button"
                                className="lives-pending-row-action"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  if (canWrite && pendingIssue.kind !== 'duplicata') onOpenEditLive(live)
                                  else onOpenLiveDetail(live)
                                }}
                              >
                                {canWrite || pendingIssue.kind === 'duplicata' ? pendingIssue.actionLabel : 'Conferir detalhes'}
                              </button>
                            </>
                          ) : null}
                        </div>

                        {/* Cabine — opcional */}
                        {colunas.has('cabine') ? (
                        <div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              background: 'var(--bg-elev-2)',
                              fontSize: 11.5,
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--text-muted)',
                                fontSize: 10.5,
                              }}
                            >
                              #{asString(live.cabine_numero)}
                            </span>
                            Cabine
                          </span>
                        </div>
                        ) : null}

                        {/* Duração + bar */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <span
                            style={{ fontVariantNumeric: 'tabular-nums', minWidth: 44 }}
                          >
                            {durText}
                          </span>
                          {colunas.has('duracao_barra') ? (
                          <div
                            style={{
                              position: 'relative',
                              height: 4,
                              flex: 1,
                              maxWidth: 56,
                              background: 'var(--hairline)',
                              borderRadius: 2,
                              overflow: 'hidden',
                            }}
                          >
                            <i
                              style={{
                                display: 'block',
                                height: '100%',
                                width: `${durPct}%`,
                                background:
                                  'linear-gradient(90deg, var(--primary), var(--primary-hover))',
                                borderRadius: 2,
                              }}
                            />
                          </div>
                          ) : null}
                        </div>

                        {/* GMV — editável inline quando rascunho */}
                        <InlineGmvCell
                          gmv={gmv}
                          hasValue={hasRecordedLiveGmv(live)}
                          editable={Boolean(onInlineSaveLive) && asString(live.status_publicacao, 'rascunho').toLowerCase() === 'rascunho'}
                          onSave={(payload) => onInlineSaveLive!(liveId, payload)}
                        />

                        {/* GMV/h — gmv / horas registradas */}
                        {colunas.has('gmv_hora') ? (
                          <MetricaCell valor={gmvHora} dinheiro />
                        ) : null}

                        {/* Pedidos — editável inline quando rascunho */}
                        <InlinePedidosCell
                          pedidos={asNumber(ordersValue)}
                          hasValue={hasRecordedMetricValue(ordersValue)}
                          editable={Boolean(onInlineSaveLive) && asString(live.status_publicacao, 'rascunho').toLowerCase() === 'rascunho'}
                          onSave={(payload) => onInlineSaveLive!(liveId, payload)}
                        />

                        {colunas.has('impressoes') ? <MetricaCell valor={live.live_impressions} /> : null}
                        {colunas.has('visualizacoes') ? <MetricaCell valor={live.manual_views ?? live.final_peak_viewers} /> : null}
                        {colunas.has('cliques') ? <MetricaCell valor={live.product_clicks} /> : null}
                        {colunas.has('seguidores') ? <MetricaCell valor={live.new_followers} /> : null}

                        {/* Comissão apresentadora */}
                        {(() => {
                          const comissao = asNumber(live.comissao_apresentadora)
                          const pct = asNumber(live.pct_apresentadora)
                          return (
                            <div
                              title={pct > 0 ? `Pct aplicado: ${pct.toFixed(2)}%` : 'Comissão não calculada'}
                              style={{
                                textAlign: 'right',
                                paddingRight: 8,
                                fontVariantNumeric: 'tabular-nums',
                                whiteSpace: 'nowrap',
                                cursor: 'default',
                              }}
                            >
                              {comissao > 0 ? (
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: 'var(--success)',
                                  }}
                                >
                                  {formatMoney(comissao)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>
                              )}
                            </div>
                          )
                        })()}

                        {/* Apresentadora — editável inline quando rascunho */}
                        <InlineApresentadoraCell
                          name={presenterCell.name}
                          editable={presenterCell.editable}
                          options={apresentadoraFilterOptions}
                          onSave={(payload) => onInlineSaveLive!(liveId, payload)}
                        />

                        {/* Status */}
                        <div>
                          <StatusBadge status={live.status_publicacao} />
                        </div>

                        {/* Tipo (origem) — opcional; o chip BOT ao lado do nome já cobre o caso comum */}
                        {colunas.has('tipo') ? (
                          <div>
                            <TipoBadge tipo={live.origem_dados} />
                          </div>
                        ) : null}

                        {/* Actions (hover-reveal) */}
                        <div
                          className="lives-row-actions"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            justifyContent: 'flex-end',
                            opacity: isKebabOpen ? 1 : 0,
                            transform: isKebabOpen ? 'translateX(0)' : 'translateX(4px)',
                            transition: 'opacity 0.18s, transform 0.18s',
                          }}
                        >
                          <button
                            type="button"
                            title="Abrir"
                            style={{
                              width: 28,
                              height: 28,
                              display: 'grid',
                              placeItems: 'center',
                              borderRadius: 7,
                              background: 'transparent',
                              border: '1px solid transparent',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                            }}
                            onClick={() => onOpenLiveDetail(live)}
                          >
                            <ExternalLink style={{ width: 13, height: 13 }} />
                          </button>

                          {/* Kebab — só para quem pode editar/excluir */}
                          {canWrite ? (
                          <div
                            style={{ position: 'relative' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              title="Mais opções"
                              style={{
                                width: 28,
                                height: 28,
                                display: 'grid',
                                placeItems: 'center',
                                borderRadius: 7,
                                background: 'transparent',
                                border: '1px solid transparent',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                              }}
                              onClick={(event) => toggleKebabMenu(event, liveId, live)}
                            >
                              <MoreHorizontal style={{ width: 13, height: 13 }} />
                            </button>
                          </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )
          })
        )}

        {/* Footer — paginação server-side */}
        <div
          style={{
            padding: '10px 22px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            color: 'var(--text-muted)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.02em',
            background: 'var(--bg-elev-2)',
          }}
        >
          <span>
            {isLoading
              ? 'Carregando recorte…'
              : total === 0
              ? '0 lives'
              : `${rangeFrom}–${rangeTo} de ${total} live${total !== 1 ? 's' : ''}`}
            {!isLoading && pendingFilter ? ` · ${filteredLives.length} nesta página (${pendingFilter === 'duplicata' ? 'possíveis duplicatas' : pendingFilter})` : ''}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>Por página</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                aria-label="Itens por página"
                style={{ ...tbtn, padding: '4px 8px', fontSize: 12, fontFamily: 'var(--font-mono)' }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>

            <span style={{ whiteSpace: 'nowrap' }}>
              Página {Math.min(page + 1, pageCount)} de {pageCount}
            </span>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Button variant="secondary" className="h-7 w-7 p-0" aria-label="Primeira página" disabled={isLoading || page <= 0} onClick={() => onPageChange(0)}>
                <ChevronsLeft style={{ width: 14, height: 14 }} />
              </Button>
              <Button variant="secondary" className="h-7 w-7 p-0" aria-label="Página anterior" disabled={isLoading || page <= 0} onClick={() => onPageChange(page - 1)}>
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </Button>
              <Button variant="secondary" className="h-7 w-7 p-0" aria-label="Próxima página" disabled={isLoading || page + 1 >= pageCount} onClick={() => onPageChange(page + 1)}>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </Button>
              <Button variant="secondary" className="h-7 w-7 p-0" aria-label="Última página" disabled={isLoading || page + 1 >= pageCount} onClick={() => onPageChange(pageCount - 1)}>
                <ChevronsRight style={{ width: 14, height: 14 }} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {typeof document !== 'undefined' && kebabMenu ? createPortal(
        <div
          style={{
            position: 'fixed',
            top: kebabMenu.top,
            left: kebabMenu.left,
            minWidth: ACTION_MENU_WIDTH,
            background: 'var(--bg-elev-2)',
            border: '1px solid var(--border-strong)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-card-lg)',
            padding: 5,
            zIndex: 70,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <MenuBtn
            icon={<Edit2 style={{ width: 13, height: 13 }} />}
            label="Editar"
            onClick={() => {
              const live = kebabMenu.live
              setKebabMenu(null)
              onOpenEditLive(live)
            }}
          />
          <hr
            style={{
              border: 'none',
              height: 1,
              background: 'var(--border)',
              margin: '4px 2px',
            }}
          />
          <MenuBtn
            icon={<Trash2 style={{ width: 13, height: 13 }} />}
            label="Excluir"
            danger
            onClick={() => {
              const live = kebabMenu.live
              setKebabMenu(null)
              onDeleteLive(live)
            }}
          />
        </div>,
        document.body,
      ) : null}

      <LiveDetailModal
        open={liveModalMode === 'detail'}
        live={selectedLiveRecord}
        canWrite={canWrite}
        reportCopied={reportCopied}
        onClose={onCloseLiveModal}
        onCopyReport={onCopyLiveReport}
        onEdit={onOpenEditLive}
        onSplitApresentadoras={onSplitApresentadoras}
        onDelete={onDeleteLive}
        deleteLiveMutation={deleteLiveMutation}
      />
    </section>
  )
}
