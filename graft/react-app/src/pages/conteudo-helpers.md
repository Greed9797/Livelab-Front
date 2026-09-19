# react-app/src/pages/conteudo-helpers.ts

- isoDay · function · L8-L13 — function isoDay(d: Date): string
- weekDays · function · L16-L26 — function weekDays(dateISO: string): string[]
- monthGridDays · function · L29-L40 — function monthGridDays(dateISO: string): string[]
- agendaFetchRange · function · L43-L49 — function agendaFetchRange(dateISO: string, view: 'dia' | 'semana' | 'mes')
- publicationStatusLabel · function · L57-L60 — function publicationStatusLabel(value: unknown)
- publicationStatusTone · function · L62-L67 — function publicationStatusTone(value: unknown): BadgeTone
- parseBareLocalDateTime · function · L71-L79 — function parseBareLocalDateTime(value: string)
- saoPauloDateTimeParts · function · L81-L116 — function saoPauloDateTimeParts(value: unknown)
- formatSaoPauloTime · function · L118-L124 — function formatSaoPauloTime(value: unknown)
- compareDateKey · function · L126-L129 — function compareDateKey(a: string, b: string)
- eventBoundsInDate · function · L131-L148 — function eventBoundsInDate(event: JsonRecord, selectedDate?: string)
- eventIntersectsSaoPauloDate · function · L150-L156 — function eventIntersectsSaoPauloDate(event: JsonRecord, selectedDate: string)
- assignAgendaLanes · function · L163-L198 — function assignAgendaLanes(events: JsonRecord[], selectedDate?: string): Map<string, { index: number; total: number }>
- flush · function · L175-L190 — flush = ()
- getAgendaEventLayout · function · L200-L215 — function getAgendaEventLayout( event: JsonRecord, config: { startHour: number; endHour: number; rowHeight: number; date?: string }, )
