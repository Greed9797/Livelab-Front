# react-app/src/pages/page-helpers.ts

- metric · function · L4-L6 — function metric(label: string, value: unknown, hint?: string, tone: Metric['tone'] = 'neutral'): Metric
- moneyMetric · function · L8-L10 — function moneyMetric(label: string, value: unknown, hint?: string, tone: Metric['tone'] = 'brand'): Metric
- percentMetric · function · L12-L14 — function percentMetric(label: string, value: unknown, hint?: string, tone: Metric['tone'] = 'info'): Metric
- historyPoints · function · L16-L26 — function historyPoints(raw: unknown, labelKeys = ['label', 'mes', 'periodo', 'data', 'dia'], valueKeys = ['gmv', 'valor', 'total', 'receita', 'entradas']): ChartPoint[]
- formatShortDay · function · L28-L33 — function formatShortDay(value: unknown)
- topDailyPoints · function · L35-L54 — function topDailyPoints( raw: unknown, valueKeys: string[], labelKeys = ['dia', 'data', 'label'], limit = 10, ): ChartPoint[]
- analyticsDailyChartRows · function · L56-L67 — function analyticsDailyChartRows(raw: JsonRecord, endpointRows: JsonRecord[])
- DailyTotals · interface · L69-L80 — interface DailyTotals
- sumDailyTotals · function · L85-L108 — function sumDailyTotals(rows: JsonRecord[]): DailyTotals
- latestPeriodWithData · function · L110-L120 — function latestPeriodWithData(raw: JsonRecord)
- normalizeHome · function · L122-L173 — function normalizeHome(raw: JsonRecord)
- normalizeMaster · function · L175-L195 — function normalizeMaster(raw: JsonRecord)
- normalizeCliente · function · L197-L217 — function normalizeCliente(raw: JsonRecord)
