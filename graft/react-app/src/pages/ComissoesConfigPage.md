# react-app/src/pages/ComissoesConfigPage.tsx

- Tab · type · L27-L27 — type Tab = 'marca' | 'apresentadora'
- VinculoStatus · type · L29-L29 — type VinculoStatus = 'ok' | 'sem_video' | 'sem_vinculo'
- tiersKey · function · L33-L38 — function tiersKey(rows: JsonRecord[]): string
- FaixaDraft · interface · L40-L44 — interface FaixaDraft
- payloadFromDraft · function · L48-L54 — function payloadFromDraft(draft: FaixaDraft): JsonRecord
- vinculoTone · function · L56-L60 — function vinculoTone(status: VinculoStatus): 'success' | 'warning' | 'danger'
- vinculoLabel · function · L62-L66 — function vinculoLabel(status: VinculoStatus): string
- classifyVinculo · function · L68-L71 — function classifyVinculo(vinculo?: JsonRecord): VinculoStatus
- EscadaPadraoSection · function · L75-L269 — function EscadaPadraoSection()
- invalidate · function · L83-L86 — invalidate = ()
- draftFor · function · L113-L118 — draftFor = (fx: JsonRecord): FaixaDraft
- setDraft · function · L120-L124 — setDraft = (fx: JsonRecord, patch: Partial<FaixaDraft>)
- mesAnterior · function · L273-L278 — function mesAnterior(): string
- FechamentoMesSection · function · L280-L340 — function FechamentoMesSection()
- ComissoesConfigPage · function · L342-L538 — function ComissoesConfigPage()
