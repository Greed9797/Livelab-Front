import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ErrorState, LoadingState } from '../components/ui/States'
import { aprovarComissao, getComissoesPendentes, reprovarComissao } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asString, formatDate, formatMoney } from '../utils/format'
import type { JsonRecord } from '../types/models'

function diagnosticTone(code: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (code === 'pronta_para_aprovar') return 'success'
  if (['sem_apresentadora', 'sem_marca', 'sem_faixa_comissao', 'sem_vinculo_marca'].includes(code)) return 'danger'
  if (code === 'comissao_zero') return 'warning'
  return 'neutral'
}

function diagnosticAction(code: string): string {
  if (code === 'sem_apresentadora') return 'Vincule uma apresentadora à live.'
  if (code === 'sem_marca') return 'Vincule uma marca à venda.'
  if (code === 'sem_faixa_comissao') return 'Cadastre a faixa da apresentadora.'
  if (code === 'sem_vinculo_marca') return 'Cadastre o vínculo apresentadora-marca.'
  if (code === 'comissao_zero') return 'Revise a regra antes de aprovar.'
  return ''
}

export function ComissoesPendentesPage() {
  const [reprovarId, setReprovarId] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const client = useQueryClient()

  const query = useQuery({ queryKey: ['comissoes-pendentes'], queryFn: getComissoesPendentes })

  const aprovar = useMutation({
    mutationFn: (id: string) => aprovarComissao(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['comissoes-pendentes'] }),
  })

  const reprovar = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => reprovarComissao(id, motivo),
    onSuccess: () => {
      setReprovarId(null)
      setMotivo('')
      void client.invalidateQueries({ queryKey: ['comissoes-pendentes'] })
    },
  })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  const items: JsonRecord[] = query.data ?? []

  function handleAprovar(id: string) {
    void aprovar.mutate(id)
  }

  function handleReprovarSubmit(id: string) {
    if (!motivo.trim()) return
    void reprovar.mutate({ id, motivo: motivo.trim() })
  }

  function handleReprovarOpen(id: string) {
    setReprovarId(id)
    setMotivo('')
  }

  function handleReprovarCancel() {
    setReprovarId(null)
    setMotivo('')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comissões"
        accent="Aprovação"
        title="de comissões pendentes"
        subtitle="Revise e aprove ou reprove as comissões aguardando validação."
      />

      {items.length === 0 ? (
        <Card>
          <CardBody>
            <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-muted">
              Nenhuma comissão pendente.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <p className="text-base font-bold text-ink">Comissões pendentes</p>
            <p className="mt-1 text-xs text-ink-muted">{items.length} comissão{items.length !== 1 ? 'ões' : ''} aguardando aprovação.</p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Apresentadora</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Live</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">GMV</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">Comissão</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Status operacional</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Data</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((item) => {
                    const id = asString(item.id, '')
                    const isReprovarOpen = reprovarId === id
                    const isAprovarPending = aprovar.isPending && aprovar.variables === id
                    const isReprovarPending = reprovar.isPending && reprovar.variables?.id === id
                    const diagnostico = asString(item.diagnostico_operacional, 'pronta_para_aprovar')
                    const acaoCorrecao = diagnosticAction(diagnostico)

                    return (
                      <tr key={id} className="group hover:bg-surface-muted">
                        <td className="px-4 py-3 font-medium text-ink">
                          {asString(item.apresentadora_nome ?? item.apresentadora ?? item.nome_apresentadora)}
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {asString(item.live_titulo ?? item.live ?? item.titulo_live ?? item.live_id)}
                        </td>
                        <td className="num px-4 py-3 text-right text-ink">
                          {formatMoney(item.gmv)}
                        </td>
                        <td className="num px-4 py-3 text-right font-semibold text-ink">
                          {formatMoney(item.valor_comissao ?? item.comissao_apresentadora ?? item.comissao)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <Badge tone={diagnosticTone(diagnostico)}>{asString(item.diagnostico_label, diagnostico)}</Badge>
                            {acaoCorrecao ? <p className="text-[11px] text-ink-muted">{acaoCorrecao}</p> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {formatDate(asString(item.data ?? item.data_live ?? item.created_at, ''))}
                        </td>
                        <td className="px-4 py-3">
                          {isReprovarOpen ? (
                            <div className="flex flex-col gap-2">
                              <input
                                className="design-input h-9 w-full min-w-[200px] px-3 text-sm"
                                placeholder="Motivo da reprovação…"
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                autoFocus
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  disabled={isReprovarPending}
                                  onClick={handleReprovarCancel}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  variant="danger"
                                  icon={X}
                                  isLoading={isReprovarPending}
                                  disabled={!motivo.trim()}
                                  onClick={() => handleReprovarSubmit(id)}
                                >
                                  Confirmar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="danger"
                                icon={X}
                                disabled={isAprovarPending || aprovar.isPending || reprovar.isPending}
                                onClick={() => handleReprovarOpen(id)}
                              >
                                Reprovar
                              </Button>
                              <Button
                                icon={Check}
                                isLoading={isAprovarPending}
                                disabled={reprovar.isPending || (aprovar.isPending && !isAprovarPending)}
                                onClick={() => handleAprovar(id)}
                              >
                                Aprovar
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {(aprovar.isError || reprovar.isError) ? (
              <div className="border-t border-line px-4 py-3">
                <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
                  {extractErrorMessage(aprovar.error ?? reprovar.error)}
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
