import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardBody, CardHeader } from '../ui/Card'
import type { ChartPoint } from '../../types/models'

const colors = ['#ff5a1f', '#2c7ad6', '#1fa968', '#e08a0b', '#8b5cf6', '#64748b']
const gridStroke = 'var(--border)'
const axisColor = 'var(--text-muted)'

function MoneyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-[var(--shadow-card)]">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-ink-muted">
          {entry.name}: <span className="font-semibold text-ink">{Number(entry.value ?? 0).toLocaleString('pt-BR')}</span>
        </p>
      ))}
    </div>
  )
}

interface ComboPoint {
  label: string
  gmvHora: number
  horas: number
}

function ComboTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string; dataKey?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-[var(--shadow-card)]">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((entry) => {
        const v = Number(entry.value ?? 0)
        const isMoney = entry.dataKey === 'gmvHora'
        return (
          <p key={entry.name} className="text-ink-muted">
            {entry.name}:{' '}
            <span className="font-semibold text-ink">
              {isMoney ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${v.toLocaleString('pt-BR')}h`}
            </span>
          </p>
        )
      })}
    </div>
  )
}

// GMV/hora (linha, eixo esquerdo em R$) × Horas de live (barras, eixo direito em h).
// Escalas independentes — é o gráfico-chave do Pulso Diário.
export function GmvHoraComboPanel({
  title,
  subtitle,
  data,
  accumulatedLabel,
  accumulatedValue,
}: {
  title: string
  subtitle?: string
  data: ComboPoint[]
  accumulatedLabel?: string
  accumulatedValue?: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold tracking-[-0.01em] text-ink">{title}</p>
            {subtitle ? <p className="mt-1 text-xs text-ink-muted">{subtitle}</p> : null}
          </div>
          {accumulatedValue ? (
            <div className="rounded-xl border border-brand/40 bg-brand-soft px-4 py-2 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-muted">{accumulatedLabel ?? 'Acumulado'}</p>
              <p className="num text-xl font-black leading-tight text-brand">{accumulatedValue}</p>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardBody>
        <div className="h-80 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 18, right: 4, bottom: 0, left: -8 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#ff5a1f' }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} width={56} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}h`} width={36} />
              <Tooltip content={<ComboTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="right" dataKey="horas" name="Horas de live (h)" fill="#52525b" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Line yAxisId="left" type="monotone" dataKey="gmvHora" name="GMV/h (R$)" stroke="#ff5a1f" strokeWidth={2.5} dot={{ r: 3, fill: '#ff5a1f', strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}

export function LinePanel({
  title,
  subtitle,
  data,
  secondary = false,
}: {
  title: string
  subtitle?: string
  data: ChartPoint[]
  secondary?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <p className="text-base font-bold tracking-[-0.01em] text-ink">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-ink-muted">{subtitle}</p> : null}
      </CardHeader>
      <CardBody>
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: axisColor }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12, fill: axisColor }} tickLine={false} axisLine={false} />
              <Tooltip content={<MoneyTooltip />} />
              <Line type="monotone" dataKey="value" name="Valor" stroke="#ff5a1f" strokeWidth={3} dot={false} />
              {secondary ? <Line type="monotone" dataKey="secondary" name="Comparativo" stroke="#2c7ad6" strokeWidth={2} dot={false} /> : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}

export function BarPanel({ title, subtitle, data }: { title: string; subtitle?: string; data: ChartPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-base font-bold tracking-[-0.01em] text-ink">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-ink-muted">{subtitle}</p> : null}
      </CardHeader>
      <CardBody>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: axisColor }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12, fill: axisColor }} tickLine={false} axisLine={false} />
              <Tooltip content={<MoneyTooltip />} />
              <Bar dataKey="value" name="Valor" fill="#ff5a1f" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}

export function AreaPanel({ title, data }: { title: string; data: ChartPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-base font-bold tracking-[-0.01em] text-ink">{title}</p>
      </CardHeader>
      <CardBody>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gmvGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff5a1f" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ff5a1f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: axisColor }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12, fill: axisColor }} tickLine={false} axisLine={false} />
              <Tooltip content={<MoneyTooltip />} />
              <Area type="monotone" dataKey="value" name="GMV" stroke="#ff5a1f" fill="url(#gmvGradient)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}

export function DonutPanel({ title, data }: { title: string; data: ChartPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-base font-bold tracking-[-0.01em] text-ink">{title}</p>
      </CardHeader>
      <CardBody>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" innerRadius={56} outerRadius={86} paddingAngle={2}>
                {data.map((_, index) => (
                  <Cell key={index} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<MoneyTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}
