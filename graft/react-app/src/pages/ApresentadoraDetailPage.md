# react-app/src/pages/ApresentadoraDetailPage.tsx

- DateRange · type · L19-L19 — type DateRange = 'hoje' | '7d' | '30d' | 'mes' | 'mes_anterior' | 'custom'
- toISO · function · L30-L30 — toISO = (d: Date)
- mesAnteriorWindow · function · L34-L38 — function mesAnteriorWindow(ref = new Date()): { data_inicio: string; data_fim: string }
- dateRangeToWindow · function · L41-L57 — function dateRangeToWindow(range: DateRange, custom: { from: string; to: string }): { data_inicio: string; data_fim: string }
- periodoLabel · function · L62-L68 — function periodoLabel(data_inicio: string, data_fim: string): string
- liveOrders · function · L70-L72 — function liveOrders(live: JsonRecord): number
- liveDurationMins · function · L73-L78 — function liveDurationMins(live: JsonRecord): number
- fmtDurationMins · function · L79-L84 — function fmtDurationMins(mins: number): string
- fmtDay · function · L85-L92 — function fmtDay(value: unknown): string
- fmtDiaMesAno · function · L94-L97 — function fmtDiaMesAno(iso: string): string
- pctLabel · function · L98-L101 — function pctLabel(value: unknown): string
- initials · function · L102-L107 — function initials(name: string): string
- Stat · function · L109-L117 — function Stat({ label, value, hint }: { label: string; value: string; hint?: string })
- regraLabel · function · L121-L131 — function regraLabel(linha: JsonRecord): string
- ApresentadoraDetailPage · function · L133-L448 — function ApresentadoraDetailPage()
- exportPdf · function · L208-L270 — async function exportPdf()
