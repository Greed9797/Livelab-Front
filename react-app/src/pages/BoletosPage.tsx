import { AlertTriangle, Check, Copy, ExternalLink, RefreshCcw, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge, statusTone } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { getBoletoAlertas, getBoletoDetalhe, getBoletos, marcarBoletoPago, marcarBoletoVisto } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { useCurrentUser } from '../stores/auth-store'
import { asString, formatDate, formatMoney } from '../utils/format'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'

const writeRoles = new Set(['franqueador_master', 'franqueado', 'gerente', 'financeiro'])

function boletoStatus(item: JsonRecord): string {
  const status = asString(item.status, '').toLowerCase()
  if (status && status !== 'pendente') return status
  const vencimento = asString(item.vencimento, '')
  if (vencimento && new Date(vencimento) < new Date(new Date().toISOString().slice(0, 10))) return 'vencido'
  return status || 'pendente'
}

function copyText(value: unknown) {
  const text = asString(value, '')
  if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return
  void navigator.clipboard.writeText(text)
}

export function BoletosPanel({ embedded = false }: { embedded?: boolean }) {
  const user = useCurrentUser()
  const canWrite = writeRoles.has(user?.papel ?? '')
  const [selectedId, setSelectedId] = useState('')
  const client = useQueryClient()

  const boletosQuery = useQuery({ queryKey: QK.boletos, queryFn: getBoletos })
  const alertaQuery = useQuery({ queryKey: QK.boletoAlertas, queryFn: getBoletoAlertas })
  const detalheQuery = useQuery({
    queryKey: QK.boletoDetalhe(selectedId),
    queryFn: () => getBoletoDetalhe(selectedId),
    enabled: Boolean(selectedId),
  })
  const vistoMutation = useMutation({
    mutationFn: marcarBoletoVisto,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: QK.boletoAlertas })
      void client.invalidateQueries({ queryKey: QK.boletos })
    },
  })
  const pagoMutation = useMutation({
    mutationFn: marcarBoletoPago,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: QK.boletos })
      void client.invalidateQueries({ queryKey: QK.boletoDetalhe('') })
    },
  })

  const boletos = useMemo(() => boletosQuery.data ?? [], [boletosQuery.data])

  useEffect(() => {
    if (!selectedId && boletos[0]?.id) setSelectedId(asString(boletos[0].id, ''))
  }, [boletos, selectedId])

  if (boletosQuery.isLoading || alertaQuery.isLoading) return <LoadingState />
  if (boletosQuery.isError) return <ErrorState message={extractErrorMessage(boletosQuery.error)} onRetry={() => void boletosQuery.refetch()} />
  if (alertaQuery.isError) return <ErrorState message={extractErrorMessage(alertaQuery.error)} onRetry={() => void alertaQuery.refetch()} />

  const pendentes = boletos.filter((item) => boletoStatus(item) === 'pendente')
  const vencidos = boletos.filter((item) => boletoStatus(item) === 'vencido')
  const pagos = boletos.filter((item) => boletoStatus(item) === 'pago')
  const detalhe = detalheQuery.data
  const alerta = alertaQuery.data

  return (
    <div className="space-y-6">
      {!embedded ? (
        <PageHeader
          eyebrow="Financeiro"
          accent="Boletos"
          title="e cobranças"
          subtitle="Lista de cobranças, status de vencimento, link do gateway e ações permitidas por papel."
          actions={
            <Button variant="secondary" icon={RefreshCcw} onClick={() => {
              void boletosQuery.refetch()
              void alertaQuery.refetch()
            }}>
              Atualizar
            </Button>
          }
        />
      ) : null}

      {alerta ? (
        <Card className="border-[var(--warning)]/35 bg-[var(--warning-soft)]">
          <CardBody className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface text-[var(--warning)]">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-ink">Novo boleto pendente</p>
                <p className="mt-1 text-sm text-ink-muted">{formatMoney(alerta.valor)} com vencimento em {formatDate(asString(alerta.vencimento, ''))}</p>
              </div>
            </div>
            <Button variant="secondary" icon={Check} isLoading={vistoMutation.isPending} onClick={() => void vistoMutation.mutate(asString(alerta.id, ''))}>
              Marcar como visto
            </Button>
          </CardBody>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total', boletos.length, 'cobranças listadas', 'neutral'],
          ['Pendentes', pendentes.length, 'aguardando pagamento', 'warning'],
          ['Vencidos', vencidos.length, 'precisam de cobrança', 'danger'],
          ['Pagos', pagos.length, 'baixas confirmadas', 'success'],
        ].map(([label, value, hint, tone]) => (
          <Card key={String(label)} className={tone === 'danger' ? 'border-[var(--danger)]/25' : undefined}>
            <CardBody className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
              <p className="num mt-3 text-[34px] font-bold leading-none text-ink">{value}</p>
              <p className="mt-2 text-xs text-ink-muted">{hint}</p>
            </CardBody>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <p className="text-base font-bold text-ink">Lista de boletos</p>
          </CardHeader>
          <CardBody className="space-y-3">
            {boletos.length === 0 ? <EmptyState title="Nenhum boleto encontrado" description="Quando o backend gerar cobranças, elas aparecerão aqui." /> : null}
            {boletos.map((item) => {
              const id = asString(item.id, '')
              const status = boletoStatus(item)
              const selected = id === selectedId
              return (
                <button
                  key={id}
                  type="button"
                  className={selected ? 'w-full rounded-2xl border border-brand bg-brand-soft p-4 text-left' : 'w-full rounded-2xl border border-line bg-surface-muted p-4 text-left transition hover:border-brand/35'}
                  onClick={() => setSelectedId(id)}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{asString(item.tipo, 'Boleto')} {asString(item.competencia, '')}</p>
                      <p className="mt-1 text-sm text-ink-muted">Vence em {formatDate(asString(item.vencimento, ''))}</p>
                    </div>
                    <div className="flex items-center gap-3 md:justify-end">
                      <p className="num font-bold text-ink">{formatMoney(item.valor)}</p>
                      <Badge tone={statusTone(status)}>{status}</Badge>
                    </div>
                  </div>
                </button>
              )
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-base font-bold text-ink">Detalhe</p>
          </CardHeader>
          <CardBody className="space-y-4">
            {!selectedId ? <EmptyState title="Selecione um boleto" description="O detalhe aparece ao lado da lista." /> : null}
            {detalheQuery.isLoading ? <LoadingState label="Carregando boleto" /> : null}
            {detalheQuery.isError ? <ErrorState message={extractErrorMessage(detalheQuery.error)} onRetry={() => void detalheQuery.refetch()} /> : null}
            {detalhe ? (
              <>
                <div className="rounded-2xl border border-line bg-surface-muted p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Valor</p>
                      <p className="num mt-2 text-2xl font-bold text-ink">{formatMoney(detalhe.valor)}</p>
                    </div>
                    <Badge tone={statusTone(boletoStatus(detalhe))}>{boletoStatus(detalhe)}</Badge>
                  </div>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-4"><dt className="text-ink-muted">Vencimento</dt><dd className="font-semibold text-ink">{formatDate(asString(detalhe.vencimento, ''))}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-ink-muted">Competência</dt><dd className="font-semibold text-ink">{asString(detalhe.competencia)}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-ink-muted">Gateway</dt><dd className="font-semibold text-ink">{asString(detalhe.gateway_provider)}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-ink-muted">Referência</dt><dd className="max-w-44 truncate font-semibold text-ink">{asString(detalhe.referencia_externa ?? detalhe.gateway_id)}</dd></div>
                  </dl>
                </div>

                {detalhe.gateway_pix_copia_cola ? (
                  <button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-muted p-3 text-left text-sm text-ink hover:border-brand/35" onClick={() => copyText(detalhe.gateway_pix_copia_cola)}>
                    <Copy className="h-4 w-4 shrink-0 text-brand" />
                    <span className="min-w-0 truncate">{asString(detalhe.gateway_pix_copia_cola)}</span>
                  </button>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {detalhe.gateway_url || detalhe.url_boleto ? (
                    <a className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:bg-surface-muted" href={asString(detalhe.gateway_url ?? detalhe.url_boleto, '#')} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Abrir boleto
                    </a>
                  ) : null}
                  {canWrite && boletoStatus(detalhe) !== 'pago' ? (
                    <Button icon={WalletCards} isLoading={pagoMutation.isPending} onClick={() => void pagoMutation.mutate(asString(detalhe.id, selectedId))}>
                      Marcar pago
                    </Button>
                  ) : null}
                  {!canWrite ? (
                    <Badge tone="neutral" className="h-10 rounded-full px-4">
                      leitura
                    </Badge>
                  ) : null}
                </div>

                {pagoMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(pagoMutation.error)}</p> : null}
                {pagoMutation.isSuccess ? <p className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)]">Boleto marcado como pago.</p> : null}
              </>
            ) : null}
          </CardBody>
        </Card>
      </section>
    </div>
  )
}
