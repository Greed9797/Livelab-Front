import { Card, CardBody, CardHeader } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import type { JsonRecord } from '../../types/models'
import { asNumber, asString, formatMoney } from '../../utils/format'
import { getBrandImage } from '../../utils/favicon'

export function RankingTable({ title, data, subject }: { title: string; data: JsonRecord[]; subject: 'marca' | 'apresentadora' }) {
  const marcaColumns = [
    {
      key: 'nome',
      header: 'Marca',
      render: (item: JsonRecord) => {
        const name = asString(item.nome ?? item.marca_nome ?? item.cliente_nome)
        const img = getBrandImage(item)
        return (
          <span className="inline-flex min-w-40 items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-brand-soft text-[10px] font-black text-brand">
              {img ? <img src={img} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : name.slice(0, 2).toUpperCase()}
            </span>
            {name}
          </span>
        )
      },
    },
    { key: 'gmv', header: 'GMV mês', align: 'right' as const, render: (item: JsonRecord) => formatMoney(item.gmv_total ?? item.gmv ?? item.valor, true) },
    { key: 'lives', header: 'Lives mês', align: 'right' as const, render: (item: JsonRecord) => asNumber(item.lives ?? item.total_lives ?? item.qtd_lives).toLocaleString('pt-BR') },
  ]

  const apresentadoraColumns = [
    {
      key: 'nome',
      header: 'Apresentadora',
      render: (item: JsonRecord) => {
        const name = asString(item.nome ?? item.apresentadora_nome)
        const img = asString(item.foto_url ?? item.apresentadora_foto_url, '')
        return (
          <span className="inline-flex min-w-40 items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-brand-soft text-[10px] font-black text-brand">
              {img ? <img src={img} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : name.slice(0, 2).toUpperCase()}
            </span>
            {name}
          </span>
        )
      },
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
