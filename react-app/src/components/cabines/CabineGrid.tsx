import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { CabineCard } from './CabineCard'
import type { Cabine } from '../../types/models'

interface CabineGridProps {
  cabines: Cabine[]
  loading: boolean
  error: Error | null
  canWriteLive: boolean
  canWriteCabine: boolean
  isCabineActive: (cabine: Cabine) => boolean
  onSelect: (cabine: Cabine) => void
  onStartLive: (cabine: Cabine) => void
  onSchedule: (cabine: Cabine) => void
}

export function CabineGrid({
  cabines,
  loading,
  error,
  canWriteLive,
  canWriteCabine,
  isCabineActive,
  onSelect,
  onStartLive,
  onSchedule,
}: CabineGridProps) {
  if (loading) return <LoadingState label="Carregando cabines" />
  if (error) return <ErrorState message={error.message} />
  if (!cabines.length) return <EmptyState title="Nenhuma cabine encontrada" description="Ajuste o filtro para ver outras cabines." />

  return (
    <section className="grid gap-[22px] sm:grid-cols-2 2xl:grid-cols-3">
      {cabines.map((cabine) => (
        <CabineCard
          key={cabine.id}
          cabine={cabine}
          isActive={isCabineActive(cabine)}
          canWriteLive={canWriteLive}
          canWriteCabine={canWriteCabine}
          onSelect={() => onSelect(cabine)}
          onStartLive={() => onStartLive(cabine)}
          onSchedule={() => onSchedule(cabine)}
        />
      ))}
    </section>
  )
}
