# react-app/src/utils/live-manual.ts

- ManualLiveForm · type · L4-L23 — type ManualLiveForm = { cabine_id: string cliente_id: string marca_id: string apresentador_id: string agenda_evento_id?: string data: string hora_inicio: string hora_fim: string fat_gerado: string qtd_pedidos: string manual_views: string manual_likes: string manual_comments?: string manual_shares?: string manual_diamonds?: string resumo: string status_publicacao: string tipo: string }
- parseManualCounter · function · L25-L51 — function parseManualCounter(value: unknown): number
- buildManualLivePayload · function · L53-L77 — function buildManualLivePayload(form: ManualLiveForm): JsonRecord
