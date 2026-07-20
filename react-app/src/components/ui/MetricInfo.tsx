import { Info } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { METRIC_GLOSSARY, type MetricKey } from '../../utils/metricGlossary'

/**
 * Ícone de ajuda ao lado do rótulo de uma métrica. Abre um popover com a
 * definição vinda do glossário central (utils/metricGlossary.ts).
 *
 * Não existe popover no design system (só o Modal, que é dialog de página
 * inteira e seria pesado demais para um rótulo) — daí este componente próprio.
 *
 * Acessibilidade e toque:
 *  - é um <button>, então Tab foca e Enter/Espaço acionam nativamente;
 *  - Escape fecha e devolve o foco ao botão;
 *  - abre em hover só quando o ponteiro é mouse (`pointerType`), senão o
 *    mouseenter sintético do toque abriria e o click logo em seguida fecharia.
 *
 * Layout: o botão ocupa 16px inline junto ao rótulo e o popover é absoluto,
 * então nada empurra o conteúdo do card.
 */

/** Escape fecha o popover. Exportado para teste sem DOM. */
export function isMetricInfoCloseKey(key: string): boolean {
  return key === 'Escape' || key === 'Esc'
}

export function MetricInfoPopover({
  id,
  metric,
  detail,
  align = 'left',
}: {
  id: string
  metric: MetricKey
  /** Memória de cálculo com os números REAIS do período, quando o payload já traz. */
  detail?: string
  align?: 'left' | 'right'
}) {
  const entry = METRIC_GLOSSARY[metric]
  return (
    <span
      id={id}
      role="tooltip"
      className={`absolute top-full z-50 mt-2 block w-64 rounded-xl border border-line bg-surface p-3 text-left shadow-[var(--shadow-card)] ${align === 'right' ? 'right-0' : 'left-0'}`}
    >
      <span className="block text-xs font-bold text-ink">{entry.rotulo}</span>
      <span className="mt-1 block text-xs leading-snug text-ink-muted">{entry.definicao}</span>
      {detail ? (
        <span className="mt-2 block border-t border-line pt-2 text-[11px] leading-snug text-ink">
          <span className="font-semibold">Neste período: </span>
          {detail}
        </span>
      ) : null}
      <span className="mt-2 block border-t border-line pt-2 text-[11px] leading-snug text-ink-muted">
        <span className="font-semibold text-ink">Cálculo: </span>
        {entry.formula}
      </span>
      <span className="mt-1 block text-[11px] leading-snug text-ink-muted">
        <span className="font-semibold text-ink">Período: </span>
        {entry.periodo}
      </span>
      <span className="mt-1 block text-[11px] leading-snug text-ink-muted">
        <span className="font-semibold text-ink">Fonte: </span>
        {entry.fonte}
      </span>
    </span>
  )
}

export function MetricInfo({
  metric,
  detail,
  align = 'left',
}: {
  metric: MetricKey
  detail?: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverId = useId()
  const entry = METRIC_GLOSSARY[metric]

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (!isMetricInfoCloseKey(event.key)) return
      event.stopPropagation()
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <span
      className="relative inline-flex shrink-0 align-middle"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setOpen(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setOpen(false)
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Como calculamos ${entry.rotulo}`}
        aria-expanded={open}
        aria-describedby={open ? popoverId : undefined}
        className="grid h-4 w-4 place-items-center rounded-full text-ink-muted transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        onClick={() => setOpen((current) => !current)}
        onFocus={() => setOpen(true)}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open ? <MetricInfoPopover id={popoverId} metric={metric} detail={detail} align={align} /> : null}
    </span>
  )
}
