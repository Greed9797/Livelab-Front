import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Activity, Gauge, Users } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { GmvHoraComboPanel } from '../charts/Charts'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { getDailyAnalytics } from '../../services/domain'
import { extractErrorMessage } from '../../services/api'
import { formatMoney, unwrapList } from '../../utils/format'
import { buildDailyPulse, formatHoras, type PulseStatus } from '../../utils/dailyPulse'
import type { JsonRecord } from '../../types/models'

interface PulsoDiarioSectionProps {
  from: string
  to: string
  marcaId: string
  apresentadoraId: string
}

const STATUS_META: Record<PulseStatus, { label: string; color: string; soft: string }> = {
  critico: { label: 'Crítico', color: 'var(--danger)', soft: 'var(--danger-soft)' },
  atencao: { label: 'Atenção', color: 'var(--warning)', soft: 'var(--warning-soft)' },
  ok: { label: 'OK', color: 'var(--success)', soft: 'var(--success-soft)' },
  otimo: { label: 'Ótimo', color: 'var(--primary)', soft: 'var(--primary-soft)' },
}

function StatusBadge({ status }: { status: PulseStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-[0.08em]"
      style={{ backgroundColor: meta.soft, color: meta.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  )
}

function HeroNumber({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className="num mt-1 text-3xl font-black leading-none tracking-[-0.02em] text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  )
}

function brDate(iso: string): string {
  return iso.split('-').reverse().join('/')
}

export function PulsoDiarioSection({ from, to, marcaId, apresentadoraId }: PulsoDiarioSectionProps) {
  const rangeValid = Boolean(from && to && from <= to)

  const dailyQuery = useQuery({
    queryKey: ['daily-pulse', from, to, marcaId, apresentadoraId],
    queryFn: () => getDailyAnalytics({ from, to, marca_id: marcaId || undefined, apresentadora_id: apresentadoraId || undefined }),
    enabled: rangeValid,
    staleTime: 60_000,
  })

  const rows = useMemo(() => unwrapList<JsonRecord>(dailyQuery.data), [dailyQuery.data])
  const pulse = useMemo(() => buildDailyPulse(rows), [rows])

  const comboData = useMemo(
    () => pulse.serieDiaria.map((d) => ({ label: d.label, gmvHora: Math.round(d.gmvHora * 100) / 100, horas: Math.round(d.horas * 10) / 10 })),
    [pulse.serieDiaria],
  )
  const heroMeta = STATUS_META[pulse.resumo.statusGeral]
  const periodoLabel = from === to ? brDate(from) : `${brDate(from)} → ${brDate(to)}`

  if (!rangeValid) return <ErrorState message="Período inválido — data inicial deve ser anterior ou igual à final." />
  if (dailyQuery.isLoading) return <LoadingState label="Calculando pulso do período" />
  if (dailyQuery.isError) return <ErrorState message={extractErrorMessage(dailyQuery.error)} onRetry={() => dailyQuery.refetch()} />
  if (rows.length === 0) return <EmptyState title="Sem lives no período" description="Nenhuma live encerrada ou venda atribuída para os filtros selecionados." />

  return (
    <section className="space-y-4">
      {/* Gráfico-chave: GMV/hora (linha, R$) × Horas de live (barras, h) — eixos independentes */}
      <GmvHoraComboPanel
        title="GMV por Hora vs Horas de Live"
        subtitle={`Período: ${periodoLabel}`}
        data={comboData}
        accumulatedLabel="GMV acumulado · período"
        accumulatedValue={formatMoney(pulse.resumo.gmvTotal)}
      />

      {/* Hero de status */}
      <Card style={{ borderColor: heroMeta.color }}>
        <CardBody className="space-y-5">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ backgroundColor: heroMeta.soft, color: heroMeta.color }}>
              <Activity className="h-4 w-4 stroke-[2.4]" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">Status do período · {periodoLabel}</p>
              <p className="text-lg font-black uppercase tracking-[0.02em]" style={{ color: heroMeta.color }}>{heroMeta.label}</p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <HeroNumber label="Horas no ar" value={formatHoras(pulse.resumo.horasTotal)} />
            <HeroNumber label="GMV" value={formatMoney(pulse.resumo.gmvTotal)} />
            <HeroNumber label="Pedidos" value={pulse.resumo.pedidosTotal.toLocaleString('pt-BR')} />
          </div>
          <div className="grid gap-5 border-t border-line pt-4 sm:grid-cols-3">
            <HeroNumber label="GMV / hora" value={formatMoney(pulse.resumo.gmvHora)} />
            <HeroNumber label="Clientes críticos" value={pulse.resumo.clientesCriticos.toLocaleString('pt-BR')} hint={`${pulse.resumo.clientesAtencao} em atenção · ${pulse.resumo.clientesOk} ok`} />
            <HeroNumber label="Horas sem venda" value={formatHoras(pulse.resumo.horasSemVenda)} hint={`${pulse.resumo.diasComZeroVenda} dia(s) com zero venda`} />
          </div>
        </CardBody>
      </Card>

      {/* Ranking de clientes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-ink-muted" />
            <p className="text-base font-bold text-ink">Clientes</p>
          </div>
        </CardHeader>
        <CardBody>
          <ul className="grid gap-2 md:grid-cols-2">
            {pulse.clientes.map((c) => (
              <li key={c.clienteId} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{c.clienteNome}</p>
                  <p className="num text-xs text-ink-muted">
                    {formatHoras(c.horas)} · {formatMoney(c.gmvHora)}/h · {c.pedidos.toLocaleString('pt-BR')} pedidos
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* Ranking de apresentadoras */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-ink-muted" />
            <p className="text-base font-bold text-ink">Apresentadoras</p>
          </div>
        </CardHeader>
        <CardBody>
          <ul className="grid gap-2 md:grid-cols-2">
            {pulse.rankingApresentadoras.map((ap) => (
              <li key={ap.apresentadoraId} className="overflow-hidden rounded-xl border border-line">
                <Link
                  to={`/apresentadoras/${ap.apresentadoraId}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 transition hover:bg-surface-muted/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{ap.apresentadoraNome}</p>
                    <p className="num text-xs text-ink-muted">
                      {formatMoney(ap.gmvHora)}/h · {ap.pedidosHora.toFixed(1).replace('.', ',')} pedidos/h · {formatHoras(ap.horas)}
                    </p>
                  </div>
                  <StatusBadge status={ap.status} />
                </Link>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </section>
  )
}
