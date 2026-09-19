# react-app/src/components/charts/Charts.tsx

- PanelProps · type · L11-L11 — type PanelProps = { title: string; subtitle?: string; data: ChartPoint[]; secondary?: boolean }
- ChartFallback · function · L13-L25 — function ChartFallback({ title, subtitle }: { title: string; subtitle?: string })
- makePanel · function · L27-L41 — function makePanel(name: 'AreaPanel' | 'BarPanel' | 'LinePanel')
- ComboProps · type · L47-L53 — type ComboProps = { title: string subtitle?: string data: Array<{ label: string; gmvHora: number; horas: number }> accumulatedLabel?: string accumulatedValue?: string }
- GmvHoraComboPanel · function · L55-L65 — function GmvHoraComboPanel(props: ComboProps)
