import { useQuery } from '@tanstack/react-query'
import { extractErrorMessage } from '../../services/api'
import { consultarResultadoVersions } from '../../services/financeiro-resultado-versions'
import { ErrorState } from '../ui/States'

const estadoLabel = { aberto: 'Aberto', fechado: 'Fechado', reaberto: 'Reaberto' } as const

function dataHora(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
  }).format(date)
}

export function ResultadoVersionsPanel({ mes }: { mes: string }) {
  const query = useQuery({
    queryKey: ['financeiro', 'fechamentos', mes],
    queryFn: () => consultarResultadoVersions(mes),
  })

  return <section className="space-y-4" aria-label="Fechamentos financeiros">
    <div>
      <h2 className="text-xl font-semibold text-ink">Fechamentos de {mes}</h2>
      <p className="text-sm text-ink-muted">Histórico das versões registradas para esta competência.</p>
    </div>
    {query.isError ? <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      : query.isPending ? <p role="status" className="text-sm text-ink-muted">Carregando fechamentos…</p>
        : query.data ? <>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-sm text-ink-muted">Situação da competência</p>
            <p className="mt-1 text-lg font-semibold text-ink">{estadoLabel[query.data.estado]}</p>
          </div>
          {query.data.versoes.length === 0 ?
            <p role="status" className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink-muted">Nenhum fechamento registrado para esta competência.</p>
            : <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Versões de fechamento da competência {mes}</caption>
                <thead className="border-b border-line text-ink-muted"><tr><th scope="col" className="px-4 py-3">Versão</th><th scope="col" className="px-4 py-3">Registrada em</th><th scope="col" className="px-4 py-3">Situação</th></tr></thead>
                <tbody>{query.data.versoes.map((version) => <tr key={version.id} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-3 font-medium text-ink">v{version.versao}</th>
                  <td className="px-4 py-3 text-ink">{dataHora(version.criado_em)}</td>
                  <td className="px-4 py-3 text-ink-muted">{version.versao === query.data.versao_atual && query.data.estado === 'fechado' ? 'Fechamento vigente' : 'Histórico'}</td>
                </tr>)}</tbody>
              </table>
            </div>}
        </> : null}
  </section>
}
