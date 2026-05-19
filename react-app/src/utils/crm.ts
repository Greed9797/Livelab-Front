import type { JsonRecord } from '../types/models'
import { asString } from './format'

export const CRM_STAGES = [
  { key: 'lead_novo', label: 'Novo lead' },
  { key: 'contato_iniciado', label: 'Contato iniciado' },
  { key: 'reuniao_agendada', label: 'Reunião agendada' },
  { key: 'proposta_enviada', label: 'Proposta enviada' },
  { key: 'em_negociacao', label: 'Em negociação' },
  { key: 'aguardando_assinatura', label: 'Aguardando assinatura' },
  { key: 'ganho', label: 'Ganho' },
  { key: 'perdido', label: 'Perdido' },
] as const

export type CrmStageKey = (typeof CRM_STAGES)[number]['key']

const CRM_STAGE_KEYS = new Set(CRM_STAGES.map((stage) => stage.key))

export function normalizeCrmStage(lead: JsonRecord) {
  const stage = asString(lead.crm_etapa, '')
  return CRM_STAGE_KEYS.has(stage as CrmStageKey) ? stage : 'lead_novo'
}

export function groupLeadsByStage<T extends JsonRecord>(leads: T[]) {
  return CRM_STAGES.map((stage) => ({
    stage,
    leads: leads.filter((lead) => normalizeCrmStage(lead) === stage.key),
  }))
}

export function moveLeadToStage<T extends JsonRecord>(leads: T[], leadId: string, stage: CrmStageKey) {
  return leads.map((lead) => (
    asString(lead.id, '') === leadId ? { ...lead, crm_etapa: stage } : lead
  ))
}

export function leadTitle(lead: JsonRecord) {
  return asString(lead.nome ?? lead.nome_cliente ?? lead.cliente_nome, 'Lead')
}

export function leadValue(lead: JsonRecord) {
  return lead.valor_oportunidade ?? lead.valor_estimado ?? lead.fat_estimado
}

export function stageLabel(stage: unknown) {
  return CRM_STAGES.find((item) => item.key === normalizeCrmStage({ crm_etapa: stage }))?.label ?? 'Novo lead'
}
