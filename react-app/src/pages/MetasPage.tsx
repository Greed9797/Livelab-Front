import { Save, Target, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/States'
import {
  getMetasApresentadoras,
  getMetaSupervisor,
  upsertMetaApresentadora,
  upsertMetaSupervisor,
} from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, formatMoney, formatPercent } from '../utils/format'
import type { JsonRecord } from '../types/models'

function currentMes() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function MetasPage() {
  const [mes, setMes] = useState(currentMes())
  const [editingMeta, setEditingMeta] = useState<Record<string, string>>({})
  const [editingSuper, setEditingSuper] = useState('')
  const client = useQueryClient()

  const metasQuery = useQuery({
    queryKey: ['metas-apresentadoras', mes],
    queryFn: () => getMetasApresentadoras(mes),
  })

  const supervisorQuery = useQuery({
    queryKey: ['meta-supervisor', mes],
    queryFn: () => getMetaSupervisor(mes),
  })

  const metaMutation = useMutation({
    mutationFn: ({ id, gmv_meta }: { id: string; gmv_meta: number }) =>
      upsertMetaApresentadora(id, mes, { gmv_meta }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['metas-apresentadoras', mes] })
      void client.invalidateQueries({ queryKey: ['meta-supervisor', mes] })
    },
  })

  const superMutation = useMutation({
    mutationFn: (gmv_meta_total: number) =>
      upsertMetaSupervisor(mes, { gmv_meta_total, calculado_automaticamente: false }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['meta-supervisor', mes] }),
  })

  function saveMeta(id: string) {
    const val = asNumber(editingMeta[id])
    metaMutation.mutate({ id, gmv_meta: val })
    setEditingMeta((v) => { const n = { ...v }; delete n[id]; return n })
  }

  const items = metasQuery.data ?? []
  const supervisor = supervisorQuery.data as JsonRecord | undefined

  const gmvMetaTotal = asNumber(supervisor?.gmv_meta_total)
  const gmvRealizado = asNumber(supervisor?.gmv_realizado)
  const pctSupervisor = gmvMetaTotal > 0 ? (gmvRealizado / gmvMetaTotal) * 100 : 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacional"
        accent="Metas"
        title="mensais"
        subtitle="Defina e acompanhe as metas de GMV de cada apresentadora e o consolidado do mês."
        actions={
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-ink-muted">Mês</label>
            <input
              type="month"
              className="design-input h-10 px-3 text-sm"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            />
          </div>
        }
      />

      {/* Meta do supervisor */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand">
              <Target className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Meta consolidada do mês</p>
              <p className="text-xs text-ink-muted">
                {supervisor?.calculado_automaticamente ? 'Calculada automaticamente como soma das metas das apresentadoras' : 'Definida manualmente'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {supervisorQuery.isLoading ? <LoadingState /> : (
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-ink-muted">Meta do mês</p>
                  <p className="mt-1 text-2xl font-extrabold text-ink">{formatMoney(gmvMetaTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">GMV realizado</p>
                  <p className="mt-1 text-2xl font-extrabold text-ink">{formatMoney(gmvRealizado)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">% atingido</p>
                  <p className={`mt-1 text-2xl font-extrabold ${pctSupervisor >= 100 ? 'text-[var(--success)]' : pctSupervisor >= 70 ? 'text-brand' : 'text-ink'}`}>
                    {formatPercent(pctSupervisor)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="design-input h-10 w-40 px-3 text-sm"
                  placeholder="Meta manual"
                  value={editingSuper}
                  onChange={(e) => setEditingSuper(e.target.value)}
                />
                <Button
                  icon={Save}
                  isLoading={superMutation.isPending}
                  disabled={!editingSuper}
                  onClick={() => { superMutation.mutate(asNumber(editingSuper)); setEditingSuper('') }}
                >
                  Salvar meta
                </Button>
              </div>
            </div>
          )}
          {/* Barra de progresso */}
          {!supervisorQuery.isLoading && gmvMetaTotal > 0 ? (
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${Math.min(pctSupervisor, 100)}%` }}
              />
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* Metas por apresentadora */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand" />
            <p className="text-sm font-bold text-ink">Metas por apresentadora</p>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {metasQuery.isLoading ? <div className="p-6"><LoadingState /></div> : null}
          {metasQuery.isError ? <div className="p-6"><ErrorState message={extractErrorMessage(metasQuery.error)} onRetry={() => void metasQuery.refetch()} /></div> : null}
          {!metasQuery.isLoading && !metasQuery.isError ? (
            <div className="divide-y divide-line">
              {items.map((item) => {
                const id = asString(item.id)
                const isEditing = id in editingMeta
                const gmvMeta = asNumber(item.gmv_meta)
                const gmvRealiz = asNumber(item.gmv_realizado)
                const pct = gmvMeta > 0 ? Math.min((gmvRealiz / gmvMeta) * 100, 100) : 0
                return (
                  <div key={id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:gap-6">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">{asString(item.nome)}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        Fixo mensal: {formatMoney(item.valor_fixo_mensal)} · Ganho estimado: <span className="font-semibold text-ink">{formatMoney(item.ganho_estimado)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="text-xs text-ink-muted">Realizado</p>
                        <p className="font-semibold text-ink">{formatMoney(gmvRealiz)}</p>
                      </div>
                      <div className="w-24">
                        <div className="mb-1 flex justify-between text-xs text-ink-muted">
                          <span>Meta</span>
                          <span className={pct >= 100 ? 'font-bold text-[var(--success)]' : ''}>{formatPercent(pct)}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            type="number"
                            min="0"
                            step="0.01"
                            className="design-input h-9 w-32 px-3 text-sm"
                            value={editingMeta[id]}
                            onChange={(e) => setEditingMeta((v) => ({ ...v, [id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && saveMeta(id)}
                          />
                          <Button icon={Save} onClick={() => saveMeta(id)} isLoading={metaMutation.isPending}>OK</Button>
                          <Button variant="secondary" onClick={() => setEditingMeta((v) => { const n = { ...v }; delete n[id]; return n })}>×</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs text-ink-muted">Meta</p>
                            <p className="font-semibold text-ink">{gmvMeta > 0 ? formatMoney(gmvMeta) : <span className="text-ink-muted">—</span>}</p>
                          </div>
                          <Button
                            variant="secondary"
                            onClick={() => setEditingMeta((v) => ({ ...v, [id]: String(gmvMeta || '') }))}
                          >
                            Editar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {items.length === 0 ? (
                <div className="py-12 text-center text-sm text-ink-muted">Nenhuma apresentadora ativa encontrada.</div>
              ) : null}
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  )
}
