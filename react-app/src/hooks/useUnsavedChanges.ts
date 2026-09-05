import { useEffect, useRef, useState } from 'react'
import { useUnsavedGuardRegistry, type PendingNavigation } from '../components/ui/UnsavedChangesProvider'

export function unsavedCloseDecision({ busy, dirty }: { busy: boolean; dirty: boolean }) {
  if (busy) return 'ignore' as const
  return dirty ? 'confirm' as const : 'close' as const
}

export function completeUnsavedDiscard({ navigation, onClose, setConfirming }: {
  navigation: PendingNavigation | null
  onClose: () => void
  setConfirming: (value: boolean) => void
}) {
  setConfirming(false)
  onClose()
  navigation?.proceed()
}

export function continueUnsavedEditing({ navigation, returnFocus, setConfirming }: {
  navigation: PendingNavigation | null
  returnFocus: HTMLElement | null
  setConfirming: (value: boolean) => void
}) {
  setConfirming(false)
  navigation?.reset()
  if (returnFocus?.isConnected) returnFocus.focus()
}

/** Guarda apenas a saída solicitada pelo usuário; o sucesso do save fecha diretamente. */
export function useUnsavedChanges({ open, dirty, busy = false, onClose }: {
  open: boolean
  dirty: boolean
  busy?: boolean
  onClose: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)
  const pendingNavigation = useRef<PendingNavigation | null>(null)
  const idRef = useRef<symbol | null>(null)
  const stateRef = useRef({ open, dirty, busy })
  const registry = useUnsavedGuardRegistry()
  if (idRef.current === null) idRef.current = Symbol('unsaved-changes')
  stateRef.current = { open, dirty, busy }

  const onNavigationBlockedRef = useRef<(navigation: PendingNavigation) => void>(() => {})
  onNavigationBlockedRef.current = (navigation) => {
    const current = stateRef.current
    if (current.busy) { navigation.reset(); return }
    if (!current.open || !current.dirty) { navigation.proceed(); return }
    if (!confirming) returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    pendingNavigation.current = navigation
    setConfirming(true)
  }

  useEffect(() => {
    const unregister = registry?.register(idRef.current as symbol, (navigation) => onNavigationBlockedRef.current(navigation))
    return () => {
      unregister?.()
      const navigation = pendingNavigation.current
      pendingNavigation.current = null
      navigation?.reset()
    }
  }, [registry])

  useEffect(() => {
    registry?.update(idRef.current as symbol, { open, dirty, busy })
  }, [busy, dirty, open, registry])

  useEffect(() => {
    if (!open || !dirty) {
      setConfirming(false)
      const navigation = pendingNavigation.current
      pendingNavigation.current = null
      navigation?.reset()
    }
  }, [open, dirty])

  useEffect(() => {
    if (!open || (!dirty && !busy)) return
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', preventUnload)
    return () => window.removeEventListener('beforeunload', preventUnload)
  }, [open, dirty, busy])

  return {
    confirming: confirming && dirty,
    busy,
    requestClose() {
      const decision = unsavedCloseDecision({ busy, dirty })
      if (decision === 'ignore') return
      if (decision === 'close') { onClose(); return }
      if (!confirming) returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setConfirming(true)
    },
    keepEditing() {
      const navigation = pendingNavigation.current
      pendingNavigation.current = null
      continueUnsavedEditing({ navigation, returnFocus: returnFocus.current, setConfirming })
    },
    discard() {
      if (busy) return
      const navigation = pendingNavigation.current
      pendingNavigation.current = null
      completeUnsavedDiscard({ navigation, onClose, setConfirming })
    },
  }
}
