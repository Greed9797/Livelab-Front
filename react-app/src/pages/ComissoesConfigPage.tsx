import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { ErrorState, LoadingState } from '../components/ui/States'
import {
  getApresentadoraFaixasComissao,
  getApresentadoras,
  getMarcas,
} from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, formatMoney } from '../utils/format'
import type { JsonRecord } from '../types/models'

type Tab = 'marca' | 'faixa'

type VinculoStatus = 'ok' | 'sem_pct' | 'sem_video' | 'sem_vinculo'

function vinculoTone(status: VinculoStatus): 'success' | 'warning' | 'danger' {
  if (status === 'ok') return 'success'
  if (status === 'sem_vinculo') return 'danger'
  return 'warning'
}

function vinculoLabel(status: VinculoStatus): string {
  if (status === 'ok') return 'Vínculo OK'
  if (status === 'sem_vinculo') return 'Sem vínculo'
  if (status === 'sem_video') return 'Sem % vídeo'
  return 'Sem % live'
}

function classifyVinculo(vinculo?: JsonRecord): VinculoStatus {
  if (!vinculo) return 'sem_vinculo'
  const live = asNumber(vinculo.comissao_live_pct)
  const video = asNumber(vinculo.comissao_video_pct)
  if (live <= 0 && video <= 0) return 'sem_vinculo'
  if (live <= 0) return 'sem_pct'
  if (video <= 0) return 'sem_video'
  return 'ok'
}

export function ComissoesConfigPage() {
  const [tab, setTab] = useState<Tab>('marca')

  const marcasQuery = useQuery({ queryKey: ['marcas', { include: 'apresentadoras' }], queryFn: () => getMarcas({ include: 'apresentadoras' }) })
  const apresentadorasQuery = useQuery({ queryKey: ['apresentadoras'], queryFn: getApresentadoras })

  const apresentadoras = useMemo(() => asArray<JsonRecord>(apresentadorasQuery.data), [apresentadorasQuery.data])

  const faixasQueries = useQueries({
    queries: apresentadoras.map((ap) => ({
      queryKey: ['apresentadora-faixas', asString(ap.id)],
      queryFn: () => getApresentadoraFaixasComissao(asString(ap.id)),
      enabled: tab === 'faixa' && Boolean(asString(ap.id)),
      staleTime: 60_000,
    })),
  })

  if (marcasQuery.isLoading || apresentadorasQuery.isLoading) return <LoadingState />
  if (marcasQuery.isError) return <ErrorState message={extractErrorMessage(marcasQuery.error)} onRetry={() => void marcasQuery.refetch()} />
  if (apresentadorasQuery.isError) return <ErrorState message={extractErrorMessage(apresentadorasQuery.error)} onRetry={() => void apresentadorasQuery.refetch()} />

  const marcas = asArray<JsonRecord>(marcasQuery.data)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comissões"
        accent="Configuração"
        title="de comissões da apresentadora"
        subtitle="Diagnóstico de vínculos por marca e faixas de GMV. Edite em Configurações."
      />

      <div className="flex gap-2 border-b border-line">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-semibold ${tab === 'marca' ? 'border-b-2 border-brand text-ink' : 'text-ink-muted'}`}
          onClick={() => setTab('marca')}
        >
          Por marca
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-semibold ${tab === 'faixa' ? 'border-b-2 border-brand text-ink' : 'text-ink-muted'}`}
          onClick={() => setTab('faixa')}
        >
          Por faixa GMV
        </button>
      </div>

      {tab === 'marca' ? (
        <Card>
          <CardHeader>
            <p className="text-base font-bold text-ink">Vínculos apresentadora × marca</p>
            <p className="mt-1 text-xs text-ink-muted">% live e % vídeo definidos no cadastro de clientes e marcas em <Link className="text-brand underline" to="/comercial">Comercial</Link>.</p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Marca</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Apresentadora</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">% Live</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">% Vídeo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {marcas.flatMap((marca) => {
                    const vinculos = asArray<JsonRecord>(marca.apresentadoras ?? marca.apresentadora_marcas)
                    if (vinculos.length === 0) {
                      const status: VinculoStatus = 'sem_vinculo'
                      return [(
                        <tr key={`marca-${asString(marca.id)}-empty`}>
                          <td className="px-4 py-3 font-medium text-ink">{asString(marca.nome)}</td>
                          <td className="px-4 py-3 text-ink-muted italic">Nenhuma apresentadora vinculada</td>
                          <td className="num px-4 py-3 text-right text-ink-muted">—</td>
                          <td className="num px-4 py-3 text-right text-ink-muted">—</td>
                          <td className="px-4 py-3"><Badge tone={vinculoTone(status)}>{vinculoLabel(status)}</Badge></td>
                        </tr>
                      )]
                    }
                    return vinculos.map((v) => {
                      const status = classifyVinculo(v)
                      return (
                        <tr key={`marca-${asString(marca.id)}-${asString(v.apresentadora_id ?? v.id)}`}>
                          <td className="px-4 py-3 font-medium text-ink">{asString(marca.nome)}</td>
                          <td className="px-4 py-3 text-ink">{asString(v.apresentadora_nome ?? v.nome)}</td>
                          <td className="num px-4 py-3 text-right text-ink">{asNumber(v.comissao_live_pct).toFixed(2)}%</td>
                          <td className="num px-4 py-3 text-right text-ink">{asNumber(v.comissao_video_pct).toFixed(2)}%</td>
                          <td className="px-4 py-3"><Badge tone={vinculoTone(status)}>{vinculoLabel(status)}</Badge></td>
                        </tr>
                      )
                    })
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <p className="text-base font-bold text-ink">Faixas de comissão por GMV</p>
            <p className="mt-1 text-xs text-ink-muted">Sem faixa → comissão variável fica 0. Edite em <Link className="text-brand underline" to="/configuracoes?tab=usuarios">Configurações → Usuários</Link>.</p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Apresentadora</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">GMV início</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">GMV fim</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">% Comissão</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {apresentadoras.flatMap((ap, idx) => {
                    const faixasQ = faixasQueries[idx]
                    const faixas = asArray<JsonRecord>(faixasQ?.data)
                    if (faixasQ?.isLoading) {
                      return [(
                        <tr key={`fx-${asString(ap.id)}-loading`}>
                          <td className="px-4 py-3 font-medium text-ink">{asString(ap.nome ?? ap.email)}</td>
                          <td colSpan={4} className="px-4 py-3 text-ink-muted italic">carregando…</td>
                        </tr>
                      )]
                    }
                    if (faixas.length === 0) {
                      return [(
                        <tr key={`fx-${asString(ap.id)}-none`}>
                          <td className="px-4 py-3 font-medium text-ink">{asString(ap.nome ?? ap.email)}</td>
                          <td colSpan={3} className="px-4 py-3 text-ink-muted italic">Nenhuma faixa cadastrada</td>
                          <td className="px-4 py-3"><Badge tone="danger">Sem faixa</Badge></td>
                        </tr>
                      )]
                    }
                    return faixas.map((fx) => (
                      <tr key={`fx-${asString(ap.id)}-${asString(fx.id)}`}>
                        <td className="px-4 py-3 font-medium text-ink">{asString(ap.nome ?? ap.email)}</td>
                        <td className="num px-4 py-3 text-right text-ink">{formatMoney(fx.gmv_inicio)}</td>
                        <td className="num px-4 py-3 text-right text-ink">{fx.gmv_fim == null ? '∞' : formatMoney(fx.gmv_fim)}</td>
                        <td className="num px-4 py-3 text-right text-ink">{asNumber(fx.comissao_pct).toFixed(2)}%</td>
                        <td className="px-4 py-3"><Badge tone={fx.ativo === false ? 'warning' : 'success'}>{fx.ativo === false ? 'Inativa' : 'Ativa'}</Badge></td>
                      </tr>
                    ))
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <p className="text-xs text-ink-muted">
            <strong>Regras:</strong> sábado/domingo (timezone São Paulo) sempre paga <strong>2% fixo</strong> de comissão da apresentadora, ignorando vínculo e faixa.
            Em dias úteis, o sistema usa primeiro a <strong>faixa</strong> da apresentadora pelo GMV mensal acumulado;
            se não houver faixa, cai no <strong>% do vínculo apresentadora-marca</strong>. Sem faixa nem vínculo em live → mínimo de 0,5% do GMV; em vídeo → comissão = 0.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
