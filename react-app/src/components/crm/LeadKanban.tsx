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
}

export function LeadKanban({ leads, onOpenLead, onMoveLead }: LeadKanbanProps) {
  const [dragLeadId, setDragLeadId] = useState('')
  const leadsByStage = groupLeadsByStage(leads)

  return (
    <div className="overflow-x-auto pb-2">
      <section className="grid min-w-[1500px] grid-cols-8 gap-4">
        {leadsByStage.map(({ stage, leads: stageLeads }) => (
          <Card
            key={stage.key}
            className="min-h-96"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const leadId = event.dataTransfer.getData('text/plain') || dragLeadId
              if (leadId) onMoveLead(leadId, stage.key)
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
                  draggable
                  onDragStart={(event) => {
                    const id = asString(lead.id, '')
                    setDragLeadId(id)
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', id)
                  }}
                  onDragEnd={() => setDragLeadId('')}
                  onClick={() => onOpenLead(lead)}
                  className="w-full cursor-grab rounded-2xl border border-line bg-surface-muted p-3 text-left transition hover:border-brand/50 active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-bold text-ink">{leadTitle(lead)}</p>
                    <GripVertical className="h-4 w-4 shrink-0 text-ink-muted" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-ink-muted">
                    <span>{asString(lead.responsavel_nome, 'sem responsável')}</span>
                    <span>{formatMoney(leadValue(lead))}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-ink-muted">Atualizado {formatDate(asString(lead.atualizado_em ?? lead.criado_em, ''))}</p>
                  <p className="mt-2 text-[11px] font-semibold text-brand">Clique para abrir · arraste para mover</p>
                </button>
              ))}
              {stageLeads.length === 0 ? <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-ink-muted">Solte um lead aqui</p> : null}
            </CardBody>
          </Card>
        ))}
      </section>
    </div>
  )
}
