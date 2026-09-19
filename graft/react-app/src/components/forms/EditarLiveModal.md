# react-app/src/components/forms/EditarLiveModal.tsx

- LookupOption · type · L20-L20 — type LookupOption = { value: string; label: string }
- EditForm · type · L22-L49 — type EditForm = { cabine_id: string cliente_id: string marca_id: string apresentador_id: string apresentador2_id: string gestor_id: string agenda_evento_id: string tiktok_username: string status: string tipo: string status_publicacao: string origem_dados: string data: string hora_inicio: string hora_fim: string previsto_fim: string fat_gerado: string manual_gmv: string qtd_pedidos: string manual_orders: string manual_views: string manual_likes: string manual_comments: string manual_shares: string manual_diamonds: string resumo: string }
- presenterIdsFromLive · function · L80-L89 — function presenterIdsFromLive(live: JsonRecord): { principalId: string; supportId: string }
- toLookupOptions · function · L91-L95 — function toLookupOptions(rows: JsonRecord[], labelKey = 'nome'): LookupOption[]
- toDateInput · function · L97-L103 — function toDateInput(value: unknown): string
- toTimeInput · function · L105-L111 — function toTimeInput(value: unknown): string
- toDatetimeLocal · function · L113-L119 — function toDatetimeLocal(value: unknown): string
- Props · type · L121-L126 — type Props = { open: boolean onClose: () => void live: JsonRecord | null onSaved?: () => void }
- montarCamposNumericos · function · L152-L190 — function montarCamposNumericos(form: EditForm, prefill: EditForm, temAdsGmv = false): JsonRecord
- EditarLiveModal · function · L192-L510 — function EditarLiveModal({ open, onClose, live, onSaved }: Props)
- setField · function · L263-L265 — function setField<K extends keyof EditForm>(key: K, value: string)
- onSubmit · function · L277-L324 — function onSubmit(event: FormEvent<HTMLFormElement>)
- setIfChanged · function · L288-L293 — setIfChanged = <K extends keyof EditForm>(key: K, raw: string, current: unknown)
