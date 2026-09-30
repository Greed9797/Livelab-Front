import { CircleDollarSign, Receipt, TrendingUp, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { PeriodControl } from '../components/forms/PeriodControl'
import { MetricCard } from '../components/ui/MetricCard'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { ErrorState, LoadingState } from '../components/ui/States'
import { getClienteFinanceiro } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, currentPeriod, formatMoney, getRecord } from '../utils/format'
import { moneyMetric } from './page-helpers'
import { QK } from '../services/query-keys'

export function ClienteFinanceiroPage() {
  const [period, setPeriod] = useState(currentPeriod())
  const query = useQuery({ queryKey: QK.clienteFinanceiro(period), queryFn: () => getClienteFinanceiro(period) })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const resumo = getRecord(getRecord(query.data).resumo)
  const contrato = query.data && getRecord(query.data).contrato ? getRecord(getRecord(query.data).contrato) : null

  const metrics = [
    moneyMetric('GMV do mês', resumo.gmv_mes, 'lives publicadas', 'brand'),
    moneyMetric('Mensalidade fixa', resumo.mensalidade_fixa, 'contrato', 'neutral'),
    moneyMetric('Comissão variável', resumo.comissao_variavel, `${asNumber(resumo.comissao_pct).toLocaleString('pt-BR')}% do GMV`, 'info'),
    moneyMetric('Total devido', resumo.total_devido, 'fixa + comissão', 'success'),
  ]
  const icons = [CircleDollarSign, WalletCards, TrendingUp, Receipt]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cliente parceiro"
        accent="Financeiro"
        title="da loja"
        subtitle="Mensalidade fixa, comissão variável e total devido."
        actions={<PeriodControl period={period} onChange={setPeriod} />}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item, i) => <MetricCard key={item.label} metric={item} icon={icons[i]} />)}
      </section>

      <Card>
        <CardHeader>
          <p className="text-base font-bold text-ink">Regra do contrato</p>
        </CardHeader>
        <CardBody>
          {contrato ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div><p className="text-xs text-ink-muted">Pacote</p><p className="font-bold text-ink">{asString(contrato.pacote_nome, '—')}</p></div>
              <div><p className="text-xs text-ink-muted">Valor fixo</p><p className="font-bold text-ink">{formatMoney(contrato.valor_fixo)}</p></div>
              <div><p className="text-xs text-ink-muted">% comissão</p><p className="font-bold text-ink">{asNumber(contrato.comissao_pct).toLocaleString('pt-BR')}%</p></div>
              <div><p className="text-xs text-ink-muted">Horas (consumidas / contratadas)</p><p className="font-bold text-ink">{asNumber(contrato.horas_consumidas).toFixed(1)}h / {asNumber(contrato.horas_contratadas).toFixed(1)}h</p></div>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Nenhum contrato ativo encontrado.</p>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
