import { Badge, statusTone } from '../ui/Badge'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import type { JsonRecord } from '../../types/models'
import { asString } from '../../utils/format'

function formatTime(value: unknown) {
  if (typeof value !== 'string') return '—'
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
  }
  return value.slice(0, 5)
}

function typeLabel(value: unknown) {
  const type = asString(value, '')
  if (type === 'gravacao_video') return 'Gravação'
  if (type === 'live') return 'Live'
  return type || '—'
}

export function TodayScheduleTable({ agenda }: { agenda: JsonRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-bold text-ink">Agenda de hoje</p>
      </CardHeader>
      <CardBody>
        <DataTable<JsonRecord>
          data={agenda}
          columns={[
            { key: 'data_inicio', header: 'Horário', render: (item) => `${formatTime(item.data_inicio)} - ${formatTime(item.data_fim)}` },
            { key: 'cabine_numero', header: 'Cabine', render: (item) => `Cabine ${asString(item.cabine_numero ?? item.numero)}` },
            { key: 'tipo', header: 'Tipo', render: (item) => typeLabel(item.tipo) },
            { key: 'marca_nome', header: 'Marca/cliente', render: (item) => asString(item.marca_nome ?? item.cliente_nome) },
            { key: 'apresentadora_nome', header: 'Apresentadora', render: (item) => asString(item.apresentadora_nome ?? item.apresentador_nome) },
            { key: 'status', header: 'Status', render: (item) => <Badge tone={statusTone(asString(item.status, ''))}>{asString(item.status)}</Badge> },
          ]}
        />
      </CardBody>
    </Card>
  )
}
