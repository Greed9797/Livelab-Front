# react-app/src/utils/dailyPulse.ts

- PulseStatus · type · L8-L8 — type PulseStatus = 'critico' | 'atencao' | 'ok' | 'otimo'
- PulseAgg · interface · L10-L17 — interface PulseAgg
- PulseResumo · interface · L19-L30 — interface PulseResumo
- PulseDay · interface · L32-L40 — interface PulseDay
- PulseCliente · interface · L42-L53 — interface PulseCliente
- PulseAlerta · interface · L55-L65 — interface PulseAlerta
- PulseApresentadora · interface · L67-L76 — interface PulseApresentadora
- DailyPulseData · interface · L78-L84 — interface DailyPulseData
- diaLabel · function · L95-L99 — function diaLabel(value: unknown): string
- formatHoras · function · L102-L108 — function formatHoras(horas: number): string
- makeAgg · function · L110-L120 — function makeAgg(gmv: number, gmvLives: number, pedidos: number, horas: number, totalLives: number): PulseAgg
- computeStatus · function · L124-L136 — function computeStatus(a: PulseAgg): PulseStatus
- diagnose · function · L138-L149 — function diagnose(status: PulseStatus, a: PulseAgg): { titulo: string; descricao: string }
- RowAgg · interface · L151-L157 — interface RowAgg
- addRow · function · L159-L165 — function addRow(target: RowAgg, row: JsonRecord): void
- emptyRowAgg · function · L167-L169 — function emptyRowAgg(): RowAgg
- buildDailyPulse · function · L173-L313 — function buildDailyPulse(rows: JsonRecord[]): DailyPulseData
