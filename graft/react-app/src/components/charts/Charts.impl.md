# react-app/src/components/charts/Charts.impl.tsx

- MoneyTooltip · function · L22-L34 — function MoneyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string }>; label?: string })
- ComboPoint · interface · L36-L40 — interface ComboPoint
- ComboTooltip · function · L42-L61 — function ComboTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string; dataKey?: string }>; label?: string })
- GmvHoraComboPanel · function · L65-L112 — function GmvHoraComboPanel({ title, subtitle, data, accumulatedLabel, accumulatedValue, }: { title: string subtitle?: string data: ComboPoint[] accumulatedLabel?: string accumulatedValue?: string })
- LinePanel · function · L114-L147 — function LinePanel({ title, subtitle, data, secondary = false, }: { title: string subtitle?: string data: ChartPoint[] secondary?: boolean })
- BarPanel · function · L149-L171 — function BarPanel({ title, subtitle, data }: { title: string; subtitle?: string; data: ChartPoint[] })
- AreaPanel · function · L173-L200 — function AreaPanel({ title, data }: { title: string; data: ChartPoint[] })
