import { useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { asArray, asNumber, asString, formatMoney } from '../../utils/format'
import { officialLiveGmv } from '../../utils/live-gmv'
import { formatDuracao } from '../../utils/duracao'
import type { JsonRecord } from '../../types/models'

interface ImportVincularLiveModalProps {
  row: JsonRecord
  /** Lives já realizadas — a mesma lista da aba "Lives realizadas". */
  lives: JsonRecord[]
  /** live_id → row_index que já a reservou neste lote. Uma live só recebe uma linha. */
  usadas: Map<string, number>
  onClose: () => void
  onSelect: (liveId: string) => void
  isSaving: boolean
}

function dataHora(valor: unknown) {
  const iso = asString(valor, '')
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function duracaoDaLive(live: JsonRecord) {
  const inicio = asString(live.iniciado_em, '')
  const fim = asString(live.encerrado_em, '')
  if (!inicio || !fim) return null
  const segundos = (new Date(fim).getTime() - new Date(inicio).getTime()) / 1000
  return Number.isFinite(segundos) && segundos > 0 ? segundos : null
}

/**
 * Escolhe a qual live cadastrada a linha da planilha corresponde.
 *
 * Antes daqui a única opção era a lista de `candidates` que o matcher devolvia — quando ele não
 * achava sobreposição de horário, a lista vinha vazia e não havia como vincular nada. As
 * sugestões continuam no topo, mas agora toda live realizada está ao alcance da busca.
 */
export function ImportVincularLiveModal({
  row, lives, usadas, onClose, onSelect, isSaving,
}: ImportVincularLiveModalProps) {
  const [busca, setBusca] = useState('')
  const selecionada = asString(row.matched_live_id, '')

  const sugeridas = useMemo(
    () => new Set(asArray<JsonRecord>(row.candidates).map((c) => asString(c.live_id))),
    [row.candidates],
  )

  const ordenadas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const filtradas = termo
      ? lives.filter((live) => [live.marca_nome, live.cliente_nome, live.apresentadora_nome, live.iniciado_em]
        .some((campo) => asString(campo, '').toLowerCase().includes(termo)))
      : lives
    // Sugestão do matcher primeiro; dentro de cada grupo, a mais recente antes.
    return [...filtradas].sort((a, b) => {
      const sugA = sugeridas.has(asString(a.id)) ? 1 : 0
      const sugB = sugeridas.has(asString(b.id)) ? 1 : 0
      if (sugA !== sugB) return sugB - sugA
      return asString(b.iniciado_em, '').localeCompare(asString(a.iniciado_em, ''))
    })
  }, [lives, busca, sugeridas])

  const dataPlanilha = asString(row.live_date, '—')
  const horaPlanilha = asString(row.start_time, '')

  return (
    <Modal
      open
      title="Vincular a uma live"
      subtitle={`Planilha: ${dataPlanilha}${horaPlanilha ? ` às ${horaPlanilha}` : ''} · ${formatDuracao(asNumber(row.duration_seconds))} · ${formatMoney(row.attributed_gmv ?? row.ads_gmv)}`}
      size="xl"
      onClose={onClose}
      footer={(
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-ink-muted">{ordenadas.length} lives</span>
          <div className="flex gap-2">
            {selecionada ? (
              <Button type="button" variant="ghost" disabled={isSaving} onClick={() => onSelect('')}>
                Desvincular
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      )}
    >
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          className="design-input h-11 w-full pl-9 pr-3"
          placeholder="Buscar por marca, apresentadora ou data…"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
      </label>

      <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
        {ordenadas.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">Nenhuma live encontrada.</p>
        ) : null}

        {ordenadas.map((live) => {
          const liveId = asString(live.id)
          const reservadaPor = usadas.get(liveId)
          const bloqueada = reservadaPor !== undefined
          const ativa = liveId === selecionada
          const duracao = duracaoDaLive(live)

          return (
            <button
              key={liveId}
              type="button"
              disabled={bloqueada || isSaving}
              onClick={() => onSelect(liveId)}
              className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 text-left transition ${
                ativa
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : bloqueada
                    ? 'cursor-not-allowed border-line bg-surface-muted opacity-60'
                    : 'border-line bg-surface hover:bg-surface-muted'
              }`}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  <span className="truncate">{asString(live.marca_nome, asString(live.cliente_nome, 'Live'))}</span>
                  {sugeridas.has(liveId) ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                      <Sparkles className="h-3 w-3" /> sugerida
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  {dataHora(live.iniciado_em)}
                  {duracao ? ` · ${formatDuracao(duracao)}` : ''}
                  {live.apresentadora_nome ? ` · ${asString(live.apresentadora_nome)}` : ''}
                </p>
                {bloqueada ? (
                  <p className="mt-1 text-[11px] font-semibold text-amber-600">
                    Já vinculada à linha {reservadaPor} deste arquivo
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm font-bold text-ink">{formatMoney(officialLiveGmv(live))}</span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
