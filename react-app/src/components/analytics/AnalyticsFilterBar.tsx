import type { ReactNode } from 'react'
import { CalendarDays, ChevronDown, Download, RefreshCw, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { asString } from '../../utils/format'
import { getSaoPauloDateInput, somarDias } from '../../utils/sao-paulo-date'
import type { JsonRecord } from '../../types/models'

export type Preset = 'hoje' | 'ontem' | '7d' | '30d' | 'mes' | 'custom'

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'ontem', label: 'Ontem' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'mes', label: 'Mês' },
  { key: 'custom', label: 'Personalizado' },
]

/**
 * Data-calendário de SÃO PAULO, não do relógio do cliente.
 *
 * Antes isto usava getFullYear/getMonth/getDate, ou seja o fuso do laptop. Toda a página de
 * Analytics (inclusive a tira de assiduidade) manda esse `YYYY-MM-DD` para um backend que define
 * "hoje" em São Paulo: numa máquina em UTC, às 21h30 de SP o preset "Hoje" pedia AMANHÃ, o
 * backend cortava o fim em hoje e a janela voltava invertida — fileira vazia afirmando
 * "sem faltas" para todo mundo. A Home já resolvia assim; o Analytics é que estava fora de
 * sintonia.
 */
export function ymd(d: Date): string {
  return getSaoPauloDateInput(d)
}

export function presetRange(preset: Preset, customFrom: string, customTo: string): { from: string; to: string } {
  const todayStr = ymd(new Date())
  // Aritmética na STRING do dia-calendário, não em Date: subtrair dias de um Date usa o fuso do
  // cliente e, num cliente com horário de verão, o shift de 24h pode cair no dia errado de SP.
  const shift = (days: number) => somarDias(todayStr, -days)
  switch (preset) {
    case 'hoje':
      return { from: todayStr, to: todayStr }
    case 'ontem':
      return { from: shift(1), to: shift(1) }
    case '7d':
      return { from: shift(6), to: todayStr }
    case '30d':
      return { from: shift(29), to: todayStr }
    case 'mes':
      return { from: `${todayStr.slice(0, 7)}-01`, to: todayStr }
    case 'custom':
      return { from: customFrom, to: customTo }
  }
}

function FilterSelect({ value, onChange, ariaLabel, children }: { value: string; onChange: (v: string) => void; ariaLabel: string; children: ReactNode }) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-[190px] cursor-pointer appearance-none rounded-full border border-line bg-surface pl-4 pr-9 text-sm font-semibold text-ink transition [color-scheme:dark] hover:border-[var(--border-strong)] focus:border-brand focus:outline-none"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
    </div>
  )
}

function FilterDate({ value, min, max, onChange, ariaLabel }: { value: string; min?: string; max?: string; onChange: (v: string) => void; ariaLabel: string }) {
  return (
    <div className="relative">
      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        type="date"
        aria-label={ariaLabel}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 cursor-pointer rounded-full border border-line bg-surface pl-9 pr-3 text-sm font-semibold text-ink transition [color-scheme:dark] hover:border-[var(--border-strong)] focus:border-brand focus:outline-none"
      />
    </div>
  )
}

interface AnalyticsFilterBarProps {
  preset: Preset
  onPreset: (p: Preset) => void
  customFrom: string
  customTo: string
  onCustomFrom: (v: string) => void
  onCustomTo: (v: string) => void
  marcaId: string
  apresentadoraId: string
  onMarca: (v: string) => void
  onApresentadora: (v: string) => void
  marcas: JsonRecord[]
  apresentadoras: JsonRecord[]
  onRefresh: () => void
  refreshing?: boolean
  onExport?: () => void
  exporting?: boolean
}

// Filtro ÚNICO do Analytics — período (presets + intervalo custom) + cliente/marca
// + apresentadora. Rege a página inteira. Não duplicar filtros em outras seções.
export function AnalyticsFilterBar(props: AnalyticsFilterBarProps) {
  const today = ymd(new Date())
  const hasEntity = Boolean(props.marcaId || props.apresentadoraId)
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface-muted/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => props.onPreset(p.key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
                props.preset === p.key ? 'bg-brand text-white' : 'border border-line text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" icon={RefreshCw} onClick={props.onRefresh} isLoading={props.refreshing}>
            Atualizar
          </Button>
          {props.onExport ? (
            <Button type="button" variant="secondary" icon={Download} onClick={props.onExport} isLoading={props.exporting}>
              Exportar comissões (CSV)
            </Button>
          ) : null}
        </div>
      </div>

      {props.preset === 'custom' ? (
        <div className="flex flex-wrap items-center gap-2">
          <FilterDate ariaLabel="Data inicial" value={props.customFrom} max={props.customTo} onChange={props.onCustomFrom} />
          <span className="text-sm text-ink-muted">até</span>
          <FilterDate ariaLabel="Data final" value={props.customTo} min={props.customFrom} max={today} onChange={props.onCustomTo} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect ariaLabel="Filtrar por cliente ou marca" value={props.marcaId} onChange={props.onMarca}>
          <option value="">Todos os clientes/marcas</option>
          {props.marcas.map((m) => (
            <option key={asString(m.id)} value={asString(m.id)}>{asString(m.nome, 'Sem nome')}</option>
          ))}
        </FilterSelect>
        <FilterSelect ariaLabel="Filtrar por apresentadora" value={props.apresentadoraId} onChange={props.onApresentadora}>
          <option value="">Todas as apresentadoras</option>
          {props.apresentadoras.map((a) => (
            <option key={asString(a.id)} value={asString(a.id)}>{asString(a.nome, 'Sem nome')}</option>
          ))}
        </FilterSelect>
        {hasEntity ? (
          <button
            type="button"
            onClick={() => { props.onMarca(''); props.onApresentadora('') }}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-line px-3 text-sm font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            <X className="h-3.5 w-3.5" /> Limpar
          </button>
        ) : null}
      </div>
    </div>
  )
}
