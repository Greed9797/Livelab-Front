import { Card, CardBody, CardHeader } from '../ui/Card'
import { EmptyState } from '../ui/States'
import { asNumber, formatMoney, formatPercent } from '../../utils/format'

// Ponte da margem comercial: receita de marcas menos custos manuais. O GMV é
// contexto de volume, não uma barra da mesma escala. A receita pode combinar
// percentual sobre GMV e valor fixo conforme a condição de cada marca.

const PLOT_H = 184
// folga no topo para os rótulos de valor não encostarem na borda do plot
const BAR_MAX = PLOT_H - 26

export function ReceitaWaterfall({
  gmvTotal,
  comissao,
  custos,
  resultado,
}: {
  gmvTotal: unknown
  comissao: unknown
  custos: unknown
  resultado: unknown
}) {
  const gmv = asNumber(gmvTotal)
  const com = asNumber(comissao)
  const cost = asNumber(custos)
  const res = asNumber(resultado)
  // Isto é relação de receita ao GMV, não a taxa variável contratada: a receita
  // também pode refletir valores fixos ou a maior condição comercial por marca.
  const receitaSobreGmv = gmv > 0 ? (com / gmv) * 100 : 0
  const custosExcedem = cost > com

  // Escala ancorada na receita (degrau mais alto: margem ≤ receita e a queda ≤ receita).
  const max = Math.max(com, 1)
  const scale = BAR_MAX / max
  const comH = Math.max(com * scale, com > 0 ? 3 : 0)
  const resH = Math.max(res * scale, res > 0 ? 3 : 0)
  const dropBottom = resH
  const dropH = Math.max(comH - resH, custosExcedem ? comH : cost > 0 ? 3 : 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold tracking-[-0.01em] text-ink">Composição da margem</p>
            <p className="mt-1 text-xs text-ink-muted">Receita de marcas menos custos manuais no período.</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-muted">GMV do período</p>
            <p className="num text-lg font-black leading-tight text-ink">{formatMoney(gmv)}</p>
            <p className="text-[11px] text-ink-muted">
              receita / GMV <span className="num font-semibold text-brand">{formatPercent(receitaSobreGmv)}</span>
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
              {/* Receita combinada conforme as condições comerciais das marcas. */}
              <div className="relative flex h-full flex-col justify-end">
                <p className="num mb-1.5 text-center text-sm font-bold text-ink">{formatMoney(com)}</p>
                <div className="overflow-hidden rounded-t-lg transition-[height] duration-300" style={{ height: comH, background: TONE_BG.success }} />
              </div>
              {/* − Custos (queda flutuante: do topo da receita até a margem) */}
              <div className="relative h-full">
                <p className="num absolute left-0 right-0 text-center text-xs font-bold text-[var(--danger)]" style={{ bottom: dropBottom + dropH + 4 }}>
                  − {formatMoney(cost)}
                </p>
                <div className="absolute left-0 right-0 rounded-t-lg transition-[height] duration-300" style={{ bottom: dropBottom, height: dropH, background: TONE_BG.danger, opacity: 0.85 }} />
              </div>
              {/* Margem com piso em zero */}
              <div className="relative flex h-full flex-col justify-end">
                <p className="num mb-1.5 text-center text-sm font-black text-ink">{formatMoney(res)}</p>
                <div className="rounded-t-lg transition-[height] duration-300" style={{ height: resH, background: TONE_BG.brand }} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <Legend
                title="Receita de marcas"
                note="condições comerciais aplicadas"
                tone="success"
              />
              <Legend title="Custos manuais" note="lançados no período" tone="danger" />
              <Legend title="Margem" note="receita − custos, mínimo R$ 0,00" tone="brand" />
            </div>
            <p className="mt-3 text-xs text-ink-muted">“Receita / GMV” relaciona a receita total ao volume. A taxa variável é aplicada só ao GMV das lives; valores fixos seguem a condição comercial de cada marca.</p>
            {custosExcedem ? (
              <p className="mt-3 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
                Os custos manuais superam a receita de marcas — a margem é exibida como R$ 0,00.
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
