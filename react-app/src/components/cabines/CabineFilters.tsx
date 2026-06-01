interface FilterCount {
  all: number
  live: number
  busy: number
  free: number
  maintenance: number
  inactive: number
}

interface CabineFiltersProps {
  filter: string
  onFilterChange: (v: string) => void
  counts: FilterCount
}

const FILTER_OPTIONS: Array<[keyof FilterCount, string]> = [
  ['all', 'Todas'],
  ['live', 'Ao vivo'],
  ['busy', 'Preparando'],
  ['free', 'Livres'],
  ['maintenance', 'Manutenção'],
  ['inactive', 'Inativas'],
]

export function CabineFilters({ filter, onFilterChange, counts }: CabineFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_OPTIONS.map(([key, label]) => (
        <button
          key={key}
          className={
            filter === key
              ? 'rounded-full border border-brand bg-brand-soft px-3 py-2 text-xs font-bold text-brand'
              : 'rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink-muted hover:bg-surface-muted'
          }
          onClick={() => onFilterChange(key)}
        >
          {label} <span className="ml-1 num">{counts[key]}</span>
        </button>
      ))}
    </div>
  )
}
