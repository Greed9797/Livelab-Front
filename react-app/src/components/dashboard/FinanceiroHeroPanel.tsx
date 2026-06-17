import { Card, CardBody } from '../ui/Card'
import { asNumber, formatMoney, formatPercent } from '../../utils/format'
import type { JsonRecord } from '../../types/models'

// Hero do Resultado líquido (fat_liquido) no padrão premium da casa (número mono
// grande). Difere do GmvHeroPanel: lê os campos reais de /financeiro/resumo e só
// exibe DeltaPill quando há período anterior REAL carregado (nunca +0,0% morto).

function DeltaPill({ current, previous }: { current: number; previous: number }) {
  if (!(previous > 0)) return null
  const delta = ((current - previous) / previous) * 100
  if (!Number.isFinite(delta)) return null
  const pos = delta >= 0
  return (
    <span
      className="num inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
      style={{
        background: pos ? 'var(--success-soft)' : 'var(--danger-soft)',
        color: pos ? 'var(--success)' : 'var(--danger)',
      }}
      title="Variação vs período anterior de mesma duração"
    >
      {pos ? '+' : ''}{delta.toFixed(1).replace('.', ',')}%
    </span>
  )
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: { current: number; previous: number } }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className="num mt-0.5 flex items-center gap-1.5 text-sm font-bold text-ink">
        {value}
        {delta ? <DeltaPill current={delta.current} previous={delta.previous} /> : null}
      </p>
    </div>
  )
}

export function FinanceiroHeroPanel({ raw, prev }: { raw: JsonRecord; prev?: JsonRecord | null }) {
  const fatLiquido = asNumber(raw.fat_liquido)
  const gmvTotal = asNumber(raw.gmv_total)
  const comissao = asNumber(raw.receita_liquida)
  const custos = asNumber(raw.total_custos)
  const pedidos = asNumber(raw.pedidos)
  const lives = asNumber(raw.total_lives)
  const videos = asNumber(raw.total_videos)
  const ticket = pedidos > 0 ? gmvTotal / pedidos : 0

  const prevFat = prev ? asNumber(prev.fat_liquido) : 0
  const prevGmv = prev ? asNumber(prev.gmv_total) : 0
  const hasPrev = Boolean(prev) && prevGmv > 0

  return (
    <Card className="relative border-brand/25">
      <div className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-brand" />
      <CardBody className="flex flex-col gap-5 p-5 md:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Resultado líquido do período</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <div
              className="flex items-baseline gap-1.5 leading-none"
              title={`Comissão de franquia ${formatMoney(comissao)} − custos ${formatMoney(custos)} = ${formatMoney(fatLiquido)}`}
            >
              <span className="text-base font-medium text-ink-muted">R$</span>
              <span className="num text-[40px] font-black leading-none tracking-[-0.03em] text-ink md:text-[44px]">
                {fatLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {hasPrev ? <DeltaPill current={fatLiquido} previous={prevFat} /> : null}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Comissão de franquia <span className="num font-semibold text-[var(--success)]">{formatMoney(comissao)}</span>
            {' − '}custos <span className="num font-semibold text-[var(--danger)]">{formatMoney(custos)}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-4 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="GMV bruto" value={formatMoney(gmvTotal)} delta={hasPrev ? { current: gmvTotal, previous: prevGmv } : undefined} />
          <Stat label="Take rate" value={formatPercent(gmvTotal > 0 ? (comissao / gmvTotal) * 100 : 0)} />
          <Stat label="Lives" value={lives.toLocaleString('pt-BR')} />
          <Stat label="Vídeos" value={videos.toLocaleString('pt-BR')} />
          <Stat label="Ticket médio" value={formatMoney(ticket)} />
        </div>
      </CardBody>
    </Card>
  )
}
