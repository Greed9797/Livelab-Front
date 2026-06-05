import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertOctagon, AlertTriangle, Gauge, RefreshCw, TriangleAlert, Users } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { BarPanel } from '../charts/Charts'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { getApresentadoras, getDailyAnalytics, getMarcas } from '../../services/domain'
import { extractErrorMessage } from '../../services/api'
import { asString, formatMoney, unwrapList } from '../../utils/format'
import { buildDailyPulse, formatHoras, type PulseStatus } from '../../utils/dailyPulse'
import type { JsonRecord } from '../../types/models'

type Preset = 'hoje' | 'ontem' | '7d' | '30d' | 'mes' | 'custom'

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'ontem', label: 'Ontem' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'mes', label: 'Mês' },
  { key: 'custom', label: 'Personalizado' },
]

const STATUS_META: Record<PulseStatus, { label: string; color: string; soft: string }> = {
  critico: { label: 'Crítico', color: 'var(--danger)', soft: 'var(--danger-soft)' },
  atencao: { label: 'Atenção', color: 'var(--warning)', soft: 'var(--warning-soft)' },
  ok: { label: 'OK', color: 'var(--success)', soft: 'var(--success-soft)' },
  otimo: { label: 'Ótimo', color: 'var(--primary)', soft: 'var(--primary-soft)' },
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function presetRange(preset: Preset, customFrom: string, customTo: string): { from: string; to: string } {
  const today = new Date()
  const todayStr = ymd(today)
  const shift = (days: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - days)
    return ymd(d)
  }
  switch (preset) {
    case 'hoje':
      return { from: todayStr, to: todayStr }
    case 'ontem':
      return { from: shift(1), to: shift(1) }
    case '7d':
      return { from: shift(6), to: todayStr }
    case '30d':
      return { from: shift(29), to: todayStr }
    case 'mes':
      return { from: `${todayStr.slice(0, 7)}-01`, to: todayStr }
    case 'custom':
      return { from: customFrom, to: customTo }
  }
}

function StatusBadge({ status, className }: { status: PulseStatus; className?: string }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-[0.08em] ${className ?? ''}`}
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

export function PulsoDiarioSection() {
  const [preset, setPreset] = useState<Preset>('7d')
  const today = ymd(new Date())
  const [customFrom, setCustomFrom] = useState(today)
  const [customTo, setCustomTo] = useState(today)
  const [marcaId, setMarcaId] = useState('')
  const [apresentadoraId, setApresentadoraId] = useState('')

  const { from, to } = presetRange(preset, customFrom, customTo)
  const rangeValid = Boolean(from && to && from <= to)

  const marcasQuery = useQuery({
    queryKey: ['pulse-marcas'],
    queryFn: () => getMarcas({ status: 'ativa' }),
    staleTime: 5 * 60_000,
  })
  const apresentadorasQuery = useQuery({
    queryKey: ['pulse-apresentadoras'],
    queryFn: () => getApresentadoras(),
    staleTime: 5 * 60_000,
  })

  const dailyQuery = useQuery({
    queryKey: ['daily-pulse', from, to, marcaId, apresentadoraId],
    queryFn: () => getDailyAnalytics({ from, to, marca_id: marcaId || undefined, apresentadora_id: apresentadoraId || undefined }),
    enabled: rangeValid,
    staleTime: 60_000,
  })

  const rows = useMemo(() => unwrapList<JsonRecord>(dailyQuery.data), [dailyQuery.data])
  const pulse = useMemo(() => buildDailyPulse(rows), [rows])

  const marcas = unwrapList<JsonRecord>(marcasQuery.data)
  const apresentadoras = unwrapList<JsonRecord>(apresentadorasQuery.data)

  const chartData = pulse.serieDiaria.map((d) => ({ label: d.label, value: Math.round(d.gmvHora * 100) / 100 }))
  const heroMeta = STATUS_META[pulse.resumo.statusGeral]
  const periodoLabel = from === to ? from.split('-').reverse().join('/') : `${from.split('-').reverse().join('/')} → ${to.split('-').reverse().join('/')}`

  return (
    <section className="space-y-4">
      {/* Header + filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand">Pulso Diário</p>
              <h2 className="mt-0.5 text-xl font-black tracking-[-0.02em] text-ink">Onde olhar primeiro</h2>
              <p className="mt-0.5 text-sm text-ink-muted">Alertas por cliente, produtividade por hora e desempenho das lives no período.</p>
            </div>
            <Button type="button" variant="secondary" icon={RefreshCw} onClick={() => dailyQuery.refetch()} isLoading={dailyQuery.isFetching}>
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
                  preset === p.key ? 'bg-brand text-white' : 'border border-line text-ink-muted hover:bg-surface-muted hover:text-ink'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' ? (
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} className="design-input" />
              <span className="text-ink-muted">até</span>
              <input type="date" value={customTo} min={customFrom} max={today} onChange={(e) => setCustomTo(e.target.value)} className="design-input" />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <select value={marcaId} onChange={(e) => setMarcaId(e.target.value)} className="design-input min-w-[180px]">
              <option value="">Todos os clientes/marcas</option>
              {marcas.map((m) => (
                <option key={asString(m.id)} value={asString(m.id)}>{asString(m.nome)}</option>
              ))}
            </select>
            <select value={apresentadoraId} onChange={(e) => setApresentadoraId(e.target.value)} className="design-input min-w-[180px]">
              <option value="">Todas as apresentadoras</option>
              {apresentadoras.map((a) => (
                <option key={asString(a.id)} value={asString(a.id)}>{asString(a.nome)}</option>
              ))}
            </select>
          </div>
        </CardBody>
      </Card>

      {!rangeValid ? (
        <ErrorState message="Período inválido — data inicial deve ser anterior ou igual à final." />
      ) : dailyQuery.isLoading ? (
        <LoadingState label="Calculando pulso do período" />
      ) : dailyQuery.isError ? (
        <ErrorState message={extractErrorMessage(dailyQuery.error)} onRetry={() => dailyQuery.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="Sem lives no período" description="Nenhuma live encerrada ou venda atribuída para os filtros selecionados." />
      ) : (
        <>
          {/* Hero de status */}
          <Card style={{ borderColor: heroMeta.color }}>
            <CardBody className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ backgroundColor: heroMeta.soft, color: heroMeta.color }}>
                    <Activity className="h-4 w-4 stroke-[2.4]" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">Status do período · {periodoLabel}</p>
                    <p className="text-lg font-black uppercase tracking-[0.02em]" style={{ color: heroMeta.color }}>{heroMeta.label}</p>
                  </div>
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

          {/* Gráfico GMV/hora por dia */}
          <BarPanel title="GMV/hora por dia" subtitle="Produtividade do período (R$ por hora no ar)" data={chartData} />

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Feed de alertas */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TriangleAlert className="h-4 w-4 text-[var(--danger)]" />
                  <p className="text-base font-bold text-ink">Alertas operacionais</p>
                </div>
              </CardHeader>
              <CardBody>
                {pulse.alertas.length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink-muted">Nenhum alerta no período. Operação saudável. ✅</p>
                ) : (
                  <ul className="space-y-2">
                    {pulse.alertas.map((a) => {
                      const meta = STATUS_META[a.severity === 'critical' ? 'critico' : 'atencao']
                      const Icon = a.severity === 'critical' ? AlertOctagon : AlertTriangle
                      return (
                        <li key={`${a.data}-${a.clienteId}`} className="rounded-xl border border-line p-3" style={{ borderLeftColor: meta.color, borderLeftWidth: 3 }}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 shrink-0" style={{ color: meta.color }} />
                              <span className="text-sm font-bold text-ink">{a.clienteNome}</span>
                            </div>
                            <span className="text-xs font-semibold text-ink-muted">{a.dataLabel}</span>
                          </div>
                          <p className="num mt-1 text-xs text-ink-muted">{a.descricao}</p>
                          <p className="mt-0.5 text-sm font-semibold" style={{ color: meta.color }}>{a.titulo}</p>
                        </li>
                      )
                    })}
                  </ul>
                )}
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
                <ul className="space-y-2">
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
          </div>

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
                  <li key={ap.apresentadoraId} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{ap.apresentadoraNome}</p>
                      <p className="num text-xs text-ink-muted">
                        {formatMoney(ap.gmvHora)}/h · {ap.pedidosHora.toFixed(1).replace('.', ',')} pedidos/h · {formatHoras(ap.horas)}
                      </p>
                    </div>
                    <StatusBadge status={ap.status} />
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </>
      )}
    </section>
  )
}
