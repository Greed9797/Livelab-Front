import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { MetricInfo } from '../ui/MetricInfo'
import { asNumber } from '../../utils/format'
import type { MetricKey } from '../../utils/metricGlossary'
import type { JsonRecord } from '../../types/models'

interface KpiItemProps {
  label: string
  value: string
  /** Chave do glossário central — define o conteúdo do tooltip do KPI. */
  metric: MetricKey
  delta?: number | null
  prefix?: string
  suffix?: string
  align?: 'left' | 'right'
}

// null = sem base de comparação; a régua declara a ausência em vez de esconder a referência.
function delta(cur: number, prev: number): number | null {
  if (!prev) return null
  return ((cur - prev) / prev) * 100
}

function DeltaPill({ d }: { d: number | null }) {
  if (d === null) return <span className="inline-flex h-[22px] items-center rounded-full bg-[var(--bg-elev-3)] px-2 text-xs font-bold text-ink-muted">sem base</span>
  const positive = d >= 0
  return (
    <span
      className="inline-flex h-[22px] items-center gap-0.5 rounded-full px-2 text-xs font-bold"
      style={{
        background: positive ? 'var(--primary-soft)' : 'var(--danger-soft)',
        color: positive ? 'var(--primary-text)' : 'var(--danger-text)',
      }}
    >
      {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {positive ? '+' : ''}{d.toFixed(1)}%
    </span>
  )
}

function KpiItem({ label, value, metric, delta: d, prefix, suffix, align }: KpiItemProps) {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col justify-center gap-2 border-t border-line px-5 py-3 xl:min-w-[150px] xl:border-t-0"
      style={{ borderLeft: '1px solid var(--border)' }}
    >
      <div className="flex flex-wrap items-start gap-1 sm:gap-2">
        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          <span className="leading-tight">{label}</span>
          <MetricInfo metric={metric} align={align} />
        </span>
        <DeltaPill d={d ?? null} />
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="shrink-0">
          <div className="flex items-baseline gap-0.5">
            {prefix && (
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {prefix}
              </span>
            )}
            <span
              className="text-[22px] font-semibold leading-none tracking-tight"
              style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {value}
            </span>
            {suffix && (
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {suffix}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface KpiStripProps {
  raw: JsonRecord
  /**
   * Primeiro carregamento — ainda não há resposta do backend.
   * Sem isso os cards caem em asNumber(undefined) = 0 e a tela AFIRMA que não houve
   * live nenhuma no mês, quando na verdade ainda não sabe. Era o que fazia "GMV/hora"
   * e "Horas em live" aparecerem zerados ao abrir a Home e "encherem" segundos depois.
   */
  loading?: boolean
  mesExibido: string
  meses: string[]
  onMesAnterior: () => void
  onMesProximo: () => void
  onMesChange: (mes: string) => void
  proximoDesabilitado: boolean
}

function monthLabel(mesISO: string): string {
  const [y, m] = mesISO.split('-').map(Number)
  const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function KpiStrip({ raw, loading = false, mesExibido, meses, onMesAnterior, onMesProximo, onMesChange, proximoDesabilitado }: KpiStripProps) {
  // Dois baldes distintos no backend (src/routes/home.js:340-342):
  //   gmv_total_mes = gmv_mes = gmv_lives_mes + gmv_videos_mes   (lives + vídeos)
  //   gmv_lives_mes                                              (só lives)
  // Fallback NUNCA cruza os dois — trocar um pelo outro sub/superestima o KPI.
  // "zero" e "não sei" não são a mesma coisa.
  //
  // asNumber(undefined) devolve 0, então um campo AUSENTE na resposta virava um card
  // afirmando "R$ 0" — indistinguível de um mês sem faturamento. Foi exatamente assim que o
  // bug do tenant na conexão apareceu na tela: o backend devolvia 200 com alguns agregados
  // vazios e a Home afirmava que não houve GMV nem horas, enquanto ranking e gráfico
  // mostravam dinheiro. O dono leu como "os dados não carregam".
  //
  // A causa daquele caso está corrigida no backend, mas a regra fica: campo que não veio
  // vira "—". Se algum agregado sumir de novo, a tela admite que não sabe em vez de mentir.
  const ausente = (...chaves: string[]) => chaves.every((k) => raw[k] === undefined || raw[k] === null)
  const gmvMes = asNumber(raw.gmv_total_mes ?? raw.gmv_mes ?? raw.fat_bruto)
  const gmvLivesMes = asNumber(raw.gmv_lives_mes)
  const livesMes = asNumber(raw.lives_mes ?? raw.total_lives)
  const livesPrev = asNumber(raw.lives_prev)
  const horasLive = asNumber(raw.horas_live ?? raw.horas_live_mes)
  const horasPrev = asNumber(raw.horas_prev)
  // GMV/hora usa só GMV de lives, igual ao backend (home.js:922, mesma
  // convenção do analytics.js).
  //
  // GMV/live NÃO segue essa convenção: o backend faz gmvMes / livesMes
  // (home.js:920), ou seja, o numerador INCLUI o GMV de vídeos. É inconsistente
  // com o GMV/hora ao lado, mas o fallback espelha o backend de propósito —
  // divergir aqui faria o card mostrar fórmula diferente conforme o backend
  // mandar valor ou zero. Uniformizar as duas métricas é decisão de produto:
  // muda número exibido em produção.
  const gmvPorLive = asNumber(raw.gmv_por_live ?? raw.gmv_por_live_mes) || (livesMes > 0 ? gmvMes / livesMes : 0)
  const gmvPorLivePrev = asNumber(raw.gmv_por_live_prev)
  const gmvPorHora = asNumber(raw.gmv_por_hora ?? raw.gmv_por_hora_mes ?? raw.gmv_hora) || (horasLive > 0 ? gmvLivesMes / horasLive : 0)
  const gmvPorHoraPrev = asNumber(raw.gmv_por_hora_prev)

  function fmtCompact(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
    if (v >= 1_000) return `${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  }

  const items: KpiItemProps[] = [
    {
      label: 'Lives realizadas',
      metric: 'home.lives',
      value: ausente('lives_mes','total_lives') ? '—' : livesMes.toLocaleString('pt-BR'),
      delta: delta(livesMes, livesPrev),
    },
    {
      label: 'Horas em live',
      metric: 'home.horas_live',
      value: ausente('horas_live','horas_live_mes') ? '—' : horasLive.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
      suffix: 'h',
      delta: delta(horasLive, horasPrev),
    },
    {
      label: 'GMV / live',
      metric: 'home.gmv_por_live',
      value: ausente('gmv_por_live','gmv_por_live_mes') && ausente('gmv_total_mes','gmv_mes') ? '—' : fmtCompact(gmvPorLive),
      prefix: 'R$',
      delta: delta(gmvPorLive, gmvPorLivePrev),
    },
    {
      label: 'GMV / hora',
      metric: 'home.gmv_por_hora',
      value: ausente('gmv_por_hora','gmv_por_hora_mes','gmv_hora') && ausente('gmv_lives_mes') ? '—' : fmtCompact(gmvPorHora),
      prefix: 'R$',
      delta: delta(gmvPorHora, gmvPorHoraPrev),
    },
  ]

  return (
    <section className="overflow-x-auto rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-card)]" aria-label="Indicadores do mês">
      <div className="grid grid-cols-2 items-stretch xl:flex">
        <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 px-4 py-3 xl:min-w-[260px]">
          <button type="button" aria-label="Mês anterior" onClick={onMesAnterior} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted"><ChevronLeft className="h-4 w-4" /></button>
          <select aria-label="Filtrar por mês" value={mesExibido} onChange={(event) => onMesChange(event.target.value)} className="min-w-[170px] appearance-none bg-transparent text-[15px] font-bold text-ink focus:outline-none">
            {meses.map((mes) => <option key={mes} value={mes}>{monthLabel(mes)}</option>)}
            {!meses.includes(mesExibido) ? <option value={mesExibido}>{monthLabel(mesExibido)}</option> : null}
          </select>
          <button type="button" aria-label="Próximo mês" disabled={proximoDesabilitado} onClick={onMesProximo} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted disabled:opacity-35"><ChevronRight className="h-4 w-4" /></button>
        </div>
      {items.map((item, index) => (
        // Últimas colunas ancoram o popover à direita para não vazar da faixa.
        <KpiItem
          key={item.label}
          {...item}
          // Delta e sparkline sairiam de um zero inventado — some com eles junto do valor.
          value={loading ? '—' : item.value}
          delta={loading ? null : item.delta}
          align={index % 2 === 1 ? 'right' : 'left'}
        />
      ))}
      </div>
    </section>
  )
}
