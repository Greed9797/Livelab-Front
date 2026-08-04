import { TrendingUp, TrendingDown } from 'lucide-react'
import { Sparkline } from '../charts/Sparkline'
import { MetricInfo } from '../ui/MetricInfo'
import { asNumber } from '../../utils/format'
import type { MetricKey } from '../../utils/metricGlossary'
import type { JsonRecord } from '../../types/models'

interface KpiItemProps {
  label: string
  value: string
  /** Chave do glossário central — define o conteúdo do tooltip do KPI. */
  metric: MetricKey
  delta?: number
  spark?: number[]
  sparkColor?: string
  prefix?: string
  suffix?: string
  align?: 'left' | 'right'
}

// undefined = sem base de comparação → não renderiza o pill (evita "+0.0%" falso)
function delta(cur: number, prev: number): number | undefined {
  if (!prev) return undefined
  return ((cur - prev) / prev) * 100
}

function DeltaPill({ d }: { d: number }) {
  const positive = d >= 0
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium font-mono"
      style={{
        background: positive ? 'var(--success-soft)' : 'var(--danger-soft)',
        color: positive ? 'var(--success)' : 'var(--danger)',
      }}
    >
      {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {positive ? '+' : ''}{d.toFixed(1)}%
    </span>
  )
}

function KpiItem({ label, value, metric, delta: d, spark, sparkColor, prefix, suffix, align }: KpiItemProps) {
  return (
    <div
      className="flex flex-col justify-between gap-3 rounded-xl p-4"
      style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          <span className="truncate">{label}</span>
          <MetricInfo metric={metric} align={align} />
        </span>
        {d !== undefined && <DeltaPill d={d} />}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-0.5">
            {prefix && (
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {prefix}
              </span>
            )}
            <span
              className="text-[22px] font-semibold leading-none tracking-tight font-mono"
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
        {spark && spark.length > 2 && (
          <div className="shrink-0 opacity-80">
            <Sparkline data={spark} width={60} height={22} stroke={sparkColor ?? 'var(--primary)'} />
          </div>
        )}
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
}

export function KpiStrip({ raw, loading = false }: KpiStripProps) {
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
  const gmvPrev = asNumber(raw.gmv_mes_prev ?? raw.gmv_prev)
  const livesMes = asNumber(raw.lives_mes ?? raw.total_lives)
  const livesPrev = asNumber(raw.lives_prev)
  const horasLive = asNumber(raw.horas_live ?? raw.horas_live_mes)
  const horasPrev = asNumber(raw.horas_prev)
  const videosMes = asNumber(raw.videos_mes ?? raw.total_videos)
  const videosPrev = asNumber(raw.videos_prev)
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

  const gmvSpark = (raw.gmv_year as number[] | undefined)
  const livesSpark = (raw.lives_year as number[] | undefined)
  const horasSpark = (raw.horas_year as number[] | undefined)
  const videosSpark = (raw.videos_year as number[] | undefined)

  function fmtCompact(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
    if (v >= 1_000) return `${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  }

  const items: KpiItemProps[] = [
    {
      label: 'GMV — Mês',
      metric: 'home.gmv_total',
      value: ausente('gmv_total_mes', 'gmv_mes', 'fat_bruto') ? '—' : fmtCompact(gmvMes),
      prefix: 'R$',
      delta: delta(gmvMes, gmvPrev),
      spark: gmvSpark,
    },
    {
      label: 'Lives realizadas',
      metric: 'home.lives',
      value: ausente('lives_mes','total_lives') ? '—' : livesMes.toLocaleString('pt-BR'),
      delta: delta(livesMes, livesPrev),
      spark: livesSpark,
      sparkColor: 'var(--info)',
    },
    {
      label: 'Horas em live',
      metric: 'home.horas_live',
      value: ausente('horas_live','horas_live_mes') ? '—' : horasLive.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
      suffix: 'h',
      delta: delta(horasLive, horasPrev),
      spark: horasSpark,
      sparkColor: 'var(--success)',
    },
    {
      label: 'Vídeos gravados',
      metric: 'home.videos',
      value: ausente('videos_mes','total_videos') ? '—' : videosMes.toLocaleString('pt-BR'),
      delta: delta(videosMes, videosPrev),
      spark: videosSpark,
      sparkColor: 'var(--warning)',
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
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
      {items.map((item, index) => (
        // Últimas colunas ancoram o popover à direita para não vazar da faixa.
        <KpiItem
          key={item.label}
          {...item}
          // Delta e sparkline sairiam de um zero inventado — some com eles junto do valor.
          value={loading ? '—' : item.value}
          delta={loading ? undefined : item.delta}
          spark={loading ? undefined : item.spark}
          align={index >= 4 ? 'right' : 'left'}
        />
      ))}
    </div>
  )
}
