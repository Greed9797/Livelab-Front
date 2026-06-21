import { Card, CardBody, CardHeader } from '../ui/Card'
import { EmptyState } from '../ui/States'
import { asNumber, formatMoney, formatPercent } from '../../utils/format'

// Ponte do resultado (waterfall honesto): a comissão de franquia (receita_liquida)
// é a receita da LiveLab; dela subtraímos os custos para chegar ao resultado líquido
// (fat_liquido). O GMV bruto é o VOLUME transacionado (contexto), não a receita —
// por isso fica no cabeçalho com a "take rate" (% do GMV que vira comissão), e não
// na mesma escala das barras.

const PLOT_H = 184
// folga no topo para os rótulos de valor não encostarem na borda do plot
const BAR_MAX = PLOT_H - 26

export function ReceitaWaterfall({
  gmvTotal,
  comissao,
  fixo,
  custos,
  resultado,
}: {
  gmvTotal: unknown
  comissao: unknown
  fixo: unknown
  custos: unknown
  resultado: unknown
}) {
  const gmv = asNumber(gmvTotal)
  const com = asNumber(comissao)
  const fixoMensal = Math.max(asNumber(fixo), 0)
  // parte variável da comissão (proporcional ao GMV); o fixo entra empilhado acima.
  const variavel = Math.max(com - fixoMensal, 0)
  const cost = asNumber(custos)
  const res = asNumber(resultado)
  // take rate considera SÓ a parte variável — o fixo mensal não é proporcional ao GMV.
  const takeRate = gmv > 0 ? (variavel / gmv) * 100 : 0
  const custosExcedem = cost > com

  // Escala ancorada na comissão (degrau mais alto: resultado ≤ comissão e a queda ≤ comissão).
  const max = Math.max(com, 1)
  const scale = BAR_MAX / max
  const comH = Math.max(com * scale, com > 0 ? 3 : 0)
  // barra empilhada: base = variável, topo = fixo (somam comH).
  const fixoH = fixoMensal > 0 ? Math.max(fixoMensal * scale, 2) : 0
  const variavelH = Math.max(comH - fixoH, variavel > 0 ? 3 : 0)
  const resH = Math.max(res * scale, res > 0 ? 3 : 0)
  const dropBottom = resH
  const dropH = Math.max(comH - resH, custosExcedem ? comH : cost > 0 ? 3 : 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold tracking-[-0.01em] text-ink">Composição do resultado</p>
            <p className="mt-1 text-xs text-ink-muted">Da comissão das lives ao resultado líquido do período.</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-muted">GMV bruto</p>
            <p className="num text-lg font-black leading-tight text-ink">{formatMoney(gmv)}</p>
            <p className="text-[11px] text-ink-muted">
              take rate <span className="num font-semibold text-brand">{formatPercent(takeRate)}</span>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {gmv <= 0 && com <= 0 ? (
          <EmptyState title="Sem movimento no período" description="Nenhuma live encerrada ou custo lançado no período selecionado." />
        ) : (
          <>
            <div className="grid grid-cols-3 items-end gap-3" style={{ height: PLOT_H }}>
              {/* Comissão de franquia (+) — barra empilhada: variável (base) + fixo mensal (topo) */}
              <div className="relative flex h-full flex-col justify-end">
                <p className="num mb-1.5 text-center text-sm font-bold text-ink">{formatMoney(com)}</p>
                <div className="flex flex-col-reverse overflow-hidden rounded-t-lg transition-[height] duration-300" style={{ height: comH }}>
                  <div style={{ height: variavelH, background: TONE_BG.success }} />
                  {fixoMensal > 0 ? <div style={{ height: fixoH, background: TONE_BG.brand, opacity: 0.7 }} /> : null}
                </div>
              </div>
              {/* − Custos (queda flutuante: do topo da comissão até o resultado) */}
              <div className="relative h-full">
                <p className="num absolute left-0 right-0 text-center text-xs font-bold text-[var(--danger)]" style={{ bottom: dropBottom + dropH + 4 }}>
                  − {formatMoney(cost)}
                </p>
                <div className="absolute left-0 right-0 rounded-t-lg transition-[height] duration-300" style={{ bottom: dropBottom, height: dropH, background: TONE_BG.danger, opacity: 0.85 }} />
              </div>
              {/* = Resultado */}
              <div className="relative flex h-full flex-col justify-end">
                <p className="num mb-1.5 text-center text-sm font-black text-ink">{formatMoney(res)}</p>
                <div className="rounded-t-lg transition-[height] duration-300" style={{ height: resH, background: TONE_BG.brand }} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <Legend
                title="Comissão de franquia"
                note={fixoMensal > 0 ? `variável + fixo mensal (${formatMoney(fixoMensal)})` : 'variável + fixo mensal'}
                tone="success"
              />
              <Legend title="Custos" note="lançados no período" tone="danger" />
              <Legend title="Resultado líquido" note="comissão − custos" tone="brand" />
            </div>
            {custosExcedem ? (
              <p className="mt-3 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
                Os custos do período excedem a comissão de franquia — resultado líquido zerado.
              </p>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  )
}

const TONE_BG: Record<string, string> = {
  success: 'var(--success)',
  danger: 'var(--danger)',
  brand: 'var(--primary)',
}

function Legend({ title, note, tone }: { title: string; note: string; tone: 'success' | 'danger' | 'brand' }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: TONE_BG[tone] }} />
        <span className="text-xs font-semibold text-ink">{title}</span>
      </div>
      <p className="mt-0.5 text-[11px] text-ink-muted">{note}</p>
    </div>
  )
}
