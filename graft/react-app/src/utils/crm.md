# react-app/src/utils/crm.ts

- CrmStageKey · type · L15-L15 — type CrmStageKey = (typeof CRM_STAGES)[number]['key']
- normalizeCrmStage · function · L19-L22 — function normalizeCrmStage(lead: JsonRecord)
- groupLeadsByStage · function · L24-L29 — function groupLeadsByStage<T extends JsonRecord>(leads: T[])
- moveLeadToStage · function · L31-L35 — function moveLeadToStage<T extends JsonRecord>(leads: T[], leadId: string, stage: CrmStageKey)
- leadTitle · function · L37-L39 — function leadTitle(lead: JsonRecord)
- leadValue · function · L41-L43 — function leadValue(lead: JsonRecord)
- stageLabel · function · L45-L47 — function stageLabel(stage: unknown)
