import { Card, CardBody, CardHeader } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import type { JsonRecord } from '../../types/models'
import { asNumber, asString, formatMoney } from '../../utils/format'

export function RankingTable({ title, data, subject }: { title: string; data: JsonRecord[]; subject: 'marca' | 'apresentadora' }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-bold text-ink">{title}</p>
      </CardHeader>
      <CardBody>
        <DataTable<JsonRecord>
          data={data}
          columns={[
            {
              key: 'nome',
              header: subject === 'marca' ? 'Marca/cliente' : 'Apresentadora',
              render: (item) => asString(item.nome ?? item.cliente_nome ?? item.tenant_nome ?? item.apresentadora_nome),
            },
            { key: 'gmv', header: 'GMV hoje', align: 'right', render: (item) => formatMoney(item.gmv_total ?? item.gmv ?? item.valor, true) },
            { key: 'lives', header: 'Lives hoje', align: 'right', render: (item) => asNumber(item.lives ?? item.total_lives ?? item.qtd_lives).toLocaleString('pt-BR') },
            ...(subject === 'apresentadora'
              ? [{ key: 'gmv_medio_live', header: 'GMV médio/live', align: 'right' as const, render: (item: JsonRecord) => formatMoney(item.gmv_medio_live, true) }]
              : []),
          ]}
        />
      </CardBody>
    </Card>
  )
}
