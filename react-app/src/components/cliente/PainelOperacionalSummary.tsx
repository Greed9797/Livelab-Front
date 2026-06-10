import { AlertTriangle, TrendingUp } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { MetricCard } from '../ui/MetricCard'
import { asArray, asNumber, asString, getRecord } from '../../utils/format'
import {
  formatMoneyOrNI,
  gmvPorHoraHint,
  gmvPorHoraTone,
  operacionalStatusLabel,
  operacionalStatusTone,
} from '../../utils/operacional'
import { metric } from '../../pages/page-helpers'
import type { JsonRecord, Metric } from '../../types/models'

interface Props {
  /** Resposta bruta de GET /cliente/operacional */
  data: JsonRecord
}

export function PainelOperacionalSummary({ data }: Props) {
  const config = getRecord(data.config)
  const metricas = getRecord(data.metricas)
  const status = getRecord(data.status)
  const funil = getRecord(metricas.funil)
  const alertas = asArray<JsonRecord>(data.alertas)

  const statusVal = asString(status.status, 'dados_incompletos')
  const motivos = asArray<string>(status.motivos)
  const diagnostico = status.diagnostico !== null && status.diagnostico !== undefined
    ? asString(status.diagnostico, '')
    : null
  const proximaAcao = status.proxima_acao !== null && status.proxima_acao !== undefined
    ? asString(status.proxima_acao, '')
    : null

  const metaGmvHora = config.meta_gmv_hora !== undefined ? config.meta_gmv_hora : null
  const pctMeta = metricas.pct_meta_hora !== undefined ? metricas.pct_meta_hora : null

  const gmvPorHoraValue = metricas.gmv_por_hora !== null && metricas.gmv_por_hora !== undefined
    ? formatMoneyOrNI(metricas.gmv_por_hora)
    : 'não informado'

  const metrics: Metric[] = [
    metric('Horas de live', metricas.horas_live !== null && metricas.horas_live !== undefined
      ? asNumber(metricas.horas_live).toFixed(1)
      : 'não informado', 'no período', 'neutral'),
    metric('GMV', metricas.gmv !== null && metricas.gmv !== undefined
      ? formatMoneyOrNI(metricas.gmv)
      : 'não informado', 'atribuído às lives', 'brand'),
    {
      label: 'GMV / hora',
      value: gmvPorHoraValue,
      hint: gmvPorHoraHint(pctMeta, metaGmvHora),
      tone: pctMeta !== null && pctMeta !== undefined
        ? gmvPorHoraTone(pctMeta)
        : ('neutral' as const),
    },
    metric('Comissão Livelab', formatMoneyOrNI(
      metricas.comissao_livelab_total !== undefined ? metricas.comissao_livelab_total : null,
    ), 'total do período', 'info'),
    metric('Comissão apresentadora', formatMoneyOrNI(
      metricas.comissao_apresentadora_total !== undefined ? metricas.comissao_apresentadora_total : null,
    ), 'total do período', 'neutral'),
    metric('Comissão / hora', formatMoneyOrNI(
      metricas.comissao_por_hora !== undefined ? metricas.comissao_por_hora : null,
    ), 'custo por hora operada', 'neutral'),
  ]

  const funilMetrics = [
    metric('Views', funil.views !== null && funil.views !== undefined
      ? asNumber(funil.views).toLocaleString('pt-BR')
      : 'não informado', 'impressões totais', 'neutral'),
    metric('Cliques', funil.clicks !== null && funil.clicks !== undefined
      ? asNumber(funil.clicks).toLocaleString('pt-BR')
      : 'não informado', 'engajamento', 'info'),
    metric('Pedidos', funil.pedidos !== null && funil.pedidos !== undefined
      ? asNumber(funil.pedidos).toLocaleString('pt-BR')
      : 'não informado', 'conversões', 'success'),
  ]

  return (
    <div className="space-y-6">
      {/* Status geral */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-bold text-ink">Status operacional</p>
            <Badge tone={operacionalStatusTone(statusVal)}>
              {operacionalStatusLabel(statusVal)}
            </Badge>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {motivos.length > 0 ? (
              <ul className="space-y-1.5">
                {motivos.map((motivo, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-ink-muted">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--warning)]" />
                    {motivo}
                  </li>
                ))}
              </ul>
            ) : null}
            {diagnostico ? (
              <p className="text-sm text-ink-muted">
                <span className="font-semibold text-ink">Diagnóstico: </span>
                {diagnostico}
              </p>
            ) : null}
            {proximaAcao ? (
              <p className="text-sm text-ink-muted">
                <span className="font-semibold text-ink">Próxima ação: </span>
                {proximaAcao}
              </p>
            ) : null}
            {motivos.length === 0 && !diagnostico && !proximaAcao ? (
              <p className="text-sm text-ink-muted">Sem observações no período.</p>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* Métricas principais */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((item) => (
          <MetricCard key={item.label} metric={item} icon={TrendingUp} />
        ))}
      </section>

      {/* Funil de conversão */}
      <Card>
        <CardHeader>
          <p className="text-sm font-bold text-ink">Funil de conversão</p>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-3">
            {funilMetrics.map((item) => (
              <MetricCard key={item.label} metric={item} />
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Alertas de sessões */}
      {alertas.length > 0 ? (
        <Card>
          <CardHeader>
            <p className="text-sm font-bold text-ink">
              Alertas de sessões
              <span className="ml-2 text-xs font-normal text-ink-muted">({alertas.length})</span>
            </p>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-line">
              {alertas.map((alerta, index) => (
                <li key={asString(alerta.live_id, String(index))} className="flex items-start gap-3 px-5 py-3.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {asString(alerta.descricao, 'Alerta sem descrição')}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {asString(alerta.tipo, '')}
                      {alerta.data ? ` · ${asString(alerta.data, '')}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
