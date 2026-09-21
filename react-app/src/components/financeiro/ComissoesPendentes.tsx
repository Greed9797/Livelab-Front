import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { useToast } from '../ui/Toast'
import { aprovarComissao, listComissoesPendentes, reprovarComissao } from '../../services/domain'
import { extractErrorMessage } from '../../services/api'
import { QK } from '../../services/query-keys'
import { canAprovarComissoes } from '../../utils/access'
import { asArray, asString, formatMoney } from '../../utils/format'
import type { JsonRecord } from '../../types/models'

type Pendente = {
  id: string
  marca: string
  apresentadora: string
  gmv: unknown
  comissaoApresentadora: unknown
  comissaoFranquia: unknown
  comissaoFranqueadora: unknown
  diagnostico: string
  label: string
}

function storedMoney(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string' && value.trim() === '') return '—'
  if (typeof value === 'number' && !Number.isFinite(value)) return '—'
  return formatMoney(value)
}

function countText(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return String(Number(value))
  return '—'
}

export function reprocessarSuccessMessage(data: JsonRecord | undefined): string {
  const row = data ?? {}
  return `${countText(row.orfas)} órfãs, ${countText(row.divergentes_gmv)} com GMV divergente, ${countText(row.ignoradas)} ignoradas.`
}

export function notifyReprocessar(
  push: (message: string, variant: 'success' | 'error') => void,
  outcome: { data?: JsonRecord; error?: unknown },
) {
  if (outcome.error !== undefined) {
    push(extractErrorMessage(outcome.error), 'error')
    return
  }
  push(reprocessarSuccessMessage(outcome.data), 'success')
}

function readPendente(row: JsonRecord): Pendente | null {
  const id = asString(row.id, '')
  if (!id) return null
  return {
    id,
    marca: asString(row.marca_nome),
    apresentadora: asString(row.apresentadora_nome),
    gmv: row.gmv,
    comissaoApresentadora: row.comissao_apresentadora,
    comissaoFranquia: row.comissao_franquia,
    comissaoFranqueadora: row.comissao_franqueadora,
    diagnostico: asString(row.diagnostico_operacional, ''),
    label: asString(row.diagnostico_label),
  }
}

function MoneyFact({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="num font-semibold text-ink">{storedMoney(value)}</dd>
    </div>
  )
}

export function ComissoesPendentes({ papel }: { papel?: string | null }) {
  const canApprove = canAprovarComissoes(papel)
  const toast = useToast()
  const client = useQueryClient()
  const [zeroDraft, setZeroDraft] = useState<Record<string, { checked: boolean; motivo: string }>>({})
  const [reprovarMotivo, setReprovarMotivo] = useState<Record<string, string>>({})

  const pendentes = useQuery({
    queryKey: QK.comissoesPendentes,
    queryFn: listComissoesPendentes,
    enabled: canApprove,
  })

  const aprovar = useMutation({
    mutationFn: ({ id, body }: { id: string; body: JsonRecord }) => aprovarComissao(id, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: QK.comissoesPendentes })
      void client.invalidateQueries({ queryKey: QK.comissoesMarcas })
      void client.invalidateQueries({ queryKey: QK.comissoesApresentadoras })
    },
    onError: (error) => toast.push(extractErrorMessage(error), 'error'),
  })

  const reprovar = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => reprovarComissao(id, { motivo }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: QK.comissoesPendentes })
      void client.invalidateQueries({ queryKey: QK.comissoesMarcas })
      void client.invalidateQueries({ queryKey: QK.comissoesApresentadoras })
    },
    onError: (error) => toast.push(extractErrorMessage(error), 'error'),
  })

  if (!canApprove) return null

  const rows = asArray<JsonRecord>(pendentes.data).map(readPendente).filter((row): row is Pendente => row !== null)

  return (
    <Card>
      <CardHeader>
        <p className="text-base font-bold text-ink">Pendentes</p>
        <p className="mt-1 text-xs text-ink-muted">Fila de aprovação. O valor gravado não muda nesta tela.</p>
      </CardHeader>
      <CardBody className="space-y-3">
        {pendentes.isLoading ? <LoadingState label="Carregando comissões pendentes" /> : null}
        {pendentes.isError ? <ErrorState message={extractErrorMessage(pendentes.error)} onRetry={() => void pendentes.refetch()} /> : null}
        {pendentes.isSuccess && rows.length === 0 ? <EmptyState title="Nenhuma comissão pendente" description="Não há linhas aguardando aprovação." /> : null}
        {rows.map((row) => {
          const zero = zeroDraft[row.id] ?? { checked: false, motivo: '' }
          const motivoZero = zero.motivo.trim()
          const zeroReady = zero.checked && motivoZero.length >= 3
          const motivoReprova = (reprovarMotivo[row.id] ?? '').trim()
          const podeAprovar = row.diagnostico === 'pronta_para_aprovar' || row.diagnostico === 'comissao_zero'
          return (
            <article key={row.id} aria-label={`pendente ${row.id}`} className="rounded-2xl border border-line bg-surface-muted p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{row.marca}</p>
                  <p className="text-sm text-ink-muted">{row.apresentadora}</p>
                </div>
                <p className="text-sm font-semibold text-ink">{row.label}</p>
              </div>
              <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                <MoneyFact label="GMV" value={row.gmv} />
                <MoneyFact label="Apresentadora" value={row.comissaoApresentadora} />
                <MoneyFact label="Franquia" value={row.comissaoFranquia} />
                <MoneyFact label="Franqueadora" value={row.comissaoFranqueadora} />
              </dl>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                {row.diagnostico === 'comissao_zero' ? (
                  <div className="grid min-w-[16rem] flex-1 gap-2">
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={zero.checked}
                        onChange={(event) => setZeroDraft((current) => ({ ...current, [row.id]: { ...zero, checked: event.target.checked } }))}
                      />
                      Confirmo comissão zero
                    </label>
                    <label className="grid gap-1 text-sm font-semibold text-ink">
                      Motivo
                      <input
                        className="design-input h-11 w-full px-4"
                        value={zero.motivo}
                        onChange={(event) => setZeroDraft((current) => ({ ...current, [row.id]: { ...zero, motivo: event.target.value } }))}
                      />
                    </label>
                  </div>
                ) : null}
                {podeAprovar ? (
                  <Button
                    type="button"
                    disabled={row.diagnostico === 'comissao_zero' ? !zeroReady || aprovar.isPending : aprovar.isPending}
                    onClick={() => {
                      if (row.diagnostico === 'comissao_zero') {
                        if (!zeroReady) return
                        aprovar.mutate({ id: row.id, body: { confirmar_zero: true, motivo: motivoZero } })
                        return
                      }
                      aprovar.mutate({ id: row.id, body: {} })
                    }}
                  >
                    Aprovar
                  </Button>
                ) : null}
                <label className="grid min-w-[12rem] flex-1 gap-1 text-sm font-semibold text-ink">
                  Motivo da reprovação
                  <input
                    className="design-input h-11 w-full px-4"
                    value={reprovarMotivo[row.id] ?? ''}
                    onChange={(event) => setReprovarMotivo((current) => ({ ...current, [row.id]: event.target.value }))}
                  />
                </label>
                <Button
                  type="button"
                  variant="danger"
                  disabled={motivoReprova.length < 3 || reprovar.isPending}
                  onClick={() => {
                    if (motivoReprova.length < 3) return
                    reprovar.mutate({ id: row.id, motivo: motivoReprova })
                  }}
                >
                  Reprovar
                </Button>
              </div>
            </article>
          )
        })}
      </CardBody>
    </Card>
  )
}
