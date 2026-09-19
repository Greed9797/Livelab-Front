# react-app/src/utils/format.ts

- asNumber · function · L10-L18 — function asNumber(value: unknown, fallback = 0): number
- asString · function · L20-L24 — function asString(value: unknown, fallback = '—'): string
- asArray · function · L26-L28 — function asArray<T = JsonRecord>(value: unknown): T[]
- unwrapList · function · L30-L37 — function unwrapList<T>(value: unknown): T[]
- formatMoney · function · L39-L42 — function formatMoney(value: unknown, precise = false): string
- formatPercent · function · L44-L46 — function formatPercent(value: unknown): string
- formatDate · function · L53-L64 — function formatDate(value?: string): string
- currentPeriod · function · L66-L69 — function currentPeriod(): Period
- periodLabel · function · L71-L77 — function periodLabel(period: Period): string
- periodToParam · function · L79-L81 — function periodToParam(period: Period): string
- shiftPeriod · function · L83-L86 — function shiftPeriod(period: Period, delta: number): Period
- getRecord · function · L88-L90 — function getRecord(value: unknown): JsonRecord
