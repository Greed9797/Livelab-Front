import type { LivePendingCounts, LivePendingKind } from './live-helpers'

const OPTIONS: Array<{ kind: LivePendingKind; label: string }> = [
  { kind: 'rascunho', label: 'Rascunhos' },
  { kind: 'cadastro', label: 'Cadastro' },
  { kind: 'metricas', label: 'Métricas' },
  { kind: 'duplicata', label: 'Possíveis duplicatas' },
]

export function LivePendingPanel({
  counts,
  loadedCount,
  selected,
  onSelect,
  loading = false,
  error = false,
  duplicateStatus = 'ready',
  onRetry,
}: {
  counts: LivePendingCounts
  loadedCount: number
  selected: LivePendingKind | ''
  onSelect: (kind: LivePendingKind | '') => void
  loading?: boolean
  error?: boolean
  duplicateStatus?: 'loading' | 'error' | 'ready'
  onRetry?: () => void
}) {
  if (loading || error) {
    return (
      <div className="lives-pending-panel" aria-live="polite">
        <span className="lives-pending-panel__label">
          {loading ? 'Carregando pendências do recorte…' : 'Pendências indisponíveis neste recorte.'}
        </span>
        {error && onRetry ? <button type="button" className="lives-pending-panel__clear" onClick={onRetry}>Tentar novamente</button> : null}
      </div>
    )
  }
  return (
    <div className="lives-pending-panel" aria-label="Pendências operacionais das lives carregadas">
      <span className="lives-pending-panel__label">
        Pendências <small>nos {loadedCount} resultados carregados</small>
      </span>
      <div className="lives-pending-panel__options">
        {OPTIONS.map((option) => (
          <button
            key={option.kind}
            type="button"
            className={selected === option.kind ? 'lives-pending-chip is-active' : 'lives-pending-chip'}
            aria-pressed={selected === option.kind}
            onClick={() => onSelect(selected === option.kind ? '' : option.kind)}
          >
            {option.label}
            <span>{option.kind === 'duplicata' && duplicateStatus !== 'ready' ? '—' : counts[option.kind]}</span>
          </button>
        ))}
      </div>
      {duplicateStatus !== 'ready' ? (
        <span className="lives-pending-reason">
          Verificação de possíveis duplicatas {duplicateStatus === 'loading' ? 'em andamento' : 'indisponível'}.
          {duplicateStatus === 'error' && onRetry ? <button type="button" className="lives-pending-panel__clear" onClick={onRetry}>Tentar novamente</button> : null}
        </span>
      ) : null}
      {selected ? (
        <button type="button" className="lives-pending-panel__clear" onClick={() => onSelect('')}>
          Limpar pendência
        </button>
      ) : null}
    </div>
  )
}
