import { ChevronLeft, ChevronRight } from 'lucide-react'
import { periodLabel, shiftPeriod } from '../../utils/format'
import {
  type PeriodRange,
  isValidPeriodRange,
  periodToYm,
  presetRange,
  ymToPeriod,
} from '../../utils/period'

// Seletor de período da tela Financeiro (unidade). Dois modos: mês único (setas)
// ou intervalo (dois meses + presets). Componente NOVO e isolado — não toca no
// PeriodControl compartilhado por Dashboard/Cliente/Master.

const PRESETS: { key: 'last3' | 'last6' | 'ytd'; label: string }[] = [
  { key: 'last3', label: '3 meses' },
  { key: 'last6', label: '6 meses' },
  { key: 'ytd', label: 'Ano' },
]

export function PeriodRangeControl({
  value,
  onChange,
}: {
  value: PeriodRange
  onChange: (next: PeriodRange) => void
}) {
  const valid = isValidPeriodRange(value)

  function setMode(mode: PeriodRange['mode']) {
    if (mode === value.mode) return
    if (mode === 'single') onChange({ mode: 'single', inicio: value.fim, fim: value.fim })
    else onChange({ mode: 'range', inicio: value.inicio, fim: value.fim })
  }

  function shiftSingle(delta: number) {
    const ym = periodToYm(shiftPeriod(ymToPeriod(value.inicio), delta))
    onChange({ mode: 'single', inicio: ym, fim: ym })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* toggle de modo */}
      <div className="inline-flex h-11 items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-[var(--shadow-card)]">
        {(['single', 'range'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setMode(mode)}
            aria-pressed={value.mode === mode}
            className={
              value.mode === mode
                ? 'h-9 rounded-full bg-button-primary px-3 text-xs font-bold text-button-primary-foreground hover:bg-button-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20'
                : 'h-9 rounded-full px-3 text-xs font-semibold text-ink-muted hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20'
            }
          >
            {mode === 'single' ? 'Mês' : 'Intervalo'}
          </button>
        ))}
      </div>

      {value.mode === 'single' ? (
        <div className="inline-flex h-11 items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-[var(--shadow-card)]">
          <button
            type="button"
            aria-label="Mês anterior"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
            onClick={() => shiftSingle(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-36 px-2 text-center text-sm font-semibold capitalize text-ink">
            {periodLabel(ymToPeriod(value.inicio))}
          </span>
          <button
            type="button"
            aria-label="Próximo mês"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
            onClick={() => shiftSingle(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-3 shadow-[var(--shadow-card)]">
            <input
              type="month"
              aria-label="Mês inicial"
              value={value.inicio}
              max={value.fim}
              onChange={(event) => onChange({ ...value, inicio: event.target.value })}
              className="h-9 bg-transparent text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
            />
            <span className="text-ink-muted">→</span>
            <input
              type="month"
              aria-label="Mês final"
              value={value.fim}
              min={value.inicio}
              onChange={(event) => onChange({ ...value, fim: event.target.value })}
              className="h-9 bg-transparent text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
            />
          </div>
          <div className="inline-flex h-11 items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-[var(--shadow-card)]">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => onChange(presetRange(preset.key))}
                className="h-9 rounded-full px-3 text-xs font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
              >
                {preset.label}
              </button>
            ))}
          </div>
          {!valid ? (
            <span className="inline-flex h-11 items-center rounded-full border border-[var(--danger)] bg-[var(--danger-soft)] px-3 text-xs font-semibold text-[var(--danger)]">
              O fim deve ser ≥ o início
            </span>
          ) : null}
        </>
      )}
    </div>
  )
}
