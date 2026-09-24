import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type CompactChromeContextValue = {
  title: string | null
  center: ReactNode | null
  setTitle: (title: string | null) => void
  setCenter: (center: ReactNode | null) => void
}

const CompactChromeContext = createContext<CompactChromeContextValue | null>(null)

export function CompactChromeProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null)
  const [center, setCenter] = useState<ReactNode | null>(null)
  const setTitleStable = useCallback((next: string | null) => setTitle(next), [])
  const setCenterStable = useCallback((next: ReactNode | null) => setCenter(next), [])
  const value = useMemo(
    () => ({ title, center, setTitle: setTitleStable, setCenter: setCenterStable }),
    [title, center, setTitleStable, setCenterStable],
  )
  return <CompactChromeContext.Provider value={value}>{children}</CompactChromeContext.Provider>
}

export function useCompactChrome() {
  return useContext(CompactChromeContext)
}
