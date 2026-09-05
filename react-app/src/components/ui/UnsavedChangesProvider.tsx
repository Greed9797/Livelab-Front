import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useBlocker, type Location } from 'react-router-dom'

export type PendingNavigation = { reset: () => void; proceed: () => void }

type GuardState = { open: boolean; dirty: boolean; busy: boolean }
type GuardEntry = GuardState & {
  id: symbol
  activation: number
  onBlocked: (navigation: PendingNavigation) => void
}

export type UnsavedGuardRegistry = ReturnType<typeof createUnsavedGuardRegistry>

export function createUnsavedGuardRegistry() {
  const entries = new Map<symbol, GuardEntry>()
  let activation = 0

  return {
    register(id: symbol, onBlocked: GuardEntry['onBlocked']) {
      const existing = entries.get(id)
      entries.set(id, existing
        ? { ...existing, onBlocked }
        : { id, open: false, dirty: false, busy: false, activation: 0, onBlocked })
      return () => { entries.delete(id) }
    },
    update(id: symbol, state: GuardState) {
      const existing = entries.get(id)
      if (!existing) return
      entries.set(id, {
        ...existing,
        ...state,
        activation: state.open && !existing.open ? ++activation : existing.activation,
      })
    },
    active(discarded = new Set<symbol>()) {
      return [...entries.values()]
        .filter((entry) => entry.open && (entry.busy || (entry.dirty && !discarded.has(entry.id))))
        .sort((a, b) => Number(b.busy) - Number(a.busy) || b.activation - a.activation)[0]
    },
  }
}

export function shouldBlockUnsavedNavigation(current: Pick<Location, 'pathname' | 'search'>, next: Pick<Location, 'pathname' | 'search'>, registry: UnsavedGuardRegistry) {
  return Boolean(registry.active()) && (current.pathname !== next.pathname || current.search !== next.search)
}

export function dispatchBlockedNavigation(registry: UnsavedGuardRegistry, navigation: PendingNavigation, discarded = new Set<symbol>()): 'proceeded' | 'busy' | 'confirming' {
  const active = registry.active(discarded)
  if (!active) {
    navigation.proceed()
    return 'proceeded' as const
  }
  if (active.busy) {
    navigation.reset()
    return 'busy' as const
  }
  active.onBlocked({
    reset: navigation.reset,
    // Um modal filho pode estar sobre outro formulário alterado. Descartar o
    // filho não autoriza perder o pai, nem abandonar uma gravação já iniciada.
    proceed: () => { dispatchBlockedNavigation(registry, navigation, new Set([...discarded, active.id])) },
  })
  return 'confirming' as const
}

export function blockedGuardStillActive(captured: { id: symbol } | null, registry: UnsavedGuardRegistry) {
  const active = registry.active()
  return Boolean(captured && active && captured.id === active.id)
}

type UnsavedGuardRegistryContextValue = {
  register: UnsavedGuardRegistry['register']
  update: UnsavedGuardRegistry['update']
}

const UnsavedGuardRegistryContext = createContext<UnsavedGuardRegistryContextValue | null>(null)

export function useUnsavedGuardRegistry() {
  return useContext(UnsavedGuardRegistryContext)
}

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const registryRef = useRef<UnsavedGuardRegistry | null>(null)
  const blockedGuardRef = useRef<GuardEntry | null>(null)
  if (registryRef.current === null) registryRef.current = createUnsavedGuardRegistry()
  const registry = registryRef.current
  const shouldBlock = useCallback(({ currentLocation, nextLocation }: { currentLocation: Location; nextLocation: Location }) => {
    if (!shouldBlockUnsavedNavigation(currentLocation, nextLocation, registry)) return false
    blockedGuardRef.current = registry.active() ?? null
    return blockedGuardRef.current !== null
  }, [registry])
  const blocker = useBlocker(shouldBlock)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    const captured = blockedGuardRef.current
    blockedGuardRef.current = null
    // A tentativa pertence ao formulário que a bloqueou. Se ele fechou/trocou
    // antes deste efeito (por exemplo, save muito rápido), cancelar evita que um
    // Back antigo navegue sozinho depois do sucesso.
    if (!blockedGuardStillActive(captured, registry)) {
      blocker.reset()
      return
    }
    dispatchBlockedNavigation(registry, { reset: blocker.reset, proceed: blocker.proceed })
  }, [blocker, registry])

  const value = useMemo(() => ({ register: registry.register, update: registry.update }), [registry])
  return <UnsavedGuardRegistryContext.Provider value={value}>{children}</UnsavedGuardRegistryContext.Provider>
}
