import { Card, CardBody, CardHeader } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import type { JsonRecord } from '../../types/models'
import { asNumber, asString, formatMoney } from '../../utils/format'

export function RankingTable({ title, data, subject }: { title: string; data: JsonRecord[]; subject: 'marca' | 'apresentadora' }) {
  const marcaColumns = [
    {
      key: 'nome',
      header: 'Marca',
      render: (item: JsonRecord) => asString(item.nome ?? item.marca_nome ?? item.cliente_nome),
    },
    { key: 'gmv', header: 'GMV mês', align: 'right' as const, render: (item: JsonRecord) => formatMoney(item.gmv_total ?? item.gmv ?? item.valor, true) },
    { key: 'lives', header: 'Lives mês', align: 'right' as const, render: (item: JsonRecord) => asNumber(item.lives ?? item.total_lives ?? item.qtd_lives).toLocaleString('pt-BR') },
  ]

  const apresentadoraColumns = [
    {
      key: 'nome',
      header: 'Apresentadora',
      render: (item: JsonRecord) => asString(item.nome ?? item.apresentadora_nome),
    },
    { key: 'fixo', header: 'Fixo', align: 'right' as const, render: (item: JsonRecord) => formatMoney(item.fixo, true) },
    { key: 'comissao_variavel', header: 'Variável', align: 'right' as const, render: (item: JsonRecord) => formatMoney(item.comissao_variavel ?? item.comissao_apresentadora, true) },
    { key: 'total_recebido', header: 'Total', align: 'right' as const, render: (item: JsonRecord) => formatMoney(item.total_recebido ?? item.comissao_apresentadora, true) },
  ]

  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-bold text-ink">{title}</p>
      </CardHeader>
      <CardBody>
        <DataTable<JsonRecord>
          data={data}
          columns={subject === 'marca' ? marcaColumns : apresentadoraColumns}
        />
      </CardBody>
    </Card>
  )
}
