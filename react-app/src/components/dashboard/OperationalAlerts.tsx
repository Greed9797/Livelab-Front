import { AlertTriangle } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import type { JsonRecord } from '../../types/models'
import { asNumber, asString } from '../../utils/format'

const priorityClass: Record<string, string> = {
  alta: 'text-[var(--danger)]',
  media: 'text-[var(--warning)]',
  baixa: 'text-ink-muted',
}

export function OperationalAlerts({ alerts }: { alerts: JsonRecord[] }) {
  const visible = alerts.filter((alert) => asNumber(alert.valor ?? alert.value) > 0)

  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-bold text-ink">Alertas da operação</p>
      </CardHeader>
      <CardBody className="space-y-3">
        {visible.length === 0 ? (
          <p className="rounded-2xl border border-line bg-surface-muted p-4 text-sm text-ink-muted">Nenhum alerta operacional ativo.</p>
        ) : visible.map((alert) => (
          <div key={asString(alert.tipo ?? alert.label)} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface-muted p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-4 w-4 ${priorityClass[asString(alert.prioridade, 'baixa')] ?? priorityClass.baixa}`} />
              <p className="text-sm font-semibold text-ink">{asString(alert.label ?? alert.tipo)}</p>
            </div>
            <span className="num text-lg font-bold text-ink">{asNumber(alert.valor ?? alert.value).toLocaleString('pt-BR')}</span>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}
