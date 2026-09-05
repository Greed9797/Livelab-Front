import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { PeriodControl } from '../components/forms/PeriodControl'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Badge, statusTone } from '../components/ui/Badge'
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States'
import { ClienteAnalyticsPanel } from '../components/cliente/ClienteAnalyticsPanel'
import { getClienteConteudoLives } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, currentPeriod, formatDate, formatMoney, getRecord } from '../utils/format'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'

type Tab = 'lives' | 'analytics'

export function ClienteConteudoPage() {
  const [period, setPeriod] = useState(currentPeriod())
  const [tab, setTab] = useState<Tab>('lives')

  const livesQuery = useQuery({
    queryKey: QK.clienteConteudoLives(period),
    queryFn: () => getClienteConteudoLives(period),
    enabled: tab === 'lives',
  })

  const lives = asArray<JsonRecord>(getRecord(livesQuery.data).lives)
  const resumo = getRecord(getRecord(livesQuery.data).resumo)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cliente parceiro"
        accent="Conteúdo"
        title="das lives"
        subtitle="Histórico publicado e analytics das lives realizadas."
        actions={tab === 'lives' ? <PeriodControl period={period} onChange={setPeriod} /> : undefined}
      />

      <div className="inline-flex rounded-full border border-line bg-surface p-1">
        {(['lives', 'analytics'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 ${tab === t ? 'bg-button-primary text-button-primary-foreground hover:bg-button-primary-hover' : 'text-ink-muted hover:text-ink'}`}
          >
            {t === 'lives' ? 'Lives realizadas' : 'Analytics'}
          </button>
        ))}
      </div>

      {tab === 'analytics' ? (
        <ClienteAnalyticsPanel />
      ) : livesQuery.isLoading ? (
        <LoadingState label="Carregando lives" />
      ) : livesQuery.isError ? (
        <ErrorState message={extractErrorMessage(livesQuery.error)} onRetry={() => livesQuery.refetch()} />
      ) : (
        <Card>
          <CardHeader>
            <p className="text-base font-bold text-ink">Lives publicadas</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {asNumber(resumo.lives).toLocaleString('pt-BR')} lives · GMV {formatMoney(resumo.gmv)} · {asNumber(resumo.pedidos).toLocaleString('pt-BR')} pedidos · {asNumber(resumo.horas).toFixed(1)}h
            </p>
          </CardHeader>
          <CardBody>
            {lives.length === 0 ? (
              <EmptyState title="Sem lives publicadas no mês" />
            ) : (
              <DataTable<JsonRecord>
                data={lives}
                columns={[
                  { key: 'iniciado_em', header: 'Data', render: (l) => formatDate(asString(l.iniciado_em, '')) },
                  { key: 'cabine_numero', header: 'Cabine', render: (l) => `Cabine ${asString(l.cabine_numero, '—')}` },
                  { key: 'apresentador_nome', header: 'Apresentador', render: (l) => asString(l.apresentador_nome, '—') },
                  { key: 'gmv', header: 'GMV', align: 'right', render: (l) => formatMoney(l.gmv) },
                  { key: 'pedidos', header: 'Pedidos', align: 'right', render: (l) => asNumber(l.pedidos).toLocaleString('pt-BR') },
                  { key: 'duracao_min', header: 'Duração', align: 'right', render: (l) => `${asNumber(l.duracao_min)} min` },
                  { key: 'status', header: 'Status', render: (l) => <Badge tone={statusTone(asString(l.status))}>{asString(l.status)}</Badge> },
                ]}
              />
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
