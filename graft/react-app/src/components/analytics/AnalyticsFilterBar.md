# react-app/src/components/analytics/AnalyticsFilterBar.tsx

- Preset · type · L7-L7 — type Preset = 'hoje' | 'ontem' | '7d' | '30d' | 'mes' | 'custom'
- ymd · function · L18-L23 — function ymd(d: Date): string
- presetRange · function · L25-L47 — function presetRange(preset: Preset, customFrom: string, customTo: string): { from: string; to: string }
- shift · function · L28-L32 — shift = (days: number)
- FilterSelect · function · L49-L63 — function FilterSelect({ value, onChange, ariaLabel, children }: { value: string; onChange: (v: string) => void; ariaLabel: string; children: ReactNode })
- FilterDate · function · L65-L80 — function FilterDate({ value, min, max, onChange, ariaLabel }: { value: string; min?: string; max?: string; onChange: (v: string) => void; ariaLabel: string })
- AnalyticsFilterBarProps · interface · L82-L99 — interface AnalyticsFilterBarProps
- AnalyticsFilterBar · function · L103-L168 — function AnalyticsFilterBar(props: AnalyticsFilterBarProps)
