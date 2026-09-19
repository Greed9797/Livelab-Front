# react-app/src/pages/FinanceiroPage.tsx

- FinanceiroTab · type · L46-L46 — type FinanceiroTab = 'operacional' | 'cliente' | 'comissoes' | 'franqueadora'
- num · function · L48-L48 — num = (value: unknown)
- sumBy · function · L49-L50 — sumBy = (rows: JsonRecord[], ...keys: string[])
- dmLabel · function · L53-L56 — function dmLabel(value: string): string
- tipoTone · function · L64-L69 — function tipoTone(tipo: string): 'brand' | 'info' | 'warning' | 'neutral'
- memoriaText · function · L82-L99 — function memoriaText(categoria: string, memoria: JsonRecord): string
- ResultadoOperacional · function · L101-L152 — function ResultadoOperacional({ data }: { data: JsonRecord })
- TotalsBar · function · L154-L164 — function TotalsBar({ items }: { items: { label: string; value: string }[] })
- FinanceiroPage · function · L166-L860 — function FinanceiroPage()
- setPeriodRange · function · L187-L190 — function setPeriodRange(next: PeriodRange)
- setCustoField · function · L316-L318 — function setCustoField(key: keyof typeof custo, value: string)
- onCustoSubmit · function · L320-L328 — function onCustoSubmit(event: FormEvent<HTMLFormElement>)
- switchTab · function · L330-L336 — function switchTab(next: FinanceiroTab)
- exportComissoesCsv · function · L340-L358 — async function exportComissoesCsv()
- exportClientesCsv · function · L360-L370 — function exportClientesCsv()
