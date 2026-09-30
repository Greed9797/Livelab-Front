import clsx from 'clsx'
import { Pause, Pencil, Play, Plus, Repeat, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useCustoMutations, useCustosRecorrentes, useInvalidateFinanceiro } from '../../hooks/useFinanceiro'
import { extractErrorMessage } from '../../services/api'
import { gerarCustosMes } from '../../services/financeiro'
import type { CustoRecorrente } from '../../types/financeiro'
import { formatDataCurta, grupoLabel, mesLabel } from '../../utils/financeiro'
import { formatMoney } from '../../utils/format'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { InlineError } from './primitives'

function vigencia(r: CustoRecorrente) {
  const ini = r.inicio ? mesLabel(r.inicio.slice(0, 7), true) : '—'
  return r.fim ? `${ini} → ${mesLabel(r.fim.slice(0, 7), true)}` : `desde ${ini}`
}

export function RecorrentesPanel({
  mes,
  podeEscrever,
  onNovo,
  onEditar,
  onToast,
}: {
  mes: string
  podeEscrever: boolean
  onNovo: () => void
  onEditar: (r: CustoRecorrente) => void
  onToast: (msg: string, variant?: 'success' | 'error') => void
}) {
  const q = useCustosRecorrentes()
  const m = useCustoMutations()
  const invalidate = useInvalidateFinanceiro()
  const [excluir, setExcluir] = useState<CustoRecorrente | null>(null)
  const gerar = useMutation({
    mutationFn: () => gerarCustosMes(mes),
    onSuccess: (res) => {
      invalidate()
      const criados = Number((res as Record<string, unknown>)?.criados ?? 0)
      onToast(criados ? `${criados} lançamento(s) de ${mesLabel(mes)} gerado(s).` : `Os recorrentes de ${mesLabel(mes)} já estavam gerados.`)
    },
    onError: (e) => onToast(extractErrorMessage(e), 'error'),
  })

  if (q.isLoading) return <LoadingState label="Carregando recorrentes" />
  if (q.isError) return <ErrorState message={extractErrorMessage(q.error)} onRetry={() => void q.refetch()} />

  const itens = q.data ?? []
  const ativos = itens.filter((r) => r.ativo)
  const totalMensal = ativos.reduce((s, r) => s + r.valor, 0)

  return (
    <section className="space-y-4">
      <div className="design-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand"><Repeat className="h-5 w-5" /></span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">Custo fixo mensal</p>
            <p className="num text-2xl font-bold tracking-[-0.02em] text-ink">{formatMoney(totalMensal, true)}</p>
            <p className="text-xs text-ink-muted">{ativos.length} recorrente{ativos.length === 1 ? '' : 's'} ativo{ativos.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        {podeEscrever ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={Sparkles} isLoading={gerar.isPending} onClick={() => gerar.mutate()} title="Materializa os lançamentos do mês (idempotente)">
              Gerar {mesLabel(mes, true)}
            </Button>
            <Button icon={Plus} onClick={onNovo}>Novo recorrente</Button>
          </div>
        ) : null}
      </div>

      {itens.length === 0 ? (
        <EmptyState title="Nenhum custo recorrente" description="Cadastre aluguel, contabilidade, ferramentas e outros custos que se repetem todo mês." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {itens.map((r) => (
            <li key={r.id} className={clsx('design-card flex items-start gap-3 p-4', !r.ativo && 'opacity-60')}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink">{r.nome}</p>
                  {!r.ativo ? <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase text-ink-muted">pausado</span> : null}
                </div>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {grupoLabel(r.grupo)} · dia {r.dia_vencimento}{r.mes_offset ? ' do mês seguinte' : ''} · {vigencia(r)}
                </p>
                {r.fim ? <p className="mt-0.5 text-[11px] text-ink-muted">termina em {formatDataCurta(r.fim)}</p> : null}
              </div>
              <p className="num shrink-0 text-sm font-bold text-ink">{formatMoney(r.valor, true)}</p>
              {podeEscrever ? (
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
                    aria-label={r.ativo ? `Pausar ${r.nome}` : `Reativar ${r.nome}`}
                    title={r.ativo ? 'Pausar' : 'Reativar'}
                    onClick={() =>
                      m.atualizarRecorrente.mutate(
                        { id: r.id, payload: { ativo: !r.ativo } },
                        { onError: (e) => onToast(extractErrorMessage(e), 'error') },
                      )
                    }
                  >
                    {r.ativo ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink" aria-label={`Editar ${r.nome}`} onClick={() => onEditar(r)}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]" aria-label={`Excluir ${r.nome}`} onClick={() => setExcluir(r)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(excluir)}
        size="sm"
        title="Excluir recorrente?"
        subtitle="Os meses já gerados continuam como lançamentos; os próximos deixam de aparecer. Para só parar, prefira pausar."
        onClose={() => setExcluir(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setExcluir(null)}>Cancelar</Button>
            <Button
              variant="danger"
              icon={Trash2}
              isLoading={m.excluirRecorrente.isPending}
              onClick={() =>
                excluir &&
                m.excluirRecorrente.mutate(excluir.id, {
                  onSuccess: () => {
                    setExcluir(null)
                    onToast('Recorrente excluído.')
                  },
                })
              }
            >
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">{excluir?.nome} · {formatMoney(excluir?.valor ?? 0, true)}/mês</p>
        <div className="mt-3">
          <InlineError message={m.excluirRecorrente.error ? extractErrorMessage(m.excluirRecorrente.error) : null} />
        </div>
      </Modal>
    </section>
  )
}
