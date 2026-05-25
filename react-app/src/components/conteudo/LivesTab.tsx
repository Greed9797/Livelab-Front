import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  Edit2,
  ExternalLink,
  Filter,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  Trash2,
} from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { publicationStatusLabel } from '../../pages/conteudo-helpers'
import { asNumber, asString, formatDate, formatMoney } from '../../utils/format'
import { extractErrorMessage } from '../../services/api'
import type { JsonRecord } from '../../types/models'
import type { UseMutationResult } from '@tanstack/react-query'

// Grid template shared between header + every row
const COLS = '80px minmax(180px,1.4fr) 90px 110px 115px 100px minmax(115px,1fr) 90px 76px 76px'
// Reference max duration (8 h) for the duration bar width
const MAX_DUR_MINS = 480
const ACTION_MENU_WIDTH = 168

// ─── helpers ───────────────────────────────────────────────────────────────

function fmtTime(value: unknown): string {
  const d = typeof value === 'string' ? new Date(value) : null
  if (!d || Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d)
}

function calcDuration(live: JsonRecord): { text: string; mins: number } {
  const start = live.iniciado_em ? new Date(live.iniciado_em as string) : null
  const end = live.encerrado_em ? new Date(live.encerrado_em as string) : null
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { text: '—', mins: 0 }
  }
  const mins = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return { text: h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`, mins }
}

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

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function buildReport(live: JsonRecord): string {
  const nome = asString(live.marca_nome ?? live.cliente_nome, '')
  const inicio = live.iniciado_em ? new Date(live.iniciado_em as string) : null
  if (!inicio || Number.isNaN(inicio.getTime())) return ''
  const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(
    inicio,
  )
  const hFim = fmtTime(live.encerrado_em)
  const { text: duracao } = calcDuration(live)
  const lines = [
    `📊 Relatório de Live${nome ? ` — ${nome}` : ''}`,
    '',
    `📅 Data: ${data}`,
    hFim !== '—'
      ? `⏰ Horário: ${fmtTime(live.iniciado_em)} às ${hFim}`
      : `⏰ Horário: ${fmtTime(live.iniciado_em)}`,
    duracao !== '—' ? `⏱️ Duração: ${duracao}` : null,
    '',
    `💰 GMV: ${formatMoney(live.fat_gerado ?? live.manual_gmv)}`,
    `🛒 Pedidos: ${asNumber(live.final_orders_count ?? live.manual_orders).toLocaleString('pt-BR')}`,
  ]
  return lines.filter(Boolean).join('\n')
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
  ]
  const groups = groupByDay(lives)
  const rows: string[][] = [header]
  for (const g of groups) {
    for (const l of g.lives) {
      const { text: dur } = calcDuration(l)
      rows.push([
        asString(l.id),
        g.dateKey,
        fmtTime(l.iniciado_em),
        fmtTime(l.encerrado_em),
        dur,
        asString(l.marca_nome ?? l.cliente_nome),
        `Cabine ${asString(l.cabine_numero)}`,
        asString(l.apresentadora_nome ?? l.apresentador_nome),
        publicationStatusLabel(l.status_publicacao),
        asString(l.origem_dados, 'manual'),
        asNumber(l.fat_gerado ?? l.manual_gmv)
          .toFixed(2)
          .replace('.', ','),
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

function TipoBadge({ tipo }: { tipo: unknown }) {
  const t = asString(tipo, 'manual').toLowerCase()
  const isAuto = ['api', 'auto', 'tiktok', 'sync'].includes(t)
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
      {isAuto ? 'AUTO' : 'MANUAL'}
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
  livesData: JsonRecord[]
  liveModalMode: 'detail' | null
  selectedLiveRecord: JsonRecord | null
  reportCopied: boolean
  deleteLiveMutation: UseMutationResult<unknown, Error, string>
  onOpenCreateLiveModal: () => void
  onOpenLiveDetail: (live: JsonRecord) => void
  onOpenEditLive: (live: JsonRecord) => void
  onDeleteLive: (live: JsonRecord) => void
  onCloseLiveModal: () => void
  onCopyLiveReport: (text: string) => void
}

// ─── main component ────────────────────────────────────────────────────────

export function LivesTab({
  livesData,
  liveModalMode,
  selectedLiveRecord,
  reportCopied,
  deleteLiveMutation,
  onOpenCreateLiveModal,
  onOpenLiveDetail,
  onOpenEditLive,
  onDeleteLive,
  onCloseLiveModal,
  onCopyLiveReport,
}: LivesTabProps) {
  const [search, setSearch] = useState('')
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set())
  const [kebabMenu, setKebabMenu] = useState<{ liveId: string; live: JsonRecord; top: number; left: number } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const kebabOpenId = kebabMenu?.liveId ?? null

  // Close overlay menus on outside click
  useEffect(() => {
    const close = () => {
      setKebabMenu(null)
      setExportOpen(false)
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

  const filteredLives = useMemo(() => {
    if (!search.trim()) return livesData
    const q = search.toLowerCase()
    return livesData.filter((live) => {
      const client = asString(live.marca_nome ?? live.cliente_nome).toLowerCase()
      const cabine = asString(live.cabine_numero).toLowerCase()
      const presenter = asString(
        live.apresentadora_nome ?? live.apresentador_nome,
      ).toLowerCase()
      return client.includes(q) || cabine.includes(q) || presenter.includes(q)
    })
  }, [livesData, search])

  const dayGroups = useMemo(() => groupByDay(filteredLives), [filteredLives])
  const totalCount = filteredLives.length

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
            {totalCount}
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
            placeholder="Buscar por cliente, cabine, apresentadora…"
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

        {/* date range button */}
        <button
          type="button"
          style={tbtn}
        >
          <Calendar style={{ width: 14, height: 14 }} />
          <b style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Últimos 7 dias</b>
          <ChevronDown style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
        </button>

        {/* filters button */}
        <button
          type="button"
          style={tbtn}
        >
          <Filter style={{ width: 14, height: 14 }} />
          Filtros
          <ChevronDown style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
        </button>

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

        {/* add button */}
        <button
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 14px',
            borderRadius: 9,
            background: 'linear-gradient(180deg, var(--primary), var(--primary-hover))',
            color: '#fff',
            border: '1px solid rgba(255,255,255,.15)',
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
      </div>

      {/* ── Table ── */}
      <div
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
            gridTemplateColumns: COLS,
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
          <div>Cabine</div>
          <div>Duração</div>
          <div style={{ textAlign: 'right', paddingRight: 14 }}>GMV</div>
          <div style={{ textAlign: 'right', paddingRight: 8 }}>Comissão</div>
          <div>Apresentadora</div>
          <div>Status</div>
          <div>Tipo</div>
          <div />
        </div>

        {/* Body */}
        {dayGroups.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            Nenhuma live encontrada{search ? ' para esse filtro' : ''}.
          </div>
        ) : (
          dayGroups.map((group) => {
            const collapsed = collapsedDays.has(group.dateKey)
            const totalMins = group.lives.reduce((s, l) => s + calcDuration(l).mins, 0)
            const h = Math.floor(totalMins / 60)
            const m = totalMins % 60
            const totalGmv = group.lives.reduce(
              (s, l) => s + asNumber(l.fat_gerado ?? l.manual_gmv),
              0,
            )
            const publicadas = group.lives.filter((l) => {
              const s = asString(l.status_publicacao, '').toLowerCase()
              return s === 'publicado' || s === 'publicada'
            }).length
            const rascunhos = group.lives.length - publicadas

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
                    const presenterName = asString(
                      live.apresentadora_nome ?? live.apresentador_nome,
                    )
                    const clientName = asString(live.marca_nome ?? live.cliente_nome)
                    const gmv = asNumber(live.fat_gerado ?? live.manual_gmv)
                    const isKebabOpen = kebabOpenId === liveId
                    const isEvenRow = rowIdx % 2 === 1

                    return (
                      <div
                        key={liveId || rowIdx}
                        className="lives-table-row"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: COLS,
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
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--text-muted)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            ID #{String(liveId).padStart(4, '0')}
                          </span>
                        </div>

                        {/* Cabine */}
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
                        </div>

                        {/* GMV */}
                        <div
                          style={{
                            textAlign: 'right',
                            paddingRight: 14,
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {gmv > 0 ? (
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: 'var(--primary)',
                                letterSpacing: -0.005,
                              }}
                            >
                              {formatMoney(gmv)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>—</span>
                          )}
                        </div>

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

                        {/* Apresentadora */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            color: 'var(--text-primary)',
                            fontSize: 12.5,
                            minWidth: 0,
                          }}
                        >
                          {presenterName ? (
                            <>
                              <span
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  flexShrink: 0,
                                  background:
                                    'linear-gradient(135deg, var(--primary-soft), var(--primary-softer))',
                                  color: 'var(--primary)',
                                  display: 'grid',
                                  placeItems: 'center',
                                  fontSize: 9,
                                  fontWeight: 700,
                                  letterSpacing: '0.02em',
                                  border: '1px solid var(--primary-soft)',
                                }}
                              >
                                {getInitials(presenterName)}
                              </span>
                              <span
                                style={{
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {presenterName}
                              </span>
                            </>
                          ) : (
                            <span
                              style={{
                                color: 'var(--text-muted)',
                                fontStyle: 'italic',
                                fontSize: 12,
                              }}
                            >
                              Sem apresentadora
                            </span>
                          )}
                        </div>

                        {/* Status */}
                        <div>
                          <StatusBadge status={live.status_publicacao} />
                        </div>

                        {/* Tipo */}
                        <div>
                          <TipoBadge tipo={live.origem_dados} />
                        </div>

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

                          {/* Kebab */}
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
                        </div>
                      </div>
                    )
                  })}
              </div>
            )
          })
        )}

        {/* Footer */}
        <div
          style={{
            padding: '12px 22px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'var(--text-muted)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.02em',
            background: 'var(--bg-elev-2)',
          }}
        >
          <span>
            {totalCount} live{totalCount !== 1 ? 's' : ''}
            {search ? ` · filtrado de ${livesData.length}` : ''}
          </span>
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

      {/* ── Detail Modal ── */}
      <Modal
        open={liveModalMode === 'detail' && !!selectedLiveRecord}
        title="Live realizada"
        subtitle={
          selectedLiveRecord
            ? `${asString(selectedLiveRecord.marca_nome ?? selectedLiveRecord.cliente_nome, 'Sem marca')} · Cabine ${asString(selectedLiveRecord.cabine_numero)}`
            : undefined
        }
        onClose={onCloseLiveModal}
        size="md"
      >
        {selectedLiveRecord ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {(
                [
                  [
                    'Data / Horário',
                    `${formatDate(asString(selectedLiveRecord.iniciado_em, ''))} ${fmtTime(selectedLiveRecord.iniciado_em)}–${fmtTime(selectedLiveRecord.encerrado_em)}`,
                  ],
                  ['Duração', calcDuration(selectedLiveRecord).text],
                  [
                    'Apresentadora',
                    asString(
                      selectedLiveRecord.apresentadora_nome ??
                        selectedLiveRecord.apresentador_nome,
                      '—',
                    ),
                  ],
                  ['GMV', formatMoney(selectedLiveRecord.fat_gerado ?? selectedLiveRecord.manual_gmv)],
                  [
                    'Pedidos',
                    asNumber(
                      selectedLiveRecord.final_orders_count ?? selectedLiveRecord.manual_orders,
                    ).toLocaleString('pt-BR'),
                  ],
                  ['Publicação', publicationStatusLabel(selectedLiveRecord.status_publicacao)],
                  ['Origem', asString(selectedLiveRecord.origem_dados, 'manual')],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-line bg-surface-muted p-3"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>

            {selectedLiveRecord.resumo ? (
              <p className="rounded-2xl border border-line bg-surface-muted p-3 text-sm text-ink">
                {asString(selectedLiveRecord.resumo)}
              </p>
            ) : null}

            {(() => {
              const report = buildReport(selectedLiveRecord)
              if (!report) return null
              return (
                <div className="rounded-2xl border border-line bg-surface-muted p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                      Relatório para copiar
                    </p>
                    <Button
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => onCopyLiveReport(report)}
                    >
                      {reportCopied ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-ink">{report}</pre>
                </div>
              )
            })()}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={Edit2}
                onClick={() => onOpenEditLive(selectedLiveRecord)}
              >
                Editar
              </Button>
              <Button
                variant="danger"
                icon={Trash2}
                isLoading={deleteLiveMutation.isPending}
                onClick={() => onDeleteLive(selectedLiveRecord)}
              >
                Excluir
              </Button>
            </div>

            {deleteLiveMutation.isError ? (
              <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
                {extractErrorMessage(deleteLiveMutation.error)}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  )
}
