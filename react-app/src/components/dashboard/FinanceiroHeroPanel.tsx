import { Card, CardBody } from '../ui/Card'
import { asNumber, formatMoney, formatPercent } from '../../utils/format'
import type { JsonRecord } from '../../types/models'

// Hero da margem comercial (fat_liquido). O backend aplica o piso em zero depois
// dos custos manuais; por isso o texto precisa deixar essa regra visível.

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
  const receitaSobreGmv = gmvTotal > 0 ? (comissao / gmvTotal) * 100 : 0

  const prevFat = prev ? asNumber(prev.fat_liquido) : 0
  const prevGmv = prev ? asNumber(prev.gmv_total) : 0
  const hasPrev = Boolean(prev) && prevGmv > 0

  return (
    <Card className="relative border-brand/25">
      <div className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-brand" />
      <CardBody className="flex flex-col gap-5 p-5 md:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Margem após custos manuais</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <div
              className="flex items-baseline gap-1.5 leading-none"
              title={`Receita de marcas ${formatMoney(comissao)} − custos manuais ${formatMoney(custos)}; mínimo exibido: R$ 0,00.`}
            >
              <span className="text-base font-medium text-ink-muted">R$</span>
              <span className="num text-[40px] font-black leading-none tracking-[-0.03em] text-ink md:text-[44px]">
                {fatLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {hasPrev ? <DeltaPill current={fatLiquido} previous={prevFat} /> : null}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Receita de marcas <span className="num font-semibold text-[var(--success)]">{formatMoney(comissao)}</span>
            {' − '}custos manuais <span className="num font-semibold text-[var(--danger)]">{formatMoney(custos)}</span>
            {' · mínimo exibido R$ 0,00'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-4 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="GMV do período" value={formatMoney(gmvTotal)} delta={hasPrev ? { current: gmvTotal, previous: prevGmv } : undefined} />
          <Stat label="Receita / GMV*" value={formatPercent(receitaSobreGmv)} />
          <Stat label="Lives" value={lives.toLocaleString('pt-BR')} />
          <Stat label="Vídeos" value={videos.toLocaleString('pt-BR')} />
          <Stat label="Ticket médio" value={formatMoney(ticket)} />
        </div>
        <p className="-mt-2 text-[11px] text-ink-muted">* Relação da receita total com o GMV; a taxa variável incide só sobre o GMV das lives e não inclui valores fixos.</p>
      </CardBody>
    </Card>
  )
}
