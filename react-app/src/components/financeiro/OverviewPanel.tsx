import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { extractErrorMessage } from '../../services/api'
import { consultarExceptions, consultarOverview } from '../../services/financeiro-overview'
import { formatConsultaMoney } from '../../services/financeiro-consulta'
import { hojeSP } from '../../utils/financeiro'
import { ErrorState } from '../ui/States'

export function OverviewPanel({ mes }: { mes: string }) {
  const [pagina, setPagina] = useState(1)
  const referencia = hojeSP()
  const overview = useQuery({
    queryKey: ['financeiro', 'overview', mes, referencia],
    queryFn: () => consultarOverview(mes, referencia),
  })
  const exceptions = useQuery({
    queryKey: ['financeiro', 'exceptions', mes, referencia, pagina],
    queryFn: () => consultarExceptions(mes, referencia, pagina),
  })

  return <section className="space-y-5" aria-label="Visão geral financeira">
    <div>
      <h2 className="text-xl font-semibold text-ink">Visão geral de {mes}</h2>
      <p className="text-sm text-ink-muted">Posição consultada em {referencia}; a fila usa o vencimento contratual.</p>
    </div>
    {overview.isError ? <ErrorState message={extractErrorMessage(overview.error)} onRetry={() => void overview.refetch()} />
      : overview.isPending ? <p role="status">Carregando visão geral…</p>
        : overview.data?.estado === 'vazio' ? <p role="status" className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink-muted">Nenhum lançamento neste mês; não há posição financeira para exibir.</p>
          : overview.data?.estado === 'incompleto' ? <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          Dados em revisão ({overview.data.incompletos} registros). Os totais completos não estão disponíveis.
        </div> : overview.data?.totais ? <div className="grid gap-3 sm:grid-cols-2">
          {(['receber', 'pagar'] as const).map((natureza) => <div key={natureza} className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="font-semibold text-ink">{natureza === 'receber' ? 'A receber' : 'A pagar'}</h3>
            <p className="mt-2 text-2xl font-semibold text-ink">{formatConsultaMoney(overview.data.totais![natureza].aberto)}</p>
            <p className="text-sm text-ink-muted">{overview.data.totais![natureza].quantidade} lançamentos · previsto {formatConsultaMoney(overview.data.totais![natureza].previsto)} · pago {formatConsultaMoney(overview.data.totais![natureza].pago)}</p>
          </div>)}
        </div> : null}
    <div className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="font-semibold text-ink">Fila de exceções</h3>
      {exceptions.isError ? <ErrorState message={extractErrorMessage(exceptions.error)} onRetry={() => void exceptions.refetch()} />
        : exceptions.isPending ? <p role="status" className="mt-3">Carregando fila…</p>
          : exceptions.data?.total_registros === 0 ? <p role="status" className="mt-3 text-sm text-ink-muted">Nenhuma exceção neste recorte.</p>
            : <>
              <ul className="mt-3 divide-y divide-line">
                {exceptions.data?.itens.map((item, index) => <li key={`${item.tipo}-${item.origem}-${item.id}-${item.componente}-${index}`} className="py-3 text-sm">
                  <strong className="text-ink">{item.tipo === 'vencido' ? 'Vencido' : 'Revisar dados'}</strong>
                  <span className="ml-2 text-ink-muted">{item.origem ?? 'Origem ausente'} · {item.id ?? 'Identidade ausente'}{item.motivo ? ` · ${item.motivo}` : ''}</span>
                  {item.saldo_aberto !== null ? <span className="ml-2 text-ink">{formatConsultaMoney(item.saldo_aberto)}</span> : null}
                </li>)}
              </ul>
              <div className="flex items-center justify-between pt-3 text-sm text-ink-muted">
                <span>Página {pagina} de {exceptions.data?.total_paginas}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={pagina <= 1} onClick={() => setPagina((value) => value - 1)}>Anterior</button>
                  <button type="button" disabled={pagina >= (exceptions.data?.total_paginas ?? 1)} onClick={() => setPagina((value) => value + 1)}>Próxima</button>
                </div>
              </div>
            </>}
    </div>
  </section>
}
