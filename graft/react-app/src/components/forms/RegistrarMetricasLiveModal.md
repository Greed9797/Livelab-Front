# react-app/src/components/forms/RegistrarMetricasLiveModal.tsx

- RegistrarMetricasLiveMode · type · L14-L14 — type RegistrarMetricasLiveMode = 'manual' | 'edit' | 'result'
- MetricsForm · type · L16-L21 — type MetricsForm = ManualLiveForm & { manual_comments: string manual_shares: string manual_diamonds: string origem_dados: string }
- today · function · L45-L47 — function today()
- toDateInput · function · L49-L60 — function toDateInput(value: unknown)
- toTimeInput · function · L62-L71 — function toTimeInput(value: unknown)
- toDatetimeLocal · function · L73-L75 — function toDatetimeLocal(date: string, time: string)
- liveTypeFromMarca · function · L77-L82 — function liveTypeFromMarca(marca?: JsonRecord): 'cliente' | 'afiliado' | 'teste'
- formFromLive · function · L84-L107 — function formFromLive(live: JsonRecord): MetricsForm
- formFromAgendaEvent · function · L109-L125 — function formFromAgendaEvent(event: JsonRecord, marcas: JsonRecord[]): MetricsForm
- RegistrarMetricasLiveModal · function · L127-L353 — function RegistrarMetricasLiveModal({ open, mode, live, agendaEvent, cabines, marcas, clientes, apresentadoras, isSaving, error, onClose, onCreateManual, onCreateResultFromAgenda, onUpdateLive, onCloseLive, }: { open: boolean mode: RegistrarMetricasLiveMode live?: JsonRecord | null agendaEvent?: JsonRecord | null cabines: Cabine[] marcas: JsonRecord[] clientes: JsonRecord[] apresentadoras: JsonRecord[] isSaving?: boolean error?: unknown onClose: () => void onCreateManual: (payload: JsonRecord) => void onCreateResultFromAgenda?: (payload: JsonRecord) => void onUpdateLive?: (id: string, payload: JsonRecord) => void onCloseLive?: (id: string, payload: JsonRecord) => void })
- setField · function · L191-L193 — function setField(key: keyof MetricsForm, value: string)
- setType · function · L195-L197 — function setType(value: string)
- setAccount · function · L199-L211 — function setAccount(value: string)
- buildEncerrarPayload · function · L213-L231 — function buildEncerrarPayload(): JsonRecord
- onSubmit · function · L233-L248 — function onSubmit(event: FormEvent<HTMLFormElement>)
