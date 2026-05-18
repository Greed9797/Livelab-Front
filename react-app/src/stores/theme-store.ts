import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const themeStorageKey = 'livelab-theme'

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'

  try {
    const value = window.localStorage.getItem(themeStorageKey)
    return isThemeMode(value) ? value : 'dark'
  } catch {
    return 'dark'
  }
}

function resolveTheme(theme: ThemeMode): ResolvedTheme {
  if (theme !== 'system') return theme
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function writeStoredTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(themeStorageKey, theme)
  } catch {
    // Theme persistence is a convenience; the in-memory state still updates.
  }
}

interface ThemeState {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const initialTheme = readStoredTheme()

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  resolvedTheme: resolveTheme(initialTheme),
  setTheme: (theme) => {
    writeStoredTheme(theme)
    set({ theme, resolvedTheme: resolveTheme(theme) })
  },
  toggleTheme: () => {
    const theme = get().resolvedTheme === 'light' ? 'dark' : 'light'
    writeStoredTheme(theme)
    set({ theme, resolvedTheme: resolveTheme(theme) })
  },
}))

if (typeof window !== 'undefined') {
  window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => {
    const state = useThemeStore.getState()
    if (state.theme === 'system') state.setTheme('system')
  })
}
