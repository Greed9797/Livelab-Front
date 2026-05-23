import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import type { JsonRecord } from '../../types/models'
import { asNumber, asString } from '../../utils/format'

function liveDuration(startedAt: unknown) {
  const started = typeof startedAt === 'string' ? new Date(startedAt) : null
  if (!started || Number.isNaN(started.getTime())) return '—'
  const minutes = Math.max(0, Math.floor((Date.now() - started.getTime()) / 60_000))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours > 0 ? `${hours}h ${String(rest).padStart(2, '0')}min` : `${rest}min`
}

export function LiveNowTable({ liveNow, upcoming }: { liveNow: JsonRecord[]; upcoming: JsonRecord[] }) {
  const next = upcoming[0]

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">Lives acontecendo agora</p>
            <p className="mt-1 text-xs text-ink-muted">{liveNow.length} cabines em live</p>
          </div>
          <Badge tone={liveNow.length > 0 ? 'success' : 'neutral'}>{liveNow.length > 0 ? 'ao vivo' : 'sem live ativa'}</Badge>
        </div>
      </CardHeader>
      <CardBody>
        {liveNow.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface-muted p-5 text-sm text-ink-muted">
            <p className="font-semibold text-ink">Nenhuma live ativa agora.</p>
            {next ? (
              <p className="mt-2">
                Próxima live: {asString(next.hora_inicio ?? next.hora)} · {asString(next.marca_nome ?? next.cliente_nome)} · Cabine {asString(next.cabine_numero ?? next.numero)}
              </p>
            ) : null}
          </div>
        ) : (
          <DataTable<JsonRecord>
            data={liveNow}
            columns={[
              { key: 'numero', header: 'Cabine', render: (item) => `Cabine ${String(item.numero ?? item.cabine_numero ?? '').padStart(2, '0')}` },
              { key: 'cliente_nome', header: 'Marca/cliente', render: (item) => asString(item.marca_nome ?? item.cliente_nome) },
              { key: 'apresentador', header: 'Apresentadora', render: (item) => asString(item.apresentadora_nome ?? item.apresentador_nome ?? item.apresentador) },
              { key: 'iniciado_em', header: 'Tempo ao vivo', render: (item) => liveDuration(item.iniciado_em) },
              { key: 'viewer_count', header: 'Espectadores', align: 'right', render: (item) => asNumber(item.viewer_count).toLocaleString('pt-BR') },
              { key: 'total_orders', header: 'Pedidos', align: 'right', render: (item) => asNumber(item.total_orders ?? item.pedidos).toLocaleString('pt-BR') },
              { key: 'duracao_min', header: 'Duração', align: 'right', render: (item) => `${asNumber(item.duracao_min).toLocaleString('pt-BR')} min` },
              {
                key: 'action',
                header: 'Ação',
                render: (item) => (
                  <Link className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-hover" to={`/conteudo?live=${asString(item.live_atual_id ?? item.live_id, '')}`}>
                    Ver detalhes <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ),
              },
            ]}
          />
        )}
      </CardBody>
    </Card>
  )
}
