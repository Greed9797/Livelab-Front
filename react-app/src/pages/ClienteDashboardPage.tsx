import { Clock, CircleDollarSign, MonitorPlay, Radio, ShoppingBag, TrendingUp, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { PeriodControl } from '../components/forms/PeriodControl'
import { MetricCard } from '../components/ui/MetricCard'
import { AreaPanel } from '../components/charts/Charts'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { ErrorState, LoadingState } from '../components/ui/States'
import { PainelOperacionalSummary } from '../components/cliente/PainelOperacionalSummary'
import { SessoesLiveTable } from '../components/cliente/SessoesLiveTable'
import { getClienteHome, getClienteOperacionalPainel } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, currentPeriod, formatMoney, getRecord } from '../utils/format'
import { metric, moneyMetric } from './page-helpers'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'

const icons = [CircleDollarSign, MonitorPlay, Clock, ShoppingBag, TrendingUp, WalletCards]

function spTime(iso: unknown): string {
  const raw = asString(iso, '')
  const m = raw.match(/T(\d{2}:\d{2})/)
  return m ? m[1] : '—'
}

export function ClienteDashboardPage() {
  const [period, setPeriod] = useState(currentPeriod())
  const query = useQuery({ queryKey: QK.clienteHome(period), queryFn: () => getClienteHome(period), refetchInterval: 30_000 })
  const operacionalQuery = useQuery({
    queryKey: QK.clienteOperacionalPainel(period),
    queryFn: () => getClienteOperacionalPainel(period),
  })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const raw = getRecord(query.data)
  const fin = getRecord(raw.financeiro_cliente)
  const contrato = raw.contrato ? getRecord(raw.contrato) : null
  const liveNow = asArray<JsonRecord>(raw.live_now)
  const proximas = asArray<JsonRecord>(raw.proximas_lives_dia)
  const series = asArray<JsonRecord>(raw.series_mensais).map((r) => ({ label: asString(r.mes), value: asNumber(r.gmv) }))

  const metrics = [
    moneyMetric('GMV do mês', raw.gmv_mes, 'lives publicadas', 'brand'),
    metric('Lives publicadas', asNumber(raw.lives_mes).toLocaleString('pt-BR'), 'realizadas no mês', 'neutral'),
    metric('Horas de live', asNumber(raw.horas_live_mes).toFixed(1), 'no mês', 'neutral'),
    metric('Pedidos', asNumber(raw.pedidos).toLocaleString('pt-BR'), 'atribuídos', 'success'),
    moneyMetric('GMV / live', raw.gmv_por_live, 'GMV / lives', 'info'),
    moneyMetric('GMV / hora', raw.gmv_por_hora, 'GMV / horas', 'success'),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cliente parceiro"
        accent="Home"
        title="da loja"
        subtitle="Resultados das lives publicadas, consumo de horas e financeiro do mês."
        actions={<PeriodControl period={period} onChange={setPeriod} />}
      />

      {liveNow.length > 0 ? (
        <Card className="border-brand/30">
          <CardBody className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge tone="success">ao vivo</Badge>
              <p className="mt-3 text-xl font-bold text-ink">Cabine {asString(liveNow[0].cabine_numero, '—')}</p>
              <p className="mt-1 text-sm text-ink-muted">Live em andamento</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-card)]">
                <p className="text-xs text-ink-muted">GMV</p>
                <p className="font-bold text-ink">{formatMoney(liveNow[0].gmv)}</p>
              </div>
              <div className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-card)]">
                <p className="text-xs text-ink-muted">Pedidos</p>
                <p className="font-bold text-ink">{asNumber(liveNow[0].pedidos).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((item, index) => <MetricCard key={item.label} metric={item} icon={icons[index]} />)}
      </section>

      {/* Financeiro do mês: mensalidade fixa + comissão variável */}
      <Card>
        <CardHeader>
          <p className="text-base font-bold text-ink">Financeiro do mês</p>
          <p className="mt-0.5 text-xs text-ink-muted">Mensalidade fixa + comissão variável sobre o GMV.</p>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">Mensalidade fixa</p>
              <p className="num mt-1 text-2xl font-black text-ink">{formatMoney(fin.valor_fixo)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">Comissão variável</p>
              <p className="num mt-1 text-2xl font-black text-ink">{formatMoney(fin.comissao_variavel)}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{asNumber(fin.comissao_pct).toLocaleString('pt-BR')}% do GMV</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">Total devido</p>
              <p className="num mt-1 text-2xl font-black text-brand">{formatMoney(fin.total_devido)}</p>
            </div>
          </div>
          {contrato ? (
            <p className="mt-4 border-t border-line pt-3 text-xs text-ink-muted">
              Pacote {asString(contrato.pacote_nome, '—')} · {asNumber(contrato.horas_consumidas).toFixed(1)}h de {asNumber(contrato.horas_contratadas).toFixed(1)}h consumidas · {asNumber(contrato.horas_restantes).toFixed(1)}h restantes
            </p>
          ) : null}
        </CardBody>
      </Card>

      {series.length > 0 ? <AreaPanel title="Evolução mensal de GMV" data={series} /> : null}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-ink-muted" />
            <p className="text-base font-bold text-ink">Próximas lives de hoje</p>
          </div>
        </CardHeader>
        <CardBody>
          {proximas.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-muted">Nenhuma live agendada para hoje.</p>
          ) : (
            <ul className="space-y-2">
              {proximas.map((p) => (
                <li key={asString(p.id)} className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
                  <span className="text-sm font-bold text-ink">Cabine {asString(p.cabine_numero, '—')}</span>
                  <span className="num text-sm text-ink-muted">{spTime(p.data_inicio)} – {spTime(p.data_fim)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* ── Painel Operacional ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-base font-bold text-ink">Painel operacional</p>
        <p className="text-xs text-ink-muted">Desempenho detalhado, comissões e indicadores por sessão de live.</p>
      </div>

      {operacionalQuery.isLoading ? (
        <LoadingState label="Carregando painel operacional" />
      ) : operacionalQuery.isError ? (
        <ErrorState
          message={extractErrorMessage(operacionalQuery.error)}
          onRetry={() => void operacionalQuery.refetch()}
        />
      ) : operacionalQuery.data ? (
        <PainelOperacionalSummary data={getRecord(operacionalQuery.data)} />
      ) : null}

      <SessoesLiveTable key={`${period.ano}-${period.mes}`} period={period} />
    </div>
  )
}
