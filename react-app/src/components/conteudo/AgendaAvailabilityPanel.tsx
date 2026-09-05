import { useState } from 'react'
import { AlertCircle, CalendarDays, Users } from 'lucide-react'
import type { AgendaAvailabilityEntry, AgendaAvailabilitySummary } from './agendaAvailability'

type AvailabilityState = 'loading' | 'error' | 'incomplete' | 'ready'

function EntryList({ entries, presenter = false }: { entries: AgendaAvailabilityEntry[]; presenter?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? entries : entries.slice(0, 8)
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {visible.map((entry) => (
          <span key={entry.id} className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
            {entry.nome}{presenter ? <span className="ml-1 text-ink-muted">{entry.slots}/2</span> : null}
          </span>
        ))}
      </div>
      {entries.length > 8 ? (
        <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-2 text-xs font-bold text-brand hover:underline">
          {expanded ? 'Mostrar menos' : `Ver mais ${entries.length - 8}`}
        </button>
      ) : null}
    </>
  )
}

export function AgendaAvailabilityPanel({
  date,
  dates,
  onDateChange,
  state,
  value,
  onRetry,
}: {
  date: string
  dates: string[]
  onDateChange: (date: string) => void
  state: AvailabilityState
  value: AgendaAvailabilitySummary | null
  onRetry: () => void
}) {
  const isReady = state === 'ready' && value !== null
  return (
    <section className="mt-5 rounded-xl border border-line bg-surface-muted/50 p-4" aria-label="Escala registrada no dia">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-ink"><Users className="h-4 w-4 text-brand" />Escala registrada</p>
          <p className="mt-1 text-xs text-ink-muted">Quem ainda precisa de horários no dia. Apresentadoras saem da lista ao completar 2 horários.</p>
        </div>
        {dates.length > 1 ? (
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
            <CalendarDays className="h-4 w-4" />
            <select aria-label="Dia da escala registrada" className="design-input h-8 px-2 text-xs" value={date} onChange={(event) => onDateChange(event.target.value)}>
              {dates.map((day) => <option key={day} value={day}>{day.split('-').reverse().join('/')}</option>)}
            </select>
          </label>
        ) : null}
      </div>

      {state === 'loading' ? <p className="mt-4 text-sm font-semibold text-ink-muted">Conferindo reservas e revezamentos…</p> : null}
      {state === 'error' || state === 'incomplete' ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-[color:var(--warning)]/30 bg-[var(--warning-soft)] px-3 py-2 text-sm text-ink">
          <AlertCircle className="h-4 w-4 shrink-0 text-[color:var(--warning)]" />
          <span>Não foi possível confirmar quem está sem escala neste dia.</span>
          <button type="button" onClick={onRetry} className="font-bold text-brand hover:underline">Tentar novamente</button>
        </div>
      ) : null}
      {isReady ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Marcas ativas sem horário ({value.marcasSemHorario.length})</p>
            {value.marcasSemHorario.length > 0 ? <EntryList entries={value.marcasSemHorario} /> : <p className="text-sm text-ink-muted">{value.marcasAtivas === 0 ? 'Nenhuma marca ativa cadastrada.' : 'Todas as marcas ativas têm horário registrado.'}</p>}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Apresentadoras com vaga ({value.apresentadorasComVaga.length})</p>
            {value.apresentadorasComVaga.length > 0 ? <EntryList entries={value.apresentadorasComVaga} presenter /> : <p className="text-sm text-ink-muted">{value.apresentadorasAtivas === 0 ? 'Nenhuma apresentadora ativa cadastrada.' : 'Todas as apresentadoras ativas já têm 2 horários.'}</p>}
          </div>
        </div>
      ) : null}
    </section>
  )
}
