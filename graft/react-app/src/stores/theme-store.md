# react-app/src/stores/theme-store.ts

- ThemeMode · type · L3-L3 — type ThemeMode = 'light' | 'dark' | 'system'
- ResolvedTheme · type · L4-L4 — type ResolvedTheme = 'light' | 'dark'
- isThemeMode · function · L8-L10 — function isThemeMode(value: unknown): value is ThemeMode
- readStoredTheme · function · L12-L21 — function readStoredTheme(): ThemeMode
- resolveTheme · function · L23-L27 — function resolveTheme(theme: ThemeMode): ResolvedTheme
- applyResolvedTheme · function · L29-L32 — function applyResolvedTheme(theme: ResolvedTheme)
- writeStoredTheme · function · L34-L42 — function writeStoredTheme(theme: ThemeMode)
- ThemeState · interface · L44-L49 — interface ThemeState
