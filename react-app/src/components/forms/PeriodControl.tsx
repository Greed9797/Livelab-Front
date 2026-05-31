import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Period } from '../../types/models'
import { periodLabel, shiftPeriod } from '../../utils/format'
import { Button } from '../ui/Button'

export function PeriodControl({ period, onChange }: { period: Period; onChange: (period: Period) => void }) {
  return (
    <div className="inline-flex h-11 items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-[var(--shadow-card)]">
      <Button className="h-9 w-9 px-0" variant="ghost" icon={ChevronLeft} aria-label="Período anterior" onClick={() => onChange(shiftPeriod(period, -1))}>
        <span className="sr-only">Anterior</span>
      </Button>
      <span className="min-w-36 px-2 text-center text-sm font-semibold capitalize text-ink">{periodLabel(period)}</span>
      <Button className="h-9 w-9 px-0" variant="ghost" icon={ChevronRight} aria-label="Próximo período" onClick={() => onChange(shiftPeriod(period, 1))}>
        <span className="sr-only">Próximo</span>
      </Button>
    </div>
  )
}
