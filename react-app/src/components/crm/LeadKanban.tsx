import { GripVertical } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../ui/Badge'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { asString, formatDate, formatMoney } from '../../utils/format'
import { groupLeadsByStage, leadTitle, leadValue, type CrmStageKey } from '../../utils/crm'
import type { JsonRecord } from '../../types/models'

interface LeadKanbanProps {
  leads: JsonRecord[]
  onOpenLead: (lead: JsonRecord) => void
  onMoveLead: (leadId: string, stage: CrmStageKey) => void
  canMove?: boolean
}

export function LeadKanban({ leads, onOpenLead, onMoveLead, canMove = false }: LeadKanbanProps) {
  const [dragLeadId, setDragLeadId] = useState('')
  const leadsByStage = groupLeadsByStage(leads)

  return (
    <div className="min-w-0 max-w-full overflow-x-auto pb-2">
      <section aria-label="Funil de oportunidades" className="grid w-max grid-cols-8 gap-3 sm:gap-4">
        {leadsByStage.map(({ stage, leads: stageLeads }) => (
          <Card
            key={stage.key}
            role="region"
            aria-label={stage.label}
            className="min-h-96 w-[min(82vw,17rem)]"
            onDragOver={(event) => { if (canMove) event.preventDefault() }}
            onDrop={(event) => {
              event.preventDefault()
              const leadId = event.dataTransfer.getData('text/plain') || dragLeadId
              if (canMove && leadId) onMoveLead(leadId, stage.key)
              setDragLeadId('')
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-ink">{stage.label}</p>
                <Badge tone={stage.key === 'ganho' ? 'success' : stage.key === 'perdido' ? 'danger' : 'brand'}>{stageLeads.length}</Badge>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {stageLeads.map((lead) => (
                <button
                  key={asString(lead.id)}
                  type="button"
                  draggable={canMove}
                  onDragStart={(event) => {
                    const id = asString(lead.id, '')
                    setDragLeadId(id)
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', id)
                  }}
                  onDragEnd={() => setDragLeadId('')}
                  onClick={() => onOpenLead(lead)}
                  className="w-full rounded-2xl border border-line bg-surface-muted p-3 text-left transition hover:border-brand/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-bold text-ink">{leadTitle(lead)}</p>
                    {canMove ? <GripVertical aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-muted" /> : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-ink-muted">
                    <span>{asString(lead.responsavel_nome, 'sem responsável')}</span>
                    <span>{formatMoney(leadValue(lead))}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-ink-muted">Atualizado {formatDate(asString(lead.atualizado_em ?? lead.criado_em, ''))}</p>
                  <p className="mt-2 text-[11px] font-semibold text-brand">{canMove ? 'Abrir detalhes · arraste ou edite para mover' : 'Abrir detalhes'}</p>
                </button>
              ))}
              {stageLeads.length === 0 ? <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-ink-muted">{canMove ? 'Arraste um lead para esta etapa' : 'Nenhum lead nesta etapa'}</p> : null}
            </CardBody>
          </Card>
        ))}
      </section>
    </div>
  )
}
